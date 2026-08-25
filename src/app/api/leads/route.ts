import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { createOrUpdateSendPulseContact } from "@/lib/sendpulse";
import { generateWayForPayPurchaseData } from "@/lib/wayforpay";
import { getOfferLabel } from "@/lib/payment-handler";
import { normalizePhone, normalizeEmail, normalizeTelegram } from "@/lib/validation";
import { upsertUnifiedCustomer, createUnifiedOrder, ProductType } from "@/lib/unified-crm";

const TG_BOT_TOKEN = process.env.TELEGRAM_LEADS_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN || "";
const TG_CHAT_ID = process.env.TELEGRAM_CHAT_ID || "-1003943120978";
const TG_THREAD_ID = process.env.TELEGRAM_THREAD_ID || "904";

async function sendTelegramLeadNotification(payload: {
  name: string;
  phone: string;
  telegram?: string | null;
  notes?: string;
  offerVariant?: string;
  orderReference?: string;
  amount?: number;
  currency?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
}): Promise<number | null> {
  try {
    if (!TG_BOT_TOKEN || !TG_CHAT_ID) {
      console.warn("[Telegram Bot] Configurations missing; skipping lead notification.");
      return null;
    }

    const cur = payload.currency || "UAH";
    const offerLabel = getOfferLabel(payload.offerVariant, payload.amount, cur);
    const amountText = payload.amount === 1 ? `1 ${cur} (ТЕСТ)` : `${payload.amount || (cur === "EUR" ? 7.6 : 279)} ${cur}`;

    let message = `<b>🟡 Заявку зареєстровано (Очікує оплати)</b>\n\n`;
    message += `👤 <b>Ім'я:</b> ${payload.name || "-"}\n`;
    message += `📞 <b>Телефон:</b> <code>${payload.phone || "-"}</code>\n`;

    if (payload.telegram) {
      const tg = payload.telegram.startsWith("@") ? payload.telegram : `@${payload.telegram}`;
      message += `📱 <b>Telegram:</b> ${tg}\n`;
    }

    message += `🎯 <b>Офер:</b> ${offerLabel}\n`;
    message += `💳 <b>Сума:</b> <code>${amountText}</code>\n`;
    if (payload.orderReference) {
      message += `🆔 <b>Order ID:</b> <code>${payload.orderReference}</code>\n`;
    }

    if (payload.notes && payload.notes.trim()) {
      message += `💬 <b>Запит:</b> ${payload.notes.trim()}\n`;
    }

    const hasUtm = payload.utm_source || payload.utm_medium || payload.utm_campaign || payload.utm_content || payload.utm_term;
    if (hasUtm) {
      message += `\n🔍 <b>UTM-маркетинг:</b>\n`;
      if (payload.utm_source) message += `• <b>Source:</b> ${payload.utm_source}\n`;
      if (payload.utm_medium) message += `• <b>Medium:</b> ${payload.utm_medium}\n`;
      if (payload.utm_campaign) message += `• <b>Campaign:</b> ${payload.utm_campaign}\n`;
      if (payload.utm_content) message += `• <b>Content:</b> ${payload.utm_content}\n`;
      if (payload.utm_term) message += `• <b>Term:</b> ${payload.utm_term}\n`;
    }

    const url = `https://api.telegram.org/bot${TG_BOT_TOKEN}/sendMessage`;
    const body = {
      chat_id: TG_CHAT_ID,
      message_thread_id: TG_THREAD_ID ? parseInt(TG_THREAD_ID, 10) : undefined,
      text: message.trim(),
      parse_mode: "HTML",
    };

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const result = await res.json();
    if (result.ok && result.result?.message_id) {
      console.log("[Telegram Bot] Notification sent successfully. Message ID:", result.result.message_id);
      return result.result.message_id;
    } else {
      console.error("[Telegram Bot] Notification failed:", result.description);
      return null;
    }
  } catch (err) {
    console.error("[Telegram Bot] Error sending notification:", err);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log("[Leads Ingestion] Received lead payload:", body);

    const name = (body.name || "").trim() || "Учасник";
    const rawPhone = body.phone || "";
    const cleanedPhone = normalizePhone(rawPhone);
    const rawTelegram = body.telegram || "";
    const cleanedTelegram = normalizeTelegram(rawTelegram);
    const cleanedEmail = normalizeEmail(body.email);
    const notes = body.notes || "";
    const offerVariant = body.offer_variant || "1";

    // Marketing Attribution parameters
    const utmSource = body.utm_source || "";
    const utmMedium = body.utm_medium || "";
    const utmCampaign = body.utm_campaign || "";
    const utmContent = body.utm_content || "";
    const utmTerm = body.utm_term || "";
    const campaignId =
      body.campaign_id ||
      body.utm_id ||
      (utmCampaign && /^\d+$/.test(utmCampaign) ? utmCampaign : undefined);
    const adsetId = body.adset_id || undefined;
    const adId = body.ad_id || undefined;
    const fbclid = body.fbclid || undefined;
    const gclid = body.gclid || undefined;
    const fbp = body.fbp || undefined;
    const fbc = body.fbc || undefined;

    const pagePath = body.page_path || "/diagnostic";
    const pageUrl = body.page_url || "";
    const visitorUuid = body.visitor_uuid || crypto.randomUUID();

    // Check for test payment handle yuransis / @yuransis
    const isTestPayment =
      cleanedTelegram?.toLowerCase() === "yuransis" ||
      rawTelegram.toLowerCase().includes("yuransis");

    const isMiniCourse =
      pagePath.startsWith("/mini-course") ||
      offerVariant.startsWith("mini-course") ||
      offerVariant === "minicourse" ||
      offerVariant === "mc" ||
      body.amount === 7.6 ||
      body.amount === 7.60 ||
      body.amount === 279 ||
      body.amount === 399;

    const currency = body.currency || (body.amount === 7.6 || body.amount === 7.60 ? "EUR" : "UAH");
    const defaultAmount = isMiniCourse ? (currency === "EUR" ? 7.60 : 279.0) : 480.0;
    const amount = isTestPayment ? 1.0 : (body.amount ? Number(Number(body.amount).toFixed(2)) : defaultAmount);

    const productType: ProductType = isMiniCourse ? "tripwire" : "consultation";
    const productName = isTestPayment
      ? (isMiniCourse ? `Тестовий міні-курс (1 ${currency})` : `Тестова діагностика (1 ${currency})`)
      : (isMiniCourse ? "Міні-курс: «Плаский живіт та струнка талія» (Анастасія Сич)" : "Персональна діагностика (Анастасія Сич)");

    const orderReference = `AS_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;

    // 1. Dispatch initial Telegram alert to get message_id for editing on payment status update
    const tgMessageId = await sendTelegramLeadNotification({
      name,
      phone: cleanedPhone || rawPhone,
      telegram: cleanedTelegram || rawTelegram,
      notes,
      offerVariant,
      orderReference,
      amount,
      currency,
      utm_source: utmSource,
      utm_medium: utmMedium,
      utm_campaign: utmCampaign,
      utm_content: utmContent,
      utm_term: utmTerm,
    });

    // 2. Canonical B&W CRM v2.0 Enrichment Protocol: Upsert unified customer & create unified order
    let customerId: string | null = null;
    try {
      customerId = await upsertUnifiedCustomer({
        name,
        phone: cleanedPhone || rawPhone,
        email: cleanedEmail,
        telegram: cleanedTelegram,
      });

      if (customerId) {
        await createUnifiedOrder({
          order_id: orderReference,
          customer_id: customerId,
          amount,
          currency: "UAH",
          status: "pending",
          product_type: productType,
          product_name: productName,
          payment_system: "wayforpay",
          page_path: pagePath,
          page_url: pageUrl,
          utm_source: utmSource,
          utm_medium: utmMedium,
          utm_campaign: utmCampaign,
          utm_content: utmContent,
          utm_term: utmTerm,
          campaign_id: campaignId,
          adset_id: adsetId,
          ad_id: adId,
          fbclid,
          gclid,
          fbp,
          fbc,
          visitor_uuid: visitorUuid,
          created_at: new Date().toISOString(),
          extra_metadata: {
            offer_variant: offerVariant,
            notes,
            tg_message_id: tgMessageId,
            is_test_payment: isTestPayment,
          },
        });
      }
    } catch (crmErr) {
      console.error("[Unified CRM] Order creation error:", crmErr);
    }

    // 3. Save to local anastasia_sych_leads table for backward compatibility & local reporting
    const dbPayload = {
      name,
      phone: cleanedPhone || rawPhone,
      telegram: cleanedTelegram || rawTelegram,
      email: cleanedEmail,
      offer_variant: offerVariant,
      status: "Зареєстровано",
      amount,
      is_free: false,
      order_id: orderReference,
      target_sheet: "Anastasia Sych",
      sheet_id: "0",
      utm_source: utmSource,
      utm_medium: utmMedium,
      utm_campaign: utmCampaign,
      utm_content: utmContent,
      utm_term: utmTerm,
      page_path: pagePath,
      page_url: pageUrl,
      visitor_uuid: visitorUuid,
      raw_payload: {
        ...body,
        campaign_id: campaignId,
        adset_id: adsetId,
        ad_id: adId,
        fbclid,
        gclid,
        fbp,
        fbc,
        currency: "UAH",
        product_type: productType,
        product_name: productName,
        customer_id: customerId,
        tg_message_id: tgMessageId,
        is_test_payment: isTestPayment,
      },
    };

    const { error: dbErr } = await supabaseAdmin
      .from("anastasia_sych_leads")
      .insert(dbPayload);

    if (dbErr) {
      console.error("[Supabase] Database save error (anastasia_sych_leads):", dbErr);
    }

    // 4. Sync to SendPulse CRM REST API
    createOrUpdateSendPulseContact({
      name,
      phone: cleanedPhone || rawPhone,
      telegram: cleanedTelegram || rawTelegram,
      email: cleanedEmail || undefined,
      offerVariant,
      status: "Зареєстровано",
    }).catch((err) => console.error("[SendPulse] Background error:", err));

    // 5. Push to Central Analytics Gateway
    try {
      fetch("https://bnw-prod.vercel.app/api/v1/leads/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_slug: "anastasia_sych",
          api_key: "bw_analytics_anastasia_sych_key_2026",
          lead: {
            name,
            phone: cleanedPhone || rawPhone,
            telegram: cleanedTelegram || null,
            email: cleanedEmail || null,
            amount,
            currency: "UAH",
            product_type: productType,
            status: "Зареєстровано",
          },
          marketing: {
            utm_source: utmSource || null,
            utm_medium: utmMedium || null,
            utm_campaign: utmCampaign || null,
            utm_content: utmContent || null,
            utm_term: utmTerm || null,
            campaign_id: campaignId || null,
            adset_id: adsetId || null,
            ad_id: adId || null,
            fbclid: fbclid || null,
            gclid: gclid || null,
            fbp: fbp || null,
            fbc: fbc || null,
            visitor_uuid: visitorUuid,
            page_path: pagePath,
            page_url: pageUrl,
          },
          metadata: {
            currency,
            product_type: productType,
            product_name: productName,
            offer_variant: offerVariant,
            notes,
            order_id: orderReference,
            customer_id: customerId,
            is_test_payment: isTestPayment,
            tg_message_id: tgMessageId,
          },
        }),
      }).catch((err) => console.error("[Analytics Gateway] Background fetch failed:", err));
    } catch (err) {
      console.error("[Analytics Gateway] Exception:", err);
    }

    // 6. Generate WayForPay payment data
    const host = request.headers.get("host") || "anastasiia-sych.vercel.app";
    const protocol = request.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
    const baseUrl = `${protocol}://${host}`;

    const wayforpayData = generateWayForPayPurchaseData({
      orderReference,
      amount,
      currency,
      productName,
      clientName: name,
      clientPhone: cleanedPhone || rawPhone,
      domainName: host.split(":")[0],
      baseUrl,
    });

    return NextResponse.json({
      status: "success",
      message: "Lead processed successfully.",
      visitor_uuid: visitorUuid,
      orderReference,
      customerId,
      wayforpayData,
    });
  } catch (error: any) {
    console.error("[Leads Ingestion] Server exception:", error);
    return NextResponse.json(
      { status: "error", message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
