import { NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  const url = request.nextUrl;

  // Intercept POST request from WayForPay returnUrl to /thank-you or /payment-failed
  if (request.method === "POST" && (url.pathname === "/thank-you" || url.pathname === "/payment-failed")) {
    let orderReference = url.searchParams.get("orderReference") || "";
    let transactionStatus = "";
    let reason = "";
    let amount = "";

    try {
      const formData = await request.formData();
      orderReference =
        orderReference ||
        (formData.get("orderReference") as string) ||
        (formData.get("order_id") as string) ||
        "";
      transactionStatus =
        (formData.get("transactionStatus") as string) || "";
      reason =
        (formData.get("reason") as string) ||
        (formData.get("reasonCode") as string) ||
        "";
      amount = (formData.get("amount") as string) || "";
    } catch (e) {
      console.error("[Middleware POST] Error parsing form data:", e);
    }

    const isApproved = transactionStatus === "Approved";

    // Trigger internal callback to update Supabase status & Telegram message
    if (orderReference) {
      try {
        fetch(`${url.origin}/api/wayforpay/callback`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderReference,
            transactionStatus: isApproved ? "Approved" : (transactionStatus || "Declined"),
            reason: reason || (isApproved ? "Approved" : "Скасовано або недостатньо коштів"),
            amount: amount ? Number(amount) : undefined,
          }),
        }).catch((err) => console.error("[Middleware] Background callback failed:", err));
      } catch (err) {
        console.error("[Middleware] Exception:", err);
      }
    }

    // Determine target page: /thank-you if Approved, /payment-failed if Declined/Failed
    const targetPath = isApproved ? "/thank-you" : "/payment-failed";
    const redirectUrl = new URL(targetPath, request.url);

    if (orderReference) {
      redirectUrl.searchParams.set("orderReference", orderReference);
    }
    if (!isApproved && reason) {
      redirectUrl.searchParams.set("reason", reason);
    }

    // Return 303 See Other redirect so browser converts POST to GET targetPath
    return NextResponse.redirect(redirectUrl, { status: 303 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/thank-you", "/payment-failed"],
};
