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
  CheckCircle2,
  PlayCircle,
  Sparkles,
  Clock,
  Home,
  Globe,
  Award,
  Flame,
  Check
} from "lucide-react";
import { trackPixelEvent } from "./FacebookPixel";
import {
  formatUkrainianPhone,
  validateUkrainianPhone,
  validateTelegramHandle
} from "@/lib/validation";
import { getMarketingAttribution } from "@/lib/attribution";

interface LeadFormData {
  name: string;
  phone: string;
  telegram: string;
  notes: string;
}

export default function WaistMiniCourseLanding() {
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
      if (window.scrollY > 300) {
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
      const saved = localStorage.getItem("as_waist_form");
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
        localStorage.setItem("as_waist_form", JSON.stringify(next));
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
      const cardWidth = carouselRef.current.firstElementChild?.clientWidth || 300;
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
      offer_variant: "mini-course-waist",
      amount: 279,
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
      const attribution = getMarketingAttribution();
      const pagePath = typeof window !== "undefined" ? window.location.pathname : "/mini-course/waist";
      const pageUrl = typeof window !== "undefined" ? window.location.href : "https://anastasiia-sych.vercel.app/mini-course/waist";

      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...attribution,
          name: formData.name,
          phone: formData.phone,
          telegram: formData.telegram,
          notes: formData.notes || "Міні-курс: Плаский живіт та чітка талія (279 грн)",
          offer_variant: "mini-course-waist",
          amount: 279.0,
          currency: "UAH",
          product_type: "tripwire",
          page_path: pagePath,
          page_url: pageUrl,
        }),
      });

      const data = await response.json();

      if (response.ok && data.status === "success") {
        trackPixelEvent("Lead", {
          offer_variant: "mini-course-waist",
          value: 279,
          currency: "UAH",
        });

        if (data.wayforpayData) {
          submitWayForPayForm(data.wayforpayData);
        } else {
          window.location.href = "https://secure.wayforpay.com";
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

  // 3 БЛОК: Pain points items
  const problemItems = [
    {
      num: "01",
      text: "Живіт випирає, навіть коли ви намагаєтесь харчуватися правильно.",
    },
    {
      num: "02",
      text: "Хочеться більш вираженої талії, але звичайні вправи на прес не дають того ефекту, якого ви очікуєте.",
    },
    {
      num: "03",
      text: "Качаєте прес, а болить поперек?",
    },
    {
      num: "04",
      text: "Починаєте тренуватися, але швидко кидаєте, бо навантаження занадто важке.",
    },
    {
      num: "05",
      text: "Постійно думаєте, що для результату потрібно ще сильніше обмежити харчування.",
    },
    {
      num: "06",
      text: "Після чергової спроби з'являються зриви та переїдання.",
    },
    {
      num: "07",
      text: "Хочеться змінити живіт і талію, але незрозуміло, з чого саме почати.",
    },
  ];

  // 5 БЛОК: Course lessons
  const courseLessons = [
    {
      num: "1",
      tag: "УРОК 1",
      title: "Чому живіт випирає?",
      desc: "Розберемо анатомію та біомеханіку живота і визначимо, над чим саме будемо працювати.",
    },
    {
      num: "2",
      tag: "УРОК 2",
      title: "Практичні вправи для плаского живота",
      desc: "Покажу вправи, які допоможуть працювати з м'язами живота та контролем положення тіла.",
    },
    {
      num: "3",
      tag: "УРОК 3",
      title: "Талія робиться на кухні",
      desc: "Розберемо, чому для плаского живота та вираженої талії важливо працювати не тільки з м'язами, а й зі складом тіла. Поговоримо про харчування під час роботи над тілом і чому під час схуднення важливо зберігати м'язи.",
    },
    {
      num: "4",
      tag: "УРОК 4",
      title: "Вправи для стрункої талії",
      desc: "Практичний комплекс для роботи над м'язами корпусу та формуванням більш вираженої талії.",
    },
    {
      num: "5",
      tag: "УРОК 5",
      title: "Full Body — тренування на все тіло",
      desc: "Повноцінне тренування для формування сильного м'язового каркасу.",
    },
  ];

  // 7 БЛОК: What you will understand
  const understandingItems = [
    "чому саме у вас випирає живіт;",
    "які вправи варто виконувати для роботи з животом;",
    "як працювати над талією;",
    "чому важливо тренувати не тільки прес, а все тіло;",
    "як харчування впливає на результат;",
    "як не загнати себе обмеженнями;",
    "як поступово сформувати звички, які допоможуть закріпити результат.",
  ];

  // 8 БЛОК: For whom
  const targetItems = [
    "хочете попрацювати саме з животом і талією;",
    "не хочете виснажливих тренувань;",
    "не хочете сидіти на дієтах;",
    "часто починаєте тренуватися, але швидко кидаєте;",
    "хочете зрозуміти, які вправи дійсно варто робити;",
    "хочете не просто схуднути, а сформувати сильне та підтягнуте тіло.",
  ];

  // 10 БЛОК: Cases
  const realCaseGalleries = [
    {
      id: 1,
      title: "Ярославна, 34 р",
      badge: "Результат за 3 міс",
      desc: "-12 кг, -5 см в талії, -4 см в стегнах, +об'ємна попа, +рельєфний прес",
      image: "/images/cases/case_5.webp",
    },
    {
      id: 2,
      title: "Наталі, 36 р",
      badge: "Результат за 3 міс",
      desc: "-5 кг, -4 см в талії, -3 см в стегнах",
      image: "/images/cases/case_natali.png",
    },
    {
      id: 3,
      title: "Ірина, 38 р, 2 дітей",
      badge: "Результат за 2 місяці",
      desc: "-4 кг, -10 см в талії, -5 см в стегнах, мінус целюліт",
      image: "/images/cases/case_irina.jpg",
    },
    {
      id: 4,
      title: "Настя, 28 р",
      badge: "Результат за 3 міс",
      desc: "-8 кг, -6 см в талії і стегнах, мінус постійний голод",
      image: "/images/cases/case_3.webp",
    },
  ];

  // 12 БЛОК: FAQ
  const faqItems = [
    {
      q: "1. Скільки триває міні-курс?",
      a: "Курс складається з 5 основних уроків та бонусного уроку. Ви можете проходити їх у зручному для себе темпі.",
    },
    {
      q: "2. Чи підійде курс, якщо я тренуюся вдома?",
      a: "Так. Вправи підібрані так, щоб їх можна було виконувати без складного обладнання.",
    },
    {
      q: "3. Чи потрібно сидіти на дієті?",
      a: "Ні. У курсі ми не будуємо результат на жорстких обмеженнях у харчуванні.",
    },
    {
      q: "4. Чи потрібно тренуватися щодня?",
      a: "Ні. Важливіше правильно підібране навантаження та регулярність, а не тренування до виснаження.",
    },
    {
      q: "5. Чи підійде курс, якщо я давно не тренувалася?",
      a: "Так. Ви зможете почати поступово та адаптувати навантаження під свій рівень.",
    },
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc] text-[#0f172a] selection:bg-[#0284c7] selection:text-white pb-24 sm:pb-20 font-sans">

      {/* TOP TICKER BANNER (APPEARS ON SCROLL DOWN) */}
      <AnimatePresence>
        {showStickyUI && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-[#0284c7] text-white py-2 overflow-hidden border-b border-[#0369a1] shadow-md fixed top-0 left-0 right-0 z-40"
          >
            <div className="animate-marquee font-extrabold text-xs sm:text-sm tracking-wider uppercase flex items-center gap-8 whitespace-nowrap">
              <span>🔥 СТАРТ 27.08 | 6 УРОКІВ</span>
              <span className="text-[#bae6fd]">✦</span>
              <span>ЗНИЖКА -91% ДІЄ СЬОГОДНІ</span>
              <span className="text-[#bae6fd]">✦</span>
              <span>ПЛАСКИЙ ЖИВІТ ТА ЧІТКА ТАЛІЯ</span>
              <span className="text-[#bae6fd]">✦</span>
              <span>АНАСТАСІЯ СИЧ</span>
              <span className="text-[#bae6fd]">✦</span>
              <span>ДОСТУП ДО МАТЕРІАЛІВ ОНЛАЙН</span>
              <span className="text-[#bae6fd]">✦</span>
              <span>🔥 СТАРТ 27.08 | 6 УРОКІВ</span>
              <span className="text-[#bae6fd]">✦</span>
              <span>ЗНИЖКА -91% ДІЄ СЬОГОДНІ</span>
              <span className="text-[#bae6fd]">✦</span>
              <span>ПЛАСКИЙ ЖИВІТ ТА ЧІТКА ТАЛІЯ</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* =========================================================================
          1 БЛОК + 2 БЛОК: HERO SECTION (FULL HEIGHT BACKGROUND PHOTO, BOTTOM-ANCHORED CONTENT)
          ========================================================================= */}
      <section className="relative min-h-[100dvh] sm:min-h-[92vh] flex flex-col justify-between pt-4 pb-6 px-4 sm:px-6 overflow-hidden">
        {/* HERO BACKGROUND PHOTO WITH LIGHT GRADIENT OVERLAY */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/images/anastasia_hero_blue.webp"
            alt="Анастасія Сич - Фітнес тренерка"
            fill
            priority
            className="object-cover object-[center_20%] sm:object-[center_15%] filter brightness-102 contrast-[1.03]"
            sizes="100vw"
          />
          {/* Subtle light gradient from bottom for maximum legibility */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#f8fafc] via-[#f8fafc]/90 via-45% to-transparent to-70% sm:bg-gradient-to-r sm:from-[#f8fafc] sm:via-[#f8fafc]/90 sm:to-transparent z-10" />
        </div>

        {/* TOP BADGE: START DATE (1 БЛОК) */}
        <div className="relative z-20 max-w-4xl mx-auto w-full pt-2">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/95 border border-slate-200 text-slate-800 text-xs sm:text-sm font-bold backdrop-blur-md shadow-sm">
            <span className="font-extrabold text-[#0284c7]">МІНІ-КУРС</span>
            <span className="text-slate-300">|</span>
            <div className="flex items-center gap-1.5 text-slate-800">
              <Calendar className="w-3.5 h-3.5 text-[#0284c7]" />
              <span>СТАРТ <b>27.08</b> | <b>6 УРОКІВ</b></span>
            </div>
          </div>
        </div>

        {/* 1 БЛОК & 2 БЛОК CONTENT: ANCHORED AT BOTTOM */}
        <div className="max-w-4xl mx-auto w-full relative z-20 mt-auto space-y-3.5 max-w-xl pb-2">
          
          {/* 1 БЛОК: MAIN HEADLINE */}
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-extrabold leading-tight text-slate-900 tracking-tight drop-shadow-sm uppercase">
            Позбудься випираючого живота та створи чітку талію з перших тренувань
          </h1>

          {/* 1 БЛОК: 3 BULLETS */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center gap-2 text-slate-800 text-sm sm:text-base font-semibold">
              <span className="w-2 h-2 rounded-full bg-[#0284c7] shrink-0" />
              <span>без обмежень в їжі</span>
            </div>
            <div className="flex items-center gap-2 text-slate-800 text-sm sm:text-base font-semibold">
              <span className="w-2 h-2 rounded-full bg-[#0284c7] shrink-0" />
              <span>без зривів</span>
            </div>
            <div className="flex items-center gap-2 text-slate-800 text-sm sm:text-base font-semibold">
              <span className="w-2 h-2 rounded-full bg-[#0284c7] shrink-0" />
              <span>за перевіреною системою</span>
            </div>
          </div>

          {/* 2 БЛОК: 1-LINE PRICE ROW */}
          <div className="flex items-center gap-2.5 font-extrabold pt-2 whitespace-nowrap">
            <span className="text-3xl sm:text-4xl font-extrabold text-[#0284c7] font-accent">
              279 грн
            </span>
            <span className="text-base sm:text-xl line-through text-slate-400 font-bold">
              2999 грн
            </span>
            <span className="text-[10px] sm:text-xs px-2.5 py-1 rounded-full bg-[#059669] text-white font-bold uppercase shadow-sm">
              -91% знижка
            </span>
          </div>

          {/* 2 БЛОК: CTA BUTTON */}
          <motion.button
            whileTap={{ scale: 0.97 }}
            animate={{ scale: [1, 1.02, 1] }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            onClick={handleOpenModal}
            className="w-full py-4 px-4 rounded-xl bg-gradient-to-r from-[#0284c7] to-[#0369a1] text-white font-extrabold text-sm sm:text-base shadow-xl glow-primary flex items-center justify-center gap-2 cursor-pointer border border-[#0284c7]/30 uppercase tracking-wide whitespace-nowrap"
          >
            <span>ОТРИМАТИ МІНІ-КУРС</span>
            <ArrowRight className="w-5 h-5 text-sky-200 shrink-0" />
          </motion.button>

          {/* 2 БЛОК: 3 SHORT BENEFITS UNDER CTA */}
          <div className="grid grid-cols-3 gap-2 text-center text-[11px] sm:text-xs font-semibold text-slate-700 pt-1">
            <div className="flex items-center justify-center gap-1.5 bg-white/70 py-1.5 px-1 rounded-lg border border-slate-200/60 shadow-xs">
              <PlayCircle className="w-3.5 h-3.5 text-[#0284c7] shrink-0" />
              <span className="leading-tight">5 практичних уроків</span>
            </div>
            <div className="flex items-center justify-center gap-1.5 bg-white/70 py-1.5 px-1 rounded-lg border border-slate-200/60 shadow-xs">
              <Home className="w-3.5 h-3.5 text-[#0284c7] shrink-0" />
              <span className="leading-tight">тренування для дому</span>
            </div>
            <div className="flex items-center justify-center gap-1.5 bg-white/70 py-1.5 px-1 rounded-lg border border-slate-200/60 shadow-xs">
              <Globe className="w-3.5 h-3.5 text-[#059669] shrink-0" />
              <span className="leading-tight">доступ онлайн</span>
            </div>
          </div>

        </div>
      </section>

      {/* =========================================================================
          3 БЛОК: PAIN POINTS (01 - 06)
          ========================================================================= */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 bg-white border-b border-slate-200" id="pain-points">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <span className="text-[#0284c7] text-xs font-bold uppercase tracking-widest">Діагностика ситуації</span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 leading-tight">
              Можливо, ви впізнаєте себе в одному з цих пунктів:
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {problemItems.map((item, idx) => (
              <div
                key={idx}
                className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 flex items-start gap-3.5 shadow-xs hover:border-sky-200 transition-colors"
              >
                <div className="px-2.5 py-1 rounded-lg bg-sky-100 text-[#0284c7] font-extrabold text-xs shrink-0 mt-0.5">
                  {item.num}
                </div>
                <span className="text-sm sm:text-base font-medium leading-snug">{item.text}</span>
              </div>
            ))}
          </div>

          <div className="glass-card p-5 sm:p-6 rounded-2xl border border-sky-200 text-center max-w-2xl mx-auto space-y-2 bg-sky-50/60 shadow-sm">
            <p className="text-slate-900 font-bold text-sm sm:text-base leading-relaxed">
              Якщо ви впізнали себе хоча б у <span className="text-[#0284c7] font-extrabold">2-х пунктах</span> — проблема не у вас, а у відсутності комплексної системи роботи з тілом.
            </p>
          </div>
        </div>
      </section>

      {/* =========================================================================
          4 БЛОК: CORE METHODOLOGY INSIGHT
          ========================================================================= */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 max-w-5xl mx-auto" id="methodology">
        <div className="glass-card p-6 sm:p-10 rounded-3xl border border-slate-200 grid grid-cols-1 md:grid-cols-12 gap-8 items-center relative overflow-hidden bg-white shadow-md">
          
          <div className="md:col-span-7 space-y-5 text-left">
            <span className="text-[#0284c7] text-xs font-bold uppercase tracking-widest">Ключовий принцип</span>

            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 leading-tight">
              Щоб змінити живіт, недостатньо просто качати прес
            </h2>

            <div className="space-y-3 text-sm sm:text-base text-slate-800 leading-relaxed font-medium">
              <p className="font-bold text-[#0284c7] text-base sm:text-lg">
                Випираючий живіт може бути пов'язаний не тільки з кількістю жиру.
              </p>
              <p className="text-slate-700 font-medium">
                Важливо розуміти, як працюють м'язи живота, положення таза, постава та рухи вашого тіла.
              </p>
              <p className="text-slate-700 font-medium">
                Саме тому на курсі ми почнемо не з сотні скручувань, а з розуміння, чому живіт виглядає саме так і над чим вам потрібно працювати.
              </p>
            </div>

            {/* ВИДІЛЕНИЙ БЛОК */}
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-sky-50 to-blue-50/70 border border-sky-200 text-slate-900 font-extrabold text-sm sm:text-base leading-snug shadow-xs">
              <span className="text-[#0284c7]">Спочатку розуміємо причину</span> → <span className="text-[#0284c7]">потім підбираємо вправи</span> → <span className="text-[#059669]">закріплюємо результат</span> системною роботою з усім тілом.
            </div>
          </div>

          <div className="md:col-span-5 relative h-72 sm:h-80 rounded-2xl overflow-hidden border border-slate-200 shadow-lg">
            <Image
              src="/images/expert_flying.webp"
              alt="Анастасія Сич - робота з м'язами та поставою"
              fill
              loading="lazy"
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 40vw"
            />
          </div>

        </div>
      </section>

      {/* =========================================================================
          5 БЛОК: COURSE CURRICULUM (5 LESSONS)
          ========================================================================= */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 bg-slate-50 border-y border-slate-200" id="curriculum">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <span className="text-[#0284c7] text-xs font-bold uppercase tracking-widest">Програма міні-курсу</span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900">
              Що ви отримаєте на міні-курсі
            </h2>
            <p className="text-slate-500 text-xs sm:text-sm font-semibold">
              5 структурованих практичних уроків + покрокові рекомендації
            </p>
          </div>

          <div className="space-y-4">
            {courseLessons.map((lesson, idx) => (
              <div
                key={idx}
                className="glass-card p-5 sm:p-6 rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow space-y-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-100 text-[#0284c7] text-xs font-extrabold">
                    <PlayCircle className="w-3.5 h-3.5" />
                    <span>{lesson.tag}</span>
                  </div>
                  <span className="text-[11px] font-bold text-slate-400">Відеоурок + практика</span>
                </div>

                <h3 className="text-lg sm:text-xl font-bold text-slate-900">
                  {lesson.title}
                </h3>

                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
                  {lesson.desc}
                </p>
              </div>
            ))}
          </div>

          <div className="text-center pt-2">
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={handleOpenModal}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-[#0284c7] to-[#0369a1] text-white font-bold text-base sm:text-lg shadow-xl glow-primary uppercase tracking-wide cursor-pointer"
            >
              Отримати міні-курс за 279 грн
            </motion.button>
          </div>
        </div>
      </section>

      {/* =========================================================================
          6 БЛОК: DEDICATED BONUS LESSON
          ========================================================================= */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 max-w-4xl mx-auto" id="bonus">
        <div className="glass-card p-6 sm:p-10 rounded-3xl border-2 border-dashed border-sky-300 bg-gradient-to-br from-sky-50/70 via-white to-white shadow-lg space-y-6 relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-40 h-40 bg-sky-200/40 rounded-full blur-2xl pointer-events-none" />

          <div className="space-y-4 relative z-10">
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#059669] text-white text-xs font-extrabold shadow-sm uppercase tracking-wider">
              <Gift className="w-3.5 h-3.5" />
              <span>БОНУС</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-tight">
              Як закріпити результат і не повернутися до старих звичок
            </h2>

            <div className="space-y-3 text-slate-700 text-sm sm:text-base font-medium leading-relaxed">
              <p className="font-bold text-slate-900">
                Я додала окремий урок про звички та маленькі кроки.
              </p>
              <p>
                Вам не потрібно намагатися змінити все одразу.
              </p>
              <p>
                Коли ви одночасно беретеся за харчування, тренування, режим, сон і ще десять речей — дуже легко втратити мотивацію та все кинути.
              </p>
              <p className="font-semibold text-[#0284c7]">
                Тому я покажу, як працювати з однією конкретною зоною і робити маленькі кроки, які реально вписати у ваше життя.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          7 БЛОК: AFTER MINI-COURSE UNDERSTANDING
          ========================================================================= */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 bg-white border-y border-slate-200" id="outcomes">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <span className="text-[#0284c7] text-xs font-bold uppercase tracking-widest">Результати навчання</span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900">
              Після міні-курсу ви будете розуміти:
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {understandingItems.map((item, idx) => (
              <div
                key={idx}
                className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center gap-3.5 shadow-xs"
              >
                <div className="p-2 rounded-xl bg-sky-100 text-[#0284c7] shrink-0">
                  <Check className="w-5 h-5 text-[#0284c7]" />
                </div>
                <span className="text-slate-900 font-semibold text-sm sm:text-base leading-snug">
                  {item}
                </span>
              </div>
            ))}
          </div>

          <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-sky-50 via-white to-sky-50 border border-sky-200 text-center max-w-2xl mx-auto shadow-sm">
            <p className="text-slate-900 font-extrabold text-base sm:text-lg leading-relaxed">
              Не просто зробите кілька вправ, а зрозумієте, як працювати з животом і талією системно.
            </p>
          </div>
        </div>
      </section>

      {/* =========================================================================
          8 БЛОК: WHO THIS COURSE IS FOR
          ========================================================================= */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 max-w-4xl mx-auto" id="target-audience">
        <div className="space-y-8">
          <div className="text-center space-y-2">
            <span className="text-[#0284c7] text-xs font-bold uppercase tracking-widest">Для кого курс</span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900">
              Цей міні-курс для вас, якщо ви:
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {targetItems.map((item, idx) => (
              <div
                key={idx}
                className="glass-card p-4 sm:p-5 rounded-2xl border border-slate-200 flex items-center gap-3.5 bg-white shadow-xs"
              >
                <div className="p-2 rounded-xl bg-emerald-100 text-[#059669] shrink-0">
                  <CheckCircle2 className="w-5 h-5 text-[#059669]" />
                </div>
                <span className="text-slate-900 font-semibold text-sm sm:text-base leading-snug">
                  {item}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================================
          9 БЛОК: ABOUT THE AUTHOR (ANASTASIA SYCH)
          ========================================================================= */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 max-w-5xl mx-auto border-t border-slate-200" id="author">
        <div className="glass-card p-6 sm:p-12 rounded-3xl border border-slate-200 space-y-8 bg-white shadow-md">
          <div className="max-w-3xl space-y-2 text-left">
            <span className="text-[#0284c7] text-xs font-bold uppercase tracking-widest">Ваш тренер</span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 leading-tight">
              Привіт! Я — Анастасія Сич
            </h2>
            <p className="text-slate-500 text-sm font-semibold">
              Фітнес-тренерка з 8-річним досвідом та вищою медичною освітою
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* PHOTO PLACED FIRST BEFORE TEXT */}
            <div className="lg:col-span-5 order-1 flex justify-center">
              <div className="w-full max-w-sm h-96 rounded-2xl overflow-hidden border border-slate-200 relative shadow-lg">
                <Image
                  src="/images/anastasia_portrait_black.webp"
                  alt="Анастасія Сич"
                  fill
                  loading="lazy"
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 35vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent" />
                <div className="absolute bottom-3 left-3 right-3 p-2.5 rounded-xl bg-white/90 backdrop-blur-md border border-slate-200 text-center shadow-md">
                  <span className="text-xs font-bold text-slate-900">Анастасія Сич</span>
                </div>
              </div>
            </div>

            {/* TEXT CONTENT */}
            <div className="lg:col-span-7 order-2 space-y-4 text-sm sm:text-base text-slate-800 leading-relaxed font-medium">
              <p className="font-semibold text-slate-900">
                Я працюю з тілом комплексно: поєдную тренування, здорові харчові звички та принципи відновлення.
              </p>

              <p className="text-slate-700">
                Маю вищу медичну освіту, тому добре розумію, як працює тіло і як підбирати навантаження з урахуванням його особливостей.
              </p>

              <p className="text-slate-700">
                Моя задача — не просто дати вам набір вправ, а допомогти зрозуміти, що саме ви робите і навіщо.
              </p>

              <div className="p-4 sm:p-5 rounded-2xl bg-[#f0f9ff] border border-sky-200 space-y-2 text-slate-800 shadow-xs">
                <p className="font-bold text-slate-900">
                  Мій підхід — не «робіть більше і їжте менше».
                </p>
                <p className="text-[#0284c7] font-extrabold">
                  Мій підхід — зрозуміти, що працює саме для вашого тіла, і поступово зробити це частиною вашого життя.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          10 БЛОК: TRANSFORMATION CASES CAROUSEL
          ========================================================================= */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 bg-white border-t border-slate-200" id="cases">
        <div className="max-w-5xl mx-auto space-y-6">

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[#0284c7] text-xs font-bold uppercase tracking-widest">Результати учасниць</span>
              <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900">
                Подивіться, як дівчата змінюють своє тіло разом зі мною
              </h2>
              <p className="text-xs sm:text-sm text-slate-500">
                Свайпайте вбік для перегляду всіх фото трансформацій:
              </p>
            </div>

            {/* CAROUSEL CONTROLS */}
            <div className="hidden sm:flex items-center gap-2 shrink-0">
              <button
                onClick={() => scrollCarousel("left")}
                className="p-2.5 rounded-full bg-slate-100 hover:bg-sky-100 text-slate-700 hover:text-[#0284c7] transition-colors border border-slate-200"
                aria-label="Попередній кейс"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => scrollCarousel("right")}
                className="p-2.5 rounded-full bg-slate-100 hover:bg-sky-100 text-slate-700 hover:text-[#0284c7] transition-colors border border-slate-200"
                aria-label="Наступний кейс"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* HORIZONTAL SWIPEABLE CAROUSEL */}
          <div
            ref={carouselRef}
            className="flex items-stretch gap-4 overflow-x-auto snap-x snap-mandatory py-2 pb-4 touch-pan-x touch-pan-y scrollbar-none [::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
            style={{ scrollSnapType: "x mandatory", WebkitOverflowScrolling: "touch" }}
          >
            {realCaseGalleries.map((cs) => (
              <div
                key={cs.id}
                onClick={() => setActiveCaseImage(cs.image)}
                className="snap-center shrink-0 w-[85vw] max-w-[340px] sm:w-[360px] glass-card rounded-3xl border border-slate-200 overflow-hidden bg-white shadow-md hover:shadow-xl transition-all duration-300 flex flex-col justify-between cursor-pointer group"
              >
                <div className="relative w-full h-80 sm:h-96 bg-slate-100 overflow-hidden">
                  <Image
                    src={cs.image}
                    alt={cs.title}
                    fill
                    loading="lazy"
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    sizes="(max-width: 768px) 340px, 360px"
                  />
                  <div className="absolute inset-0 bg-slate-900/10 group-hover:bg-slate-900/30 transition-colors duration-300 flex items-center justify-center">
                    <div className="p-3 rounded-full bg-white/95 text-slate-900 shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center gap-2 text-xs font-bold">
                      <ZoomIn className="w-4 h-4 text-[#0284c7]" />
                      <span>Збільшити фото</span>
                    </div>
                  </div>
                  <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-white/95 backdrop-blur-md text-[#0284c7] font-bold text-xs shadow-md border border-sky-100">
                    {cs.badge}
                  </div>
                </div>

                <div className="p-5 space-y-2 bg-white">
                  <h3 className="text-lg font-bold text-slate-900">{cs.title}</h3>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">{cs.desc}</p>
                  <div className="pt-2 flex items-center justify-between text-xs text-[#0284c7] font-bold">
                    <span>Натисніть для перегляду фото</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* =========================================================================
          11 БЛОК: PRE-FOOTER OFFER & CTA
          ========================================================================= */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 max-w-4xl mx-auto text-center" id="final-offer">
        <div className="glass-card p-6 sm:p-12 rounded-3xl border border-sky-200 bg-gradient-to-b from-white via-white to-sky-50/70 space-y-6 shadow-xl relative overflow-hidden">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-sky-100 text-[#0284c7] text-xs sm:text-sm font-bold border border-sky-200">
            <Sparkles className="w-4 h-4 text-[#0284c7]" />
            <span>Старт 27.08 | Онлайн доступ</span>
          </div>

          <h2 className="text-[22px] sm:text-3xl font-extrabold text-slate-900 leading-snug max-w-2xl mx-auto uppercase">
            Почніть не з чергової дієти, а з розуміння свого тіла
          </h2>

          <div className="space-y-2 text-slate-600 text-xs sm:text-sm max-w-xl mx-auto font-medium">
            <p>
              Ви вже знаєте, що просто «менше їсти і більше тренуватися» не завжди працює.
            </p>
            <p>
              На міні-курсі я покажу, як працювати з животом і талією системно — через тренування, харчування та поступове формування звичок.
            </p>
          </div>

          <div className="flex items-center justify-center gap-2.5 sm:gap-3 font-extrabold pt-2 whitespace-nowrap">
            <span className="text-3xl sm:text-4xl text-[#0284c7] font-accent">279 грн</span>
            <span className="text-sm sm:text-base line-through text-slate-400 font-bold">2999 грн</span>
            <span className="text-[10px] sm:text-xs px-2.5 py-1 rounded-full bg-[#059669] text-white font-bold uppercase shadow-sm">
              -91% знижка
            </span>
          </div>

          <div className="pt-2 max-w-md mx-auto">
            <motion.button
              whileTap={{ scale: 0.96 }}
              animate={{ scale: [1, 1.02, 1] }}
              transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
              onClick={handleOpenModal}
              className="w-full py-4 px-4 rounded-2xl bg-gradient-to-r from-[#0284c7] to-[#0369a1] text-white font-extrabold text-sm sm:text-base shadow-xl glow-primary cursor-pointer flex items-center justify-center gap-2 border border-[#0284c7]/30 uppercase tracking-wide whitespace-nowrap"
            >
              <span>ОТРИМАТИ МІНІ-КУРС</span>
              <ArrowRight className="w-5 h-5 text-sky-200 shrink-0" />
            </motion.button>
          </div>
        </div>
      </section>

      {/* =========================================================================
          12 БЛОК: FAQ ACCORDION (5 QUESTIONS)
          ========================================================================= */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 max-w-3xl mx-auto" id="faq">
        <div className="space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900">Часті запитання (FAQ)</h2>
            <p className="text-slate-500 text-xs sm:text-sm font-semibold">Відповіді на запитання щодо проходження курсу</p>
          </div>

          <div className="space-y-3.5">
            {faqItems.map((item, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div key={idx} className="glass-card rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-sm">
                  <button
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 font-bold text-slate-900 text-sm sm:text-base hover:text-[#0284c7] transition-colors"
                  >
                    <span>{item.q}</span>
                    <ChevronDown className={`w-5 h-5 text-[#0284c7] transition-transform duration-300 shrink-0 ${isOpen ? "rotate-180" : ""}`} />
                  </button>

                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4 sm:px-5 sm:pb-5 text-xs sm:text-sm text-slate-600 border-t border-slate-100 pt-3 leading-relaxed font-medium">
                          {item.a}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-8 px-4 text-center text-xs text-slate-500 border-t border-slate-200 bg-white font-medium">
        <p>© 2026 Анастасія Сич. Всі права захищено. Міні-курс «Плаский живіт та чітка талія».</p>
      </footer>

      {/* STICKY BOTTOM MOBILE CTA BAR */}
      <AnimatePresence>
        {showStickyUI && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-0 left-0 right-0 z-[9990] p-2.5 sm:p-3 bg-white/95 backdrop-blur-xl border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.12)] flex items-center justify-between gap-2 overflow-hidden"
          >
            <div className="flex flex-col shrink-0">
              <span className="text-[9px] sm:text-[10px] text-slate-600 font-bold uppercase tracking-wider">Старт 27.08 • 6 уроків</span>
              <div className="flex items-baseline gap-1 font-extrabold">
                <span className="text-sm sm:text-lg text-[#0284c7]">279 грн</span>
                <span className="line-through text-[10px] text-slate-400">2999 грн</span>
              </div>
            </div>

            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleOpenModal}
              className="px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl bg-gradient-to-r from-[#0284c7] to-[#0369a1] text-white font-extrabold text-xs sm:text-sm shadow-lg glow-primary cursor-pointer flex items-center gap-1.5 border border-[#0284c7]/40 shrink-0 uppercase tracking-tight whitespace-nowrap"
            >
              <Sparkles className="w-3.5 h-3.5 text-sky-200 shrink-0" />
              <span>Отримати міні-курс</span>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CASE IMAGE LIGHTBOX MODAL */}
      <AnimatePresence>
        {activeCaseImage && (
          <div
            onClick={() => setActiveCaseImage(null)}
            className="fixed inset-0 z-[999999] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
          >
            <button
              onClick={() => setActiveCaseImage(null)}
              className="absolute top-4 right-4 p-3 text-white bg-white/10 hover:bg-white/20 rounded-full backdrop-blur-md"
            >
              <X className="w-6 h-6" />
            </button>
            <div
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-4xl max-h-[88vh] w-full h-full flex items-center justify-center"
            >
              <Image
                src={activeCaseImage}
                alt="Перегляд кейсу"
                fill
                className="object-contain rounded-2xl"
              />
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* LEAD REGISTRATION MODAL */}
      <AnimatePresence>
        {isModalOpen && (
          <div
            onClick={() => setIsModalOpen(false)}
            className="fixed inset-0 z-[99999] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-lg bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 my-auto text-slate-900 max-h-[90vh] overflow-y-auto"
            >
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 rounded-full bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="space-y-5">
                <div className="space-y-1.5">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-50 text-[#0284c7] text-xs font-bold border border-sky-100">
                    <span>Старт 27.08 • Доступ онлайн</span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900">
                    Отримати міні-курс
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 font-medium">
                    Заповніть контактні дані для отримання доступу до матеріалів курсу:
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">Вартість міні-курсу:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs line-through text-slate-400 font-bold">2999 грн</span>
                    <span className="text-lg font-extrabold text-[#0284c7]">279 грн</span>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {errorMessage && (
                    <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
                      {errorMessage}
                    </div>
                  )}

                  {/* Name input */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Ваше ім'я *</label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => handleInputChange("name", e.target.value)}
                        placeholder="Олена"
                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-[#0284c7] focus:bg-white text-slate-900 text-sm font-semibold outline-none transition-all placeholder:text-slate-400"
                      />
                    </div>
                  </div>

                  {/* Phone input */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Номер телефону *</label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="tel"
                        required
                        value={formData.phone}
                        onChange={handlePhoneChange}
                        placeholder="+380 50 123 45 67"
                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-[#0284c7] focus:bg-white text-slate-900 text-sm font-semibold outline-none transition-all placeholder:text-slate-400 font-mono"
                      />
                    </div>
                  </div>

                  {/* Telegram input */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700">Telegram нікнейм *</label>
                      <button
                        type="button"
                        onClick={handleNoTelegramClick}
                        className="text-[11px] text-[#0284c7] hover:underline font-semibold"
                      >
                        В мене немає нікнейму
                      </button>
                    </div>
                    <div className="relative">
                      <MessageCircle className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        required
                        value={formData.telegram}
                        onChange={(e) => handleInputChange("telegram", e.target.value)}
                        placeholder="@username"
                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-[#0284c7] focus:bg-white text-slate-900 text-sm font-semibold outline-none transition-all placeholder:text-slate-400"
                      />
                    </div>
                  </div>

                  {/* SUBMIT BUTTON */}
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    disabled={isSubmitting}
                    type="submit"
                    className="w-full py-4 rounded-xl bg-gradient-to-r from-[#0284c7] to-[#0369a1] text-white font-extrabold text-sm sm:text-base shadow-xl glow-primary cursor-pointer flex items-center justify-center gap-2 border border-[#0284c7]/30 uppercase tracking-wide disabled:opacity-70 mt-2"
                  >
                    {isSubmitting ? (
                      <span>Перенаправлення на оплату...</span>
                    ) : (
                      <>
                        <span>Перейти до оплати 279 грн</span>
                        <ArrowRight className="w-5 h-5 text-sky-200" />
                      </>
                    )}
                  </motion.button>

                  <div className="flex items-center justify-center gap-2 text-[11px] text-slate-500 font-semibold text-center pt-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#059669]" />
                    <span>Безпечна оплата через WayForPay (Apple Pay / Google Pay / Карта)</span>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
