import crypto from "crypto";

export interface WayForPayPurchaseParams {
  merchantAccount: string;
  merchantDomainName: string;
  orderReference: string;
  orderDate: number;
  amount: number;
  currency: string;
  productName: string[];
  productCount: number[];
  productPrice: number[];
  clientFirstName?: string;
  clientLastName?: string;
  clientPhone?: string;
  serviceUrl: string;
  returnUrl: string;
}

export function generateWayForPayPurchaseData(params: {
  orderReference: string;
  amount: number;
  currency?: string;
  productName: string;
  clientName?: string;
  clientPhone?: string;
  domainName: string;
  baseUrl: string;
}) {
  const merchantAccount = process.env.WAYFORPAY_MERCHANT_ACCOUNT || "freelance_user_68f25563083b8";
  const secretKey = process.env.WAYFORPAY_SECRET_KEY || "ba0f0779bda0299f07c5b7df630c95786ac06398";
  const merchantDomainName = params.domainName || "anastasiia-sych.vercel.app";

  const orderDate = Math.floor(Date.now() / 1000);
  const currency = params.currency || "UAH";
  const productNames = [params.productName];
  const productCounts = [1];
  const productPrices = [params.amount];

  const signatureString = [
    merchantAccount,
    merchantDomainName,
    params.orderReference,
    orderDate.toString(),
    params.amount.toString(),
    currency,
    productNames.join(";"),
    productCounts.join(";"),
    productPrices.join(";"),
  ].join(";");

  const merchantSignature = crypto
    .createHmac("md5", secretKey)
    .update(signatureString, "utf8")
    .digest("hex");

  const serviceUrl = `${params.baseUrl}/api/wayforpay/callback`;
  const returnUrl = `${params.baseUrl}/thank-you?orderReference=${params.orderReference}`;

  return {
    merchantAccount,
    merchantAuthType: "SimpleSignature",
    merchantDomainName,
    orderReference: params.orderReference,
    orderDate,
    amount: params.amount,
    currency,
    productName: productNames,
    productPrice: productPrices,
    productCount: productCounts,
    clientFirstName: params.clientName || "",
    clientPhone: params.clientPhone || "",
    serviceUrl,
    returnUrl,
    merchantSignature,
  };
}

export function verifyWayForPayCallbackSignature(
  data: Record<string, any>
): boolean {
  const secretKey = process.env.WAYFORPAY_SECRET_KEY || "ba0f0779bda0299f07c5b7df630c95786ac06398";

  const fields = [
    data.merchantAccount || "",
    data.orderReference || "",
    data.amount != null ? data.amount.toString() : "",
    data.currency || "",
    data.authCode || "",
    data.cardPan || "",
    data.transactionStatus || "",
    data.reasonCode != null ? data.reasonCode.toString() : "",
    data.reason || "",
  ];

  const signatureString = fields.join(";");
  const expectedSignature = crypto
    .createHmac("md5", secretKey)
    .update(signatureString, "utf8")
    .digest("hex");

  return expectedSignature.toLowerCase() === (data.merchantSignature || "").toLowerCase();
}

export function generateWayForPayCallbackResponse(orderReference: string) {
  const secretKey = process.env.WAYFORPAY_SECRET_KEY || "ba0f0779bda0299f07c5b7df630c95786ac06398";
  const time = Math.floor(Date.now() / 1000);
  const status = "accept";

  const signatureString = `${orderReference};${status};${time}`;
  const signature = crypto
    .createHmac("md5", secretKey)
    .update(signatureString, "utf8")
    .digest("hex");

  return {
    orderReference,
    status,
    time,
    signature,
  };
}
