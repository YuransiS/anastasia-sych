import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

const TG_BOT_TOKEN = process.env.TELEGRAM_LEADS_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN || "";
const TG_CHAT_ID = process.env.TELEGRAM_CHAT_ID || "";
const REPORT_THREAD_ID = process.env.TELEGRAM_REPORT_THREAD_ID
  ? parseInt(process.env.TELEGRAM_REPORT_THREAD_ID, 10)
  : undefined;

function getTimeRangeForOffsetDays(startOffset: number, endOffset: number) {
  const now = new Date();
  const localNow = new Date(now.getTime() + 3 * 60 * 60 * 1000); // Kyiv UTC+3

  const startDay = new Date(localNow.getTime() + startOffset * 24 * 60 * 60 * 1000);
  const startYear = startDay.getUTCFullYear();
  const startMonth = String(startDay.getUTCMonth() + 1).padStart(2, "0");
  const startDayOfMonth = String(startDay.getUTCDate()).padStart(2, "0");

  const endDay = new Date(localNow.getTime() + endOffset * 24 * 60 * 60 * 1000);
  const endYear = endDay.getUTCFullYear();
  const endMonth = String(endDay.getUTCMonth() + 1).padStart(2, "0");
  const endDayOfMonth = String(endDay.getUTCDate()).padStart(2, "0");

  const startStr = `${startYear}-${startMonth}-${startDayOfMonth}T00:00:00+03:00`;
  const endStr = `${endYear}-${endMonth}-${endDayOfMonth}T23:59:59.999+03:00`;

  return {
    start: new Date(startStr).toISOString(),
    end: new Date(endStr).toISOString(),
    label:
      startOffset === endOffset
        ? `${startDayOfMonth}.${startMonth}.${startYear}`
        : `${startDayOfMonth}.${startMonth}.${startYear} - ${endDayOfMonth}.${endMonth}.${endYear}`,
  };
}

async function sendTelegramMessage(text: string): Promise<boolean> {
  if (!TG_BOT_TOKEN || !TG_CHAT_ID) {
    console.warn("[Report Bot] Telegram configuration is missing.");
    return false;
  }
  const url = `https://api.telegram.org/bot${TG_BOT_TOKEN}/sendMessage`;
  const body = {
    chat_id: TG_CHAT_ID,
    message_thread_id: REPORT_THREAD_ID,
    text: text,
    parse_mode: "HTML",
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const result = await res.json();
    return !!result.ok;
  } catch (err) {
    console.error("[Report Bot] Failed to post message to Telegram:", err);
    return false;
  }
}

async function generateReportText(
  start: string,
  end: string,
  label: string,
  isWeekly: boolean
): Promise<string> {
  const { data: leads, error } = await supabaseAdmin
    .from("anastasia_sych_leads")
    .select("*")
    .gte("created_at", start)
    .lte("created_at", end);

  if (error) {
    throw new Error(`Failed to fetch leads for report: ${error.message}`);
  }

  const rows = leads || [];
  const totalLeads = rows.length;
  const totalRevenue = totalLeads * 480;

  // Offer breakdown counts
  const offerCounts: Record<string, number> = { "1": 0, "2": 0, "3": 0 };
  const utmCounts: Record<string, number> = {};

  rows.forEach((row) => {
    const offerKey = String(row.offer_variant || "1");
    offerCounts[offerKey] = (offerCounts[offerKey] || 0) + 1;

    const src = row.utm_source || "direct";
    const camp = row.utm_campaign || "none";
    const key = `${src} / ${camp}`;
    utmCounts[key] = (utmCounts[key] || 0) + 1;
  });

  const titleEmoji = isWeekly ? "📈" : "📊";
  const reportType = isWeekly ? "Тижневий" : "Щоденний";

  let reportText = `${titleEmoji} <b>${reportType} звіт: Анастасія Сич [Діагностика]</b>\n`;
  reportText += `📅 <b>Період:</b> ${label}\n\n`;

  if (totalLeads === 0) {
    reportText += `Немає нових заявок за вказаний період.`;
    return reportText;
  }

  reportText += `📋 <b>Загальна статистика:</b>\n`;
  reportText += `• <b>Всього заявок:</b> <code>${totalLeads} шт.</code>\n`;
  reportText += `• <b>Потенційна виручка:</b> <code>${totalRevenue} UAH</code>\n\n`;

  reportText += `🎯 <b>Розподіл за варіантами оферів:</b>\n`;
  reportText += `• <b>Офер #1 (Після дієти):</b> <code>${offerCounts["1"] || 0} шт.</code>\n`;
  reportText += `• <b>Офер #2 (Сриви та солодке):</b> <code>${offerCounts["2"] || 0} шт.</code>\n`;
  reportText += `• <b>Офер #3 (Впевненість у тілі):</b> <code>${offerCounts["3"] || 0} шт.</code>\n\n`;

  const topUtm = Object.entries(utmCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([key, count]) => `• <code>${key}</code>: ${count} шт.`)
    .join("\n") || "• Немає даних";

  reportText += `🔍 <b>Top UTM Джерела:</b>\n${topUtm}`;

  return reportText.trim();
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization") || request.headers.get("authorization");
    const customHeader = request.headers.get("x-cron-secret");
    const cronSecret = process.env.CRON_SECRET || "";
    const querySecret = request.nextUrl.searchParams.get("secret");

    const isAuthorized =
      (cronSecret && authHeader === `Bearer ${cronSecret}`) ||
      (cronSecret && customHeader === cronSecret) ||
      (cronSecret && querySecret === cronSecret) ||
      process.env.NODE_ENV === "development";

    if (!isAuthorized && cronSecret) {
      return NextResponse.json({ status: "error", message: "Unauthorized trigger" }, { status: 401 });
    }

    const manualStart = request.nextUrl.searchParams.get("start");
    const manualEnd = request.nextUrl.searchParams.get("end");
    const manualWeekly = request.nextUrl.searchParams.get("isWeekly") === "true";

    if (manualStart && manualEnd) {
      const startLocalStr = `${manualStart}T00:00:00+03:00`;
      const endLocalStr = `${manualEnd}T23:59:59.999+03:00`;
      const label = `${manualStart} - ${manualEnd}`;

      const reportText = await generateReportText(
        new Date(startLocalStr).toISOString(),
        new Date(endLocalStr).toISOString(),
        label,
        manualWeekly
      );

      const success = await sendTelegramMessage(reportText);
      return NextResponse.json({ status: "success", type: "manual", sent: success });
    }

    // Automated daily trigger (UTC+3)
    const dailyRange = getTimeRangeForOffsetDays(-1, -1);
    const dailyText = await generateReportText(dailyRange.start, dailyRange.end, dailyRange.label, false);
    const dailySent = await sendTelegramMessage(dailyText);

    return NextResponse.json({ status: "success", reportSent: dailySent });
  } catch (error: any) {
    console.error("[Report Cron Error]:", error);
    return NextResponse.json({ status: "error", message: error.message }, { status: 500 });
  }
}
