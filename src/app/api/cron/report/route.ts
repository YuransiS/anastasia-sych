import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { syncWayForPayTransactions } from "@/lib/wayforpay-sync";
import { TG_BOT_TOKEN, TG_CHAT_ID, TG_REPORT_THREAD_ID } from "@/lib/telegram";

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
  const body: Record<string, any> = {
    chat_id: TG_CHAT_ID,
    text: text,
    parse_mode: "HTML",
  };
  if (TG_REPORT_THREAD_ID && !isNaN(TG_REPORT_THREAD_ID)) {
    body.message_thread_id = TG_REPORT_THREAD_ID;
  }

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

import { getOfferLabel, getLandingLabel } from "@/lib/payment-handler";

function cleanUtmString(str?: string | null): string {
  if (!str) return "";
  try {
    let decoded = decodeURIComponent(str);
    if (decoded.includes("%20") || decoded.includes("%2F") || decoded.includes("%2C") || decoded.includes("+")) {
      decoded = decodeURIComponent(decoded.replace(/\+/g, " "));
    }
    return decoded.replace(/\+/g, " ").trim();
  } catch {
    return str.replace(/\+/g, " ").trim();
  }
}

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
    page_path?: string | null;
    page_url?: string | null;
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
        page_path: u.page_path,
        page_url: u.page_url,
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
        status: isPaid ? "closed_won" : (l.status === "Не оплачено" ? "declined" : (l.status === "Клик" ? "click" : "pending")),
        amount: amt,
        currency: cur,
        utm_source: l.utm_source,
        utm_medium: l.utm_medium,
        utm_campaign: l.utm_campaign,
        utm_content: l.utm_content,
        utm_term: l.utm_term,
        page_path: l.page_path,
        page_url: l.page_url,
        created_at: l.created_at,
      });
    } else {
      existing.utm_source = existing.utm_source || l.utm_source;
      existing.utm_medium = existing.utm_medium || l.utm_medium;
      existing.utm_campaign = existing.utm_campaign || l.utm_campaign;
      existing.utm_content = existing.utm_content || l.utm_content;
      existing.utm_term = existing.utm_term || l.utm_term;
      existing.page_path = existing.page_path || l.page_path;
      existing.page_url = existing.page_url || l.page_url;
      if (isPaid) {
        existing.status = "closed_won";
      }
    }
  });

  const orders = Array.from(orderMap.values());
  const titleEmoji = isWeekly ? "📈" : "📊";
  const reportType = isWeekly ? "Тижневий" : "Щоденний";

  if (orders.length === 0) {
    return `${titleEmoji} <b>${reportType} аналітичний звіт: Анастасія Сич</b>\n📅 <b>Період:</b> ${label}\n\nНемає даних за вказаний період.`;
  }

  let totalVisits = 0;
  let totalForms = 0;
  let totalPaid = 0;
  const revenueByCurrency: Record<string, number> = {};
  const landingsStats: Record<string, { visits: number; forms: number; paid: number; revenue: Record<string, number> }> = {};
  const utmStats: Record<string, { visits: number; forms: number; paid: number; revenue: Record<string, number> }> = {};

  orders.forEach((o) => {
    const isCold = (o.order_id && o.order_id.startsWith("COLD_")) || o.status === "click";
    const isPaid = o.status === "closed_won" || o.status === "paid" || o.status === "Оплачено";
    const landing = getLandingLabel(o.page_path, o.page_url);
    const cur = o.currency || (o.amount === 7.6 ? "EUR" : "UAH");
    const amt = o.amount || 0;

    if (!landingsStats[landing]) {
      landingsStats[landing] = { visits: 0, forms: 0, paid: 0, revenue: {} };
    }

    const src = cleanUtmString(o.utm_source) || "direct";
    const med = cleanUtmString(o.utm_medium);
    const camp = cleanUtmString(o.utm_campaign);
    const utmKey = (med || camp) ? `${src} / ${med || "-"} / ${camp || "-"}` : src;

    if (!utmStats[utmKey]) {
      utmStats[utmKey] = { visits: 0, forms: 0, paid: 0, revenue: {} };
    }

    if (isCold) {
      totalVisits += 1;
      landingsStats[landing].visits += 1;
      utmStats[utmKey].visits += 1;
    } else {
      totalForms += 1;
      landingsStats[landing].forms += 1;
      utmStats[utmKey].forms += 1;

      if (isPaid) {
        totalPaid += 1;
        landingsStats[landing].paid += 1;
        utmStats[utmKey].paid += 1;

        revenueByCurrency[cur] = (revenueByCurrency[cur] || 0) + amt;
        landingsStats[landing].revenue[cur] = (landingsStats[landing].revenue[cur] || 0) + amt;
        utmStats[utmKey].revenue[cur] = (utmStats[utmKey].revenue[cur] || 0) + amt;
      }
    }
  });

  const totalRevenueText = Object.entries(revenueByCurrency)
    .map(([cur, sum]) => `${sum.toFixed(2)} ${cur}`)
    .join(" + ") || "0.00 EUR";

  const siteConv = totalVisits > 0 ? ((totalForms / totalVisits) * 100).toFixed(1) : "-";
  const formConv = totalForms > 0 ? ((totalPaid / totalForms) * 100).toFixed(1) : (totalPaid > 0 ? "100.0" : "0.0");

  let reportText = `${titleEmoji} <b>${reportType} аналітичний звіт: Анастасія Сич</b>\n`;
  reportText += `📅 <b>Період:</b> ${label}\n\n`;

  reportText += `💰 <b>ФІНАНСИ ТА ПРОДАЖІ:</b>\n`;
  reportText += `• <b>Загальний дохід:</b> <code>${totalRevenueText}</code>\n`;
  reportText += `• <b>Оплачених замовлень:</b> <code>${totalPaid} шт.</code>\n\n`;

  reportText += `📈 <b>ЗАГАЛЬНА ВОРОНКА КОНВЕРСІЇ:</b>\n`;
  reportText += `• 🌐 <b>Переходи на сайт (Кліки):</b> <code>${totalVisits}</code>\n`;
  reportText += `• 📝 <b>Заповнено форму (Ініційовано):</b> <code>${totalForms}</code>\n`;
  reportText += `• 💳 <b>Успішно сплачено:</b> <code>${totalPaid}</code>\n`;
  if (siteConv !== "-") {
    reportText += `• ⚡ <b>Конверсія сайту у форму:</b> <code>${siteConv}%</code>\n`;
  }
  reportText += `• 🎯 <b>Конверсія з форми в оплату:</b> <code>${formConv}%</code>\n\n`;

  reportText += `🌐 <b>РОЗБИВКА ПО ЛЕНДІНГАХ:</b>\n`;
  Object.entries(landingsStats).forEach(([name, s]) => {
    const lConv = s.forms > 0 ? ((s.paid / s.forms) * 100).toFixed(1) : (s.paid > 0 ? "100.0" : "0.0");
    const rev = Object.entries(s.revenue).map(([c, v]) => `${v.toFixed(2)} ${c}`).join(" + ") || "0.00 EUR";
    reportText += `📍 <b>${name}</b>\n`;
    reportText += `  ↳ Переходи: <code>${s.visits}</code> | Форми: <code>${s.forms}</code> | Оплачено: <code>${s.paid}</code> (${rev})\n`;
    reportText += `  ↳ Конверсія в оплату: <code>${lConv}%</code>\n\n`;
  });

  reportText += `🔍 <b>ДЖЕРЕЛА ТРАФІКУ ТА ЕФЕКТИВНІСТЬ (UTM):</b>\n`;
  const sortedUtm = Object.entries(utmStats).sort((a, b) => (b[1].paid - a[1].paid) || (b[1].forms - a[1].forms) || (b[1].visits - a[1].visits));
  sortedUtm.forEach(([key, s]) => {
    const rev = Object.entries(s.revenue).map(([c, v]) => `${v.toFixed(2)} ${c}`).join(" + ");
    const revText = rev ? ` (${rev})` : "";
    reportText += `• <code>${key}</code>\n`;
    reportText += `  ↳ ${s.visits} переходів → ${s.forms} форм → <b>${s.paid} оплат</b>${revText}\n`;
  });

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
