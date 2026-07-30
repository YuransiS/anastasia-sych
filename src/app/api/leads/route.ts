import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { createOrUpdateSendPulseContact } from "@/lib/sendpulse";

function cleanPhone(phone: string): string {
  let cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 10 && cleaned.startsWith("0")) {
    cleaned = "38" + cleaned;
  }
  if (cleaned.length === 11 && cleaned.startsWith("80")) {
    cleaned = "38" + cleaned.substring(1);
  }
  return cleaned;
}

const TG_BOT_TOKEN = process.env.TELEGRAM_LEADS_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN || "";
const TG_CHAT_ID = process.env.TELEGRAM_CHAT_ID || "";
const TG_THREAD_ID = process.env.TELEGRAM_THREAD_ID || "";

async function sendTelegramLeadNotification(payload: {
  name: string;
  phone: string;
  telegram?: string;
  notes?: string;
  offerVariant?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
}) {
  try {
    if (!TG_BOT_TOKEN || !TG_CHAT_ID) {
      console.warn("[Telegram Bot] Configurations missing; skipping lead notification.");
      return;
    }

    const offerTitle = payload.offerVariant ? `Офер #${payload.offerVariant}` : "Стандартний офер";
    let message = `<b>🟢 Нова заявка: Діагностика (Анастасія Сич)</b>\n\n`;
    message += `👤 <b>Ім'я:</b> ${payload.name || "-"}\n`;
    message += `📞 <b>Телефон:</b> <code>${payload.phone || "-"}</code>\n`;

    if (payload.telegram) {
      const tg = payload.telegram.startsWith("@") ? payload.telegram : `@${payload.telegram}`;
      message += `📱 <b>Telegram / Соцмережі:</b> ${tg}\n`;
    }

    message += `🎯 <b>Офер варіант:</b> ${offerTitle}\n`;
    message += `💳 <b>Вартість:</b> <code>480 UAH</code>\n`;

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
    if (!result.ok) {
      console.error("[Telegram Bot] Notification failed:", result.description);
    } else {
      console.log("[Telegram Bot] Notification sent successfully. Message ID:", result.result?.message_id);
    }
  } catch (err) {
    console.error("[Telegram Bot] Error sending notification:", err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log("[Leads Ingestion] Received lead payload:", body);

    const name = body.name || "";
    const rawPhone = body.phone || "";
    const cleanedPhone = rawPhone ? cleanPhone(rawPhone) : "";
    const telegram = body.telegram || "";
    const notes = body.notes || "";
    const offerVariant = body.offer_variant || "1";
    const utmSource = body.utm_source || "";
    const utmMedium = body.utm_medium || "";
    const utmCampaign = body.utm_campaign || "";
    const utmContent = body.utm_content || "";
    const utmTerm = body.utm_term || "";
    const pagePath = body.page_path || "/diagnostic";
    const pageUrl = body.page_url || "";
    const visitorUuid = body.visitor_uuid || crypto.randomUUID();

    const dbPayload = {
      name,
      phone: cleanedPhone || rawPhone,
      telegram,
      offer_variant: offerVariant,
      status: "Зареєстровано",
      amount: 480,
      is_free: false,
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
      raw_payload: body,
    };

    // 1. Save strictly to Supabase with RLS compliance via admin client
    const { error: dbErr } = await supabaseAdmin
      .from("anastasia_sych_leads")
      .insert(dbPayload);

    if (dbErr) {
      console.error("[Supabase] Database save error:", dbErr);
      return NextResponse.json({ status: "error", message: dbErr.message }, { status: 500 });
    }

    // 2. Dispatch real-time Telegram alert
    await sendTelegramLeadNotification({
      name,
      phone: cleanedPhone || rawPhone,
      telegram,
      notes,
      offerVariant,
      utm_source: utmSource,
      utm_medium: utmMedium,
      utm_campaign: utmCampaign,
      utm_content: utmContent,
      utm_term: utmTerm,
    });

    // 3. Sync to SendPulse CRM REST API
    createOrUpdateSendPulseContact({
      name,
      phone: cleanedPhone || rawPhone,
      telegram,
      offerVariant,
      status: "Зареєстровано",
    }).catch((err) => console.error("[SendPulse] Background error:", err));

    // 4. Push to Central Analytics Gateway
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
            telegram: telegram || null,
            amount: 480,
            status: "Зареєстровано",
          },
          marketing: {
            utm_source: utmSource || null,
            utm_medium: utmMedium || null,
            utm_campaign: utmCampaign || null,
            utm_content: utmContent || null,
            utm_term: utmTerm || null,
            visitor_uuid: visitorUuid,
            page_path: pagePath,
            page_url: pageUrl,
          },
          metadata: {
            offer_variant: offerVariant,
            notes,
          },
        }),
      }).catch((err) => console.error("[Analytics Gateway] Background fetch failed:", err));
    } catch (err) {
      console.error("[Analytics Gateway] Exception:", err);
    }

    return NextResponse.json({
      status: "success",
      message: "Lead processed successfully.",
      visitor_uuid: visitorUuid,
    });
  } catch (error: any) {
    console.error("[Leads Ingestion] Server exception:", error);
    return NextResponse.json(
      { status: "error", message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
