import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import {
  verifyWayForPayCallbackSignature,
  generateWayForPayCallbackResponse,
} from "@/lib/wayforpay";
import { updateUnifiedOrderStatus } from "@/lib/unified-crm";
import { getOfferLabel, getLandingLabel } from "@/lib/payment-handler";
import { TG_BOT_TOKEN, TG_CHAT_ID, TG_LEADS_THREAD_ID } from "@/lib/telegram";

async function updateOrSendTelegramPaymentStatus(payload: {
  name?: string;
  phone?: string;
  telegram?: string;
  offerVariant?: string;
  orderReference: string;
  amount: number;
  currency?: string;
  isPaid: boolean;
  reason?: string;
  tgMessageId?: number;
  pagePath?: string | null;
  pageUrl?: string | null;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
}) {
  try {
    // Only send Telegram notifications for successful payments
    if (!payload.isPaid) {
      return;
    }

    if (!TG_BOT_TOKEN || !TG_CHAT_ID) return;

    const cur = payload.currency || (payload.amount === 7.6 || payload.amount === 7.60 ? "EUR" : "UAH");
    const offerTitle = getOfferLabel(payload.offerVariant, payload.amount, cur);
    const landingLabel = getLandingLabel(payload.pagePath, payload.pageUrl);
    const isTest = payload.amount === 1 || payload.orderReference.toLowerCase().includes("test") || !!payload.reason?.includes("TEST");
    const amountText = isTest ? `${payload.amount} ${cur} (ТЕСТ)` : `${payload.amount} ${cur}`;

    let message = isTest ? `🧪 <b>[ТЕСТОВЕ ОПОВІЩЕННЯ]</b>\n<b>🟢 Оплата успішна!</b>\n\n` : `<b>🟢 Оплата успішна!</b>\n\n`;
    message += `👤 <b>Ім'я:</b> ${payload.name || "-"}\n`;
    message += `📞 <b>Телефон:</b> <code>${payload.phone || "-"}</code>\n`;

    if (payload.telegram) {
      const tg = payload.telegram.startsWith("@") ? payload.telegram : `@${payload.telegram}`;
      message += `📱 <b>Telegram:</b> ${tg}\n`;
    }

    message += `🎯 <b>Офер:</b> ${offerTitle}\n`;
    message += `🌐 <b>Лендінг:</b> ${landingLabel}\n`;
    message += `💳 <b>Сума:</b> <code>${amountText}</code>\n`;
    message += `🆔 <b>Order ID:</b> <code>${payload.orderReference}</code>\n`;
    message += `✅ <b>Статус:</b> Успішно оплачено (WayForPay)\n`;

    const hasUtm = payload.utm_source || payload.utm_medium || payload.utm_campaign || payload.utm_content || payload.utm_term;
    if (hasUtm) {
      message += `\n🔍 <b>UTM-маркетинг:</b>\n`;
      if (payload.utm_source) message += `• <b>Source:</b> ${payload.utm_source}\n`;
      if (payload.utm_medium) message += `• <b>Medium:</b> ${payload.utm_medium}\n`;
      if (payload.utm_campaign) message += `• <b>Campaign:</b> ${payload.utm_campaign}\n`;
      if (payload.utm_content) message += `• <b>Content:</b> ${payload.utm_content}\n`;
      if (payload.utm_term) message += `• <b>Term:</b> ${payload.utm_term}\n`;
    }

    if (payload.tgMessageId) {
      // Edit existing Telegram message in-place if available
      const editUrl = `https://api.telegram.org/bot${TG_BOT_TOKEN}/editMessageText`;
      const editRes = await fetch(editUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: TG_CHAT_ID,
          message_id: payload.tgMessageId,
          text: message.trim(),
          parse_mode: "HTML",
        }),
      });
      const editResult = await editRes.json();
      if (editResult.ok) {
        console.log(`[Telegram Bot] Successfully edited message #${payload.tgMessageId}`);
        return;
      }
    }

    // Send clean success message
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
    console.error("[Telegram Bot] Payment status update error:", err);
  }
}

export async function POST(request: NextRequest) {
  try {
    let payload: Record<string, any> = {};
    const rawText = await request.text();

    try {
      payload = JSON.parse(rawText);
    } catch {
      try {
        const params = new URLSearchParams(rawText);
        const parsed: Record<string, any> = {};
        params.forEach((val, key) => {
          parsed[key] = val;
        });
        payload = parsed;
      } catch {
        payload = {};
      }
    }

    // Handle edge case where the entire JSON string is received as a single key (e.g. from urlencoded form post)
    const keys = Object.keys(payload);
    if (keys.length === 1 && (keys[0].startsWith("{") || keys[0].includes("merchantAccount"))) {
      try {
        const nested = JSON.parse(keys[0]);
        if (nested && typeof nested === "object") {
          payload = nested;
        }
      } catch {}
    } else if (!payload.orderReference && rawText.includes("merchantAccount")) {
      try {
        const match = rawText.match(/\{[\s\S]*\}/);
        if (match) {
          const extracted = JSON.parse(match[0]);
          if (extracted?.orderReference) {
            payload = extracted;
          }
        }
      } catch {}
    }

    console.log("[WayForPay Callback] Received payload:", payload);

    const isValidSig = verifyWayForPayCallbackSignature(payload);
    if (!isValidSig) {
      console.warn("[WayForPay Callback] Signature verification mismatch.");
    }

    const { orderReference, transactionStatus, amount, currency: callbackCurrency, reason, reasonCode } = payload;
    const isApproved = transactionStatus === "Approved";

    if (orderReference) {
      const legacyStatus = isApproved ? "Оплачено" : "Не оплачено";
      const canonicalStatus = isApproved ? "closed_won" : "declined";
      const paidAmount = amount != null ? Number(Number(amount).toFixed(2)) : 7.6;
      const currency = callbackCurrency || (paidAmount === 7.6 || paidAmount === 7.60 ? "EUR" : "UAH");

      // 1. Fetch existing lead to get tg_message_id and lead details
      const { data: existingLead } = await supabaseAdmin
        .from("anastasia_sych_leads")
        .select("*")
        .eq("order_id", orderReference)
        .maybeSingle();

      const tgMessageId = existingLead?.raw_payload?.tg_message_id;
      const offerVariant = existingLead?.offer_variant || (paidAmount === 7.6 || paidAmount === 279 ? "mini-course" : "1");

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
        console.error("[WayForPay Callback] Unified CRM update error:", crmErr);
      }

      // 3. Update lead status in Supabase anastasia_sych_leads table
      const { data: updatedLead, error: dbErr } = await supabaseAdmin
        .from("anastasia_sych_leads")
        .update({
          status: legacyStatus,
          amount: paidAmount,
          raw_payload: {
            ...(existingLead?.raw_payload || {}),
            canonical_status: canonicalStatus,
            currency,
            wayforpay_callback: payload,
          },
        })
        .eq("order_id", orderReference)
        .select()
        .single();

      if (dbErr) {
        console.error("[WayForPay Callback] DB update error:", dbErr);
      } else {
        console.log(`[WayForPay Callback] Lead updated to ${legacyStatus} (${canonicalStatus}):`, updatedLead);
      }

      // 4. Dispatch Telegram payment alert ONLY if payment is approved (successful)
      if (isApproved) {
        const clientName = payload.clientName || existingLead?.name || updatedLead?.name;
        const clientPhone = payload.phone || existingLead?.phone || updatedLead?.phone;
        const clientTg = existingLead?.telegram || updatedLead?.telegram;

        await updateOrSendTelegramPaymentStatus({
          name: clientName,
          phone: clientPhone,
          telegram: clientTg,
          offerVariant,
          orderReference,
          amount: paidAmount,
          currency,
          isPaid: true,
          tgMessageId,
          pagePath: existingLead?.page_path,
          pageUrl: existingLead?.page_url,
          utm_source: existingLead?.utm_source,
          utm_medium: existingLead?.utm_medium,
          utm_campaign: existingLead?.utm_campaign,
          utm_content: existingLead?.utm_content,
          utm_term: existingLead?.utm_term,
        });
      }

      // 5. Central Analytics Gateway payment sync
      try {
        fetch("https://bnw-prod.vercel.app/api/v1/leads/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            project_slug: "anastasia_sych",
            api_key: "bw_analytics_anastasia_sych_key_2026",
            lead: {
              name: existingLead?.name || payload.clientName || "",
              phone: existingLead?.phone || payload.phone || "",
              telegram: existingLead?.telegram || null,
              amount: paidAmount,
              currency,
              status: legacyStatus,
            },
            metadata: {
              order_id: orderReference,
              canonical_status: canonicalStatus,
              currency,
              payment_gateway: "WayForPay",
              transaction_status: transactionStatus,
              reason,
            },
          }),
        }).catch((err) => console.error("[Analytics Gateway] Payment push failed:", err));
      } catch (err) {
        console.error("[Analytics Gateway] Exception:", err);
      }
    }

    const responsePayload = generateWayForPayCallbackResponse(orderReference || "");
    return NextResponse.json(responsePayload);
  } catch (err: any) {
    console.error("[WayForPay Callback] Server exception:", err);
    return NextResponse.json(
      { status: "error", message: err.message || "Internal error" },
      { status: 500 }
    );
  }
}
