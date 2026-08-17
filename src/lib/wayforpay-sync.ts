import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabase";

export interface SyncOptions {
  daysBack?: number;
  startDate?: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
}

export async function syncWayForPayTransactions(options: SyncOptions = {}) {
  const merchantAccount = process.env.WAYFORPAY_MERCHANT_ACCOUNT || "freelance_user_68f25563083b8";
  const secretKey = process.env.WAYFORPAY_SECRET_KEY || "ba0f0779bda0299f07c5b7df630c95786ac06398";

  let startTs = 0;
  let endTs = Math.floor(Date.now() / 1000);

  if (options.startDate && options.endDate) {
    startTs = Math.floor(new Date(`${options.startDate}T00:00:00+03:00`).getTime() / 1000);
    endTs = Math.floor(new Date(`${options.endDate}T23:59:59+03:00`).getTime() / 1000);
  } else {
    const days = options.daysBack ?? 3;
    const now = new Date();
    // Calculate start day at 00:00:00 Kyiv time
    const startDay = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    startDay.setHours(0, 0, 0, 0);
    startTs = Math.floor(startDay.getTime() / 1000);
  }

  const logs: string[] = [];
  logs.push(`Starting WayForPay sync from ${new Date(startTs * 1000).toLocaleString("uk-UA")} (Kyiv) to ${new Date(endTs * 1000).toLocaleString("uk-UA")} (Kyiv)`);

  // WayForPay allows maximum 31 days per request range. We partition requests into chunks of max 28 days.
  const SECONDS_IN_28_DAYS = 28 * 24 * 60 * 60;
  const chunks: { begin: number; end: number }[] = [];
  
  let currentBegin = startTs;
  while (currentBegin < endTs) {
    const currentEnd = Math.min(currentBegin + SECONDS_IN_28_DAYS, endTs);
    chunks.push({ begin: currentBegin, end: currentEnd });
    currentBegin = currentEnd + 1;
  }

  let totalFetched = 0;
  let totalUpdated = 0;
  let totalCreated = 0;

  for (const chunk of chunks) {
    logs.push(`Fetching transactions range: ${new Date(chunk.begin * 1000).toLocaleDateString("uk-UA")} - ${new Date(chunk.end * 1000).toLocaleDateString("uk-UA")}`);
    
    // HMAC MD5 Signature: merchantAccount;dateBegin;dateEnd
    const signStr = `${merchantAccount};${chunk.begin};${chunk.end}`;
    const signature = crypto
      .createHmac("md5", secretKey)
      .update(signStr, "utf8")
      .digest("hex");

    const payload = {
      transactionType: "TRANSACTION_LIST",
      merchantAccount,
      merchantSignature: signature,
      apiVersion: 1,
      dateBegin: chunk.begin,
      dateEnd: chunk.end,
    };

    try {
      const response = await fetch("https://api.wayforpay.com/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const resData = await response.json();
      if (resData.reasonCode !== 1100 && resData.reasonCode !== 0) {
        logs.push(`WayForPay API returned response: [${resData.reasonCode}] ${resData.reason}`);
        continue;
      }

      const txList = resData.transactionList || [];
      totalFetched += txList.length;
      logs.push(`Found ${txList.length} transaction(s) in range`);

      for (const tx of txList) {
        const orderRef = tx.orderReference;
        const amount = Number(tx.amount);

        // Skip technical test transactions
        if (amount <= 5 || (orderRef && orderRef.startsWith("test_"))) {
          continue;
        }

        const isApproved = tx.transactionStatus === "Approved";
        const isDeclinedOrExpired = tx.transactionStatus === "Declined" || tx.transactionStatus === "Expired";

        // Query leads table
        const { data: existingLeads, error: selectError } = await supabaseAdmin
          .from("anastasia_sych_leads")
          .select("*")
          .eq("order_id", orderRef);

        if (selectError) {
          logs.push(`Error selecting order ${orderRef}: ${selectError.message}`);
          continue;
        }

        if (existingLeads && existingLeads.length > 0) {
          const lead = existingLeads[0];
          if (isApproved) {
            if (lead.status !== "Оплачено") {
              const { error: updateError } = await supabaseAdmin
                .from("anastasia_sych_leads")
                .update({
                  status: "Оплачено",
                  amount: amount,
                  raw_payload: {
                    ...(typeof lead.raw_payload === 'object' ? lead.raw_payload : {}),
                    wayforpay_sync: tx,
                  }
                })
                .eq("id", lead.id);

              if (updateError) {
                logs.push(`Error updating order ${orderRef} status: ${updateError.message}`);
              } else {
                logs.push(`Updated existing order ${orderRef} to 'Оплачено'`);
                totalUpdated++;
              }
            }
          } else if (isDeclinedOrExpired) {
            if (lead.status === "Очікує оплати" || lead.status === "Зареєстровано") {
              const { error: updateError } = await supabaseAdmin
                .from("anastasia_sych_leads")
                .update({
                  status: "Не оплачено",
                  raw_payload: {
                    ...(typeof lead.raw_payload === 'object' ? lead.raw_payload : {}),
                    wayforpay_sync: tx,
                  }
                })
                .eq("id", lead.id);

              if (updateError) {
                logs.push(`Error updating failed order ${orderRef} status: ${updateError.message}`);
              } else {
                logs.push(`Updated failed order ${orderRef} to 'Не оплачено'`);
                totalUpdated++;
              }
            }
          }
        } else {
          // If transaction is Approved but lead doesn't exist, create it (avoiding duplicates)
          if (isApproved) {
            const clientName = tx.clientName || tx.cardHolder || tx.email || "WayForPay Direct Payment";
            const clientPhone = tx.phone || tx.clientPhone || "";
            const { error: insertError } = await supabaseAdmin
              .from("anastasia_sych_leads")
              .insert({
                name: clientName,
                phone: clientPhone,
                email: tx.email || "",
                order_id: orderRef,
                amount: amount,
                status: "Оплачено",
                created_at: new Date(tx.createdDate * 1000).toISOString(),
                raw_payload: {
                  wayforpay_sync: tx,
                }
              });

            if (insertError) {
              logs.push(`Error inserting direct order ${orderRef}: ${insertError.message}`);
            } else {
              logs.push(`Inserted new direct paid order ${orderRef}`);
              totalCreated++;
            }
          }
        }
      }
    } catch (err: any) {
      logs.push(`Error fetching chunk data: ${err.message}`);
    }
  }

  logs.push(`Sync complete. Total processed: Fetched: ${totalFetched}, Updated: ${totalUpdated}, Created: ${totalCreated}`);
  return {
    success: true,
    totalFetched,
    totalUpdated,
    totalCreated,
    logs,
  };
}
