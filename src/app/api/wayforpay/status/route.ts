import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orderReference = searchParams.get("orderReference");

    if (!orderReference) {
      return NextResponse.json(
        { status: "error", message: "Missing orderReference parameter" },
        { status: 400 }
      );
    }

    const { data: lead, error } = await supabaseAdmin
      .from("anastasia_sych_leads")
      .select("order_id, name, phone, telegram, status, amount, created_at")
      .eq("order_id", orderReference)
      .maybeSingle();

    if (error) {
      console.error("[Order Status] Database query error:", error);
      return NextResponse.json({ status: "error", message: error.message }, { status: 500 });
    }

    if (!lead) {
      return NextResponse.json({ status: "not_found", message: "Order not found" }, { status: 404 });
    }

    return NextResponse.json({
      status: "success",
      order: lead,
    });
  } catch (err: any) {
    console.error("[Order Status] Exception:", err);
    return NextResponse.json(
      { status: "error", message: err.message || "Internal error" },
      { status: 500 }
    );
  }
}
