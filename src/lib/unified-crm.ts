import { supabaseAdmin } from "@/lib/supabase";
import { normalizePhone, normalizeEmail, normalizeTelegram } from "@/lib/validation";

export const ANASTASIA_PROJECT_ID = "39ace0eb-084a-455e-b058-c6f20cda7f74";
export const ANASTASIA_PROJECT_SLUG = "anastasia_sych";

export type ProductType = "course" | "tripwire" | "subscription" | "consultation" | "lead";
export type CanonicalCurrency = "UAH" | "USD" | "EUR";
export type CanonicalOrderStatus =
  | "new"
  | "pending"
  | "closed_won"
  | "paid"
  | "approved"
  | "оплачено"
  | "внесена предоплата"
  | "передплата"
  | "declined"
  | "failed"
  | "Клик"
  | "КликФормы";

export interface UnifiedCustomerInput {
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  telegram?: string | null;
}

export interface UnifiedOrderInput {
  project_id?: string | null;
  order_id: string;
  customer_id?: string | null;
  amount: number;
  currency?: CanonicalCurrency;
  status: CanonicalOrderStatus;
  product_type: ProductType;
  product_name: string;
  payment_system?: string | null;
  page_path?: string | null;
  page_url?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_content?: string | null;
  utm_term?: string | null;
  campaign_id?: string | null;
  adset_id?: string | null;
  ad_id?: string | null;
  fbclid?: string | null;
  gclid?: string | null;
  fbp?: string | null;
  fbc?: string | null;
  visitor_uuid?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
  created_at?: string | null;
  extra_metadata?: Record<string, any>;
}

/**
 * Finds an existing customer in unified_customers for Anastasia Sych project
 * or creates a new customer profile.
 */
export async function upsertUnifiedCustomer(input: UnifiedCustomerInput): Promise<string | null> {
  try {
    const rawName = (input.name || "").trim() || "Учасник";
    const cleanPhone = input.phone ? normalizePhone(input.phone) : null;
    const cleanEmail = input.email ? normalizeEmail(input.email) : null;
    const cleanTelegram = input.telegram ? normalizeTelegram(input.telegram) : null;

    // Search for existing customer strictly within this project
    let existingCustomerId: string | null = null;

    if (cleanPhone || cleanEmail || cleanTelegram) {
      let query = supabaseAdmin
        .from("unified_customers")
        .select("id, name, phone, email, telegram")
        .eq("project_id", ANASTASIA_PROJECT_ID);

      const orConditions: string[] = [];
      if (cleanPhone) orConditions.push(`phone.eq.${cleanPhone}`);
      if (cleanEmail) orConditions.push(`email.ilike.${cleanEmail}`);
      if (cleanTelegram) orConditions.push(`telegram.ilike.${cleanTelegram}`);

      if (orConditions.length > 0) {
        query = query.or(orConditions.join(","));
        const { data: matched, error: searchErr } = await query.limit(1).maybeSingle();

        if (searchErr) {
          console.warn("[Unified CRM] Customer lookup warning:", searchErr.message);
        } else if (matched) {
          existingCustomerId = matched.id;
        }
      }
    }

    if (existingCustomerId) {
      // Update customer profile with fresh details
      const updatePayload: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };
      if (rawName && rawName !== "Учасник") updatePayload.name = rawName;
      if (cleanPhone) updatePayload.phone = cleanPhone;
      if (cleanEmail) updatePayload.email = cleanEmail;
      if (cleanTelegram) updatePayload.telegram = cleanTelegram;

      const { error: updateErr } = await supabaseAdmin
        .from("unified_customers")
        .update(updatePayload)
        .eq("id", existingCustomerId);

      if (updateErr) {
        console.warn("[Unified CRM] Customer update error:", updateErr.message);
      }
      return existingCustomerId;
    }

    // Create new customer profile
    const insertPayload = {
      project_id: ANASTASIA_PROJECT_ID,
      name: rawName,
      phone: cleanPhone,
      email: cleanEmail,
      telegram: cleanTelegram,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: newCustomer, error: insertErr } = await supabaseAdmin
      .from("unified_customers")
      .insert(insertPayload)
      .select("id")
      .single();

    if (insertErr || !newCustomer) {
      console.error("[Unified CRM] Failed to insert customer:", insertErr);
      return null;
    }

    return newCustomer.id;
  } catch (err) {
    console.error("[Unified CRM] Customer upsert exception:", err);
    return null;
  }
}

function safeTruncate(str: string | null | undefined, maxLen = 100): string | null {
  if (!str) return null;
  const s = String(str).trim();
  return s.length > maxLen ? s.slice(0, maxLen) : s;
}

/**
 * Creates or updates an order in unified_orders according to B&W CRM v2.0 enrichment protocol.
 */
export async function createUnifiedOrder(orderData: UnifiedOrderInput) {
  try {
    const currency: CanonicalCurrency = (orderData.currency || "UAH").toUpperCase() as CanonicalCurrency;
    const amount = Number(Number(orderData.amount || 0).toFixed(2));
    const visitorUuid = orderData.visitor_uuid || null;

    const metadata = {
      currency,
      product_type: orderData.product_type,
      product_name: orderData.product_name,
      payment_system: orderData.payment_system || "wayforpay",
      ...(orderData.extra_metadata || {}),
    };

    const dbPayload = {
      project_id: ANASTASIA_PROJECT_ID,
      customer_id: orderData.customer_id,
      order_id: safeTruncate(orderData.order_id, 100),
      amount,
      status: safeTruncate(orderData.status, 50) as CanonicalOrderStatus,
      page_path: safeTruncate(orderData.page_path, 255),
      page_url: safeTruncate(orderData.page_url, 500),
      utm_source: safeTruncate(orderData.utm_source, 100),
      utm_medium: safeTruncate(orderData.utm_medium, 100),
      utm_campaign: safeTruncate(orderData.utm_campaign, 100),
      utm_content: safeTruncate(orderData.utm_content, 100),
      utm_term: safeTruncate(orderData.utm_term, 100),
      campaign_id: safeTruncate(orderData.campaign_id, 100),
      adset_id: safeTruncate(orderData.adset_id, 100),
      ad_id: safeTruncate(orderData.ad_id, 100),
      fbclid: safeTruncate(orderData.fbclid, 100),
      gclid: safeTruncate(orderData.gclid, 100),
      fbp: safeTruncate(orderData.fbp, 100),
      fbc: safeTruncate(orderData.fbc, 100),
      ip_address: safeTruncate(orderData.ip_address, 100),
      user_agent: safeTruncate(orderData.user_agent, 500),
      visitor_uuid: safeTruncate(visitorUuid, 100),
      created_at: orderData.created_at || new Date().toISOString(),
      metadata,
    };

    // Check if order already exists
    const { data: existingOrder } = await supabaseAdmin
      .from("unified_orders")
      .select("id, metadata")
      .eq("project_id", ANASTASIA_PROJECT_ID)
      .eq("order_id", orderData.order_id)
      .maybeSingle();

    if (existingOrder) {
      const mergedMetadata = {
        ...(existingOrder.metadata || {}),
        ...metadata,
      };

      const { data: updated, error: updateErr } = await supabaseAdmin
        .from("unified_orders")
        .update({
          ...dbPayload,
          metadata: mergedMetadata,
        })
        .eq("id", existingOrder.id)
        .select()
        .single();

      if (updateErr) {
        console.error("[Unified CRM] Error updating unified_order:", updateErr);
        return null;
      }
      return updated;
    }

    const { data: inserted, error: insertErr } = await supabaseAdmin
      .from("unified_orders")
      .insert(dbPayload)
      .select()
      .single();

    if (insertErr) {
      console.error("[Unified CRM] Error inserting unified_order:", insertErr);
      return null;
    }

    console.log(`[Unified CRM] Order ${orderData.order_id} recorded in unified_orders with status: ${orderData.status}`);
    return inserted;
  } catch (err) {
    console.error("[Unified CRM] createUnifiedOrder exception:", err);
    return null;
  }
}

/**
 * Updates an order status (e.g., closed_won, declined) in unified_orders.
 */
export async function updateUnifiedOrderStatus(params: {
  orderId: string;
  status: CanonicalOrderStatus;
  amount?: number;
  paymentPayload?: Record<string, any>;
  reason?: string;
}) {
  try {
    const { data: existingOrders, error: selectErr } = await supabaseAdmin
      .from("unified_orders")
      .select("*")
      .eq("project_id", ANASTASIA_PROJECT_ID)
      .eq("order_id", params.orderId)
      .order("created_at", { ascending: false });

    if (selectErr || !existingOrders || existingOrders.length === 0) {
      console.warn("[Unified CRM] Order not found for status update:", params.orderId, selectErr?.message);
      return null;
    }

    const existingOrder = existingOrders[0];

    const updatedMetadata = {
      ...(existingOrder.metadata || {}),
      currency: (existingOrder.metadata?.currency || "UAH").toUpperCase(),
      payment_system: "wayforpay",
      last_status_update: new Date().toISOString(),
      ...(params.reason ? { failure_reason: params.reason } : {}),
      ...(params.paymentPayload ? { payment_payload: params.paymentPayload } : {}),
    };

    const updateFields: Record<string, any> = {
      status: params.status,
      metadata: updatedMetadata,
    };

    if (params.amount !== undefined && params.amount !== null) {
      updateFields.amount = Number(Number(params.amount).toFixed(2));
    }

    const { error: updateErr } = await supabaseAdmin
      .from("unified_orders")
      .update(updateFields)
      .eq("project_id", ANASTASIA_PROJECT_ID)
      .eq("order_id", params.orderId);

    if (updateErr) {
      console.error("[Unified CRM] Failed to update order status:", updateErr);
      return null;
    }

    console.log(`[Unified CRM] Order ${params.orderId} status updated to ${params.status}`);
    return existingOrder;
  } catch (err) {
    console.error("[Unified CRM] updateUnifiedOrderStatus exception:", err);
    return null;
  }
}
