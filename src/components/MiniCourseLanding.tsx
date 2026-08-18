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
  CheckCircle2,
  XCircle,
  PlayCircle,
  RotateCw,
  Award,
  GraduationCap,
  Clock
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
      if (window.scrollY > 350) {
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

  // 4 Block: What you get on mini-course (5 video preview items)
  const courseLessons = [
    {
      num: "1",
      title: "Зрозумієте, що реально впливає на живіт і талію",
      desc: "Без хаотичних порад з TikTok та Instagram.",
      tag: "КРОК 01",
    },
    {
      num: "2",
      title: "Розберете харчування",
      desc: "Зрозумієте, що варто змінити в раціоні, щоб не жити в постійному обмеженні.",
      tag: "КРОК 02",
    },
    {
      num: "3",
      title: "Навчитеся тренуватися без виснаження",
      desc: "Зрозумієте, яке навантаження потрібне для вашої цілі.",
      tag: "КРОК 03",
    },
    {
      num: "4",
      title: "Побачите, де самі гальмуєте свій результат",
      desc: "Харчування, режим, тренування, відновлення — побачите систему цілком.",
      tag: "КРОК 04",
    },
    {
      num: "5",
      title: "Отримаєте зрозумілий план дій",
      desc: "Що робити зараз, щоб почати змінювати тіло без чергового марафону «з понеділка».",
      tag: "КРОК 05",
    },
  ];

  // 6 Block: 4 Steps
  const systemSteps = [
    {
      step: "КРОК 1",
      title: "Розбираємо основу",
      desc: "Харчування, активність, режим та звички, які впливають на результат.",
    },
    {
      step: "КРОК 2",
      title: "Прибираємо те, що заважає",
      desc: "Без списку з 50 заборон і життя на курячій грудці.",
    },
    {
      step: "КРОК 3",
      title: "Додаємо те, що працює",
      desc: "Зрозуміле харчування та адекватне фізичне навантаження.",
    },
    {
      step: "КРОК 4",
      title: "Закріплюємо",
      desc: "Щоб ви не повернулися до старого режиму після першого тижня.",
    },
  ];

  // 8 Block: Cases
  const realCaseGalleries = [
    {
      id: 1,
      title: "Ярославна, 34 р",
      badge: "Результат за 3 міс",
      desc: "-12 кг, -5 см в талії, -4 см в стегнах, +пружні сідниці",
      image: "/images/cases/case_5.webp",
    },
    {
      id: 2,
      title: "Наталі, 36 р",
      badge: "Результат за 3 міс",
      desc: "-5 кг, -4 см в талії, -3 см в стегнах, мінус набряки",
      image: "/images/cases/case_natali.png",
    },
    {
      id: 3,
      title: "Ірина, 38 р",
      badge: "Результат за 2 міс",
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

  // 10 Block: FAQ
  const faqItems = [
    {
      q: "А якщо я ніколи не займалась спортом?",
      a: "Міні-курс розрахований на звичайний ритм життя, а не на професійних спортсменок.",
    },
    {
      q: "Чи потрібно сидіти на дієті?",
      a: "Ні. Завдання курсу — показати, як вибудувати харчування без постійних жорстких обмежень.",
    },
    {
      q: "А якщо я вже багато чого пробувала?",
      a: "Саме тому важливо не починати ще одну дієту навмання, а зрозуміти, чому попередні підходи не дали стабільного результату.",
    },
    {
      q: "Чи допоможе якщо у мене вага постійно повертається назад?",
      a: "Задача цього курсу не ввести вас в коротко тривалі обмеження, а вибудувати систему, яка стане частиною вашого життя.",
    },
  ];

  return (
    <div className="min-h-screen bg-[#070607] text-[#FFFFFF] font-source selection:bg-[#F01147] selection:text-white pb-28 sm:pb-24 overflow-x-hidden">

      {/* TOP RED TICKER BANNER (START 27.08) */}
      <div className="bg-gradient-to-r from-[#BA022F] to-[#D00839] text-white py-1.5 overflow-hidden shadow-lg sticky top-0 z-40 border-b border-[#F01147]/30">
        <div className="animate-marquee font-extrabold text-xs sm:text-sm tracking-wider uppercase flex items-center gap-8 whitespace-nowrap">
          <span>🔥 СТАРТ 27.08</span>
          <span className="text-white/60">✦</span>
          <span>ЗНИЖКА -87% ДІЄ СЬОГОДНІ</span>
          <span className="text-white/60">✦</span>
          <span>6 УРОКІВ + БОНУС «ЯК СПАЛИТИ ЖИР»</span>
          <span className="text-white/60">✦</span>
          <span>ДОСТУП НАЗАВЖДИ</span>
          <span className="text-white/60">✦</span>
          <span>🔥 СТАРТ 27.08</span>
          <span className="text-white/60">✦</span>
          <span>ЗНИЖКА -87% ДІЄ СЬОГОДНІ</span>
          <span className="text-white/60">✦</span>
          <span>6 УРОКІВ + БОНУС «ЯК СПАЛИТИ ЖИР»</span>
          <span className="text-white/60">✦</span>
        </div>
      </div>

      {/* =========================================================================
          1 БЛОК + 2 БЛОК: HERO SECTION (PHOTO TOP, STRUCTURED OFFER BOTTOM)
          ========================================================================= */}
      <section className="relative w-full max-w-[480px] mx-auto px-4 pt-1.5 pb-4 flex flex-col items-center space-y-2.5">
        
        {/* TOP DATE PILL (UKRAINIAN: СТАРТ 27.08) */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-[#EB94A9]/40 text-[#EB94A9] text-xs font-bold uppercase backdrop-blur-md shadow-sm">
          <Calendar className="w-3.5 h-3.5 text-[#F01147]" />
          <span>СТАРТ 27.08 | 6 УРОКІВ (ТЕОРІЯ + ПРАКТИКА)</span>
        </div>

        {/* HERO CARD (PHOTO TOP WITH CLEAN BOTTOM GRADIENT) */}
        <div className="relative w-full rounded-[28px] overflow-hidden border border-white/15 shadow-2xl bg-[#0D090B] flex flex-col">
          
          {/* PHOTO CANVAS OF ANASTASIA (FULL FIGURE IN ATHLETIC WEAR) */}
          <div className="relative w-full h-[290px] sm:h-[350px] overflow-hidden">
            <Image
              src="/images/anastasia_hero_blue.webp"
              alt="Анастасія Сич - Фітнес тренерка"
              fill
              priority
              className="object-cover object-[center_12%] filter brightness-100 contrast-105"
              sizes="(max-width: 768px) 100vw, 480px"
            />
            {/* Smooth bottom fade into content */}
            <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#0D090B] via-[#0D090B]/80 to-transparent" />
          </div>

          {/* 1 БЛОК: HEADLINE & 3 BULLETS */}
          <div className="p-4 sm:p-5 pt-0 space-y-2.5 relative z-10">
            
            {/* MAIN HEADLINE */}
            <div className="space-y-0.5 text-left">
              <h1 className="font-league text-3xl sm:text-4xl font-normal text-white uppercase tracking-wide leading-[0.95] drop-shadow-md">
                ОТРИМАЙ ПЛАСКИЙ ЖИВІТ
              </h1>
              <div className="font-league text-2xl sm:text-3xl font-normal text-[#F01147] uppercase tracking-wide leading-none drop-shadow-sm">
                ТА СТРУНКУ ТАЛІЮ
              </div>
            </div>

            {/* 3 BULLETS FROM TZ */}
            <div className="space-y-1 pt-0.5">
              <div className="flex items-center gap-2 text-xs text-slate-200 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#F01147] shrink-0" />
                <span>перший результат вже за 7 днів</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-200 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#F01147] shrink-0" />
                <span>без виснажливих тренувань та обмежень в їжі</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-200 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#F01147] shrink-0" />
                <span>за перевіреною системою від фітнес тренерки</span>
              </div>
            </div>

            {/* 2 БЛОК: DUAL PRICING COMPARISON ROW (RED BOX AS PRIMARY CTA) */}
            <div className="w-full grid grid-cols-2 gap-2 pt-1">
              
              {/* ACTIVE RED BUY BOX */}
              <motion.div
                whileTap={{ scale: 0.97 }}
                animate={{ scale: [1, 1.02, 1] }}
                transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}
                onClick={handleOpenModal}
                className="cursor-pointer p-3 rounded-2xl bg-gradient-to-br from-[#F01147] via-[#DB0B3E] to-[#B0002B] text-white flex flex-col justify-center items-center shadow-xl border border-[#F01147]/60 hover:brightness-110 transition-all"
              >
                <div className="flex items-center gap-1">
                  <span className="text-[10px] sm:text-[11px] font-extrabold text-white uppercase tracking-wide">
                    СПЛАТІТЬ 1 РАЗ
                  </span>
                  <ArrowRight className="w-3 h-3 text-white" />
                </div>
                <span className="font-league text-3xl sm:text-4xl font-bold leading-none mt-0.5">
                  399 грн
                </span>
              </motion.div>

              {/* STRIKETHROUGH REGULAR PRICE BOX */}
              <div
                onClick={handleOpenModal}
                className="cursor-pointer p-3 rounded-2xl bg-white/5 backdrop-blur-md text-slate-400 flex flex-col justify-center items-center border border-white/15 hover:scale-[1.02] transition-transform"
              >
                <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wide">
                  ЗВИЧАЙНА ЦІНА
                </span>
                <span className="font-league text-3xl sm:text-4xl font-normal leading-none mt-0.5 line-through decoration-slate-400 text-slate-400">
                  2999 грн
                </span>
              </div>

            </div>

            {/* TRUST BADGE ROW */}
            <div className="flex items-center justify-center gap-3 text-[10px] sm:text-[11px] font-semibold text-white/80 pt-0.5">
              <span className="flex items-center gap-1">
                <Star className="w-3 h-3 fill-[#F01147] text-[#F01147]" /> 4.9/5
              </span>
              <span className="text-white/30">•</span>
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-[#059669]" /> Доступ назавжди
              </span>
              <span className="text-white/30">•</span>
              <span className="flex items-center gap-1">
                <Gift className="w-3.5 h-3.5 text-[#F01147]" /> + Бонус
              </span>
            </div>

          </div>

        </div>

      </section>

      {/* =========================================================================
          3 БЛОК: YOU DO EVERYTHING RIGHT BUT STOMACH WON'T CHANGE? + CIRCLE LOOP
          ========================================================================= */}
      <section className="py-8 px-4 max-w-[480px] mx-auto space-y-5 border-t border-white/10">
        
        <div className="text-center space-y-1.5">
          <h2 className="font-league text-3xl sm:text-4xl font-normal uppercase tracking-wide leading-tight text-white">
            Ви наче все робите правильно, <br />
            <span className="text-[#F01147]">але живіт і талія не змінюються?</span>
          </h2>
        </div>

        {/* YOU ALREADY TRIED CARD */}
        <div className="p-4 rounded-2xl bg-[#120E10] border border-white/10 shadow-lg space-y-2.5">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Ви вже пробували:
          </div>
          <div className="space-y-2">
            {[
              "менше їсти;",
              "прибирати солодке;",
              "сідати на дієту;",
              "більше тренуватися;",
              "починати «з понеділка»;",
              "триматися кілька днів, а потім зриватися.",
            ].map((item, idx) => (
              <div key={idx} className="flex items-center gap-2 text-xs sm:text-sm text-slate-300 font-medium">
                <XCircle className="w-4 h-4 text-[#F01147] shrink-0" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* AND THEN AGAIN - VISUAL CIRCULAR INFOGRAPHIC */}
        <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-b from-[#1A0E13] via-[#120E10] to-[#0A0708] border border-[#F01147]/50 shadow-2xl space-y-3 text-center overflow-hidden">
          
          <div className="space-y-0.5">
            <div className="font-league text-3xl font-bold uppercase tracking-wider text-[#F01147]">
              А ПОТІМ ЗНОВУ:
            </div>
            <p className="text-[11px] text-slate-400">
              Замкнене коло, яке повторюється з кожною новою спробою
            </p>
          </div>

          {/* CIRCULAR INFOGRAPHIC CONTAINER */}
          <div className="relative w-full max-w-[350px] h-[360px] mx-auto my-2 flex items-center justify-center">
            
            {/* SVG BACKGROUND CIRCLE TRACK AND CLOCKWISE ARROWS */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              viewBox="0 0 350 360"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <marker
                  id="cycle-arrow"
                  viewBox="0 0 10 10"
                  refX="6"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#F01147" />
                </marker>
              </defs>

              {/* DASHED CIRCLE ORBIT */}
              <circle
                cx="175"
                cy="180"
                r="115"
                stroke="#F01147"
                strokeWidth="1.5"
                strokeDasharray="4 4"
                strokeOpacity="0.35"
              />

              {/* 5 DIRECTIONAL CLOCKWISE ARROW ARCS */}
              {/* Arrow 1: Top to Top-Right */}
              <path
                d="M 215 88 A 115 115 0 0 1 268 128"
                stroke="#F01147"
                strokeWidth="2"
                markerEnd="url(#cycle-arrow)"
              />
              {/* Arrow 2: Top-Right to Bottom-Right */}
              <path
                d="M 285 200 A 115 115 0 0 1 258 258"
                stroke="#F01147"
                strokeWidth="2"
                markerEnd="url(#cycle-arrow)"
              />
              {/* Arrow 3: Bottom-Right to Bottom-Left */}
              <path
                d="M 205 292 A 115 115 0 0 1 145 292"
                stroke="#F01147"
                strokeWidth="2"
                markerEnd="url(#cycle-arrow)"
              />
              {/* Arrow 4: Bottom-Left to Top-Left */}
              <path
                d="M 92 258 A 115 115 0 0 1 65 200"
                stroke="#F01147"
                strokeWidth="2"
                markerEnd="url(#cycle-arrow)"
              />
              {/* Arrow 5: Top-Left to Top */}
              <path
                d="M 82 128 A 115 115 0 0 1 135 88"
                stroke="#F01147"
                strokeWidth="2"
                markerEnd="url(#cycle-arrow)"
              />
            </svg>

            {/* CENTER HUB */}
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#240F18] to-[#0E090B] border border-[#F01147]/60 shadow-[0_0_20px_rgba(240,17,71,0.35)] flex flex-col items-center justify-center text-center p-2 z-10">
              <RotateCw className="w-5 h-5 text-[#F01147] animate-spin" style={{ animationDuration: "10s" }} />
              <span className="font-league text-xs font-bold text-white uppercase tracking-wider mt-1 leading-none">
                ЗАМКНЕНЕ КОЛО
              </span>
              <span className="text-[8px] text-[#EB94A9] font-semibold mt-0.5 leading-tight">
                по колу
              </span>
            </div>

            {/* NODE 1: TOP (ОБМЕЖЕННЯ) */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 z-20">
              <div className="flex flex-col items-center justify-center px-2.5 py-1.5 rounded-xl bg-black/90 border border-[#F01147]/60 shadow-lg backdrop-blur-md text-center min-w-[95px]">
                <div className="flex items-center gap-1">
                  <span className="text-xs">🔒</span>
                  <span className="text-[9px] font-black text-[#F01147]">01</span>
                </div>
                <span className="text-[10px] font-bold text-white uppercase tracking-tight leading-none mt-0.5">
                  ОБМЕЖЕННЯ
                </span>
              </div>
            </div>

            {/* NODE 2: TOP-RIGHT (СИЛЬНИЙ ГОЛОД) */}
            <div className="absolute top-[28%] right-0 -translate-y-1/2 z-20">
              <div className="flex flex-col items-center justify-center px-2.5 py-1.5 rounded-xl bg-black/90 border border-[#F01147]/60 shadow-lg backdrop-blur-md text-center min-w-[95px]">
                <div className="flex items-center gap-1">
                  <span className="text-xs">⚡</span>
                  <span className="text-[9px] font-black text-[#F01147]">02</span>
                </div>
                <span className="text-[10px] font-bold text-white uppercase tracking-tight leading-none mt-0.5">
                  СИЛЬНИЙ ГОЛОД
                </span>
              </div>
            </div>

            {/* NODE 3: BOTTOM-RIGHT (ПЕРЕЇДАННЯ) */}
            <div className="absolute bottom-1 right-2 z-20">
              <div className="flex flex-col items-center justify-center px-2.5 py-1.5 rounded-xl bg-black/90 border border-[#F01147]/60 shadow-lg backdrop-blur-md text-center min-w-[95px]">
                <div className="flex items-center gap-1">
                  <span className="text-xs">🍕</span>
                  <span className="text-[9px] font-black text-[#F01147]">03</span>
                </div>
                <span className="text-[10px] font-bold text-white uppercase tracking-tight leading-none mt-0.5">
                  ПЕРЕЇДАННЯ
                </span>
              </div>
            </div>

            {/* NODE 4: BOTTOM-LEFT (ЗРИВ) */}
            <div className="absolute bottom-1 left-2 z-20">
              <div className="flex flex-col items-center justify-center px-2.5 py-1.5 rounded-xl bg-black/90 border border-[#F01147]/60 shadow-lg backdrop-blur-md text-center min-w-[95px]">
                <div className="flex items-center gap-1">
                  <span className="text-xs">💥</span>
                  <span className="text-[9px] font-black text-[#F01147]">04</span>
                </div>
                <span className="text-[10px] font-bold text-white uppercase tracking-tight leading-none mt-0.5">
                  ЗРИВ
                </span>
              </div>
            </div>

            {/* NODE 5: TOP-LEFT (ПОЧИНАЄТЕ СПОЧАТКУ) */}
            <div className="absolute top-[28%] left-0 -translate-y-1/2 z-20">
              <div className="flex flex-col items-center justify-center px-2 py-1.5 rounded-xl bg-black/90 border border-[#F01147]/60 shadow-lg backdrop-blur-md text-center min-w-[95px]">
                <div className="flex items-center gap-1">
                  <span className="text-xs">🔄</span>
                  <span className="text-[9px] font-black text-[#F01147]">05</span>
                </div>
                <span className="text-[9px] font-bold text-white uppercase tracking-tight leading-tight mt-0.5">
                  ПОЧИНАЄТЕ СПОЧАТКУ
                </span>
              </div>
            </div>

          </div>

          {/* REPEAT LOOP FOOTER */}
          <div className="inline-flex items-center gap-2 text-xs font-bold text-[#EB94A9] bg-[#F01147]/15 border border-[#F01147]/40 px-3 py-1 rounded-full">
            <RotateCw className="w-3.5 h-3.5 animate-spin text-[#F01147]" />
            <span>Замкнене коло повторюється знову і знову</span>
          </div>

        </div>

        {/* CONCLUSION */}
        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-xs sm:text-sm text-slate-300 font-medium space-y-1.5 leading-relaxed">
          <p>І справа не обов'язково в тому, що вам не вистачає сили волі.</p>
          <p className="text-white font-semibold">
            Можливо, ви просто використовуєте підхід, який не підходить саме вам.
          </p>
        </div>

      </section>

      {/* =========================================================================
          4 БЛОК: WHAT YOU GET (5 VIDEO PREVIEW CARDS)
          ========================================================================= */}
      <section className="py-8 px-4 max-w-[480px] mx-auto space-y-5 border-t border-white/10">
        
        <div className="text-center space-y-1">
          <h2 className="font-league text-3xl sm:text-4xl font-normal uppercase tracking-wide leading-tight">
            <span className="text-white">ЩО ВИ ОТРИМАЄТЕ</span> <br />
            <span className="text-[#F01147]">НА МІНІ-КУРСІ</span>
          </h2>
        </div>

        <div className="space-y-3">
          {courseLessons.map((lesson, idx) => (
            <div
              key={idx}
              className="rounded-2xl overflow-hidden bg-[#120E10] border border-white/15 shadow-lg group hover:border-[#F01147]/50 transition-colors"
            >
              {/* VIDEO COVER HEADER */}
              <div className="bg-gradient-to-r from-[#241017] to-[#160B0E] p-3 flex items-center justify-between border-b border-white/10">
                <span className="text-[10px] font-bold tracking-wider uppercase text-[#EB94A9] bg-[#F01147]/20 border border-[#F01147]/40 px-2.5 py-0.5 rounded-md">
                  {lesson.tag}
                </span>
                <PlayCircle className="w-4 h-4 text-[#F01147]" />
              </div>

              {/* LESSON CONTENT */}
              <div className="p-3.5 space-y-1">
                <h3 className="text-sm font-bold text-white leading-snug">
                  {lesson.num}. {lesson.title}
                </h3>
                <p className="text-xs text-slate-400 font-medium leading-tight">
                  {lesson.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA TO ENROLL */}
        <button
          onClick={handleOpenModal}
          className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#F01147] to-[#B0002B] text-white font-league text-xl uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 cursor-pointer hover:brightness-110 transition-all"
        >
          <span>ОТРИМАТИ ДОСТУП ЗА 399 ГРН</span>
          <ArrowRight className="w-4 h-4 text-white" />
        </button>

      </section>

      {/* =========================================================================
          5 БЛОК: THE PROBLEM IS NOT THAT YOU ARE NOT TRYING HARD ENOUGH
          ========================================================================= */}
      <section className="py-8 px-4 max-w-[480px] mx-auto space-y-5 border-t border-white/10">
        
        <div className="text-center space-y-1">
          <h2 className="font-league text-3xl sm:text-4xl font-normal uppercase tracking-wide leading-tight text-white">
            Проблема не в тому, <br />
            <span className="text-[#F01147]">що ви недостатньо стараєтесь</span>
          </h2>
        </div>

        {/* LOOP CHAIN */}
        <div className="p-4 rounded-2xl bg-[#120E10] border border-[#F01147]/40 shadow-lg space-y-2.5">
          <div className="text-xs font-bold uppercase tracking-wider text-[#EB94A9]">
            Коли ви:
          </div>
          <div className="p-3 rounded-xl bg-black/60 border border-white/10 text-xs sm:text-sm text-slate-200 font-semibold leading-relaxed flex items-center justify-between">
            <span>різко обмежуєте їжу → виснажуєте себе тренуваннями → терпите → зриваєтесь</span>
          </div>
        </div>

        {/* EXPLANATION */}
        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-xs sm:text-sm text-slate-300 font-medium space-y-2 leading-relaxed">
          <p>
            Організм і психіка рано чи пізно вимагають повернутися до звичного.
          </p>
          <p>
            Тому наше завдання — не змусити вас ще сильніше себе контролювати.
          </p>
          <p className="text-white font-bold text-sm text-[#EB94A9]">
            А побудувати систему, яку ви зможете нормально дотримуватися.
          </p>
        </div>

      </section>

      {/* =========================================================================
          6 БЛОК: NO NEED TO CHANGE YOUR WHOLE LIFE IN ONE DAY (4 STEPS)
          ========================================================================= */}
      <section className="py-8 px-4 max-w-[480px] mx-auto space-y-5 border-t border-white/10">
        
        <div className="text-center space-y-1">
          <h2 className="font-league text-3xl sm:text-4xl font-normal uppercase tracking-wide leading-tight text-white">
            Не потрібно міняти <br />
            <span className="text-[#F01147]">все життя за один день</span>
          </h2>
        </div>

        <div className="space-y-2.5">
          {systemSteps.map((step, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-2xl bg-[#120E10] border border-white/10 shadow-md space-y-1"
            >
              <div className="text-[10px] font-bold text-[#EB94A9] uppercase tracking-wider">
                {step.step}
              </div>
              <h3 className="font-league text-2xl text-white uppercase tracking-wide leading-none">
                {step.title}
              </h3>
              <p className="text-xs text-slate-400 font-medium leading-tight">
                {step.desc}
              </p>
            </div>
          ))}
        </div>

      </section>

      {/* =========================================================================
          7 БЛОК: WHO WILL TEACH YOU (ABOUT ANASTASIA)
          ========================================================================= */}
      <section className="py-8 px-4 max-w-[480px] mx-auto space-y-5 border-t border-white/10">
        
        <div className="text-center space-y-1">
          <h2 className="font-league text-4xl font-normal uppercase tracking-wide leading-none text-white">
            ХТО ВАС <span className="text-[#F01147]">НАВЧАТИМЕ</span>
          </h2>
        </div>

        <div className="rounded-3xl overflow-hidden bg-[#120E10] border border-white/15 shadow-2xl space-y-4 p-4">
          
          {/* PHOTO OF ANASTASIA WITH BADGES */}
          <div className="relative w-full h-[320px] rounded-2xl overflow-hidden">
            <Image
              src="/images/anastasia_portrait_black.webp"
              alt="Анастасія Сич"
              fill
              className="object-cover object-[center_10%]"
              sizes="(max-width: 768px) 100vw, 480px"
            />
            {/* Top gradient for badges */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/60" />
            
            {/* BADGES ON PHOTO AS REQUESTED IN TZ */}
            <div className="absolute top-3 left-3 flex flex-col gap-1.5">
              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider bg-black/75 border border-white/20 text-white px-2.5 py-1 rounded-full backdrop-blur-md">
                <GraduationCap className="w-3 h-3 text-[#F01147]" />
                Вища медична освіта
              </span>
              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider bg-black/75 border border-white/20 text-white px-2.5 py-1 rounded-full backdrop-blur-md">
                <Clock className="w-3 h-3 text-[#F01147]" />
                8 років досвіду
              </span>
              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider bg-black/75 border border-white/20 text-white px-2.5 py-1 rounded-full backdrop-blur-md">
                <Award className="w-3 h-3 text-[#F01147]" />
                Фітнес-тренерка
              </span>
            </div>
          </div>

          {/* BIO TEXT */}
          <div className="space-y-2 text-xs sm:text-sm text-slate-300 font-medium leading-relaxed">
            <p>
              Я — <span className="text-white font-bold">Анастасія</span>, фітнес-тренерка з 8-річним досвідом та вищою медичною освітою.
            </p>
            <p>
              Я працюю з жінками не тільки над тілом, а й над тим, щоб харчування та тренування стали частиною нормального життя.
            </p>
            <p>
              Без жорстких заборон, постійних дієт та підходу «терпіть ще трохи».
            </p>
            <p className="text-white font-semibold pt-1 border-t border-white/10">
              Моя задача — допомогти вам зрозуміти систему, а не просто дати черговий план, якого ви будете дотримуватися кілька тижнів.
            </p>
          </div>

        </div>

      </section>

      {/* =========================================================================
          8 БЛОК: CLIENT TRANSFORMATION CASES
          ========================================================================= */}
      <section className="py-8 px-4 max-w-[480px] mx-auto space-y-4 border-t border-white/10">
        
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h2 className="font-league text-3xl font-normal uppercase tracking-wide leading-none text-white">
              ДІВЧАТА ВЖЕ ПРОХОДЯТЬ <span className="text-[#F01147]">ЦЕЙ ШЛЯХ</span>
            </h2>
            <p className="text-xs text-slate-400 font-medium">Реальні результати моїх підопічних</p>
          </div>
          
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => scrollCarousel("left")}
              className="w-8 h-8 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => scrollCarousel("right")}
              className="w-8 h-8 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* HORIZONTAL SCROLL CAROUSEL */}
        <div
          ref={carouselRef}
          className="flex gap-3 overflow-x-auto no-scrollbar scroll-smooth snap-x snap-mandatory py-1"
        >
          {realCaseGalleries.map((c) => (
            <div
              key={c.id}
              onClick={() => setActiveCaseImage(c.image)}
              className="min-w-[270px] max-w-[270px] snap-center rounded-2xl overflow-hidden bg-[#120E10] border border-white/15 flex flex-col shadow-lg cursor-pointer group"
            >
              <div className="relative w-full h-72 overflow-hidden">
                <Image
                  src={c.image}
                  alt={c.title}
                  fill
                  className="object-cover object-top group-hover:scale-105 transition-transform duration-300"
                  sizes="270px"
                />
                <div className="absolute top-2 right-2 bg-black/60 p-1.5 rounded-full text-white backdrop-blur-md">
                  <ZoomIn className="w-3.5 h-3.5" />
                </div>
                <div className="absolute bottom-2 left-2 bg-[#F01147] text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow">
                  {c.badge}
                </div>
              </div>
              <div className="p-3 space-y-1">
                <div className="font-bold text-white text-xs">{c.title}</div>
                <div className="text-[11px] text-slate-300 font-medium leading-tight">{c.desc}</div>
              </div>
            </div>
          ))}
        </div>

      </section>

      {/* =========================================================================
          9 БЛОК: START CHANGING YOUR APPROACH NOW (OFFER)
          ========================================================================= */}
      <section className="py-8 px-4 max-w-[480px] mx-auto space-y-5 border-t border-white/10">
        
        <div className="p-5 rounded-3xl bg-gradient-to-b from-[#1E0E14] to-[#120E10] border border-[#F01147]/50 shadow-2xl text-center space-y-4">
          
          <div className="space-y-1">
            <h2 className="font-league text-3xl sm:text-4xl font-normal uppercase tracking-wide leading-none text-white">
              ПОЧНИ ЗМІНЮВАТИ СВІЙ ПІДХІД <span className="text-[#F01147]">ВЖЕ ЗАРАЗ</span>
            </h2>
            <p className="text-xs text-slate-300 font-medium leading-relaxed pt-1">
              Замість чергових спроб навмання — зрозуміла система, з якої ви можете почати вже зараз.
            </p>
          </div>

          {/* DUAL PRICING */}
          <div className="inline-flex items-center gap-3 bg-black/60 border border-white/15 px-4 py-2 rounded-2xl backdrop-blur-md">
            <span className="font-league text-2xl text-slate-400 line-through">2999 грн</span>
            <span className="text-white text-xs">→</span>
            <span className="font-league text-4xl text-[#F01147] font-bold">399 грн</span>
          </div>

          <motion.button
            whileTap={{ scale: 0.98 }}
            animate={{ scale: [1, 1.02, 1] }}
            transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}
            onClick={handleOpenModal}
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#F01147] to-[#B0002B] text-white font-league text-2xl uppercase tracking-wider shadow-2xl border border-[#F01147]/60 flex items-center justify-center gap-2 cursor-pointer hover:brightness-110 transition-all"
          >
            <span>ОТРИМАТИ МІНІ-КУРС ЗА 399 ГРН</span>
            <ArrowRight className="w-5 h-5 text-white shrink-0" />
          </motion.button>

        </div>

      </section>

      {/* =========================================================================
          10 БЛОК: FAQ ACCORDION
          ========================================================================= */}
      <section className="py-8 px-4 max-w-[480px] mx-auto space-y-4 border-t border-white/10">
        
        <div className="text-center space-y-1">
          <h2 className="font-league text-4xl font-normal uppercase tracking-wide leading-none text-white">
            ЧАСТІ <span className="text-[#F01147]">ЗАПИТАННЯ:</span>
          </h2>
        </div>

        <div className="space-y-2">
          {faqItems.map((item, idx) => (
            <div
              key={idx}
              className="rounded-2xl overflow-hidden bg-[#120E10] border border-white/10 shadow-sm"
            >
              <button
                onClick={() => setOpenFaqIndex(openFaqIndex === idx ? null : idx)}
                className="w-full p-4 text-left flex items-center justify-between gap-3 text-xs sm:text-sm font-bold text-white hover:text-[#EB94A9] transition-colors"
              >
                <span>{item.q}</span>
                <ChevronDown
                  className={`w-4 h-4 text-[#F01147] shrink-0 transition-transform duration-200 ${
                    openFaqIndex === idx ? "rotate-180" : ""
                  }`}
                />
              </button>
              
              <AnimatePresence>
                {openFaqIndex === idx && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="px-4 pb-4 pt-1 text-xs text-slate-300 leading-relaxed font-medium border-t border-white/5">
                      {item.a}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>

      </section>

      {/* =========================================================================
          11 БЛОК: BONUS LESSON «ЯК СПАЛИТИ ЖИР» & TELEGRAM BOT INFO
          ========================================================================= */}
      <section className="py-8 px-4 max-w-[480px] mx-auto space-y-4 border-t border-white/10">
        
        <div className="p-5 rounded-3xl bg-gradient-to-br from-[#220E17] via-[#160B10] to-[#0E080A] border border-[#F01147]/50 shadow-2xl space-y-4">
          
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F01147]/20 border border-[#F01147]/40 text-[#EB94A9] text-xs font-bold uppercase">
            <Gift className="w-3.5 h-3.5 text-[#F01147]" />
            <span>Безкоштовний бонус при оплаті прямо зараз</span>
          </div>

          <div className="space-y-1.5">
            <h2 className="font-league text-3xl font-normal uppercase tracking-wide leading-tight text-white">
              УРОК <span className="text-[#F01147]">«ЯК СПАЛИТИ ЖИР»</span>
            </h2>
            <div className="text-xs text-slate-300 font-medium">Що в цьому уроці:</div>
          </div>

          <div className="space-y-2">
            {[
              "5 правил для здорового схуднення;",
              "як правильно харчуватись для схуднення;",
              "який режим навантажень обрати для схуднення;",
              "чому важливо під час схуднення спалювати жир, а не мʼязи.",
            ].map((rule, idx) => (
              <div key={idx} className="flex items-start gap-2 text-xs sm:text-sm text-slate-200 font-medium">
                <CheckCircle2 className="w-4 h-4 text-[#059669] shrink-0 mt-0.5" />
                <span>{rule}</span>
              </div>
            ))}
          </div>

          {/* TELEGRAM BOT EXPLANATION */}
          <div className="p-3.5 rounded-2xl bg-black/60 border border-white/10 space-y-1.5 text-left">
            <div className="text-[11px] font-bold text-[#EB94A9] uppercase flex items-center gap-1.5">
              <MessageCircle className="w-3.5 h-3.5 text-[#229ED9]" />
              <span>Миттєвий доступ через Telegram-бот:</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Одразу після оплати ви отримуєте посилання на Telegram-бота із усіма 6 уроками курсу та бонусним уроком.
            </p>
          </div>

        </div>

      </section>

      {/* =========================================================================
          12 БЛОК: FINAL CTA SECTION
          ========================================================================= */}
      <section className="py-8 px-4 max-w-[480px] mx-auto space-y-4 border-t border-white/10 text-center">
        
        <div className="space-y-1">
          <h2 className="font-league text-4xl font-normal uppercase tracking-wide leading-none text-white">
            ОТРИМАЙ ПЛАСКИЙ ЖИВІТ <br />
            <span className="text-[#F01147]">ТА СТРУНКУ ТАЛІЮ</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed pt-1">
            Перший результат вже за 7 днів, без виснажливих тренувань та обмежень в їжі, за перевіреною системою від фітнес-тренерки.
          </p>
        </div>

        <div className="font-league text-5xl text-[#F01147] font-bold">
          399 грн
        </div>

        <motion.button
          whileTap={{ scale: 0.98 }}
          animate={{ scale: [1, 1.02, 1] }}
          transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}
          onClick={handleOpenModal}
          className="w-full py-4 px-5 rounded-2xl bg-gradient-to-r from-[#F01147] via-[#DB0B3E] to-[#B0002B] text-white font-league text-2xl uppercase tracking-wider shadow-2xl border border-[#F01147]/60 flex items-center justify-center gap-2 cursor-pointer hover:brightness-110 transition-all"
        >
          <span>ОТРИМАТИ МІНІ-КУРС</span>
          <ArrowRight className="w-5 h-5 text-white shrink-0" />
        </motion.button>

        <p className="text-[10px] text-slate-500 pt-4">
          © {new Date().getFullYear()} Анастасія Сич. Всі права захищені.
        </p>

      </section>

      {/* =========================================================================
          STICKY COUNTDOWN FOOTER BAR (APPEARS ON SCROLL)
          ========================================================================= */}
      <AnimatePresence>
        {showStickyUI && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-0 inset-x-0 z-50 bg-[#070607]/95 backdrop-blur-xl border-t border-white/15 p-3 px-4 shadow-[0_-10px_30px_rgba(0,0,0,0.8)]"
          >
            <div className="max-w-[480px] mx-auto flex items-center justify-between gap-3">
              
              {/* TIMER BOX */}
              <div className="flex items-center gap-1 font-mono text-sm font-bold text-white bg-white/10 px-2.5 py-1.5 rounded-xl border border-white/15">
                <span>{timeLeft.hours}</span>
                <span className="text-[#F01147]">:</span>
                <span>{timeLeft.minutes}</span>
                <span className="text-[#F01147]">:</span>
                <span>{timeLeft.seconds}</span>
              </div>

              {/* ACTION BUTTON */}
              <button
                onClick={handleOpenModal}
                className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#F01147] to-[#B0002B] text-white font-league text-xl uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 cursor-pointer hover:brightness-110 transition-all"
              >
                <span>ОТРИМАТИ – 399 ГРН</span>
                <ArrowRight className="w-4 h-4 text-white" />
              </button>

            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* =========================================================================
          LIGHTBOX MODAL FOR CASE TRANSFORMATION IMAGES
          ========================================================================= */}
      <AnimatePresence>
        {activeCaseImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setActiveCaseImage(null)}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
          >
            <button
              onClick={() => setActiveCaseImage(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            <div
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-lg w-full h-[80vh] rounded-2xl overflow-hidden"
            >
              <Image
                src={activeCaseImage}
                alt="Case preview"
                fill
                className="object-contain"
                sizes="(max-width: 768px) 100vw, 600px"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* =========================================================================
          CHECKOUT LEAD FORM MODAL (399 UAH)
          ========================================================================= */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-[#140E11] border border-[#F01147]/50 rounded-3xl p-5 sm:p-6 shadow-2xl text-white space-y-4"
            >
              
              {/* CLOSE BUTTON */}
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              {/* MODAL HEADER */}
              <div className="space-y-1 text-center pr-6">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F01147]/20 border border-[#F01147]/40 text-[#EB94A9] text-xs font-bold uppercase">
                  <span>СТАРТ 27 СЕРПНЯ</span>
                </div>
                <h3 className="font-league text-3xl font-bold uppercase tracking-wide text-white">
                  ОТРИМАТИ МІНІ-КУРС
                </h3>
                <p className="text-xs text-slate-300">
                  Заповніть форму для переходу до захищеної оплати 399 грн
                </p>
              </div>

              {/* ERROR MESSAGE */}
              {errorMessage && (
                <div className="p-3 rounded-xl bg-red-950/60 border border-red-500/50 text-red-200 text-xs">
                  {errorMessage}
                </div>
              )}

              {/* FORM */}
              <form onSubmit={handleSubmit} className="space-y-3">
                
                {/* NAME INPUT */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-[#F01147]" /> Ваше ім'я
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Наприклад: Олена"
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-[#F01147] transition-colors"
                  />
                </div>

                {/* PHONE INPUT */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-[#F01147]" /> Номер телефону
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="+380"
                    value={formData.phone}
                    onChange={handlePhoneChange}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-[#F01147] transition-colors font-mono"
                  />
                </div>

                {/* TELEGRAM INPUT */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <MessageCircle className="w-3.5 h-3.5 text-[#F01147]" /> Telegram нікнейм
                    </label>
                    <button
                      type="button"
                      onClick={handleNoTelegramClick}
                      className="text-[11px] text-[#EB94A9] hover:underline"
                    >
                      Немає нікнейму
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="@username"
                    value={formData.telegram}
                    onChange={(e) => handleInputChange("telegram", e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-[#F01147] transition-colors"
                  />
                </div>

                {/* PRICE SUMMARY */}
                <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between text-xs">
                  <span className="text-slate-300">До сплати:</span>
                  <div className="flex items-center gap-2">
                    <span className="line-through text-slate-500 text-xs">2999 грн</span>
                    <span className="font-league text-2xl text-[#F01147] font-bold">399 грн</span>
                  </div>
                </div>

                {/* SUBMIT BUTTON */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#F01147] to-[#B0002B] text-white font-league text-2xl uppercase tracking-wider shadow-xl flex items-center justify-center gap-2 cursor-pointer hover:brightness-110 transition-all disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <span className="text-sm font-sans">Переходимо до оплати...</span>
                  ) : (
                    <>
                      <span>ПЕРЕЙТИ ДО ОПЛАТИ (399 ГРН)</span>
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>

                <p className="text-[10px] text-center text-slate-400 pt-1">
                  🔒 Безпечна оплата банківською картою через сервіс WayForPay
                </p>

              </form>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
