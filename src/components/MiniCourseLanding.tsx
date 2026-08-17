"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  X,
  Phone,
  User,
  MessageCircle,
  ArrowRight,
  ShieldCheck,
  ZoomIn,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Gift,
  Star,
  ShieldAlert,
  Shield
} from "lucide-react";
import { trackPixelEvent } from "./FacebookPixel";
import {
  formatUkrainianPhone,
  validateUkrainianPhone,
  validateTelegramHandle
} from "@/lib/validation";

interface LeadFormData {
  name: string;
  phone: string;
  telegram: string;
  notes: string;
}

export default function MiniCourseLanding() {
  const searchParams = useSearchParams();

  // Capture UTM parameters from URL
  const utmSource = searchParams.get("utm_source") || "";
  const utmMedium = searchParams.get("utm_medium") || "";
  const utmCampaign = searchParams.get("utm_campaign") || "";
  const utmContent = searchParams.get("utm_content") || "";
  const utmTerm = searchParams.get("utm_term") || "";

  // Modal & Lightbox State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeCaseImage, setActiveCaseImage] = useState<string | null>(null);

  // Scroll state to reveal sticky bottom CTA bar
  const [showStickyUI, setShowStickyUI] = useState(false);

  // Countdown timer for sticky footer bar
  const [timeLeft, setTimeLeft] = useState({ hours: "00", minutes: "59", seconds: "59" });

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 400) {
        setShowStickyUI(true);
      } else {
        setShowStickyUI(false);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const nextHour = new Date(now);
      nextHour.setHours(now.getHours() + 1, 0, 0, 0);
      const diff = Math.max(0, Math.floor((nextHour.getTime() - now.getTime()) / 1000));
      const m = Math.floor((diff % 3600) / 60);
      const s = diff % 60;
      setTimeLeft({
        hours: "00",
        minutes: m < 10 ? `0${m}` : `${m}`,
        seconds: s < 10 ? `0${s}` : `${s}`,
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Form auto-save state
  const [formData, setFormData] = useState<LeadFormData>({
    name: "",
    phone: "+380",
    telegram: "",
    notes: "",
  });

  // Restore saved input from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("as_minicourse_form");
      if (saved) {
        const parsed = JSON.parse(saved);
        setFormData((prev) => ({
          ...prev,
          name: parsed.name || prev.name,
          phone: parsed.phone || prev.phone,
          telegram: parsed.telegram || prev.telegram,
        }));
      }
    } catch (_) {}
  }, []);

  // Auto-save form inputs
  const handleInputChange = (field: keyof LeadFormData, value: string) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };
      try {
        localStorage.setItem("as_minicourse_form", JSON.stringify(next));
      } catch (_) {}
      return next;
    });
  };

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Carousel ref for case studies
  const carouselRef = useRef<HTMLDivElement>(null);

  const scrollCarousel = (direction: "left" | "right") => {
    if (carouselRef.current) {
      const cardWidth = carouselRef.current.firstElementChild?.clientWidth || 280;
      const scrollAmount = direction === "left" ? -cardWidth - 16 : cardWidth + 16;
      carouselRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  // Lock body scroll when modal or lightbox is open
  useEffect(() => {
    if (isModalOpen || activeCaseImage) {
      document.body.classList.add("modal-open");
    } else {
      document.body.classList.remove("modal-open");
    }
    return () => {
      document.body.classList.remove("modal-open");
    };
  }, [isModalOpen, activeCaseImage]);

  // Auto-detect visitor country & dial code via Geo IP API
  useEffect(() => {
    fetch("/api/geo")
      .then((res) => res.json())
      .then((data) => {
        if (data.dialCode && formData.phone === "+380") {
          setFormData((prev) => ({ ...prev, phone: data.dialCode }));
        }
      })
      .catch(() => {});
  }, []);

  // FAQ open items state
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  // Handle modal open
  const handleOpenModal = () => {
    setIsModalOpen(true);
    setErrorMessage("");
    trackPixelEvent("InitiateCheckout", {
      offer_variant: "mini-course",
      amount: 399,
      currency: "UAH",
      content_name: "Міні-курс: Плаский живіт та струнка талія",
    });
  };

  // Ukrainian phone input cleaner/formatter
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatUkrainianPhone(e.target.value);
    handleInputChange("phone", formatted);
  };

  const handleNoTelegramClick = () => {
    handleInputChange("telegram", "В мене немає нікнейму");
  };

  const submitWayForPayForm = (wayforpayData: Record<string, any>) => {
    const form = document.createElement("form");
    form.method = "POST";
    form.action = "https://secure.wayforpay.com/pay";
    form.acceptCharset = "utf-8";

    Object.entries(wayforpayData).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach((val) => {
          const input = document.createElement("input");
          input.type = "hidden";
          input.name = `${key}[]`;
          input.value = String(val);
          form.appendChild(input);
        });
      } else {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = key;
        input.value = String(value);
        form.appendChild(input);
      }
    });

    document.body.appendChild(form);
    form.submit();
  };

  // Form submission handler with validation
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      setErrorMessage("Будь ласка, вкажіть ваше ім'я.");
      return;
    }

    const phoneVal = validateUkrainianPhone(formData.phone);
    if (!phoneVal.isValid) {
      setErrorMessage(phoneVal.error || "Введіть дійсний номер мобільного телефону.");
      return;
    }

    const tgVal = validateTelegramHandle(formData.telegram);
    if (!tgVal.isValid) {
      setErrorMessage(tgVal.error || "Введіть коректний Telegram нікнейм.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          phone: formData.phone,
          telegram: formData.telegram,
          notes: formData.notes || "Заявка на міні-курс (399 грн)",
          offer_variant: "mini-course",
          amount: 399,
          utm_source: utmSource,
          utm_medium: utmMedium,
          utm_campaign: utmCampaign,
          utm_content: utmContent,
          utm_term: utmTerm,
          page_path: typeof window !== "undefined" ? window.location.pathname : "/mini-course",
          page_url: typeof window !== "undefined" ? window.location.href : "/mini-course",
        }),
      });

      const data = await response.json();

      if (response.ok && data.status === "success") {
        trackPixelEvent("Lead", {
          offer_variant: "mini-course",
          value: 399,
          currency: "UAH",
          content_name: "Міні-курс: Плаский живіт та струнка талія",
        });

        if (data.wayforpayData) {
          submitWayForPayForm(data.wayforpayData);
        } else {
          setIsSubmitting(false);
          alert("Дякуємо! Ваша заявка прийнята.");
          setIsModalOpen(false);
        }
      } else {
        setErrorMessage(data.message || "Помилка при збереженні заявки. Спробуйте ще раз.");
        setIsSubmitting(false);
      }
    } catch (err) {
      console.error("Form submit error:", err);
      setErrorMessage("Виникла мережева помилка. Будь ласка, перевірте з'єднання.");
      setIsSubmitting(false);
    }
  };

  // Section: What You Get (Clean & Short)
  const whatYouGetItems = [
    {
      heading: "Справжні причини жирових відкладень",
      desc: "Дізнаєтесь, що реально впливає на живіт і талію без міфів із соцмереж.",
      icon: "🎯",
    },
    {
      heading: "Система харчування без заборон",
      desc: "Як скласти ситний раціон без підрахунку калорій, зважування та голоду.",
      icon: "🥗",
    },
    {
      heading: "Тренування без виснаження",
      desc: "Адекватне навантаження для талії, постави та глибоких м'язів живота.",
      icon: "⚡",
    },
    {
      heading: "Аудит особистих гальм",
      desc: "Побачите, чому вага поверталась (сон, стрес, режим, відновлення).",
      icon: "🔍",
    },
    {
      heading: "Покроковий план на кожен день",
      desc: "Чіткий алгоритм дій без зривів і чергових починань «з понеділка».",
      icon: "📋",
    },
  ];

  // Case Studies
  const realCaseGalleries = [
    {
      id: 1,
      title: "Ярославна, 34 р",
      badge: "Результат за 3 міс",
      desc: "-12 кг, -5 см в талії, рельєфний прес",
      image: "/images/cases/case_5.webp",
    },
    {
      id: 2,
      title: "Наталі, 36 р",
      badge: "Результат за 3 міс",
      desc: "-5 кг, -4 см в талії, підтягнуте тіло",
      image: "/images/cases/case_natali.png",
    },
    {
      id: 3,
      title: "Ірина, 38 р",
      badge: "Результат за 2 міс",
      desc: "-4 кг, -10 см в талії, мінус набряки",
      image: "/images/cases/case_irina.jpg",
    },
    {
      id: 4,
      title: "Настя, 28 р",
      badge: "Результат за 3 міс",
      desc: "-8 кг, -6 см в талії, без зривів",
      image: "/images/cases/case_3.webp",
    },
  ];

  // FAQ Items (Concise)
  const faqItems = [
    {
      q: "Чи підійде для початківців?",
      a: "Так. Всі вправи та рекомендації адаптовані для звичайного ритму життя без спортивного минулого.",
    },
    {
      q: "Чи потрібно сидіти на дієті?",
      a: "Ні. Курс вчить вибудовувати повноцінне смачне харчування без голодування та підрахунку калорій.",
    },
    {
      q: "Як довго зберігається доступ?",
      a: "Доступ назавжди. Всі матеріали залишаються у вашому особистому Telegram-боті.",
    },
    {
      q: "Як я отримаю доступ після оплати?",
      a: "Одразу після оплати ви отримаєте посилання на Telegram-бот із усіма уроками та бонусами.",
    },
  ];

  return (
    <div className="min-h-screen bg-[#070607] text-[#FFFFFF] font-source selection:bg-[#DB0B3E] selection:text-white pb-28 sm:pb-24 overflow-x-hidden">

      {/* TOP RED TICKER BANNER */}
      <div className="bg-gradient-to-r from-[#BA022F] to-[#D00839] text-white py-1.5 overflow-hidden shadow-lg sticky top-0 z-40 border-b border-[#F01147]/30">
        <div className="animate-marquee font-extrabold text-xs sm:text-sm tracking-wider uppercase flex items-center gap-8">
          <span>🔥 СТАРТ 24.08</span>
          <span className="text-white/60">✦</span>
          <span>ЗНИЖКА -87% ДІЄ СЬОГОДНІ</span>
          <span className="text-white/60">✦</span>
          <span>6 УРОКІВ + БОНУС «ЯК СПАЛИТИ ЖИР»</span>
          <span className="text-white/60">✦</span>
          <span>ДОСТУП НАЗАВЖДИ</span>
          <span className="text-white/60">✦</span>
          <span>🔥 СТАРТ 24.08</span>
          <span className="text-white/60">✦</span>
          <span>ЗНИЖКА -87% ДІЄ СЬОГОДНІ</span>
          <span className="text-white/60">✦</span>
        </div>
      </div>

      {/* =========================================================================
          HERO SECTION (.s1: PHOTO IN BACKGROUND, HEADINGS & OFFER OVERLAID DIRECTLY ON PHOTO)
          ========================================================================= */}
      <section className="relative w-full max-w-[480px] mx-auto px-4 pt-4 pb-8 sm:py-8 flex flex-col items-center">
        
        {/* CONTAINER CARD WITH PHOTO AS HERO BACKGROUND */}
        <div className="relative w-full rounded-3xl overflow-hidden border border-white/15 shadow-2xl bg-black min-h-[640px] sm:min-h-[680px] flex flex-col justify-between p-4 sm:p-5">
          
          {/* PHOTO OF ANASTASIA AS HERO CANVAS */}
          <div className="absolute inset-0 z-0">
            <Image
              src="/images/anastasia_hero_blue.webp"
              alt="Анастасія Сич"
              fill
              priority
              className="object-cover object-[center_15%] filter brightness-95 contrast-105"
              sizes="(max-width: 768px) 100vw, 480px"
            />
            {/* Top dark gradient for heading readability */}
            <div className="absolute inset-x-0 top-0 h-44 bg-gradient-to-b from-black/90 via-black/50 to-transparent" />
            {/* Bottom heavy dark gradient for offer & CTA overlay */}
            <div className="absolute inset-x-0 bottom-0 h-96 bg-gradient-to-t from-black via-black/85 to-transparent" />
          </div>

          {/* TOP GROUP: DATE BADGE & CONDENSED HEADLINES */}
          <div className="relative z-10 flex flex-col items-center text-center space-y-2 pt-1">
            
            {/* DATE BADGE */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 border border-[#EB94A9]/40 text-[#EB94A9] text-xs font-bold uppercase backdrop-blur-md">
              <Calendar className="w-3.5 h-3.5" />
              <span>START: 24 AUGUST</span>
            </div>

            {/* HEADLINE */}
            <div className="space-y-0.5">
              <h1 className="font-league text-5xl sm:text-6xl font-normal text-white uppercase tracking-wide leading-[0.95] drop-shadow-lg">
                ОТРИМАЙ ПЛАСКИЙ ЖИВІТ
              </h1>
              <div className="font-league text-3xl sm:text-4xl font-normal text-[#F01147] uppercase tracking-wide leading-none drop-shadow-md">
                ТА СТРУНКУ ТАЛІЮ
              </div>
            </div>

            <div className="text-[11px] text-slate-300 font-bold uppercase tracking-wider bg-black/40 px-2.5 py-0.5 rounded-full backdrop-blur-sm">
              6 уроків • теорія + практика
            </div>
          </div>

          {/* BOTTOM GROUP OVERLAID DIRECTLY ON PHOTO: OFFER, PRICING & CTA */}
          <div className="relative z-10 flex flex-col items-center text-center space-y-3 pt-24">

            {/* DUAL PRICING COMPARISON ROW */}
            <div className="w-full grid grid-cols-2 gap-2">
              
              {/* ACTIVE RED BOX */}
              <div
                onClick={handleOpenModal}
                className="cursor-pointer p-3 rounded-2xl bg-gradient-to-br from-[#F01147] to-[#B0002B] text-white flex flex-col justify-center items-center shadow-lg border border-[#F01147]/50 hover:scale-[1.02] transition-transform"
              >
                <span className="text-[11px] font-bold text-white/90 uppercase tracking-wide">
                  Сплатіть 1 раз
                </span>
                <span className="font-league text-4xl font-normal leading-none mt-0.5">
                  399 грн
                </span>
              </div>

              {/* STRIKETHROUGH REGULAR PRICE BOX */}
              <div
                onClick={handleOpenModal}
                className="cursor-pointer p-3 rounded-2xl bg-white/10 backdrop-blur-md text-slate-400 flex flex-col justify-center items-center border border-white/15 hover:scale-[1.02] transition-transform"
              >
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                  Звичайна ціна
                </span>
                <span className="font-league text-4xl font-normal leading-none mt-0.5 line-through decoration-slate-400 text-slate-400">
                  2999 грн
                </span>
              </div>

            </div>

            {/* PUNCHY OFFER SUMMARY */}
            <div className="text-xs text-[#EB94A9] font-bold leading-tight drop-shadow">
              <span className="text-white">Перший результат за 7 днів</span> • Без дієт та виснаження
            </div>

            {/* BIG HIGH-IMPACT RED CTA BUTTON */}
            <motion.button
              whileTap={{ scale: 0.98 }}
              animate={{ scale: [1, 1.02, 1] }}
              transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}
              onClick={handleOpenModal}
              className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#F01147] via-[#DB0B3E] to-[#B0002B] text-white font-league text-2xl uppercase tracking-wider shadow-2xl border border-[#F01147]/60 flex items-center justify-center gap-2 cursor-pointer hover:brightness-110 transition-all"
            >
              <span>ОТРИМАТИ МІНІ-КУРС ЗА 399 ГРН</span>
              <ArrowRight className="w-5 h-5 text-white shrink-0" />
            </motion.button>

            {/* TRUST BADGE ROW */}
            <div className="flex items-center justify-center gap-3 text-[11px] font-semibold text-white/80 pt-1">
              <span className="flex items-center gap-1">
                <Star className="w-3 h-3 fill-[#F01147] text-[#F01147]" /> 4.9/5
              </span>
              <span className="text-white/30">•</span>
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-[#059669]" /> Доступ назавжди
              </span>
              <span className="text-white/30">•</span>
              <span className="flex items-center gap-1">
                <Gift className="w-3 h-3 text-[#F01147]" /> + Подарунок
              </span>
            </div>

          </div>

        </div>

      </section>

      {/* =========================================================================
          SECTION 2: WHAT YOU GET (.s9: CLEAN & CRISP)
          ========================================================================= */}
      <section className="py-8 px-4 max-w-[480px] mx-auto space-y-5 border-t border-white/10">

        <div className="text-center space-y-1">
          <h2 className="font-league text-4xl font-normal uppercase tracking-wide leading-none">
            <span className="text-[#F01147]">ЩО ВИ ОТРИМАЄТЕ</span>{" "}
            <span className="text-white">ПІСЛЯ ОПЛАТИ</span>
          </h2>
        </div>

        <div className="space-y-2.5">
          {whatYouGetItems.map((item, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-2xl bg-[#120E10] border border-white/10 flex items-center gap-3.5 shadow-md"
            >
              <div className="w-10 h-10 rounded-xl bg-[#F01147]/20 border border-[#F01147]/40 flex items-center justify-center text-lg shrink-0">
                {item.icon}
              </div>
              <div className="space-y-0.5">
                <h3 className="text-sm font-bold text-white leading-snug">
                  {item.heading}
                </h3>
                <p className="text-xs text-slate-400 font-medium leading-tight">
                  {item.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

      </section>

      {/* =========================================================================
          SECTION 3: EVERYTHING YOU GET TODAY + BONUS (.s25)
          ========================================================================= */}
      <section className="py-8 px-4 max-w-[480px] mx-auto space-y-5 border-t border-white/10">

        <div className="text-center space-y-2">
          <h2 className="font-league text-4xl font-normal uppercase tracking-wide leading-none">
            ВСЕ, ЩО ВИ ОТРИМУЄТЕ <span className="text-[#F01147]">СЬОГОДНІ</span>
          </h2>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-[#B0002B] to-[#660A22] border border-[#F01147]/50 text-white text-xs font-bold shadow-md">
            <Gift className="w-3.5 h-3.5 text-white" />
            <span>Безкоштовний бонус до замовлення</span>
          </div>
        </div>

        {/* 3 CRISP CARDS */}
        <div className="space-y-2.5">
          
          <div className="p-4 rounded-2xl bg-gradient-to-br from-[#1A0E13] to-[#120E10] border border-[#F01147]/40 shadow-lg space-y-1">
            <div className="text-[10px] text-[#EB94A9] font-bold uppercase tracking-wider">
              🎁 БОНУСНИЙ УРОК
            </div>
            <h3 className="font-league text-2xl text-white uppercase tracking-wide">
              «ЯК СПАЛИТИ ЖИР»
            </h3>
            <p className="text-xs text-slate-300 font-medium">
              5 правил здорового схуднення, щоб прибрати жир, а не м'язи.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#120E10] border border-white/10 shadow-md space-y-1">
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              🥗 ПРАКТИЧНИЙ ШАБЛОН
            </div>
            <h3 className="font-league text-2xl text-white uppercase tracking-wide">
              КОНСТРУКТОР ТАРІЛКИ
            </h3>
            <p className="text-xs text-slate-400 font-medium">
              Ситний раціон без зважування їжі та підрахунку калорій.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#120E10] border border-white/10 shadow-md space-y-1">
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              📱 ЗРУЧНИЙ ФОРМАТ
            </div>
            <h3 className="font-league text-2xl text-white uppercase tracking-wide">
              TELEGRAM-БОТ
            </h3>
            <p className="text-xs text-slate-400 font-medium">
              Миттєвий доступ до всіх 6 уроків з будь-якого пристрою назавжди.
            </p>
          </div>

        </div>

        {/* TOTAL SUMMARY BOX */}
        <div
          onClick={handleOpenModal}
          className="cursor-pointer p-5 rounded-3xl bg-gradient-to-r from-[#B0002B] to-[#660A22] border border-[#F01147]/60 shadow-xl flex flex-col items-center text-center gap-3 hover:brightness-105 transition-all"
        >
          <h3 className="font-league text-2xl text-white uppercase tracking-wide leading-tight">
            6 УРОКІВ + БОНУСИ. ОДИН ПЛАТІЖ. ДОСТУП НАЗАВЖДИ.
          </h3>

          <div className="w-full bg-white rounded-full py-2.5 px-6 flex items-center justify-between shadow-lg">
            <div className="text-left text-[#730924] font-bold text-xs uppercase leading-tight font-source">
              Отримати все<br />сьогодні за
            </div>
            <div className="font-league text-4xl font-normal text-[#730924] leading-none">
              399 грн
            </div>
          </div>
        </div>

      </section>

      {/* =========================================================================
          SECTION 4: GUARANTEE (.s3)
          ========================================================================= */}
      <section className="py-6 px-4 max-w-[480px] mx-auto">
        <div className="p-4 rounded-2xl bg-[#120E10] border border-[#EB94A9]/30 shadow-lg flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-[#F01147]/20 border border-[#F01147]/40 flex items-center justify-center shrink-0">
            <Shield className="w-6 h-6 text-[#EB94A9]" />
          </div>
          <div className="space-y-0.5">
            <div className="font-league text-xl text-white uppercase tracking-wide">
              100% МЕДИЧНИЙ ПІДХІД
            </div>
            <p className="text-xs text-slate-300 font-medium leading-tight">
              Система від фітнес-тренерки з вищою медичною освітою та 8 роками досвіду.
            </p>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 5: CLIENT TRANSFORMATIONS (.s6)
          ========================================================================= */}
      <section className="py-8 px-4 max-w-[480px] mx-auto space-y-4 border-t border-white/10" id="cases">

        <div className="flex items-center justify-between">
          <h2 className="font-league text-3xl font-normal text-white uppercase tracking-wide">
            РЕЗУЛЬТАТИ <span className="text-[#F01147]">КЛІЄНТОК</span>
          </h2>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => scrollCarousel("left")}
              className="p-2 rounded-full bg-[#120E10] text-white border border-white/10"
              aria-label="Попередній"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => scrollCarousel("right")}
              className="p-2 rounded-full bg-[#120E10] text-white border border-white/10"
              aria-label="Наступний"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* SWIPER CAROUSEL */}
        <div
          ref={carouselRef}
          className="flex items-stretch gap-3 overflow-x-auto snap-x snap-mandatory py-1 pb-3 scrollbar-none [::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
          style={{ scrollSnapType: "x mandatory", WebkitOverflowScrolling: "touch" }}
        >
          {realCaseGalleries.map((cs) => (
            <div
              key={cs.id}
              onClick={() => setActiveCaseImage(cs.image)}
              className="min-w-[220px] max-w-[240px] snap-start rounded-2xl bg-[#120E10] border border-white/10 overflow-hidden shadow-lg hover:border-[#F01147]/50 transition-all cursor-pointer flex flex-col justify-between group"
            >
              <div className="relative h-48 w-full bg-black overflow-hidden">
                <Image
                  src={cs.image}
                  alt={cs.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                  sizes="240px"
                />
                <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-[#F01147] text-white text-[10px] font-bold uppercase">
                  {cs.badge}
                </div>
                <div className="absolute bottom-2 right-2 p-1.5 rounded-full bg-black/80 text-white">
                  <ZoomIn className="w-3.5 h-3.5 text-[#EB94A9]" />
                </div>
              </div>

              <div className="p-3 space-y-0.5">
                <div className="font-bold text-white text-xs">{cs.title}</div>
                <p className="text-[11px] text-slate-400 font-medium leading-tight">
                  {cs.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

      </section>

      {/* =========================================================================
          SECTION 6: FAQ ACCORDION (.s7)
          ========================================================================= */}
      <section className="py-8 px-4 max-w-[480px] mx-auto space-y-4 border-t border-white/10" id="faq">

        <div className="text-center">
          <h2 className="font-league text-4xl font-normal text-white uppercase tracking-wide">
            FAQ
          </h2>
        </div>

        <div className="space-y-2">
          {faqItems.map((item, idx) => {
            const isOpen = openFaqIndex === idx;
            return (
              <div
                key={idx}
                className="rounded-2xl border border-white/10 bg-[#120E10] overflow-hidden shadow-md"
              >
                <button
                  onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                  className="w-full p-3.5 text-left flex items-center justify-between gap-3 font-bold text-xs sm:text-sm text-white"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-[#F01147]/20 border border-[#F01147]/40 text-[#F01147] font-bold text-[10px] flex items-center justify-center shrink-0">
                      Q
                    </span>
                    <span>{item.q}</span>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 ${
                      isOpen ? "rotate-180 text-[#F01147]" : ""
                    }`}
                  />
                </button>

                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="overflow-hidden"
                    >
                      <div className="px-3.5 pb-3.5 pt-1 text-xs text-slate-300 font-medium leading-relaxed border-t border-white/5">
                        {item.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

      </section>

      {/* =========================================================================
          SECTION 7: FINAL CTA
          ========================================================================= */}
      <section className="py-8 px-4 max-w-[480px] mx-auto text-center space-y-4 border-t border-white/10">

        <h2 className="font-league text-4xl sm:text-5xl font-normal text-white uppercase tracking-wide leading-none">
          ОТРИМАЙ ПЛАСКИЙ ЖИВІТ<br />
          <span className="text-[#F01147]">ТА СТРУНКУ ТАЛІЮ</span>
        </h2>

        <div className="flex items-center justify-center gap-3 font-league text-4xl text-[#F01147]">
          <span>399 грн</span>
          <span className="text-2xl line-through text-slate-500 font-normal">2999 грн</span>
        </div>

        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={handleOpenModal}
          className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-[#F01147] via-[#DB0B3E] to-[#B0002B] text-white font-league text-2xl uppercase tracking-wider shadow-2xl border border-[#F01147]/60 cursor-pointer flex items-center justify-center gap-2 hover:brightness-110"
        >
          <span>ОТРИМАТИ МІНІ-КУРС</span>
          <ArrowRight className="w-5 h-5 text-white" />
        </motion.button>

      </section>

      {/* =========================================================================
          STICKY FLOATING FOOTER BAR
          ========================================================================= */}
      <AnimatePresence>
        {showStickyUI && (
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 60 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-[#0C090A]/95 backdrop-blur-xl border-t border-[#F01147]/40 p-3 shadow-2xl"
          >
            <div className="max-w-[480px] mx-auto flex items-center justify-between gap-2.5">
              
              {/* TIMER */}
              <div className="flex items-center gap-1 font-league text-lg text-white">
                <div className="px-2 py-0.5 rounded bg-black/60 border border-white/10">{timeLeft.hours}</div>
                <span>:</span>
                <div className="px-2 py-0.5 rounded bg-black/60 border border-white/10">{timeLeft.minutes}</div>
                <span>:</span>
                <div className="px-2 py-0.5 rounded bg-black/60 border border-white/10">{timeLeft.seconds}</div>
              </div>

              {/* CTA BUTTON */}
              <button
                onClick={handleOpenModal}
                className="py-2.5 px-5 rounded-xl bg-gradient-to-r from-[#F01147] to-[#B0002B] text-white font-league text-xl uppercase tracking-wider shadow-lg hover:brightness-110 cursor-pointer whitespace-nowrap border border-[#F01147]/60"
              >
                ОТРИМАТИ – 399 грн
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* =========================================================================
          LEAD FORM MODAL
          ========================================================================= */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isSubmitting && setIsModalOpen(false)}
              className="absolute inset-0 bg-black/85 backdrop-blur-md"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md rounded-3xl bg-[#120E10] border border-[#F01147]/50 shadow-2xl p-5 sm:p-6 space-y-4 overflow-hidden z-10 max-h-[92vh] overflow-y-auto"
            >
              <button
                onClick={() => !isSubmitting && setIsModalOpen(false)}
                className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-white bg-white/10"
                aria-label="Закрити"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#F01147]/20 text-[#EB94A9] text-xs font-bold border border-[#F01147]/40">
                  <Calendar className="w-3 h-3" />
                  <span>Старт 24.08 • Доступ назавжди</span>
                </div>
                <h3 className="font-league text-3xl text-white uppercase leading-none pt-1">
                  Отримати міні-курс
                </h3>
              </div>

              <div className="p-3 rounded-2xl bg-[#1A0E13] border border-[#F01147]/40 flex items-center justify-between text-xs font-bold text-slate-200">
                <span>Вартість зі знижкою -87%:</span>
                <div className="flex items-center gap-2">
                  <span className="line-through text-slate-500 font-league text-base">2999 грн</span>
                  <span className="font-league text-3xl text-[#F01147]">399 грн</span>
                </div>
              </div>

              {errorMessage && (
                <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-600 text-rose-300 text-xs font-bold flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-[#EB94A9]" />
                    <span>Ваше ім'я:</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Олена"
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/20 focus:border-[#F01147] outline-none text-sm text-white font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-[#EB94A9]" />
                    <span>Номер телефону (Viber / Telegram):</span>
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="+380"
                    value={formData.phone}
                    onChange={handlePhoneChange}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/20 focus:border-[#F01147] outline-none text-sm text-white font-medium font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-300 flex items-center gap-1">
                      <MessageCircle className="w-3.5 h-3.5 text-[#EB94A9]" />
                      <span>Ваш Telegram:</span>
                    </label>
                    <button
                      type="button"
                      onClick={handleNoTelegramClick}
                      className="text-[11px] text-[#EB94A9] hover:underline font-semibold"
                    >
                      В мене немає нікнейму
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="@username або посилання"
                    value={formData.telegram}
                    onChange={(e) => handleInputChange("telegram", e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/20 focus:border-[#F01147] outline-none text-sm text-white font-medium"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#F01147] via-[#DB0B3E] to-[#B0002B] text-white font-league text-2xl uppercase tracking-wider shadow-xl border border-[#F01147]/50 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition-all hover:brightness-110"
                >
                  {isSubmitting ? (
                    <span>Перенаправлення...</span>
                  ) : (
                    <>
                      <span>Перейти до оплати 399 грн</span>
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* LIGHTBOX MODAL */}
      <AnimatePresence>
        {activeCaseImage && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <button
              onClick={() => setActiveCaseImage(null)}
              className="absolute top-4 right-4 p-2 rounded-full text-white bg-white/10"
              aria-label="Закрити фото"
            >
              <X className="w-6 h-6" />
            </button>
            <div className="relative max-w-xl w-full h-[70vh] rounded-2xl overflow-hidden">
              <Image
                src={activeCaseImage}
                alt="Результат клієнтки"
                fill
                className="object-contain"
                sizes="(max-width: 1024px) 100vw, 600px"
              />
            </div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
