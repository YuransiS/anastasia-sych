import { supabaseAdmin } from "@/lib/supabase";

const TG_BOT_TOKEN = process.env.TELEGRAM_LEADS_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN || "7889462444:AAGCjyk-5h6SKWk94txoMlyhV2qyZuwcWaQ";
const TG_CHAT_ID = process.env.TELEGRAM_CHAT_ID || "-1003943120978";
const TG_THREAD_ID = process.env.TELEGRAM_THREAD_ID || "904";

export function getOfferLabel(variant?: string): string {
  const v = String(variant || "1");
  if (v === "2") return "Офер #2 (Дивишся в дзеркало і тобі не подобається відображення?)";
  if (v === "3") return "Офер #3 (Марафон закінчився, мотивація зникла, а старі звички повернулися?)";
  return "Офер #1 (Дієта закінчилась - нарешті можна наїстись?)";
}

export async function processPaymentStatusUpdate(payload: {
  orderReference: string;
  transactionStatus: string;
  amount?: number | string;
  reason?: string;
  reasonCode?: string | number;
}) {
  const { orderReference, transactionStatus, amount, reason, reasonCode } = payload;
  if (!orderReference) return null;

  const isApproved = transactionStatus === "Approved";
  const newStatus = isApproved ? "Оплачено" : "Не оплачено";
  const paidAmount = amount ? Number(amount) : 480;

  // 1. Fetch lead from Supabase
  const { data: existingLead, error: selectErr } = await supabaseAdmin
    .from("anastasia_sych_leads")
    .select("*")
    .eq("order_id", orderReference)
    .maybeSingle();

  if (selectErr || !existingLead) {
    console.error("[Payment Handler] Lead not found for orderReference:", orderReference, selectErr);
    return null;
  }

  // 2. Update status in Supabase
  const { data: updatedLead, error: updateErr } = await supabaseAdmin
    .from("anastasia_sych_leads")
    .update({
      status: newStatus,
      amount: paidAmount,
      raw_payload: {
        ...(existingLead.raw_payload || {}),
        payment_processed_at: new Date().toISOString(),
        payment_payload: payload,
      },
    })
    .eq("order_id", orderReference)
    .select()
    .single();

  if (updateErr) {
    console.error("[Payment Handler] Supabase update error:", updateErr);
  } else {
    console.log(`[Payment Handler] Successfully updated lead ${orderReference} to ${newStatus}`);
  }

  // 3. Edit Telegram message in thread 904
  const tgMessageId = existingLead.raw_payload?.tg_message_id;
  const offerVariant = existingLead.offer_variant || "1";
  const offerLabel = getOfferLabel(offerVariant);
  const amountText = paidAmount === 1 ? "1 UAH (ТЕСТ)" : `${paidAmount} UAH`;

  let message = "";
  if (isApproved) {
    message += `<b>🟢 Оплата успішна!</b>\n\n`;
  } else {
    message += `<b>🔴 Оплату відхилено</b>\n\n`;
  }

  message += `👤 <b>Ім'я:</b> ${existingLead.name || "-"}\n`;
  message += `📞 <b>Телефон:</b> <code>${existingLead.phone || "-"}</code>\n`;

  if (existingLead.telegram) {
    const tg = existingLead.telegram.startsWith("@") ? existingLead.telegram : `@${existingLead.telegram}`;
    message += `📱 <b>Telegram:</b> ${tg}\n`;
  }

  if (isApproved) {
    message += `🎯 <b>Офер з якого купив:</b> ${offerLabel}\n`;
  } else {
    message += `🎯 <b>Офер:</b> ${offerLabel}\n`;
  }

  message += `💳 <b>Сума:</b> <code>${amountText}</code>\n`;
  message += `🆔 <b>Order ID:</b> <code>${orderReference}</code>\n`;

  if (isApproved) {
    message += `✅ <b>Статус:</b> Успішно оплачено (WayForPay)\n`;
  } else {
    message += `❌ <b>Причина відмови:</b> ${reason || (reasonCode ? `Код: ${reasonCode}` : "Скасовано користувачем")}\n`;
    message += `⚠️ <b>Статус:</b> Не оплачено\n`;
  }

  if (tgMessageId) {
    try {
      const editUrl = `https://api.telegram.org/bot${TG_BOT_TOKEN}/editMessageText`;
      const editRes = await fetch(editUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: TG_CHAT_ID,
          message_id: tgMessageId,
          text: message.trim(),
          parse_mode: "HTML",
        }),
      });
      const editResult = await editRes.json();
      if (editResult.ok) {
        console.log(`[Payment Handler] Successfully edited Telegram message #${tgMessageId}`);
      } else {
        console.warn("[Payment Handler] Message edit returned error:", editResult.description);
      }
    } catch (err) {
      console.error("[Payment Handler] Telegram edit exception:", err);
    }
  } else {
    // Send fallback message if tgMessageId was missing
    try {
      const sendUrl = `https://api.telegram.org/bot${TG_BOT_TOKEN}/sendMessage`;
      await fetch(sendUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: TG_CHAT_ID,
          message_thread_id: TG_THREAD_ID ? parseInt(TG_THREAD_ID, 10) : undefined,
          text: message.trim(),
          parse_mode: "HTML",
        }),
      });
    } catch (err) {
      console.error("[Payment Handler] Fallback send message error:", err);
    }
  }

  return updatedLead;
}
