import { supabaseAdmin } from "@/lib/supabase";
import { updateUnifiedOrderStatus } from "@/lib/unified-crm";

const TG_BOT_TOKEN = process.env.TELEGRAM_LEADS_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN || "7889462444:AAGCjyk-5h6SKWk94txoMlyhV2qyZuwcWaQ";
const TG_CHAT_ID = process.env.TELEGRAM_CHAT_ID || "-1003943120978";
const TG_THREAD_ID = process.env.TELEGRAM_THREAD_ID || "904";

export function getOfferLabel(variant?: string, amount?: number | string, currency?: string): string {
  const v = String(variant || "1");
  if (v === "mini-course" || v === "minicourse" || v === "mc" || v.startsWith("mini-course")) {
    if (amount === 7.6 || currency === "EUR") {
      return "Міні-курс: «Плаский живіт та струнка талія» (7,6€)";
    }
    return "Міні-курс: «Плаский живіт та струнка талія» (279 грн)";
  }
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
  const legacyStatus = isApproved ? "Оплачено" : "Не оплачено";
  const canonicalStatus = isApproved ? "closed_won" : "declined";

  // 1. Fetch lead from Supabase
  const { data: existingLead, error: selectErr } = await supabaseAdmin
    .from("anastasia_sych_leads")
    .select("*")
    .eq("order_id", orderReference)
    .maybeSingle();

  if (selectErr) {
    console.error("[Payment Handler] Error querying lead for orderReference:", orderReference, selectErr);
  }

  const paidAmount = amount
    ? Number(Number(amount).toFixed(2))
    : (existingLead?.amount ? Number(Number(existingLead.amount).toFixed(2)) : 279.0);

  // 2. Canonical B&W CRM v2.0 Enrichment Protocol: Update unified_orders
  try {
    await updateUnifiedOrderStatus({
      orderId: orderReference,
      status: canonicalStatus,
      amount: paidAmount,
      reason: reason || (reasonCode ? `Reason code: ${reasonCode}` : undefined),
      paymentPayload: payload,
    });
  } catch (crmErr) {
    console.error("[Payment Handler] Unified order status update error:", crmErr);
  }

  // 3. Update status in local anastasia_sych_leads
  let updatedLead = null;
  if (existingLead) {
    const { data: leadUpdate, error: updateErr } = await supabaseAdmin
      .from("anastasia_sych_leads")
      .update({
        status: legacyStatus,
        amount: paidAmount,
        raw_payload: {
          ...(existingLead.raw_payload || {}),
          canonical_status: canonicalStatus,
          payment_processed_at: new Date().toISOString(),
          payment_payload: payload,
        },
      })
      .eq("order_id", orderReference)
      .select()
      .single();

    if (updateErr) {
      console.error("[Payment Handler] Supabase update error (anastasia_sych_leads):", updateErr);
    } else {
      updatedLead = leadUpdate;
      console.log(`[Payment Handler] Successfully updated lead ${orderReference} to ${legacyStatus} (${canonicalStatus})`);
    }
  }

  // 4. Dispatch Telegram alert ONLY if payment is approved (successful)
  if (isApproved) {
    const tgMessageId = existingLead?.raw_payload?.tg_message_id;
    const offerVariant = existingLead?.offer_variant || "1";
    const currency = existingLead?.raw_payload?.currency || (paidAmount === 7.6 ? "EUR" : "UAH");
    const offerLabel = getOfferLabel(offerVariant, paidAmount, currency);
    const amountText = paidAmount === 1 ? `1 ${currency} (ТЕСТ)` : `${paidAmount} ${currency}`;
    const userNotes = existingLead?.raw_payload?.notes;

    let message = `<b>🟢 Оплата успішна!</b>\n\n`;
    message += `👤 <b>Ім'я:</b> ${existingLead?.name || "-"}\n`;
    message += `📞 <b>Телефон:</b> <code>${existingLead?.phone || "-"}</code>\n`;

    if (existingLead?.telegram) {
      const tg = existingLead.telegram.startsWith("@") ? existingLead.telegram : `@${existingLead.telegram}`;
      message += `📱 <b>Telegram:</b> ${tg}\n`;
    }

    message += `🎯 <b>Офер:</b> ${offerLabel}\n`;
    message += `💳 <b>Сума:</b> <code>${amountText}</code>\n`;
    message += `🆔 <b>Order ID:</b> <code>${orderReference}</code>\n`;

    if (userNotes && String(userNotes).trim()) {
      message += `💬 <b>Запит:</b> ${String(userNotes).trim()}\n`;
    }

    message += `✅ <b>Статус:</b> Успішно оплачено (WayForPay)\n`;

    const utmSource = existingLead.utm_source || existingLead.raw_payload?.utm_source;
    const utmMedium = existingLead.utm_medium || existingLead.raw_payload?.utm_medium;
    const utmCampaign = existingLead.utm_campaign || existingLead.raw_payload?.utm_campaign;
    const utmContent = existingLead.utm_content || existingLead.raw_payload?.utm_content;
    const utmTerm = existingLead.utm_term || existingLead.raw_payload?.utm_term;

    const hasUtm = utmSource || utmMedium || utmCampaign || utmContent || utmTerm;
    if (hasUtm) {
      message += `\n🔍 <b>UTM-маркетинг:</b>\n`;
      if (utmSource) message += `• <b>Source:</b> ${utmSource}\n`;
      if (utmMedium) message += `• <b>Medium:</b> ${utmMedium}\n`;
      if (utmCampaign) message += `• <b>Campaign:</b> ${utmCampaign}\n`;
      if (utmContent) message += `• <b>Content:</b> ${utmContent}\n`;
      if (utmTerm) message += `• <b>Term:</b> ${utmTerm}\n`;
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
      // Send message if tgMessageId was not previously stored
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
        console.error("[Payment Handler] Send message error:", err);
      }
    }
  }

  return updatedLead;
}
