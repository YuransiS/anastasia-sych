import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { syncWayForPayTransactions } from "@/lib/wayforpay-sync";

const TG_BOT_TOKEN = process.env.TELEGRAM_LEADS_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN || "";
const TG_CHAT_ID = process.env.TELEGRAM_CHAT_ID || "-1003943120978";
const REPORT_THREAD_ID = process.env.TELEGRAM_REPORT_THREAD_ID
  ? parseInt(process.env.TELEGRAM_REPORT_THREAD_ID, 10)
  : 908;

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

  // Paid vs Unpaid counts & revenue
  let paidCount = 0;
  let unpaidCount = 0;
  let totalRevenue = 0;

  // Offer breakdown: total and paid
  const offerTotal: Record<string, number> = { "1": 0, "2": 0, "3": 0 };
  const offerPaid: Record<string, number> = { "1": 0, "2": 0, "3": 0 };
  const offerRevenue: Record<string, number> = { "1": 0, "2": 0, "3": 0 };
  const utmCounts: Record<string, number> = {};

  rows.forEach((row) => {
    const offerKey = String(row.offer_variant || "1");
    offerTotal[offerKey] = (offerTotal[offerKey] || 0) + 1;

    const isPaid = row.status === "Оплачено";
    const amount = Number(row.amount || 480);

    if (isPaid) {
      paidCount += 1;
      totalRevenue += amount;
      offerPaid[offerKey] = (offerPaid[offerKey] || 0) + 1;
      offerRevenue[offerKey] = (offerRevenue[offerKey] || 0) + amount;
    } else {
      unpaidCount += 1;
    }

    const src = row.utm_source || "direct";
    const camp = row.utm_campaign || "none";
    const key = `${src} / ${camp}`;
    utmCounts[key] = (utmCounts[key] || 0) + 1;
  });

  const conversionRate = totalLeads > 0 ? ((paidCount / totalLeads) * 100).toFixed(1) : "0.0";
  const titleEmoji = isWeekly ? "📈" : "📊";
  const reportType = isWeekly ? "Тижневий" : "Щоденний";

  let reportText = `${titleEmoji} <b>${reportType} аналітичний звіт: Анастасія Сич [Діагностика]</b>\n`;
  reportText += `📅 <b>Період:</b> ${label}\n\n`;

  if (totalLeads === 0) {
    reportText += `Немає нових заявок за вказаний період.`;
    return reportText;
  }

  reportText += `💰 <b>ФІНАНСИ ТА ПРОДАЖІ:</b>\n`;
  reportText += `• <b>Загальний доход:</b> <code>${totalRevenue} UAH</code>\n`;
  reportText += `• <b>Скільки купило (Оплачено):</b> <code>${paidCount} шт.</code>\n`;
  reportText += `• <b>Скільки не купило:</b> <code>${unpaidCount} шт.</code>\n`;
  reportText += `• <b>Всього заявок:</b> <code>${totalLeads} шт.</code>\n`;
  reportText += `• <b>Конверсія в оплату:</b> <code>${conversionRate}%</code>\n\n`;

  reportText += `🎯 <b>ПРОДАЖІ ЗА ВАРІАНТАМИ ОФЕРІВ:</b>\n`;
  reportText += `• <b>Офер #1 (Після дієти):</b> Купило: <code>${offerPaid["1"] || 0}</code> з <code>${offerTotal["1"] || 0}</code> (${offerRevenue["1"] || 0} UAH)\n`;
  reportText += `• <b>Офер #2 (Дзеркало / Не подобається):</b> Купило: <code>${offerPaid["2"] || 0}</code> з <code>${offerTotal["2"] || 0}</code> (${offerRevenue["2"] || 0} UAH)\n`;
  reportText += `• <b>Офер #3 (Марафон закінчився):</b> Купило: <code>${offerPaid["3"] || 0}</code> з <code>${offerTotal["3"] || 0}</code> (${offerRevenue["3"] || 0} UAH)\n\n`;

  const topUtm = Object.entries(utmCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([key, count]) => `• <code>${key}</code>: ${count} заявок`)
    .join("\n") || "• Немає даних";

  reportText += `🔍 <b>ТОП UTM-ДЖЕРЕЛА ТРАФІКУ:</b>\n${topUtm}`;

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
      await syncWayForPayTransactions({
        startDate: manualStart,
        endDate: manualEnd,
      });

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
    await syncWayForPayTransactions({ daysBack: 3 });
    const dailyRange = getTimeRangeForOffsetDays(-1, -1);
    const dailyText = await generateReportText(dailyRange.start, dailyRange.end, dailyRange.label, false);
    const dailySent = await sendTelegramMessage(dailyText);

    return NextResponse.json({ status: "success", reportSent: dailySent });
  } catch (error: any) {
    console.error("[Report Cron Error]:", error);
    return NextResponse.json({ status: "error", message: error.message }, { status: 500 });
  }
}
