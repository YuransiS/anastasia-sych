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
  Clock,
  Award,
  Sparkles,
  Flame,
  Utensils,
  Dumbbell,
  HeartCrack,
  CalendarX,
  RotateCcw,
  Check
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

export default function FlatBellyLanding() {
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
      if (window.scrollY > 250) {
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
      const saved = localStorage.getItem("as_flatbelly_form");
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
        localStorage.setItem("as_flatbelly_form", JSON.stringify(next));
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
      offer_variant: "mini-course-flat-belly",
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
          page_path: typeof window !== "undefined" ? window.location.pathname : "/mini-course/flat-belly",
          page_url: typeof window !== "undefined" ? window.location.href : "/mini-course/flat-belly",
        }),
      });

      const data = await response.json();

      if (response.ok && data.status === "success") {
        trackPixelEvent("Lead", {
          offer_variant: "mini-course-flat-belly",
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

  // 2 БЛОК: 6 items of past attempts with frustration visuals
  const failurePoints = [
    {
      text: "качали прес;",
      icon: Dumbbell,
      visualLabel: "100 скручувань без ефекту",
    },
    {
      text: "робили тренування на живіт;",
      icon: Flame,
      visualLabel: "Виснаження та втома",
    },
    {
      text: "намагались менше їсти;",
      icon: Utensils,
      visualLabel: "Постійне відчуття голоду",
    },
    {
      text: "прибирали солодке;",
      icon: HeartCrack,
      visualLabel: "Жорсткі обмеження й тяга",
    },
    {
      text: "починали тренуватися з понеділка;",
      icon: CalendarX,
      visualLabel: "Вічний цикл «з понеділка»",
    },
    {
      text: "витримували кілька днів, а потім зривалися.",
      icon: RotateCcw,
      visualLabel: "Зрив і почуття провини",
    },
  ];

  // 3 БЛОК: Messenger question sequence
  const messengerQuestions = [
    { text: "чому живіт випирає", num: "1", align: "left" },
    { text: "→ які м'язи та рухи тут задіяні", num: "2", align: "right" },
    { text: "→ які вправи потрібні", num: "3", align: "left" },
    { text: "→ як харчування впливає на кількість жиру", num: "4", align: "right" },
    { text: "→ як тренувати все тіло, щоб зберігати м'язи.", num: "5", align: "left" },
  ];

  // 4 БЛОК: 6 YouTube-styled Video Lessons
  const lessons = [
    {
      lessonBadge: "Урок 0. Бонусна лекція",
      title: "Як закріпити результат",
      desc: "Розберемо, як працювати зі звичками та чому не варто намагатися змінити все одразу.\n\nВи зрозумієте силу маленьких кроків і чому краще послідовно працювати з однією проблемною зоною, ніж взятися за все одночасно і втратити мотивацію.",
      duration: "18 хв",
      tag: "БОНУС",
      image: "/images/anastasia_yoga_white.webp",
    },
    {
      lessonBadge: "Урок 1",
      title: "Чому живіт випирає",
      desc: "Розберемо анатомію та біомеханіку і визначимо, над чим саме потрібно працювати, щоб змінити вигляд живота.",
      duration: "20 хв",
      tag: "АНАТОМІЯ",
      image: "/images/anastasia_outdoor.webp",
    },
    {
      lessonBadge: "Урок 2",
      title: "Практичні вправи для плаского живота",
      desc: "Покажу вправи, за допомогою яких ви зможете правильно працювати з м'язами живота.\n\nБез тренувань до стану, коли наступного дня неможливо підвестись з ліжка.",
      duration: "22 хв",
      tag: "ПРАКТИКА",
      image: "/images/anastasia_hero_blue.webp",
    },
    {
      lessonBadge: "Урок 3",
      title: "Талія робиться на кухні",
      desc: "Розберемо, чому для плаского живота та стрункої талії важливо зменшувати відсоток жиру в організмі.\n\nТакож поговоримо про харчування та поясню, чому під час схуднення важливо тренуватися, щоб зберігати м'язи.",
      duration: "25 хв",
      tag: "ХАРЧУВАННЯ",
      image: "/images/expert.webp",
    },
    {
      lessonBadge: "Урок 4",
      title: "Вправи для стрункої талії",
      desc: "Практичний урок з вправами, які допоможуть вам працювати над м'язами та формою талії.",
      duration: "20 хв",
      tag: "ПРАКТИКА",
      image: "/images/anastasia_yoga_white.webp",
    },
    {
      lessonBadge: "Урок 5",
      title: "Full Body — тренування на все тіло",
      desc: "Повноцінне тренування для формування сильного м'язевого каркасу.\n\nТому що ми не хочемо просто працювати над животом — нам потрібно формувати сильне, підтягнуте тіло в цілому.",
      duration: "24 хв",
      tag: "FULL BODY",
      image: "/images/anastasia_portrait_black.webp",
    },
  ];

  // 10 БЛОК: Real transformation cases (like diagnostic landing)
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

  // 11 БЛОК: Everything inside
  const insideFeatures = [
    {
      title: "5 уроків",
      desc: "Від анатомії живота до практичних тренувань.",
      icon: PlayCircle,
    },
    {
      title: "Бонусна лекція",
      desc: "Як закріпити результат через роботу зі звичками.",
      icon: Gift,
    },
    {
      title: "Практика",
      desc: "Конкретні вправи, які можна виконувати самостійно.",
      icon: Dumbbell,
    },
    {
      title: "Харчування",
      desc: "Розуміння, як харчування пов'язане з пласким животом і стрункою талією.",
      icon: Utensils,
    },
    {
      title: "Full Body",
      desc: "Тренування на все тіло для сильного м'язевого каркасу.",
      icon: Sparkles,
    },
  ];

  // 12 БЛОК: FAQ
  const faqItems = [
    {
      q: "Чи потрібно сидіти на дієті?",
      a: "Ні. На курсі ми розберемо харчування та його роль у роботі з відсотком жиру.",
    },
    {
      q: "А якщо я давно не тренувалась?",
      a: "Курс створений не для професійних спортсменок. Ви зможете почати з того рівня навантаження, який підходить вам.",
    },
    {
      q: "Чи потрібно ходити в зал?",
      a: "Ні. Формат вправ має бути доступним для самостійних занять.",
    },
    {
      q: "Скільки часу потрібно на тренування?",
      a: "Всі тренування будуть займати не більше 20 хвилин в день.",
    },
  ];

  return (
    <div className="min-h-screen bg-[#070607] text-[#FFFFFF] font-source selection:bg-[#F01147] selection:text-white pb-28 sm:pb-24 overflow-x-hidden">

      {/* TOP TICKER BANNER */}
      <div className="bg-gradient-to-r from-[#BA022F] via-[#F01147] to-[#BA022F] text-white py-1.5 overflow-hidden shadow-lg sticky top-0 z-40 border-b border-[#F01147]/30">
        <div className="animate-marquee font-extrabold text-xs sm:text-sm tracking-wider uppercase flex items-center gap-8 whitespace-nowrap">
          <span>🔥 СТАРТ 24.08</span>
          <span className="text-white/60">✦</span>
          <span>6 ПРАКТИЧНИХ УРОКІВ</span>
          <span className="text-white/60">✦</span>
          <span>ЦІНА: 399 ГРН ЗАМІСТЬ 3999 ГРН</span>
          <span className="text-white/60">✦</span>
          <span>ЗНИЖКА -90% ДІЄ СЬОГОДНІ</span>
          <span className="text-white/60">✦</span>
          <span>🔥 СТАРТ 24.08</span>
          <span className="text-white/60">✦</span>
          <span>6 ПРАКТИЧНИХ УРОКІВ</span>
          <span className="text-white/60">✦</span>
          <span>ЦІНА: 399 ГРН ЗАМІСТЬ 3999 ГРН</span>
          <span className="text-white/60">✦</span>
        </div>
      </div>

      {/* =========================================================================
          1 БЛОК: HERO SECTION
          ========================================================================= */}
      <section className="relative w-full max-w-[480px] mx-auto px-4 pt-3 pb-4 flex flex-col items-center space-y-3">
        
        {/* START DATE BADGE */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-[#EB94A9]/40 text-[#EB94A9] text-xs font-bold uppercase backdrop-blur-md shadow-sm">
          <Calendar className="w-3.5 h-3.5 text-[#F01147]" />
          <span>СТАРТ 24.08 | 6 практичних уроків</span>
        </div>

        {/* HERO CARD */}
        <div className="relative w-full rounded-[28px] overflow-hidden border border-white/15 shadow-2xl bg-[#0D090B] flex flex-col">
          
          {/* PHOTO CANVAS OF ANASTASIA */}
          <div className="relative w-full h-[320px] sm:h-[380px] overflow-hidden bg-[#120D10]">
            <Image
              src="/images/anastasia_hero_blue.webp"
              alt="Анастасія Сич - Фітнес тренерка"
              fill
              priority
              className="object-cover object-[center_10%] filter brightness-100 contrast-105"
              sizes="(max-width: 768px) 100vw, 480px"
            />
            {/* Gradient overlay */}
            <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#0D090B] via-[#0D090B]/85 to-transparent" />
          </div>

          {/* CONTENT: EXACT HEADLINE & BULLETS */}
          <div className="p-4 sm:p-5 pt-0 space-y-3 relative z-10">
            
            {/* HEADLINE */}
            <h1 className="font-league text-3xl sm:text-4xl font-normal text-white uppercase tracking-wide leading-[1.02] drop-shadow-md">
              Зроби плаский живіт та струнку талію всього за 20 хвилин на день
            </h1>

            {/* 3 BULLETS FROM TZ */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center gap-2.5 text-xs sm:text-sm text-slate-200 font-medium">
                <CheckCircle2 className="w-4 h-4 text-[#F01147] shrink-0" />
                <span>-без страху зʼїсти щось «не те»</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs sm:text-sm text-slate-200 font-medium">
                <CheckCircle2 className="w-4 h-4 text-[#F01147] shrink-0" />
                <span>-без тренувань після яких неможливо підвестись на ноги</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs sm:text-sm text-slate-200 font-medium">
                <CheckCircle2 className="w-4 h-4 text-[#F01147] shrink-0" />
                <span>-за чіткою системою від фітнес тренерки</span>
              </div>
            </div>

            {/* DUAL PRICING COMPARISON ROW */}
            <div className="w-full grid grid-cols-2 gap-2 pt-2">
              
              {/* ACTIVE RED BUY BOX */}
              <motion.div
                whileTap={{ scale: 0.97 }}
                animate={{ scale: [1, 1.02, 1] }}
                transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}
                onClick={handleOpenModal}
                className="cursor-pointer p-3.5 rounded-2xl bg-gradient-to-br from-[#F01147] via-[#DB0B3E] to-[#B0002B] text-white flex flex-col justify-center items-center shadow-xl border border-[#F01147]/60 hover:brightness-110 transition-all"
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
                className="cursor-pointer p-3.5 rounded-2xl bg-white/5 backdrop-blur-md text-slate-400 flex flex-col justify-center items-center border border-white/15 hover:scale-[1.02] transition-transform"
              >
                <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wide">
                  ЗВИЧАЙНА ЦІНА
                </span>
                <span className="font-league text-3xl sm:text-4xl font-normal leading-none mt-0.5 line-through decoration-slate-400 text-slate-400">
                  3999 грн
                </span>
              </div>

            </div>

            {/* MAIN CTA BUTTON */}
            <button
              onClick={handleOpenModal}
              className="w-full py-4 rounded-2xl bg-[#F01147] hover:bg-[#D00839] text-white font-league text-2xl uppercase tracking-wider shadow-xl shadow-[#F01147]/30 flex items-center justify-center gap-2 transition-all transform active:scale-[0.98]"
            >
              <span>Отримати міні-курс</span>
              <ArrowRight className="w-5 h-5" />
            </button>

            {/* TRUST BADGE ROW */}
            <div className="flex items-center justify-center gap-3 text-[10px] sm:text-[11px] font-semibold text-white/80 pt-1">
              <span className="flex items-center gap-1">
                <Star className="w-3.5 h-3.5 fill-[#F01147] text-[#F01147]" /> 4.9/5
              </span>
              <span className="text-white/30">•</span>
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-[#059669]" /> Доступ назавжди
              </span>
              <span className="text-white/30">•</span>
              <span className="flex items-center gap-1">
                <Gift className="w-3.5 h-3.5 text-[#F01147]" /> + Бонусна лекція
              </span>
            </div>

          </div>

        </div>

      </section>

      {/* =========================================================================
          2 БЛОК: ALREADY TRIED TO FLATTEN BELLY BUT NO RESULTS?
          ========================================================================= */}
      <section className="py-8 px-4 max-w-[480px] mx-auto space-y-5 border-t border-white/10">
        
        <div className="text-center space-y-2">
          <h2 className="font-league text-3xl sm:text-4xl font-normal uppercase tracking-wide leading-tight text-white">
            Вже намагались зробити живіт пласким, але результату немає?
          </h2>
          <p className="text-sm font-semibold uppercase tracking-wider text-[#EB94A9]">
            Можливо, ви вже:
          </p>
        </div>

        {/* 6 FRAMED ITEMS WITH FAILURE/FRUSTRATION VISUALS */}
        <div className="grid grid-cols-1 gap-2.5">
          {failurePoints.map((item, idx) => {
            const IconComp = item.icon;
            return (
              <div
                key={idx}
                className="p-3.5 rounded-2xl bg-[#120E10] border border-white/10 hover:border-[#F01147]/40 transition-all flex items-center justify-between gap-3 shadow-md"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[#F01147] shrink-0">
                    <IconComp className="w-5 h-5" />
                  </div>
                  <span className="text-sm sm:text-base font-medium text-slate-100">
                    — {item.text}
                  </span>
                </div>
                <div className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-white/5 text-slate-400 shrink-0 border border-white/5 hidden sm:inline-block">
                  {item.visualLabel}
                </div>
              </div>
            );
          })}
        </div>

        {/* BOTTOM EXPLANATORY CARD */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-b from-[#180F14] to-[#120A0E] border border-[#F01147]/30 space-y-2.5 text-slate-200 text-sm sm:text-base leading-relaxed">
          <p className="font-semibold text-white">
            А живіт і талія все одно залишаються зоною, яка вас не влаштовує.
          </p>
          <p className="text-slate-300">
            Проблема може бути не в тому, що ви недостатньо стараєтесь.
          </p>
          <p className="text-slate-300">
            Важливо зрозуміти, з чим саме ви працюєте і які вправи, харчування та навантаження потрібні саме для цієї задачі.
          </p>
        </div>

        {/* CTA */}
        <button
          onClick={handleOpenModal}
          className="w-full py-3.5 rounded-2xl bg-[#F01147] hover:bg-[#D00839] text-white font-league text-2xl uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
        >
          <span>Отримати міні-курс</span>
          <ArrowRight className="w-5 h-5" />
        </button>

      </section>

      {/* =========================================================================
          3 БЛОК: FLAT BELLY IS NOT JUST 100 CRUNCHES + MESSENGER MESSAGES AROUND NASTIA
          ========================================================================= */}
      <section className="py-8 px-4 max-w-[480px] mx-auto space-y-5 border-t border-white/10">
        
        <div className="text-center space-y-1.5">
          <h2 className="font-league text-3xl sm:text-4xl font-normal uppercase tracking-wide leading-tight text-white">
            Плаский живіт — це не просто 100 скручувань на день
          </h2>
          <p className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-slate-300">
            Щоб працювати з животом і талією, потрібно розуміти:
          </p>
        </div>

        {/* FULL-HEIGHT PHOTO CANVAS WITH MESSENGER CHAT BUBBLES AROUND NASTIA */}
        <div className="relative w-full rounded-3xl overflow-hidden border border-white/15 bg-gradient-to-b from-[#160E13] via-[#0E090C] to-[#0A0708] p-4 sm:p-5 shadow-2xl flex flex-col justify-between min-h-[580px]">
          
          {/* BACKGROUND PHOTO OF NASTIA IN FULL HEIGHT */}
          <div className="absolute inset-0 opacity-40 pointer-events-none">
            <Image
              src="/images/anastasia_yoga_white.webp"
              alt="Анастасія Сич"
              fill
              className="object-cover object-[center_20%] filter brightness-95 contrast-110"
              sizes="(max-width: 768px) 100vw, 480px"
            />
            {/* Gradient overlays to keep messages ultra readable */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#0D090B]/90 via-[#0D090B]/60 to-[#0D090B]/95" />
          </div>

          {/* MESSENGER BUBBLE STACK */}
          <div className="relative z-10 space-y-3 my-auto py-2">
            {messengerQuestions.map((q, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: idx * 0.1 }}
                className={`flex ${q.align === "right" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] sm:max-w-[80%] p-3.5 rounded-2xl backdrop-blur-md shadow-xl border ${
                    q.align === "right"
                      ? "bg-gradient-to-r from-[#BA022F]/90 to-[#F01147]/90 text-white border-[#F01147]/50 rounded-tr-none"
                      : "bg-[#1C1418]/90 text-slate-100 border-white/15 rounded-tl-none"
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-white/60 mb-1">
                    <MessageCircle className="w-3 h-3 text-white/70" />
                    <span>Питання {idx + 1}</span>
                  </div>
                  <p className="text-sm sm:text-base font-semibold leading-snug">
                    {q.text}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* CONCLUSION BANNER */}
          <div className="relative z-10 mt-4 p-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-center space-y-1">
            <p className="font-league text-2xl text-white uppercase tracking-wider">
              Саме цю систему ми і розберемо на міні-курсі.
            </p>
          </div>

        </div>

        {/* CTA */}
        <button
          onClick={handleOpenModal}
          className="w-full py-3.5 rounded-2xl bg-[#F01147] hover:bg-[#D00839] text-white font-league text-2xl uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
        >
          <span>Отримати міні-курс</span>
          <ArrowRight className="w-5 h-5" />
        </button>

      </section>

      {/* =========================================================================
          4 БЛОК: WHAT YOU GET ON MINI-COURSE (YOUTUBE-STYLE LESSON VIDEO CARDS)
          ========================================================================= */}
      <section className="py-8 px-4 max-w-[480px] mx-auto space-y-5 border-t border-white/10">
        
        <div className="text-center space-y-1.5">
          <h2 className="font-league text-3xl sm:text-4xl font-normal uppercase tracking-wide leading-tight text-white">
            Що ви отримаєте на міні-курсі:
          </h2>
          <p className="text-xs sm:text-sm text-slate-300">
            6 структурованих відео-уроків з покроковою практикою
          </p>
        </div>

        {/* YOUTUBE-STYLE VIDEO LESSON CARDS */}
        <div className="space-y-4">
          {lessons.map((lesson, idx) => (
            <div
              key={idx}
              className="rounded-2xl overflow-hidden border border-white/15 bg-[#120E10] shadow-xl hover:border-[#F01147]/50 transition-all flex flex-col"
            >
              {/* YOUTUBE VIDEO PREVIEW FRAME */}
              <div className="relative w-full h-[180px] bg-black/40 overflow-hidden group cursor-pointer" onClick={handleOpenModal}>
                <Image
                  src={lesson.image}
                  alt={lesson.title}
                  fill
                  className="object-cover object-center group-hover:scale-105 transition-transform duration-500"
                  sizes="(max-width: 768px) 100vw, 480px"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#120E10] via-black/30 to-transparent" />
                
                {/* YOUTUBE PLAY ICON OVERLAY */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-13 h-13 rounded-full bg-[#F01147]/90 text-white flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform">
                    <PlayCircle className="w-8 h-8 fill-white text-[#F01147]" />
                  </div>
                </div>

                {/* DURATION BADGE */}
                <div className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded bg-black/80 text-white text-[11px] font-bold flex items-center gap-1 backdrop-blur-sm">
                  <Clock className="w-3 h-3" />
                  <span>{lesson.duration}</span>
                </div>

                {/* LESSON BADGE */}
                <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-full bg-[#F01147] text-white text-[10px] font-extrabold uppercase tracking-wider shadow-md">
                  {lesson.lessonBadge}
                </div>
              </div>

              {/* LESSON DETAILS */}
              <div className="p-4 space-y-2">
                <h3 className="font-league text-2xl font-bold uppercase tracking-wide text-white leading-tight">
                  {lesson.title}
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed whitespace-pre-line">
                  {lesson.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <button
          onClick={handleOpenModal}
          className="w-full py-3.5 rounded-2xl bg-[#F01147] hover:bg-[#D00839] text-white font-league text-2xl uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
        >
          <span>Отримати міні-курс</span>
          <ArrowRight className="w-5 h-5" />
        </button>

      </section>

      {/* =========================================================================
          5 БЛОК: NO NEED TO TRAIN FOR HOURS (20 MIN/DAY)
          ========================================================================= */}
      <section className="py-8 px-4 max-w-[480px] mx-auto space-y-5 border-t border-white/10">
        
        <div className="text-center space-y-1.5">
          <h2 className="font-league text-3xl sm:text-4xl font-normal uppercase tracking-wide leading-tight text-white">
            Не потрібно тренуватися годинами
          </h2>
        </div>

        <div className="p-5 rounded-3xl bg-gradient-to-br from-[#1A0F14] via-[#120E10] to-[#0D090B] border border-[#F01147]/40 shadow-2xl space-y-3.5">
          
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#F01147]/20 border border-[#F01147]/40 flex items-center justify-center text-[#F01147] shrink-0">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <div className="font-league text-3xl font-bold text-white uppercase leading-none">
                20 ХВИЛИН НА ДЕНЬ
              </div>
              <div className="text-[11px] text-[#EB94A9] font-bold uppercase tracking-wider">
                Замість виснажливих годин у залі
              </div>
            </div>
          </div>

          <div className="space-y-2.5 text-sm sm:text-base text-slate-200 leading-relaxed border-t border-white/10 pt-3">
            <p>
              Вам не потрібно проводити по 1–2 години в залі, щоб почати працювати над тілом.
            </p>
            <p>
              На курсі ми покажемо, як використовувати 20 хвилин на день, щоб системно працювати над животом і талією.
            </p>
            <p className="font-semibold text-white bg-white/5 p-3 rounded-xl border border-white/10">
              Головне — не кількість вправ, а правильне навантаження + харчування + регулярність.
            </p>
          </div>

        </div>

      </section>

      {/* =========================================================================
          6 БЛОК: TO MAKE BELLY FLAT, CRUNCHES ALONE ARE NOT ENOUGH
          ========================================================================= */}
      <section className="py-8 px-4 max-w-[480px] mx-auto space-y-5 border-t border-white/10">
        
        <div className="text-center space-y-1.5">
          <h2 className="font-league text-3xl sm:text-4xl font-normal uppercase tracking-wide leading-tight text-white">
            Щоб живіт був пласким, недостатньо просто качати прес
          </h2>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-[#120E10] border border-white/10 space-y-3">
          
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Якщо відсоток жиру в організмі залишається високим, одними вправами на прес проблему не вирішити.
          </p>

          <div className="text-xs font-bold uppercase tracking-wider text-[#EB94A9]">
            Тому на курсі ми окремо розберемо харчування:
          </div>

          <div className="space-y-2 pt-1">
            {[
              "чому важливо знижувати відсоток жиру;",
              "чому не варто просто різко урізати їжу;",
              "чому під час схуднення важливо тренуватися;",
              "як зберігати м'язи, а не просто бачити меншу цифру на вагах.",
            ].map((point, idx) => (
              <div key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-200">
                <CheckCircle2 className="w-4 h-4 text-[#F01147] shrink-0 mt-0.5" />
                <span>— {point}</span>
              </div>
            ))}
          </div>

        </div>

      </section>

      {/* =========================================================================
          7 БЛОК: WE WON'T WORK WITH JUST ONE EXERCISE
          ========================================================================= */}
      <section className="py-8 px-4 max-w-[480px] mx-auto space-y-5 border-t border-white/10">
        
        <div className="text-center space-y-1.5">
          <h2 className="font-league text-3xl sm:text-4xl font-normal uppercase tracking-wide leading-tight text-white">
            Ми не будемо працювати тільки з однією вправою
          </h2>
          <p className="text-xs sm:text-sm text-slate-300">
            Плаский живіт і струнка талія — це не одна вправа.
          </p>
        </div>

        <div className="p-5 rounded-3xl bg-gradient-to-b from-[#180E13] to-[#0F0A0D] border border-[#F01147]/40 shadow-xl space-y-4 text-center">
          
          <div className="text-xs font-bold uppercase tracking-wider text-[#EB94A9]">
            Тому в міні-курсі ми поєднали:
          </div>

          {/* FORMULA PILLS */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            {["анатомію", "вправи на живіт", "роботу з талією", "харчування", "Full Body тренування"].map((item, idx) => (
              <React.Fragment key={idx}>
                <span className="px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-xs sm:text-sm font-bold text-white shadow-sm">
                  {item}
                </span>
                {idx < 4 && <span className="text-[#F01147] font-bold text-base">+</span>}
              </React.Fragment>
            ))}
          </div>

          <p className="text-xs sm:text-sm text-slate-200 leading-relaxed border-t border-white/10 pt-3">
            Ви не просто повторюєте вправи, а розумієте, що ви робите і навіщо.
          </p>

        </div>

      </section>

      {/* =========================================================================
          8 БЛОК: WHO CREATED THIS MINI-COURSE (ABOUT ANASTASIA)
          ========================================================================= */}
      <section className="py-8 px-4 max-w-[480px] mx-auto space-y-5 border-t border-white/10">
        
        <div className="text-center space-y-1.5">
          <h2 className="font-league text-3xl sm:text-4xl font-normal uppercase tracking-wide leading-tight text-white">
            Хто створив цей міні-курс
          </h2>
        </div>

        <div className="rounded-3xl overflow-hidden border border-white/15 bg-[#120E10] shadow-2xl flex flex-col">
          
          {/* PHOTO OF ANASTASIA */}
          <div className="relative w-full h-[320px] bg-[#1A1216] overflow-hidden">
            <Image
              src="/images/anastasia_portrait_black.webp"
              alt="Анастасія Сич"
              fill
              className="object-cover object-[center_15%]"
              sizes="(max-width: 768px) 100vw, 480px"
            />
            <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#120E10] to-transparent" />
            
            {/* BADGE */}
            <div className="absolute bottom-3 left-4 px-3 py-1.5 rounded-full bg-[#F01147] text-white text-xs font-extrabold uppercase tracking-wider shadow-md flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5" />
              <span>8 років досвіду + Медосвіта</span>
            </div>
          </div>

          {/* BIO DETAILS */}
          <div className="p-5 space-y-3">
            <div className="font-league text-3xl font-bold uppercase text-white leading-none">
              Анастасія Сич
            </div>
            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
              Анастасія — фітнес-тренерка з 8-річним досвідом та вищою медичною освітою.
            </p>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              У своїй роботі вона поєднує практичний досвід тренерки з медичними знаннями, щоб допомагати жінкам працювати над тілом без крайнощів.
            </p>
            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1">
              <p className="text-xs sm:text-sm font-semibold text-white">
                Її підхід — не просто дати вам список вправ.
              </p>
              <p className="text-xs sm:text-sm text-slate-300">
                Пояснити, що відбувається з вашим тілом і як правильно з ним працювати.
              </p>
            </div>
          </div>

        </div>

      </section>

      {/* =========================================================================
          9 БЛОК: THIS MINI-COURSE IS FOR YOU IF YOU:
          ========================================================================= */}
      <section className="py-8 px-4 max-w-[480px] mx-auto space-y-5 border-t border-white/10">
        
        <div className="text-center space-y-1.5">
          <h2 className="font-league text-3xl sm:text-4xl font-normal uppercase tracking-wide leading-tight text-white">
            Цей міні-курс для вас, якщо ви:
          </h2>
        </div>

        <div className="space-y-2.5">
          {[
            "хочете плаский живіт і струнку талію;",
            "не розумієте, які вправи реально працюють для цієї зони;",
            "качаєте прес, але не бачите бажаних змін;",
            "не хочете виснажувати себе тренуваннями;",
            "втомилися від дієт та постійних обмежень;",
            "хочете зрозумілу систему, яку можна вписати у своє життя.",
          ].map((item, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-2xl bg-[#120E10] border border-white/10 hover:border-[#F01147]/40 transition-all flex items-start gap-3 shadow-md"
            >
              <Check className="w-5 h-5 text-[#F01147] shrink-0 mt-0.5" />
              <span className="text-xs sm:text-sm font-medium text-slate-100 leading-snug">
                — {item}
              </span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <button
          onClick={handleOpenModal}
          className="w-full py-3.5 rounded-2xl bg-[#F01147] hover:bg-[#D00839] text-white font-league text-2xl uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
        >
          <span>Отримати міні-курс</span>
          <ArrowRight className="w-5 h-5" />
        </button>

      </section>

      {/* =========================================================================
          10 БЛОК: SEE HOW GIRLS CHANGE THEIR BODY WITH ME (CASE STUDIES)
          ========================================================================= */}
      <section className="py-8 px-4 max-w-[480px] mx-auto space-y-5 border-t border-white/10">
        
        <div className="text-center space-y-1.5">
          <h2 className="font-league text-3xl sm:text-4xl font-normal uppercase tracking-wide leading-tight text-white">
            Подивіться, як дівчата змінюють своє тіло разом зі мною
          </h2>
          <p className="text-xs sm:text-sm text-slate-300">
            Реальні результати учениць та відгуки
          </p>
        </div>

        {/* CASES CAROUSEL */}
        <div className="relative">
          <div
            ref={carouselRef}
            className="flex gap-3.5 overflow-x-auto pb-3 snap-x snap-mandatory scrollbar-hide"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {realCaseGalleries.map((caseItem) => (
              <div
                key={caseItem.id}
                onClick={() => setActiveCaseImage(caseItem.image)}
                className="min-w-[270px] max-w-[270px] shrink-0 snap-center rounded-2xl overflow-hidden bg-[#120E10] border border-white/15 p-3 flex flex-col space-y-2.5 cursor-pointer hover:border-[#F01147]/50 transition-all shadow-xl group"
              >
                {/* PHOTO */}
                <div className="relative w-full h-[280px] rounded-xl overflow-hidden bg-black/40">
                  <Image
                    src={caseItem.image}
                    alt={caseItem.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    sizes="270px"
                  />
                  <div className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white backdrop-blur-sm">
                    <ZoomIn className="w-4 h-4" />
                  </div>
                  <div className="absolute bottom-2 left-2 px-2.5 py-0.5 rounded-full bg-[#F01147] text-white text-[10px] font-bold">
                    {caseItem.badge}
                  </div>
                </div>

                {/* DETAILS */}
                <div className="space-y-1">
                  <div className="font-league text-xl font-bold uppercase text-white">
                    {caseItem.title}
                  </div>
                  <p className="text-xs text-slate-300 leading-snug">
                    {caseItem.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* CAROUSEL CONTROLS */}
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={() => scrollCarousel("left")}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/15 transition-colors"
              aria-label="Previous slide"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs text-slate-400 font-medium">← гортайте результати →</span>
            <button
              onClick={() => scrollCarousel("right")}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/15 transition-colors"
              aria-label="Next slide"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

      </section>

      {/* =========================================================================
          11 БЛОК: EVERYTHING YOU NEED IS ALREADY INSIDE
          ========================================================================= */}
      <section className="py-8 px-4 max-w-[480px] mx-auto space-y-5 border-t border-white/10">
        
        <div className="text-center space-y-1.5">
          <h2 className="font-league text-3xl sm:text-4xl font-normal uppercase tracking-wide leading-tight text-white">
            Все необхідне вже всередині
          </h2>
        </div>

        <div className="space-y-3">
          {insideFeatures.map((feat, idx) => {
            const IconComp = feat.icon;
            return (
              <div
                key={idx}
                className="p-4 rounded-2xl bg-[#120E10] border border-white/10 flex items-start gap-3.5 shadow-lg hover:border-[#F01147]/40 transition-all"
              >
                <div className="w-10 h-10 rounded-xl bg-[#F01147]/15 border border-[#F01147]/30 flex items-center justify-center text-[#F01147] shrink-0">
                  <IconComp className="w-5 h-5" />
                </div>
                <div className="space-y-0.5">
                  <h3 className="font-league text-2xl font-bold uppercase text-white leading-tight">
                    {feat.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-300 leading-snug">
                    {feat.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

      </section>

      {/* =========================================================================
          12 БЛОК: FAQ (ACCORDION)
          ========================================================================= */}
      <section className="py-8 px-4 max-w-[480px] mx-auto space-y-5 border-t border-white/10">
        
        <div className="text-center space-y-1.5">
          <h2 className="font-league text-3xl sm:text-4xl font-normal uppercase tracking-wide leading-tight text-white">
            ЧАСТІ ПИТАННЯ:
          </h2>
        </div>

        <div className="space-y-3">
          {faqItems.map((item, idx) => {
            const isOpen = openFaqIndex === idx;
            return (
              <div
                key={idx}
                className="rounded-2xl overflow-hidden border border-white/10 bg-[#120E10] shadow-md transition-all"
              >
                <button
                  onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                  className="w-full p-4 text-left flex items-center justify-between gap-3 font-semibold text-sm sm:text-base text-white hover:text-[#EB94A9] transition-colors"
                >
                  <span>{item.q}</span>
                  <ChevronDown
                    className={`w-5 h-5 text-[#F01147] shrink-0 transition-transform duration-300 ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                    >
                      <div className="px-4 pb-4 pt-1 text-xs sm:text-sm text-slate-300 border-t border-white/5 leading-relaxed">
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
          13 БЛОК: FINAL OFFER & CTA
          ========================================================================= */}
      <section className="py-8 px-4 max-w-[480px] mx-auto space-y-5 border-t border-white/10 text-center">
        
        <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-b from-[#1C0E14] via-[#120E10] to-[#0A0708] border border-[#F01147]/50 shadow-2xl space-y-4">
          
          <div className="space-y-2">
            <h2 className="font-league text-3xl sm:text-4xl font-normal uppercase tracking-wide leading-tight text-white">
              Зроби плоский живіт та струнку талію всього за 20 хвилин на день
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Без страху з'їсти щось не те, без тренувань, після яких неможливо підвестись на ноги, за чіткою системою від фітнес-тренерки
            </p>
          </div>

          {/* PRICING ROW */}
          <div className="py-3 px-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
            <span className="font-league text-xl font-bold uppercase text-white">
              Міні-курс —
            </span>
            <div className="flex items-center gap-3">
              <span className="font-league text-2xl text-slate-400 line-through">
                3999 грн
              </span>
              <span className="font-league text-3xl font-extrabold text-[#F01147]">
                399 грн
              </span>
            </div>
          </div>

          {/* FINAL CTA BUTTON */}
          <button
            onClick={handleOpenModal}
            className="w-full py-4 rounded-2xl bg-[#F01147] hover:bg-[#D00839] text-white font-league text-2xl uppercase tracking-wider shadow-xl shadow-[#F01147]/30 flex items-center justify-center gap-2 transition-all transform active:scale-[0.98]"
          >
            <span>Отримати міні-курс</span>
            <ArrowRight className="w-5 h-5" />
          </button>

          {/* TRUST BADGE ROW */}
          <div className="flex items-center justify-center gap-3 text-[10px] sm:text-[11px] font-semibold text-white/80 pt-1">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-[#059669]" /> Гарантія повернення коштів
            </span>
            <span className="text-white/30">•</span>
            <span className="flex items-center gap-1">
              <Gift className="w-3.5 h-3.5 text-[#F01147]" /> Доступ назавжди
            </span>
          </div>

        </div>

      </section>

      {/* =========================================================================
          FIXED STICKY BOTTOM BAR ACROSS THE ENTIRE LANDING PAGE
          ========================================================================= */}
      <AnimatePresence>
        {showStickyUI && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="fixed inset-x-0 bottom-0 z-50 p-2.5 sm:p-3 bg-[#0A0709]/95 backdrop-blur-xl border-t border-[#F01147]/40 shadow-2xl"
          >
            <div className="max-w-[480px] mx-auto flex items-center justify-between gap-3">
              
              {/* TIMER & PRICE */}
              <div className="flex flex-col">
                <div className="flex items-center gap-1 text-[10px] font-extrabold text-[#EB94A9] uppercase tracking-wider">
                  <Clock className="w-3 h-3 text-[#F01147]" />
                  <span>Знижка зникне через: {timeLeft.minutes}:{timeLeft.seconds}</span>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="font-league text-2xl font-black text-white leading-none">
                    399 грн
                  </span>
                  <span className="font-league text-sm text-slate-400 line-through leading-none">
                    3999 грн
                  </span>
                </div>
              </div>

              {/* ACTION BUTTON */}
              <button
                onClick={handleOpenModal}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#F01147] to-[#D00839] hover:brightness-110 text-white font-league text-xl uppercase tracking-wider shadow-lg shadow-[#F01147]/40 flex items-center gap-1.5 shrink-0 transition-transform active:scale-95"
              >
                <span>Отримати міні-курс</span>
                <ArrowRight className="w-4 h-4" />
              </button>

            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* =========================================================================
          CHECKOUT MODAL POPUP
          ========================================================================= */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            
            {/* BACKDROP */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />

            {/* MODAL CARD */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-[420px] rounded-3xl bg-[#140E12] border border-[#F01147]/50 shadow-2xl p-5 sm:p-6 text-white z-10 overflow-hidden"
            >
              {/* CLOSE BUTTON */}
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="space-y-4">
                
                {/* HEADER */}
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#F01147]/20 border border-[#F01147]/40 text-[#EB94A9] text-[10px] font-extrabold uppercase tracking-wider">
                    🔥 ЗНИЖКА -90% ДІЄ СЬОГОДНІ
                  </div>
                  <h3 className="font-league text-2xl sm:text-3xl font-bold uppercase tracking-wide text-white leading-tight">
                    Отримати міні-курс
                  </h3>
                  <p className="text-xs text-slate-300">
                    Заповніть форму для миттєвого переходу до безпечної оплати (399 грн).
                  </p>
                </div>

                {/* FORM */}
                <form onSubmit={handleSubmit} className="space-y-3.5">
                  
                  {/* NAME INPUT */}
                  <div className="space-y-1 text-left">
                    <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1">
                      <User className="w-3 h-3 text-[#F01147]" /> Ваше ім'я
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Олена"
                      value={formData.name}
                      onChange={(e) => handleInputChange("name", e.target.value)}
                      className="w-full px-3.5 py-3 rounded-xl bg-white/5 border border-white/15 text-white placeholder-slate-500 focus:outline-none focus:border-[#F01147] transition-colors text-sm"
                    />
                  </div>

                  {/* PHONE INPUT */}
                  <div className="space-y-1 text-left">
                    <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1">
                      <Phone className="w-3 h-3 text-[#F01147]" /> Номер телефону
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="+380"
                      value={formData.phone}
                      onChange={handlePhoneChange}
                      className="w-full px-3.5 py-3 rounded-xl bg-white/5 border border-white/15 text-white placeholder-slate-500 focus:outline-none focus:border-[#F01147] transition-colors text-sm"
                    />
                  </div>

                  {/* TELEGRAM INPUT */}
                  <div className="space-y-1 text-left">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1">
                        <MessageCircle className="w-3 h-3 text-[#F01147]" /> Telegram нікнейм
                      </label>
                      <button
                        type="button"
                        onClick={handleNoTelegramClick}
                        className="text-[10px] text-[#EB94A9] hover:underline"
                      >
                        Немає нікнейму
                      </button>
                    </div>
                    <input
                      type="text"
                      required
                      placeholder="@username або номер"
                      value={formData.telegram}
                      onChange={(e) => handleInputChange("telegram", e.target.value)}
                      className="w-full px-3.5 py-3 rounded-xl bg-white/5 border border-white/15 text-white placeholder-slate-500 focus:outline-none focus:border-[#F01147] transition-colors text-sm"
                    />
                  </div>

                  {/* ERROR MESSAGE */}
                  {errorMessage && (
                    <div className="p-2.5 rounded-xl bg-red-500/20 border border-red-500/40 text-red-300 text-xs font-medium">
                      {errorMessage}
                    </div>
                  )}

                  {/* SUBMIT BUTTON */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3.5 rounded-xl bg-[#F01147] hover:bg-[#D00839] disabled:opacity-50 text-white font-league text-2xl uppercase tracking-wider shadow-xl shadow-[#F01147]/40 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                  >
                    {isSubmitting ? (
                      <span>Обробка...</span>
                    ) : (
                      <>
                        <span>Перейти до оплати 399 грн</span>
                        <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </button>

                  {/* GUARANTEE */}
                  <p className="text-[10px] text-slate-400 text-center flex items-center justify-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#059669]" />
                    Безпечна оплата через WayForPay (Apple Pay, Google Pay, Картка)
                  </p>

                </form>

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* =========================================================================
          LIGHTBOX FOR CASE IMAGES
          ========================================================================= */}
      <AnimatePresence>
        {activeCaseImage && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <button
              onClick={() => setActiveCaseImage(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-20"
              aria-label="Close image lightbox"
            >
              <X className="w-6 h-6" />
            </button>
            <div
              className="relative max-w-[90vw] max-h-[85vh] w-[450px] h-[550px]"
              onClick={() => setActiveCaseImage(null)}
            >
              <Image
                src={activeCaseImage}
                alt="Case preview"
                fill
                className="object-contain"
                sizes="(max-width: 768px) 90vw, 450px"
              />
            </div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
