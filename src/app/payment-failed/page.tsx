"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { AlertCircle, RefreshCw, Send, ArrowRight } from "lucide-react";

const TG_BOT_URL = "https://t.me/anastasiiasychbot?start=6a6cd40e6f9471d0600b322f";

function PaymentFailedContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderReference = searchParams.get("orderReference") || "";
  const rawReason = searchParams.get("reason") || "";

  const [reason, setReason] = useState(rawReason || "Скасовано користувачем або недостатньо коштів на картці");

  useEffect(() => {
    if (orderReference && !rawReason) {
      fetch(`/api/wayforpay/status?orderReference=${orderReference}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.status === "success" && data.order?.raw_payload?.wayforpay_callback?.reason) {
            setReason(data.order.raw_payload.wayforpay_callback.reason);
          }
        })
        .catch(() => {});
    }
  }, [orderReference, rawReason]);

  const handleRetryPayment = () => {
    router.push("/diagnostic");
  };

  const handleOpenTelegram = () => {
    window.location.href = TG_BOT_URL;
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex items-center justify-center p-4 selection:bg-[#c33624] selection:text-white font-sans">
      <div className="max-w-md w-full glass-card p-6 sm:p-10 rounded-3xl border border-red-200 bg-white shadow-2xl text-center space-y-6 relative overflow-hidden">
        
        {/* TOP ACCENT BADGE */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-50 border border-red-200 text-red-700 text-xs font-bold shadow-sm mx-auto">
          <AlertCircle className="w-4 h-4 text-red-600" />
          <span>Оплату не завершено</span>
        </div>

        {/* FAIL ICON & HEADLINE */}
        <div className="space-y-3">
          <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-red-100 to-rose-100 text-red-600 flex items-center justify-center mx-auto shadow-inner border border-red-200">
            <AlertCircle className="w-12 h-12 text-red-600" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-tight">
            Оплату відхилено
          </h1>
          <p className="text-slate-600 text-xs sm:text-sm leading-relaxed font-medium">
            Транзакцію не вдалося завершити. Спробуйте повторити оплату або використайте іншу картку.
          </p>
        </div>

        {/* REASON BOX */}
        <div className="p-4 rounded-2xl bg-red-50/80 border border-red-200 text-slate-800 space-y-1 text-left">
          <span className="text-[11px] font-bold text-red-700 uppercase tracking-wider block">
            Причина відмови:
          </span>
          <p className="text-xs text-red-900 font-semibold leading-relaxed">
            {reason}
          </p>
        </div>

        {/* ACTION BUTTONS */}
        <div className="pt-2 space-y-3">
          <button
            onClick={handleRetryPayment}
            className="w-full py-4 px-5 rounded-2xl bg-gradient-to-r from-[#0284c7] to-[#0369a1] text-white font-extrabold text-sm sm:text-base shadow-xl glow-primary cursor-pointer flex items-center justify-center gap-2 border border-[#0284c7]/30 uppercase tracking-wide transition-transform hover:scale-[1.02] active:scale-[0.98]"
          >
            <RefreshCw className="w-5 h-5 text-sky-200 shrink-0" />
            <span>Спробувати оплатити знову</span>
            <ArrowRight className="w-4 h-4 text-sky-200 shrink-0" />
          </button>

          <button
            onClick={handleOpenTelegram}
            className="w-full py-3.5 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs sm:text-sm transition-colors border border-slate-200 flex items-center justify-center gap-2"
          >
            <Send className="w-4 h-4 text-[#0284c7]" />
            <span>Написати підтримці в Telegram</span>
          </button>
        </div>

        {orderReference && (
          <div className="pt-4 border-t border-slate-100 text-[10px] text-slate-400 font-mono">
            Order ID: {orderReference}
          </div>
        )}
      </div>
    </div>
  );
}

export default function PaymentFailedPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex items-center justify-center p-4">
          <div className="text-center font-bold text-sm text-slate-500">Завантаження...</div>
        </div>
      }
    >
      <PaymentFailedContent />
    </Suspense>
  );
}
