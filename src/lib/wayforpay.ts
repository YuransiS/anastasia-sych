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

  const merchantAccount = data.merchantAccount || "";
  const orderReference = data.orderReference || "";
  const amountStr = data.amount != null ? data.amount.toString() : "";
  const currency = data.currency || "";
  const authCode = data.authCode || "";
  const cardPan = data.cardPan || "";
  const transactionStatus = data.transactionStatus || "";
  const reasonCodeStr = data.reasonCode != null ? data.reasonCode.toString() : "";
  const reason = data.reason || "";
  const receivedSig = (data.merchantSignature || "").toLowerCase();

  if (!receivedSig) return false;

  const baseFields = [
    merchantAccount,
    orderReference,
    amountStr,
    currency,
    authCode,
    cardPan,
    transactionStatus,
    reasonCodeStr,
  ];

  // Variant A: without reason (standard WayForPay approved callback)
  const sigA = crypto
    .createHmac("md5", secretKey)
    .update(baseFields.join(";"), "utf8")
    .digest("hex")
    .toLowerCase();

  if (sigA === receivedSig) return true;

  // Variant B: with reason
  const sigB = crypto
    .createHmac("md5", secretKey)
    .update([...baseFields, reason].join(";"), "utf8")
    .digest("hex")
    .toLowerCase();

  if (sigB === receivedSig) return true;

  // Variant C/D: with fixed 2 decimal places if applicable (e.g. 7.6 -> 7.60)
  if (data.amount != null && !isNaN(Number(data.amount))) {
    const fixedAmount = Number(data.amount).toFixed(2);
    const fieldsWithFixed = [
      merchantAccount,
      orderReference,
      fixedAmount,
      currency,
      authCode,
      cardPan,
      transactionStatus,
      reasonCodeStr,
    ];

    const sigC = crypto
      .createHmac("md5", secretKey)
      .update(fieldsWithFixed.join(";"), "utf8")
      .digest("hex")
      .toLowerCase();
    if (sigC === receivedSig) return true;

    const sigD = crypto
      .createHmac("md5", secretKey)
      .update([...fieldsWithFixed, reason].join(";"), "utf8")
      .digest("hex")
      .toLowerCase();
    if (sigD === receivedSig) return true;
  }

  return false;
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
