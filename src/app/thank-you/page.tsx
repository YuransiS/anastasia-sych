"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CheckCircle2, Sparkles, Send, ArrowRight, Video } from "lucide-react";
import { trackPixelEvent } from "@/components/FacebookPixel";

const TG_BOT_URL = "https://t.me/anastasiiasychbot?start=6a6cd40e6f9471d0600b322f";

function ThankYouContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderReference = searchParams.get("orderReference") || "";
  const [orderData, setOrderData] = useState<any>(null);
  const [countdown, setCountdown] = useState(3);

  // Check order status from database to prevent failed payment user from seeing thank-you page
  useEffect(() => {
    if (orderReference) {
      fetch(`/api/wayforpay/status?orderReference=${orderReference}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.status === "success" && data.order) {
            setOrderData(data.order);
            if (data.order.status === "Не оплачено") {
              router.replace(`/payment-failed?orderReference=${orderReference}`);
            }
          }
        })
        .catch(() => {});
    }
  }, [orderReference, router]);

  const isMiniCourse =
    orderData?.page_path === "/mini-course" ||
    orderData?.offer_variant === "mini-course" ||
    orderData?.amount === 279 ||
    orderData?.amount === 399;

  // Track Facebook Pixel Purchase event on Thank You page
  useEffect(() => {
    const value = orderData?.amount || (isMiniCourse ? 279 : 480);
    const contentName = isMiniCourse
      ? "Анастасія Сич - Міні-курс «Плаский живіт та струнка талія»"
      : "Анастасія Сич - Персональна діагностика";

    trackPixelEvent("Purchase", {
      value,
      currency: "UAH",
      content_name: contentName,
      order_id: orderReference,
    });
  }, [orderReference, orderData, isMiniCourse]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          window.location.href = TG_BOT_URL;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleManualRedirect = () => {
    window.location.href = TG_BOT_URL;
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex items-center justify-center p-4 selection:bg-[#0284c7] selection:text-white font-sans">
      <div className="max-w-md w-full glass-card p-6 sm:p-10 rounded-3xl border border-sky-200 bg-white shadow-2xl text-center space-y-6 relative overflow-hidden">
        
        {/* TOP ACCENT BADGE */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-[#059669] text-xs font-bold shadow-sm mx-auto">
          <CheckCircle2 className="w-4 h-4 text-[#059669]" />
          <span>Оплата успішна!</span>
        </div>

        {/* SUCCESS ICON & HEADLINE */}
        <div className="space-y-3">
          <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-emerald-100 to-sky-100 text-[#0284c7] flex items-center justify-center mx-auto shadow-inner border border-sky-100 animate-pulse">
            <CheckCircle2 className="w-12 h-12 text-[#0284c7]" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-tight">
            Дякуємо за оплату!
          </h1>
          <p className="text-slate-600 text-xs sm:text-sm leading-relaxed font-semibold">
            {isMiniCourse ? (
              <>
                Ваша оплата за міні-курс <span className="text-[#0284c7] font-bold">«Плаский живіт та струнка талія»</span> успішно схвалена! Бонусний урок <span className="text-[#0284c7] font-bold">«Як спалити ЖИР»</span> вже чекає на вас у боті.
              </>
            ) : (
              <>
                Ви успішно забронювали персональну 60-хвилинну діагностику з Анастасією Сич та отримали безкоштовний урок "Як спалити ЖИР".
              </>
            )}
          </p>
        </div>

        {/* COUNTDOWN / AUTO-REDIRECT BANNER */}
        <div className="p-4 rounded-2xl bg-sky-50 border border-sky-200 text-slate-800 space-y-1.5">
          <div className="flex items-center justify-center gap-2 text-[#0284c7] font-bold text-xs sm:text-sm">
            <Sparkles className="w-4 h-4" />
            <span>Перехід до Telegram-бота через {countdown} сек...</span>
          </div>
          <p className="text-[11px] text-slate-500 font-medium">
            {isMiniCourse
              ? "У боті ви одразу отримаєте доступ до уроку та інформацію про старт 24.08."
              : "У боті ви отримаєте бонусний урок та зможете обрати зручний час зустрічі."}
          </p>
        </div>

        {/* PROMINENT MANUAL REDIRECT BUTTON */}
        <div className="pt-2 space-y-3 flex flex-col gap-2">
          <button
            onClick={handleManualRedirect}
            className="w-full py-4 px-5 rounded-2xl bg-gradient-to-r from-[#0284c7] to-[#0369a1] text-white font-extrabold text-sm sm:text-base shadow-xl flex items-center justify-center gap-2 transition-transform hover:scale-[1.02] active:scale-[0.98] uppercase"
          >
            <Send className="w-5 h-5 text-sky-200 shrink-0" />
            <span>Перейти в Telegram-бот</span>
            <ArrowRight className="w-4 h-4 text-sky-200 shrink-0" />
          </button>
          
          <p className="text-[11px] text-slate-400 font-medium">
            Якщо вас не перенаправило автоматично, натисніть кнопку вище.
          </p>
        </div>

        {orderReference && (
          <div className="pt-4 border-t border-slate-100 text-[10px] text-slate-400 font-mono">
            Номер замовлення: {orderReference}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ThankYouPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex items-center justify-center p-4">
          <div className="text-center font-bold text-sm text-slate-500">Завантаження...</div>
        </div>
      }
    >
      <ThankYouContent />
    </Suspense>
  );
}
