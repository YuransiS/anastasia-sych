import { NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  const url = request.nextUrl;

  // Intercept POST request from WayForPay returnUrl to /thank-you
  if (request.method === "POST" && url.pathname === "/thank-you") {
    let orderReference = url.searchParams.get("orderReference") || "";
    let transactionStatus = "";
    let amount = "";

    try {
      const formData = await request.formData();
      orderReference =
        orderReference ||
        (formData.get("orderReference") as string) ||
        (formData.get("order_id") as string) ||
        "";
      transactionStatus =
        (formData.get("transactionStatus") as string) || "Approved";
      amount = (formData.get("amount") as string) || "";
    } catch (e) {
      console.error("[Middleware ThankYou POST] Error parsing form data:", e);
    }

    // Trigger internal callback to update Supabase status & Telegram message
    if (orderReference) {
      try {
        fetch(`${url.origin}/api/wayforpay/callback`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderReference,
            transactionStatus: transactionStatus || "Approved",
            amount: amount ? Number(amount) : undefined,
          }),
        }).catch((err) => console.error("[Middleware] Background callback failed:", err));
      } catch (err) {
        console.error("[Middleware] Exception:", err);
      }
    }

    const redirectUrl = new URL("/thank-you", request.url);
    if (orderReference) {
      redirectUrl.searchParams.set("orderReference", orderReference);
    }

    // Return 303 See Other redirect so browser converts POST to GET /thank-you?orderReference=...
    return NextResponse.redirect(redirectUrl, { status: 303 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/thank-you"],
};
