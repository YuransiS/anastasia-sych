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

import { getOfferLabel } from "@/lib/payment-handler";

async function generateReportText(
  start: string,
  end: string,
  label: string,
  isWeekly: boolean
): Promise<string> {
  const { data: leads, error: leadsErr } = await supabaseAdmin
    .from("anastasia_sych_leads")
    .select("*")
    .gte("created_at", start)
    .lte("created_at", end);

  if (leadsErr) {
    throw new Error(`Failed to fetch leads for report: ${leadsErr.message}`);
  }

  const { data: unifiedOrders, error: unifiedErr } = await supabaseAdmin
    .from("unified_orders")
    .select("*")
    .eq("project_id", "39ace0eb-084a-455e-b058-c6f20cda7f74")
    .gte("created_at", start)
    .lte("created_at", end);

  if (unifiedErr) {
    console.warn("[Report Cron] Warning fetching unified_orders:", unifiedErr.message);
  }

  // Merge and deduplicate by order_id
  const orderMap = new Map<string, {
    order_id: string;
    status: string;
    amount: number;
    currency: string;
    utm_source?: string | null;
    utm_medium?: string | null;
    utm_campaign?: string | null;
    utm_content?: string | null;
    utm_term?: string | null;
    offer_variant?: string;
    page_path?: string | null;
    created_at: string;
  }>();

  (unifiedOrders || []).forEach((u) => {
    if (u.order_id) {
      const amt = Number(u.amount);
      const cur = (u.metadata as any)?.currency || (amt === 7.6 || amt === 7.60 ? "EUR" : "UAH");
      orderMap.set(u.order_id, {
        order_id: u.order_id,
        status: u.status,
        amount: amt,
        currency: cur,
        utm_source: u.utm_source,
        utm_medium: u.utm_medium,
        utm_campaign: u.utm_campaign,
        utm_content: u.utm_content,
        utm_term: u.utm_term,
        offer_variant: (u.metadata as any)?.offer_variant || (amt === 7.6 || amt === 279 ? "mini-course" : "1"),
        page_path: u.page_path,
        created_at: u.created_at,
      });
    }
  });

  (leads || []).forEach((l) => {
    const existing = orderMap.get(l.order_id);
    const amt = Number(l.amount);
    const cur = (l.raw_payload as any)?.currency || (amt === 7.6 || amt === 7.60 ? "EUR" : "UAH");
    const isPaid = l.status === "Оплачено";

    if (!existing) {
      orderMap.set(l.order_id, {
        order_id: l.order_id,
        status: isPaid ? "closed_won" : (l.status === "Не оплачено" ? "declined" : "pending"),
        amount: amt,
        currency: cur,
        utm_source: l.utm_source,
        utm_medium: l.utm_medium,
        utm_campaign: l.utm_campaign,
        utm_content: l.utm_content,
        utm_term: l.utm_term,
        offer_variant: l.offer_variant || (amt === 7.6 || amt === 279 ? "mini-course" : "1"),
        page_path: l.page_path,
        created_at: l.created_at,
      });
    } else {
      existing.utm_source = existing.utm_source || l.utm_source;
      existing.utm_medium = existing.utm_medium || l.utm_medium;
      existing.utm_campaign = existing.utm_campaign || l.utm_campaign;
      existing.utm_content = existing.utm_content || l.utm_content;
      existing.utm_term = existing.utm_term || l.utm_term;
      if (isPaid) {
        existing.status = "closed_won";
      }
    }
  });

  const orders = Array.from(orderMap.values());
  const totalLeads = orders.length;

  if (totalLeads === 0) {
    const titleEmoji = isWeekly ? "📈" : "📊";
    const reportType = isWeekly ? "Тижневий" : "Щоденний";
    return `${titleEmoji} <b>${reportType} аналітичний звіт: Анастасія Сич</b>\n📅 <b>Період:</b> ${label}\n\nНемає нових заявок за вказаний період.`;
  }

  let paidCount = 0;
  let unpaidCount = 0;
  const revenueByCurrency: Record<string, number> = {};
  const offerStats: Record<string, { total: number; paid: number; revenue: number; currency: string }> = {};
  const utmCounts: Record<string, number> = {};

  orders.forEach((o) => {
    const isPaid = o.status === "closed_won" || o.status === "paid" || o.status === "Оплачено";
    const cur = o.currency || "UAH";
    const amt = o.amount || 0;
    const offerLabel = getOfferLabel(o.offer_variant, amt, cur);

    if (!offerStats[offerLabel]) {
      offerStats[offerLabel] = { total: 0, paid: 0, revenue: 0, currency: cur };
    }
    offerStats[offerLabel].total += 1;

    if (isPaid) {
      paidCount += 1;
      revenueByCurrency[cur] = (revenueByCurrency[cur] || 0) + amt;
      offerStats[offerLabel].paid += 1;
      offerStats[offerLabel].revenue += amt;
    } else {
      unpaidCount += 1;
    }

    const src = o.utm_source || "direct";
    const med = o.utm_medium ? ` / ${o.utm_medium}` : "";
    const camp = o.utm_campaign ? ` / ${o.utm_campaign}` : "";
    const utmKey = `${src}${med}${camp}`;
    utmCounts[utmKey] = (utmCounts[utmKey] || 0) + 1;
  });

  const totalRevenueText = Object.entries(revenueByCurrency)
    .map(([cur, sum]) => `${sum.toFixed(1).replace(/\.0$/, "")} ${cur}`)
    .join(" + ") || "0 UAH";

  const conversionRate = totalLeads > 0 ? ((paidCount / totalLeads) * 100).toFixed(1) : "0.0";
  const titleEmoji = isWeekly ? "📈" : "📊";
  const reportType = isWeekly ? "Тижневий" : "Щоденний";

  let reportText = `${titleEmoji} <b>${reportType} аналітичний звіт: Анастасія Сич</b>\n`;
  reportText += `📅 <b>Період:</b> ${label}\n\n`;

  reportText += `💰 <b>ФІНАНСИ ТА ПРОДАЖІ:</b>\n`;
  reportText += `• <b>Загальний доход:</b> <code>${totalRevenueText}</code>\n`;
  reportText += `• <b>Скільки купило (Оплачено):</b> <code>${paidCount} шт.</code>\n`;
  reportText += `• <b>Скільки не купило:</b> <code>${unpaidCount} шт.</code>\n`;
  reportText += `• <b>Всього заявок:</b> <code>${totalLeads} шт.</code>\n`;
  reportText += `• <b>Конверсія в оплату:</b> <code>${conversionRate}%</code>\n\n`;

  reportText += `🎯 <b>ПРОДАЖІ ЗА ОФЕРАМИ:</b>\n`;
  Object.entries(offerStats).forEach(([name, stat]) => {
    reportText += `• <b>${name}:</b> Купило: <code>${stat.paid}</code> з <code>${stat.total}</code> (${stat.revenue.toFixed(1).replace(/\.0$/, "")} ${stat.currency})\n`;
  });
  reportText += `\n`;

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
