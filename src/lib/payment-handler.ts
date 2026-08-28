import { supabaseAdmin } from "@/lib/supabase";
import { updateUnifiedOrderStatus } from "@/lib/unified-crm";

const TG_BOT_TOKEN = process.env.TELEGRAM_LEADS_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN || "7889462444:AAGCjyk-5h6SKWk94txoMlyhV2qyZuwcWaQ";
const TG_CHAT_ID = process.env.TELEGRAM_CHAT_ID || "-1003943120978";
const TG_THREAD_ID = process.env.TELEGRAM_THREAD_ID || "904";

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

  // 4. Dispatch Telegram alert ONLY if payment is approved (temporarily paused while reconfiguring channel)
  if (isApproved) {
    console.log(`[Payment Handler] Telegram alert skipped for ${orderReference} (paused per configuration).`);
  }

  return updatedLead;
}
