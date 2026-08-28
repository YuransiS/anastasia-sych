import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import {
  verifyWayForPayCallbackSignature,
  generateWayForPayCallbackResponse,
} from "@/lib/wayforpay";
import { updateUnifiedOrderStatus } from "@/lib/unified-crm";
import { getOfferLabel } from "@/lib/payment-handler";

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
  currency?: string;
  isPaid: boolean;
  reason?: string;
  tgMessageId?: number;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
}) {
  // Telegram notifications temporarily paused while channel destination is being reconfigured
  console.log("[Telegram Bot] Payment notification skipped (paused per configuration).");
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
