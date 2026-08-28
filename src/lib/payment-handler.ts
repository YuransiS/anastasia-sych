import { supabaseAdmin } from "@/lib/supabase";
import { updateUnifiedOrderStatus } from "@/lib/unified-crm";
import { TG_BOT_TOKEN, TG_CHAT_ID, TG_LEADS_THREAD_ID } from "@/lib/telegram";

export function getOfferLabel(variant?: string, amount?: number | string, currency?: string): string {
  const v = String(variant || "1");
  const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
  if (v === "mini-course" || v === "minicourse" || v === "mc" || v.startsWith("mini-course")) {
    if (numAmount === 7.6 || numAmount === 7.60 || currency === "EUR") {
      return "Міні-курс: «Плаский живіт та струнка талія» (7,6€)";
    }
    return "Міні-курс: «Плаский живіт та струнка талія» (279 грн)";
  }
  if (v === "2") return "Офер #2 (Дивишся в дзеркало і тобі не подобається відображення?)";
  if (v === "3") return "Офер #3 (Марафон закінчився, мотивація зникла, а старі звички повернулися?)";
  return "Офер #1 (Дієта закінчилась - нарешті можна наїстись?)";
}

export function getLandingLabel(pagePath?: string | null, pageUrl?: string | null): string {
  const p = (pagePath || "").toLowerCase();
  const u = (pageUrl || "").toLowerCase();

  if (p === "/mini-course" || u.includes("/mini-course?") || u.endsWith("/mini-course")) {
    return "Міні-курс (7.60 EUR / evergreen)";
  }
  if (p === "/mini-course/flat-belly" || u.includes("/mini-course/flat-belly")) {
    return "Міні-курс: «Плаский живіт» (279 грн)";
  }
  if (p === "/mini-course/waist" || u.includes("/mini-course/waist")) {
    return "Міні-курс: «Струнка талія» (279 грн)";
  }
  if (p === "/diagnostic" || u.includes("/diagnostic")) {
    return "Персональна діагностика (/diagnostic)";
  }
  if (p === "/consultation" || u.includes("/consultation")) {
    return "Консультація (/consultation)";
  }
  if (pagePath) return pagePath;
  return "Головний лендінг";
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
    const landingLabel = getLandingLabel(existingLead?.page_path, existingLead?.page_url);
    const isTest = paidAmount === 1 || orderReference.toLowerCase().includes("test") || !!existingLead?.raw_payload?.is_test;
    const amountText = isTest ? `${paidAmount} ${currency} (ТЕСТ)` : `${paidAmount} ${currency}`;
    const userNotes = existingLead?.raw_payload?.notes;

    let message = isTest ? `🧪 <b>[ТЕСТОВЕ ОПОВІЩЕННЯ]</b>\n<b>🟢 Оплата успішна!</b>\n\n` : `<b>🟢 Оплата успішна!</b>\n\n`;
    message += `👤 <b>Ім'я:</b> ${existingLead?.name || "-"}\n`;
    message += `📞 <b>Телефон:</b> <code>${existingLead?.phone || "-"}</code>\n`;

    if (existingLead?.telegram) {
      const tg = existingLead.telegram.startsWith("@") ? existingLead.telegram : `@${existingLead.telegram}`;
      message += `📱 <b>Telegram:</b> ${tg}\n`;
    }

    message += `🎯 <b>Офер:</b> ${offerLabel}\n`;
    message += `🌐 <b>Лендінг:</b> ${landingLabel}\n`;
    message += `💳 <b>Сума:</b> <code>${amountText}</code>\n`;
    message += `🆔 <b>Order ID:</b> <code>${orderReference}</code>\n`;

    if (userNotes && String(userNotes).trim()) {
      message += `💬 <b>Запит:</b> ${String(userNotes).trim()}\n`;
    }

    message += `✅ <b>Статус:</b> Успішно оплачено (WayForPay)\n`;

    const utmSource = existingLead?.utm_source || existingLead?.raw_payload?.utm_source;
    const utmMedium = existingLead?.utm_medium || existingLead?.raw_payload?.utm_medium;
    const utmCampaign = existingLead?.utm_campaign || existingLead?.raw_payload?.utm_campaign;
    const utmContent = existingLead?.utm_content || existingLead?.raw_payload?.utm_content;
    const utmTerm = existingLead?.utm_term || existingLead?.raw_payload?.utm_term;

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
        const body: Record<string, any> = {
          chat_id: TG_CHAT_ID,
          text: message.trim(),
          parse_mode: "HTML",
        };
        if (TG_LEADS_THREAD_ID && !isNaN(TG_LEADS_THREAD_ID)) {
          body.message_thread_id = TG_LEADS_THREAD_ID;
        }

        await fetch(sendUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      } catch (err) {
        console.error("[Payment Handler] Send message error:", err);
      }
    }
  }

  return updatedLead;
}
