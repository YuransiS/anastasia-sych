import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import {
  verifyWayForPayCallbackSignature,
  generateWayForPayCallbackResponse,
} from "@/lib/wayforpay";
import { updateUnifiedOrderStatus } from "@/lib/unified-crm";

const TG_BOT_TOKEN = process.env.TELEGRAM_LEADS_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN || "";
const TG_CHAT_ID = process.env.TELEGRAM_CHAT_ID || "-1003943120978";
const TG_THREAD_ID = process.env.TELEGRAM_THREAD_ID || "904";

async function updateOrSendTelegramPaymentStatus(payload: {
  name?: string;
  phone?: string;
  telegram?: string;
  offerVariant?: string;
  orderReference: string;
  amount: number;
  isPaid: boolean;
  reason?: string;
  tgMessageId?: number;
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

    const offerTitle = payload.offerVariant ? `Офер #${payload.offerVariant}` : "Офер #1";
    const amountText = payload.amount === 1 ? "1 UAH (ТЕСТ)" : `${payload.amount} UAH`;

    let message = `<b>🟢 Оплата успішна!</b>\n\n`;
    message += `👤 <b>Ім'я:</b> ${payload.name || "-"}\n`;
    message += `📞 <b>Телефон:</b> <code>${payload.phone || "-"}</code>\n`;

    if (payload.telegram) {
      const tg = payload.telegram.startsWith("@") ? payload.telegram : `@${payload.telegram}`;
      message += `📱 <b>Telegram:</b> ${tg}\n`;
    }

    message += `🎯 <b>Офер:</b> ${offerTitle}\n`;
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
    console.error("[Telegram Bot] Payment status update error:", err);
  }
}

export async function POST(request: NextRequest) {
  try {
    let payload: Record<string, any> = {};

    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      payload = await request.json();
    } else if (contentType.includes("application/x-www-form-urlencoded")) {
      const formData = await request.formData();
      formData.forEach((value, key) => {
        payload[key] = value;
      });
    } else {
      const rawText = await request.text();
      try {
        payload = JSON.parse(rawText);
      } catch {
        const params = new URLSearchParams(rawText);
        params.forEach((value, key) => {
          payload[key] = value;
        });
      }
    }

    console.log("[WayForPay Callback] Received payload:", payload);

    const isValidSig = verifyWayForPayCallbackSignature(payload);
    if (!isValidSig) {
      console.warn("[WayForPay Callback] Signature verification mismatch.");
    }

    const { orderReference, transactionStatus, amount, reason, reasonCode } = payload;
    const isApproved = transactionStatus === "Approved";

    if (orderReference) {
      const legacyStatus = isApproved ? "Оплачено" : "Не оплачено";
      const canonicalStatus = isApproved ? "closed_won" : "declined";
      const paidAmount = amount ? Number(Number(amount).toFixed(2)) : 480.0;

      // 1. Fetch existing lead to get tg_message_id and lead details
      const { data: existingLead } = await supabaseAdmin
        .from("anastasia_sych_leads")
        .select("*")
        .eq("order_id", orderReference)
        .maybeSingle();

      const tgMessageId = existingLead?.raw_payload?.tg_message_id;
      const offerVariant = existingLead?.offer_variant || "1";

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
        await updateOrSendTelegramPaymentStatus({
          name: existingLead?.name || updatedLead?.name,
          phone: existingLead?.phone || updatedLead?.phone,
          telegram: existingLead?.telegram || updatedLead?.telegram,
          offerVariant,
          orderReference,
          amount: paidAmount,
          isPaid: true,
          tgMessageId,
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
              name: existingLead?.name || "",
              phone: existingLead?.phone || "",
              telegram: existingLead?.telegram || null,
              amount: paidAmount,
              currency: "UAH",
              status: legacyStatus,
            },
            metadata: {
              order_id: orderReference,
              canonical_status: canonicalStatus,
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
