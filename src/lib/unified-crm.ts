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
      order_id: orderData.order_id,
      amount,
      status: orderData.status,
      page_path: orderData.page_path || null,
      page_url: orderData.page_url || null,
      utm_source: orderData.utm_source || null,
      utm_medium: orderData.utm_medium || null,
      utm_campaign: orderData.utm_campaign || null,
      utm_content: orderData.utm_content || null,
      utm_term: orderData.utm_term || null,
      campaign_id: orderData.campaign_id || null,
      adset_id: orderData.adset_id || null,
      ad_id: orderData.ad_id || null,
      fbclid: orderData.fbclid || null,
      gclid: orderData.gclid || null,
      fbp: orderData.fbp || null,
      fbc: orderData.fbc || null,
      ip_address: orderData.ip_address || null,
      user_agent: orderData.user_agent || null,
      visitor_uuid: visitorUuid,
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
    const { data: existingOrder, error: selectErr } = await supabaseAdmin
      .from("unified_orders")
      .select("*")
      .eq("project_id", ANASTASIA_PROJECT_ID)
      .eq("order_id", params.orderId)
      .maybeSingle();

    if (selectErr || !existingOrder) {
      console.warn("[Unified CRM] Order not found for status update:", params.orderId, selectErr?.message);
      return null;
    }

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

    const { data: updated, error: updateErr } = await supabaseAdmin
      .from("unified_orders")
      .update(updateFields)
      .eq("id", existingOrder.id)
      .select()
      .single();

    if (updateErr) {
      console.error("[Unified CRM] Failed to update order status:", updateErr);
      return null;
    }

    console.log(`[Unified CRM] Order ${params.orderId} status updated to ${params.status}`);
    return updated;
  } catch (err) {
    console.error("[Unified CRM] updateUnifiedOrderStatus exception:", err);
    return null;
  }
}
