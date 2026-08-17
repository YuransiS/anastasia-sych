import { NextRequest, NextResponse } from "next/server";
import { syncWayForPayTransactions } from "@/lib/wayforpay-sync";

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

    const daysParam = request.nextUrl.searchParams.get("days");
    const startParam = request.nextUrl.searchParams.get("start");
    const endParam = request.nextUrl.searchParams.get("end");

    let result;
    if (startParam && endParam) {
      result = await syncWayForPayTransactions({
        startDate: startParam,
        endDate: endParam,
      });
    } else {
      const days = daysParam ? parseInt(daysParam, 10) : 3;
      result = await syncWayForPayTransactions({
        daysBack: days,
      });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[Payments Sync Error]:", error);
    return NextResponse.json({ status: "error", message: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
