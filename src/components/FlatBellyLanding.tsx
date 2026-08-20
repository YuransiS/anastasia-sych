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
  PlayCircle,
  Clock,
  Sparkles,
  Award,
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
  const thoughtsCarouselRef = useRef<HTMLDivElement>(null);

  const scrollCarousel = (direction: "left" | "right") => {
    if (carouselRef.current) {
      const cardWidth = carouselRef.current.firstElementChild?.clientWidth || 280;
      const scrollAmount = direction === "left" ? -cardWidth - 16 : cardWidth + 16;
      carouselRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  const scrollThoughts = (direction: "left" | "right") => {
    if (thoughtsCarouselRef.current) {
      const cardWidth = thoughtsCarouselRef.current.firstElementChild?.clientWidth || 260;
      const scrollAmount = direction === "left" ? -cardWidth - 16 : cardWidth + 16;
      thoughtsCarouselRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
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
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          phone: formData.phone,
          telegram: formData.telegram,
          notes: formData.notes || "Заявка на міні-курс (279 грн)",
          offer_variant: "mini-course",
          amount: 279,
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

  // 2 БЛОК: 6 items in separate frames (Lovable style cards)
  const failureThoughts = [
    {
      author: "Олена",
      initial: "О",
      quote: "— качали прес;",
      subtext: "100 скручувань щодня, а живіт не йде",
    },
    {
      author: "Марія",
      initial: "М",
      quote: "— робили тренування на живіт;",
      subtext: "Виснажливі марафони без видимого результату",
    },
    {
      author: "Тетяна",
      initial: "Т",
      quote: "— намагались менше їсти;",
      subtext: "Постійне відчуття голоду та слабкість",
    },
    {
      author: "Юлія",
      initial: "Ю",
      quote: "— прибирали солодке;",
      subtext: "Заборона викликала ще більшу тягу",
    },
    {
      author: "Анна",
      initial: "А",
      quote: "— починали тренуватися з понеділка;",
      subtext: "Кожен понеділок починався новий старт",
    },
    {
      author: "Оксана",
      initial: "О",
      quote: "— витримували кілька днів, а потім зривалися.",
      subtext: "Зрив на вихідних та почуття провини",
    },
  ];

  // 3 БЛОК: Messenger question sequence around Nastia
  const messengerQuestions = [
    { text: "чому живіт випирає", isPrimary: false },
    { text: "→ які м'язи та рухи тут задіяні", isPrimary: true },
    { text: "→ які вправи потрібні", isPrimary: false },
    { text: "→ як харчування впливає на кількість жиру", isPrimary: true },
    { text: "→ як тренувати все тіло, щоб зберігати м'язи.", isPrimary: false },
  ];

  // 4 БЛОК: 6 YouTube-styled Video Lessons
  const lessons = [
    {
      lessonBadge: "Бонусний урок",
      title: "Як закріпити результат",
      desc: "Як працювати зі звичками та чому маленькі послідовні кроки ефективніші за спроби змінити все одразу.",
      image: "/images/anastasia_yoga_white.webp",
      imagePosition: "center 20%",
    },
    {
      lessonBadge: "Урок 1",
      title: "Чому живіт випирає",
      desc: "Розберемо анатомію та біомеханіку і визначимо, над чим саме потрібно працювати, щоб змінити вигляд живота.",
      image: "/images/anastasia_outdoor.webp",
      imagePosition: "center 15%",
    },
    {
      lessonBadge: "Урок 2",
      title: "Практичні вправи для плаского живота",
      desc: "Вправи, за допомогою яких ви зможете правильно працювати з м'язами живота. Без тренувань до стану, коли наступного дня неможливо підвестись з ліжка.",
      image: "/images/anastasia_hero_blue.webp",
      imagePosition: "center 15%",
    },
    {
      lessonBadge: "Урок 3",
      title: "Талія робиться на кухні",
      desc: "Чому для плаского живота та стрункої талії важливо зменшувати відсоток жиру. Харчування та тренування під час схуднення — як зберегти м'язи.",
      image: "/images/expert.webp",
      imagePosition: "center 5%",
    },
    {
      lessonBadge: "Урок 4",
      title: "Вправи для стрункої талії",
      desc: "Практичний урок з вправами, які допоможуть вам працювати над м'язами та формою талії.",
      image: "/images/anastasia_yoga_white.webp",
      imagePosition: "center 20%",
    },
    {
      lessonBadge: "Урок 5",
      title: "Full Body — тренування на все тіло",
      desc: "Повноцінне тренування для формування сильного м'язевого каркасу — для підтягнутого тіла в цілому.",
      image: "/images/anastasia_portrait_black.webp",
      imagePosition: "center 10%",
    },
  ];

  // 10 БЛОК: Real transformation cases
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

  // 11 БЛОК: Inside deliverables
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
      icon: Sparkles,
    },
    {
      title: "Харчування",
      desc: "Розуміння, як харчування пов'язане з пласким животом і стрункою талією.",
      icon: CheckCircle2,
    },
    {
      title: "Full Body",
      desc: "Тренування на все тіло для сильного м'язевого каркасу.",
      icon: Award,
    },
  ];

  // 12 БЛОК: FAQ items
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
    <div className="min-h-screen bg-[#FAF4F7] text-[#2C1D27] font-sans selection:bg-[#D8438A] selection:text-white pb-28 sm:pb-24 overflow-x-hidden">

      {/* =========================================================================
          1 БЛОК: HERO SECTION (LOVABLE REFERENCE STYLE)
          ========================================================================= */}
      <section className="relative w-full max-w-[480px] mx-auto px-4 pt-6 pb-6 flex flex-col items-center">
        
        {/* TOP INTRO TEXT */}
        <div className="w-full text-center space-y-4 mb-2 relative">
          
          {/* DECORATIVE PINK ACCENT DOTS */}
          <div className="absolute -top-1 left-3 w-3 h-3 rounded-full bg-[#D8438A]" />
          <div className="absolute top-28 right-2 w-3.5 h-3.5 rounded-full bg-[#D8438A]" />

          {/* MAIN EDITORIAL HEADLINE WITH PINK HIGHLIGHT PILLS */}
          <h1 className="font-playfair text-[32px] sm:text-[38px] font-black text-[#261A23] leading-[1.15] tracking-tight px-1">
            Зроби{" "}
            <span className="bg-[#FBD4E5] text-[#C42774] px-3 py-0.5 rounded-2xl inline-block shadow-sm">
              плаский живіт
            </span>{" "}
            та{" "}
            <span className="bg-[#FBD4E5] text-[#C42774] px-3 py-0.5 rounded-2xl inline-block shadow-sm">
              струнку талію
            </span>{" "}
            всього за 20 хвилин на день
          </h1>

          {/* 3 BULLETS FROM TZ */}
          <div className="space-y-1.5 pt-1 text-left px-2">
            <div className="flex items-center gap-2 text-xs sm:text-[13px] text-[#4A3D47] font-medium">
              <span className="text-[#D8438A] font-bold">•</span>
              <span>-без страху зʼїсти щось «не те»</span>
            </div>
            <div className="flex items-center gap-2 text-xs sm:text-[13px] text-[#4A3D47] font-medium">
              <span className="text-[#D8438A] font-bold">•</span>
              <span>-без тренувань після яких неможливо підвестись на ноги</span>
            </div>
            <div className="flex items-center gap-2 text-xs sm:text-[13px] text-[#4A3D47] font-medium">
              <span className="text-[#D8438A] font-bold">•</span>
              <span>-за чіткою системою від фітнес тренерки</span>
            </div>
          </div>

        </div>

        {/* ANASTASIA HERO PHOTO CANVAS */}
        <div className="relative w-full h-[360px] sm:h-[420px] rounded-[32px] overflow-hidden shadow-md my-2">
          <Image
            src="/images/anastasia_hero_blue.webp"
            alt="Анастасія Сич"
            fill
            priority
            className="object-cover object-[center_12%]"
            sizes="(max-width: 768px) 100vw, 480px"
          />
        </div>

        {/* FLOATING DARK CARD AT BOTTOM OF HERO (MATCHING LOVABLE SCREENSHOT 1) */}
        <div className="relative w-full -mt-10 z-10 rounded-[32px] bg-[#291B26] text-white p-5 sm:p-6 shadow-2xl space-y-4 border border-white/10">
          
          <div className="space-y-1 text-center">
            <p className="text-sm text-slate-200 leading-snug">
              СТАРТ 27.08 | 6 практичних уроків
            </p>
            <div className="text-sm font-medium text-slate-300 flex items-center justify-center gap-2 pt-0.5">
              <span>Ціна:</span>
              <span className="line-through text-slate-400">3999 грн</span>
              <span className="font-bold text-white text-base">279 грн</span>
              <span className="text-[#F472B6] font-bold">· знижка -93%</span>
            </div>
          </div>

          {/* MAIN HOT PINK PILL BUTTON */}
          <button
            onClick={handleOpenModal}
            className="w-full py-4 rounded-full bg-gradient-to-r from-[#DE438E] to-[#CD327E] hover:brightness-105 text-white font-bold text-lg uppercase tracking-wider shadow-[0_10px_25px_rgba(217,67,142,0.4)] flex items-center justify-center gap-2 transition-all transform active:scale-95"
          >
            <span>Отримати міні-курс</span>
          </button>

          {/* 3 DARK PILL BADGES */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1 text-[11px] font-semibold text-slate-200">
            <span className="px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm">
              8+ років досвіду
            </span>
            <span className="px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm">
              Доступ назавжди
            </span>
            <span className="px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm">
              Без обмежень в їжі
            </span>
          </div>

        </div>

      </section>

      {/* =========================================================================
          2 БЛОК: FAMILIAR THOUGHTS (LOVABLE SCREENSHOT 2 STYLE)
          ========================================================================= */}
      <section className="py-8 px-4 max-w-[480px] mx-auto space-y-5">
        
        <div className="text-center space-y-1">
          <div className="text-[#D8438A] text-xs font-black tracking-widest uppercase">
            ЗНАЙОМІ ДУМКИ?
          </div>
          <h2 className="font-playfair text-2xl sm:text-3xl font-black text-[#261A23] leading-tight">
            Вже намагались зробити живіт пласким,{" "}
            <span className="bg-[#FBD4E5] text-[#C42774] px-2 py-0.5 rounded-xl inline-block">
              але результату немає?
            </span>
          </h2>
          <p className="text-xs sm:text-sm font-semibold text-[#5A4B56] pt-1">
            Можливо, ви вже:
          </p>
        </div>

        {/* 6 INDIVIDUAL FRAMED THOUGHT CARDS (CAROUSEL / GRID) */}
        <div className="relative">
          <div
            ref={thoughtsCarouselRef}
            className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {failureThoughts.map((item, idx) => (
              <div
                key={idx}
                className="min-w-[240px] max-w-[240px] shrink-0 snap-center rounded-3xl bg-white p-4 shadow-sm border border-[#F2DEE9] space-y-3"
              >
                {/* AUTHOR AVATAR */}
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-[#D8438A] text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-sm">
                    {item.initial}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#261A23]">{item.author}</div>
                    <div className="text-[10px] text-[#7A6B76]">учасниця</div>
                  </div>
                </div>

                {/* QUOTE BUBBLE */}
                <div className="p-3 rounded-2xl bg-[#FDF0F6] border border-[#FCE1ED] text-[#261A23] font-serif italic text-sm font-bold leading-snug">
                  {item.quote}
                </div>

                {/* SUBTEXT */}
                <p className="text-xs text-[#5A4B56] leading-relaxed">
                  {item.subtext}
                </p>
              </div>
            ))}
          </div>

          {/* CONTROLS */}
          <div className="flex items-center justify-center gap-3 pt-2 text-[#D8438A] text-xs font-bold tracking-widest uppercase">
            <button
              onClick={() => scrollThoughts("left")}
              className="p-1.5 rounded-full bg-white text-[#D8438A] border border-[#F2DEE9]"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span>← гортай повідомлення →</span>
            <button
              onClick={() => scrollThoughts("right")}
              className="p-1.5 rounded-full bg-white text-[#D8438A] border border-[#F2DEE9]"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* BOTTOM EXPLANATORY CARD */}
        <div className="space-y-3 text-center pt-2">
          <p className="font-playfair text-lg sm:text-xl font-bold text-[#261A23] leading-snug">
            А живіт і талія все одно залишаються зоною, яка вас не влаштовує.
          </p>
          <div className="bg-[#FCE1ED] p-4 rounded-2xl text-[#C42774] text-sm sm:text-base font-medium leading-relaxed">
            <p>
              Проблема може бути не в тому, що ви недостатньо стараєтесь.
            </p>
            <p className="pt-1 font-bold">
              Важливо зрозуміти, з чим саме ви працюєте і які вправи, харчування та навантаження потрібні саме для цієї задачі.
            </p>
          </div>
          
          <p className="font-playfair italic text-[#261A23] text-base font-bold pt-1">
            Впізнали себе хоча б в одному пункті? Тоді час це змінити.
          </p>

          {/* CTA */}
          <button
            onClick={handleOpenModal}
            className="w-full py-4 rounded-full bg-gradient-to-r from-[#DE438E] to-[#CD327E] hover:brightness-105 text-white font-bold text-base uppercase tracking-wider shadow-[0_10px_25px_rgba(217,67,142,0.35)] transition-all active:scale-95"
          >
            <span>Так, це про мене</span>
          </button>
        </div>

      </section>

      {/* =========================================================================
          3 БЛОК: FLAT BELLY IS NOT JUST 100 CRUNCHES + MESSENGER AROUND NASTIA
          ========================================================================= */}
      <section className="py-8 px-4 max-w-[480px] mx-auto space-y-4">
        
        <div className="text-center space-y-1">
          <div className="text-[#D8438A] text-xs font-black tracking-widest uppercase">
            СИСТЕМА ТРЕНУВАНЬ
          </div>
          <h2 className="font-playfair text-2xl sm:text-3xl font-black text-[#261A23] leading-tight">
            Плаский живіт — це{" "}
            <span className="bg-[#FBD4E5] text-[#C42774] px-2 py-0.5 rounded-xl inline-block">
              не просто 100 скручувань
            </span>{" "}
            на день
          </h2>
          <p className="text-xs sm:text-sm font-semibold text-[#5A4B56]">
            Щоб працювати з животом і талією, потрібно розуміти:
          </p>
        </div>

        {/* FULL-HEIGHT PHOTO WITH MESSENGER CARDS AROUND NASTIA */}
        <div className="relative w-full rounded-[32px] overflow-hidden bg-[#FAF1F6] border border-[#F2DCE8] p-4 sm:p-5 shadow-lg flex flex-col justify-between min-h-[580px]">
          
          {/* PHOTO OF NASTIA */}
          <div className="absolute inset-0 opacity-45 pointer-events-none">
            <Image
              src="/images/anastasia_yoga_white.webp"
              alt="Анастасія Сич"
              fill
              className="object-cover object-[center_20%]"
              sizes="(max-width: 768px) 100vw, 480px"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-[#FAF4F7]/90 via-[#FAF4F7]/40 to-[#FAF4F7]/95" />
          </div>

          {/* MESSENGER BUBBLES */}
          <div className="relative z-10 space-y-3 my-auto py-2">
            {messengerQuestions.map((q, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: idx * 0.08 }}
                className={`flex ${idx % 2 === 1 ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] p-3.5 rounded-2xl shadow-md border ${
                    q.isPrimary
                      ? "bg-[#D8438A] text-white border-[#D8438A] rounded-tr-none"
                      : "bg-white text-[#261A23] border-[#F2DEE9] rounded-tl-none"
                  }`}
                >
                  <div className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider mb-1 ${q.isPrimary ? "text-white/80" : "text-[#D8438A]"}`}>
                    <MessageCircle className="w-3 h-3" />
                    <span>Крок 0{idx + 1}</span>
                  </div>
                  <p className="text-sm font-semibold leading-snug">
                    {q.text}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* CONCLUSION BANNER */}
          <div className="relative z-10 mt-3 p-3.5 rounded-2xl bg-white/90 backdrop-blur-sm border border-[#F2DEE9] text-center shadow-sm">
            <p className="font-playfair text-lg sm:text-xl font-bold text-[#261A23]">
              Саме цю систему ми і розберемо на міні-курсі.
            </p>
          </div>

        </div>

        {/* CTA */}
        <button
          onClick={handleOpenModal}
          className="w-full py-4 rounded-full bg-gradient-to-r from-[#DE438E] to-[#CD327E] hover:brightness-105 text-white font-bold text-base uppercase tracking-wider shadow-[0_10px_25px_rgba(217,67,142,0.35)] transition-all active:scale-95"
        >
          <span>Отримати міні-курс</span>
        </button>

      </section>

      {/* =========================================================================
          4 БЛОК: WHAT YOU GET ON MINI-COURSE (YOUTUBE-STYLE LESSON VIDEO CARDS)
          ========================================================================= */}
      <section className="py-8 px-4 max-w-[480px] mx-auto space-y-5">
        
        <div className="text-center space-y-1">
          <div className="text-[#D8438A] text-xs font-black tracking-widest uppercase">
            ПРОГРАМА КУРСУ
          </div>
          <h2 className="font-playfair text-2xl sm:text-3xl font-black text-[#261A23] leading-tight">
            Що ви отримаєте на міні-курсі:
          </h2>
        </div>

        {/* YOUTUBE-STYLE VIDEO LESSON CARDS */}
        <div className="space-y-4">
          {lessons.map((lesson, idx) => (
            <div
              key={idx}
              className="rounded-3xl overflow-hidden bg-white border border-[#F2DEE9] shadow-sm hover:shadow-md transition-all flex flex-col"
            >
              {/* YOUTUBE VIDEO PREVIEW FRAME */}
              <div className="relative w-full h-[180px] bg-black/40 overflow-hidden group cursor-pointer" onClick={handleOpenModal}>
                <Image
                  src={lesson.image}
                  alt={lesson.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                  style={{ objectPosition: lesson.imagePosition }}
                  sizes="(max-width: 768px) 100vw, 480px"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />
                
                {/* PLAY BUTTON */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-[#D8438A]/90 text-white flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
                    <PlayCircle className="w-7 h-7 fill-white text-[#D8438A]" />
                  </div>
                </div>

                {/* LESSON BADGE */}
                <div className="absolute top-2.5 left-2.5 px-3 py-1 rounded-full bg-[#D8438A] text-white text-[10px] font-black uppercase tracking-wider shadow-md">
                  {lesson.lessonBadge}
                </div>
              </div>

              {/* DETAILS */}
              <div className="p-4 sm:p-5 space-y-2 text-left">
                <h3 className="font-playfair text-xl font-bold text-[#261A23] leading-snug">
                  {lesson.title}
                </h3>
                <p className="text-xs sm:text-[13px] text-[#5A4B56] leading-relaxed whitespace-pre-line">
                  {lesson.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <button
          onClick={handleOpenModal}
          className="w-full py-4 rounded-full bg-gradient-to-r from-[#DE438E] to-[#CD327E] hover:brightness-105 text-white font-bold text-base uppercase tracking-wider shadow-[0_10px_25px_rgba(217,67,142,0.35)] transition-all active:scale-95"
        >
          <span>Отримати міні-курс</span>
        </button>

      </section>

      {/* =========================================================================
          5 БЛОК: NO NEED TO TRAIN FOR HOURS (20 MIN/DAY)
          ========================================================================= */}
      <section className="py-8 px-4 max-w-[480px] mx-auto space-y-4">
        
        <div className="text-center">
          <h2 className="font-playfair text-2xl sm:text-3xl font-black text-[#261A23] leading-tight">
            Не потрібно тренуватися годинами
          </h2>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-[#F2DEE9] shadow-sm space-y-3.5 text-left">
          
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#FCE1ED] text-[#D8438A] flex items-center justify-center shrink-0">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <div className="font-playfair text-xl font-black text-[#261A23] leading-none">
                20 ХВИЛИН НА ДЕНЬ
              </div>
              <div className="text-[11px] text-[#D8438A] font-bold uppercase tracking-wider mt-0.5">
                Замість виснажливих годин у залі
              </div>
            </div>
          </div>

          <div className="space-y-2.5 text-xs sm:text-[13px] text-[#5A4B56] leading-relaxed border-t border-[#F5E6EE] pt-3">
            <p>
              Вам не потрібно проводити по 1–2 години в залі, щоб почати працювати над тілом.
            </p>
            <p>
              На курсі ми покажемо, як використовувати 20 хвилин на день, щоб системно працювати над животом і талією.
            </p>
            <p className="font-bold text-[#261A23] bg-[#FDF0F6] p-3 rounded-2xl border border-[#FCE1ED]">
              Головне — не кількість вправ, а правильне навантаження + харчування + регулярність.
            </p>
          </div>

        </div>

      </section>

      {/* =========================================================================
          6 БЛОК: NUTRITION & FAT % (LOVABLE SCREENSHOT 3 STYLE)
          ========================================================================= */}
      <section className="py-8 px-4 max-w-[480px] mx-auto space-y-4">
        
        <div className="text-center space-y-1">
          <div className="text-[#D8438A] text-xs font-black tracking-widest uppercase">
            РОЛЬ ХАРЧУВАННЯ
          </div>
          <h2 className="font-playfair text-2xl sm:text-3xl font-black text-[#261A23] leading-tight">
            Щоб живіт був пласким,{" "}
            <span className="bg-[#FBD4E5] text-[#C42774] px-2 py-0.5 rounded-xl inline-block">
              недостатньо просто качати прес
            </span>
          </h2>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-[#F2DEE9] shadow-sm space-y-4 text-left">
          
          <p className="text-xs sm:text-[13px] text-[#5A4B56] leading-relaxed">
            Якщо відсоток жиру в організмі залишається високим, одними вправами на прес проблему не вирішити.
          </p>

          <div className="text-xs font-bold uppercase tracking-wider text-[#D8438A]">
            Тому на курсі ми окремо розберемо харчування:
          </div>

          <div className="space-y-3 pt-1">
            {[
              "чому важливо знижувати відсоток жиру;",
              "чому не варто просто різко урізати їжу;",
              "чому під час схуднення важливо тренуватися;",
              "як зберігати м'язи, а не просто бачити меншу цифру на вагах.",
            ].map((point, idx) => (
              <div key={idx} className="flex items-start gap-3 border-t border-[#F8EDF3] pt-3 first:border-0 first:pt-0">
                <span className="font-playfair font-black text-xl text-[#D8438A] leading-none shrink-0 w-4">
                  {idx + 1}
                </span>
                <span className="text-xs sm:text-[13px] text-[#261A23] font-medium leading-snug">
                  {point}
                </span>
              </div>
            ))}
          </div>

        </div>

      </section>

      {/* =========================================================================
          7 БЛОК: MULTI-DISCIPLINARY FORMULA
          ========================================================================= */}
      <section className="py-8 px-4 max-w-[480px] mx-auto space-y-4">
        
        <div className="text-center space-y-1">
          <div className="text-[#D8438A] text-xs font-black tracking-widest uppercase">
            КОМПЛЕКСНИЙ ПІДХІД
          </div>
          <h2 className="font-playfair text-2xl sm:text-3xl font-black text-[#261A23] leading-tight">
            Ми не будемо працювати тільки з однією вправою
          </h2>
          <p className="text-xs sm:text-sm text-[#5A4B56]">
            Плаский живіт і струнка талія — це не одна вправа.
          </p>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-[#F2DEE9] shadow-sm space-y-4 text-center">
          
          <div className="text-xs font-bold uppercase tracking-wider text-[#D8438A]">
            Тому в міні-курсі ми поєднали:
          </div>

          {/* FORMULA PILLS */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            {["анатомію", "вправи на живіт", "роботу з талією", "харчування", "Full Body тренування"].map((item, idx) => (
              <React.Fragment key={idx}>
                <span className="px-3 py-1.5 rounded-2xl bg-[#FDF0F6] border border-[#FCE1ED] text-xs sm:text-sm font-bold text-[#C42774] shadow-sm">
                  {item}
                </span>
                {idx < 4 && <span className="text-[#D8438A] font-black text-base">+</span>}
              </React.Fragment>
            ))}
          </div>

          <p className="text-xs sm:text-[13px] text-[#5A4B56] leading-relaxed border-t border-[#F8EDF3] pt-3">
            Ви не просто повторюєте вправи, а розумієте, що ви робите і навіщо.
          </p>

        </div>

      </section>

      {/* =========================================================================
          8 БЛОК: ABOUT AUTHOR (LOVABLE SCREENSHOT 4 STYLE)
          ========================================================================= */}
      <section className="py-8 px-4 max-w-[480px] mx-auto space-y-4">
        
        <div className="text-center space-y-1">
          <div className="text-[#D8438A] text-xs font-black tracking-widest uppercase">
            АВТОРКА КУРСУ
          </div>
          <h2 className="font-playfair text-2xl sm:text-3xl font-black text-[#261A23] leading-tight">
            Хто створив цей міні-курс
          </h2>
        </div>

        {/* PHOTO CANVAS WITH OVERLAY TEXT (SCREENSHOT 4) */}
        <div className="relative w-full h-[360px] sm:h-[400px] rounded-[32px] overflow-hidden shadow-md">
          <Image
            src="/images/anastasia_portrait_black.webp"
            alt="Анастасія Сич"
            fill
            className="object-cover object-[center_15%]"
            sizes="(max-width: 768px) 100vw, 480px"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
          
          <div className="absolute bottom-4 left-5 text-white space-y-0.5">
            <div className="text-[10px] font-black uppercase tracking-widest text-[#F472B6]">
              АВТОР КУРСУ
            </div>
            <div className="font-playfair text-2xl sm:text-3xl font-black">
              Анастасія Сич
            </div>
          </div>
        </div>

        {/* BIO DETAILS */}
        <div className="space-y-3 text-left px-1">
          <p className="text-xs sm:text-[13px] text-[#5A4B56] leading-relaxed">
            Анастасія — фітнес-тренерка з 8-річним досвідом та вищою медичною освітою.
          </p>
          <p className="text-xs sm:text-[13px] text-[#5A4B56] leading-relaxed">
            У своїй роботі вона поєднує практичний досвід тренерки з медичними знаннями, щоб допомагати жінкам працювати над тілом без крайнощів.
          </p>
          
          <div className="p-4 rounded-2xl bg-white border border-[#F2DEE9] space-y-1 shadow-sm">
            <p className="text-xs sm:text-sm font-bold text-[#261A23]">
              Її підхід — не просто дати вам список вправ.
            </p>
            <p className="text-xs sm:text-[13px] text-[#5A4B56]">
              Пояснити, що відбувається з вашим тілом і як правильно з ним працювати.
            </p>
          </div>

          {/* 2 STAT CARDS (SCREENSHOT 4) */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="p-4 rounded-3xl bg-white border border-[#F2DEE9] text-center shadow-sm space-y-1">
              <div className="font-playfair text-2xl font-black text-[#D8438A]">
                8+ років
              </div>
              <div className="text-[11px] text-[#7A6B76] font-medium">досвіду тренерки</div>
            </div>
            <div className="p-4 rounded-3xl bg-white border border-[#F2DEE9] text-center shadow-sm space-y-1">
              <div className="font-playfair text-2xl font-black text-[#D8438A]">
                100%
              </div>
              <div className="text-[11px] text-[#7A6B76] font-medium">медичний підхід</div>
            </div>
          </div>

          <p className="font-playfair italic text-[#261A23] text-center text-base font-bold pt-2">
            Готові довіритись системі від тренерки з медичною освітою?
          </p>

          {/* CTA */}
          <button
            onClick={handleOpenModal}
            className="w-full py-4 rounded-full bg-gradient-to-r from-[#DE438E] to-[#CD327E] hover:brightness-105 text-white font-bold text-base uppercase tracking-wider shadow-[0_10px_25px_rgba(217,67,142,0.35)] transition-all active:scale-95"
          >
            <span>Приєднатись до курсу</span>
          </button>
        </div>

      </section>

      {/* =========================================================================
          9 БЛОК: FOR WHOM IS THIS COURSE (LOVABLE SCREENSHOT 3 STYLE)
          ========================================================================= */}
      <section className="py-8 px-4 max-w-[480px] mx-auto space-y-4">
        
        <div className="text-center space-y-1">
          <div className="text-[#D8438A] text-xs font-black tracking-widest uppercase">
            ДЛЯ КОГО ЦЕЙ КУРС
          </div>
          <h2 className="font-playfair text-2xl sm:text-3xl font-black text-[#261A23] leading-tight">
            Цей міні-курс для вас, якщо ви:
          </h2>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-[#F2DEE9] shadow-sm space-y-3.5 text-left">
          {[
            "хочете плаский живіт і струнку талію;",
            "не розумієте, які вправи реально працюють для цієї зони;",
            "качаєте прес, але не бачите бажаних змін;",
            "не хочете виснажувати себе тренуваннями;",
            "втомилися від дієт та постійних обмежень;",
            "хочете зрозумілу систему, яку можна вписати у своє життя.",
          ].map((item, idx) => (
            <div key={idx} className="flex items-start gap-3 border-t border-[#F8EDF3] pt-3 first:border-0 first:pt-0">
              <span className="font-playfair font-black text-xl text-[#D8438A] leading-none shrink-0 w-4">
                {idx + 1}
              </span>
              <span className="text-xs sm:text-[13px] text-[#261A23] font-medium leading-snug">
                {item}
              </span>
            </div>
          ))}
        </div>

        <p className="font-playfair italic text-[#261A23] text-center text-base font-bold pt-1">
          Впізнали себе хоча б у одному пункті? Тоді час діяти.
        </p>

        {/* CTA */}
        <button
          onClick={handleOpenModal}
          className="w-full py-4 rounded-full bg-gradient-to-r from-[#DE438E] to-[#CD327E] hover:brightness-105 text-white font-bold text-base uppercase tracking-wider shadow-[0_10px_25px_rgba(217,67,142,0.35)] transition-all active:scale-95"
        >
          <span>Хочу почати зміни</span>
        </button>

      </section>

      {/* =========================================================================
          10 БЛОК: STUDENT TRANSFORMATIONS (CAROUSEL)
          ========================================================================= */}
      <section className="py-8 px-4 max-w-[480px] mx-auto space-y-4">
        
        <div className="text-center space-y-1">
          <div className="text-[#D8438A] text-xs font-black tracking-widest uppercase">
            РЕЗУЛЬТАТИ ТА ВІДГУКИ
          </div>
          <h2 className="font-playfair text-2xl sm:text-3xl font-black text-[#261A23] leading-tight">
            Подивіться, як дівчата змінюють своє тіло разом зі мною
          </h2>
          <p className="text-xs text-[#7A6B76]">
            фото кейсів з описами
          </p>
        </div>

        {/* CASES CAROUSEL */}
        <div className="relative">
          <div
            ref={carouselRef}
            className="flex gap-3.5 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {realCaseGalleries.map((caseItem) => (
              <div
                key={caseItem.id}
                onClick={() => setActiveCaseImage(caseItem.image)}
                className="min-w-[260px] max-w-[260px] shrink-0 snap-center rounded-3xl overflow-hidden bg-white border border-[#F2DEE9] p-3 flex flex-col space-y-2.5 cursor-pointer shadow-sm hover:shadow-md transition-all group"
              >
                {/* PHOTO */}
                <div className="relative w-full h-[280px] rounded-2xl overflow-hidden bg-slate-100">
                  <Image
                    src={caseItem.image}
                    alt={caseItem.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    sizes="260px"
                  />
                  <div className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 text-white backdrop-blur-sm">
                    <ZoomIn className="w-4 h-4" />
                  </div>
                  <div className="absolute bottom-2 left-2 px-2.5 py-0.5 rounded-full bg-[#D8438A] text-white text-[10px] font-bold shadow-sm">
                    {caseItem.badge}
                  </div>
                </div>

                {/* DETAILS */}
                <div className="space-y-0.5 text-left px-1">
                  <div className="font-playfair text-lg font-bold text-[#261A23]">
                    {caseItem.title}
                  </div>
                  <p className="text-xs text-[#5A4B56] leading-snug">
                    {caseItem.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* CONTROLS */}
          <div className="flex items-center justify-center gap-3 pt-2 text-[#D8438A] text-xs font-bold tracking-widest uppercase">
            <button
              onClick={() => scrollCarousel("left")}
              className="p-1.5 rounded-full bg-white text-[#D8438A] border border-[#F2DEE9]"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span>← гортай результати →</span>
            <button
              onClick={() => scrollCarousel("right")}
              className="p-1.5 rounded-full bg-white text-[#D8438A] border border-[#F2DEE9]"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

      </section>


      {/* =========================================================================
          12 БЛОК: FAQ (ACCORDION)
          ========================================================================= */}
      <section className="py-8 px-4 max-w-[480px] mx-auto space-y-4">
        
        <div className="text-center space-y-1">
          <div className="text-[#D8438A] text-xs font-black tracking-widest uppercase">
            ВІДПОВІДІ НА ПИТАННЯ
          </div>
          <h2 className="font-playfair text-2xl sm:text-3xl font-black text-[#261A23] leading-tight">
            ЧАСТІ ПИТАННЯ:
          </h2>
        </div>

        <div className="space-y-2.5">
          {faqItems.map((item, idx) => {
            const isOpen = openFaqIndex === idx;
            return (
              <div
                key={idx}
                className="rounded-3xl overflow-hidden bg-white border border-[#F2DEE9] shadow-sm transition-all"
              >
                <button
                  onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                  className="w-full p-4 text-left flex items-center justify-between gap-3 font-semibold text-sm text-[#261A23] hover:text-[#D8438A] transition-colors"
                >
                  <span>{item.q}</span>
                  <ChevronDown
                    className={`w-5 h-5 text-[#D8438A] shrink-0 transition-transform duration-300 ${
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
                      <div className="px-4 pb-4 pt-0 text-xs text-[#5A4B56] border-t border-[#F8EDF3] pt-2 leading-relaxed">
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
          13 БЛОК: FINAL CONVERSION CARD (LOVABLE SCREENSHOT 1 STYLE)
          ========================================================================= */}
      <section className="py-8 px-4 max-w-[480px] mx-auto">
        
        <div className="rounded-[32px] bg-[#291B26] text-white p-6 shadow-2xl space-y-4 border border-white/10 text-center">
          
          <div className="space-y-2">
            <h2 className="font-playfair text-2xl sm:text-3xl font-black text-white leading-snug">
              Зроби плоский живіт та струнку талію всього за 20 хвилин на день
            </h2>
            <p className="text-xs sm:text-[13px] text-slate-300 leading-relaxed">
              Без страху з'їсти щось не те, без тренувань, після яких неможливо підвестись на ноги, за чіткою системою від фітнес-тренерки
            </p>
          </div>

          <div className="py-2.5 px-4 rounded-2xl bg-white/10 flex items-center justify-between">
            <span className="font-playfair text-base font-bold">Міні-курс —</span>
            <div className="flex items-center gap-2">
              <span className="text-slate-400 line-through text-sm">3999 грн</span>
              <span className="font-bold text-white text-lg text-[#F472B6]">279 грн</span>
            </div>
          </div>

          {/* FINAL CTA BUTTON */}
          <button
            onClick={handleOpenModal}
            className="w-full py-4 rounded-full bg-gradient-to-r from-[#DE438E] to-[#CD327E] hover:brightness-105 text-white font-bold text-base uppercase tracking-wider shadow-[0_10px_25px_rgba(217,67,142,0.4)] transition-all active:scale-95"
          >
            <span>Отримати міні-курс</span>
          </button>

          <div className="flex items-center justify-center gap-3 text-[11px] text-slate-300 font-medium pt-1">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-[#34D399]" /> Безпечна оплата
            </span>
            <span>•</span>
            <span>Доступ назавжди</span>
          </div>

        </div>

      </section>

      {/* =========================================================================
          FIXED STICKY BOTTOM BAR (LOVABLE WHITE / BLUSH STYLE)
          ========================================================================= */}
      <AnimatePresence>
        {showStickyUI && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="fixed inset-x-0 bottom-0 z-50 p-3 bg-white/95 backdrop-blur-xl border-t border-[#F2DEE9] shadow-2xl"
          >
            <div className="max-w-[480px] mx-auto flex items-center justify-between gap-3">
              
              {/* TIMER & PRICE */}
              <div className="flex flex-col text-left">
                <div className="flex items-center gap-1 text-[10px] font-bold text-[#D8438A] uppercase tracking-wider">
                  <Clock className="w-3 h-3 text-[#D8438A]" />
                  <span>Знижка зникне: {timeLeft.minutes}:{timeLeft.seconds}</span>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="font-playfair text-2xl font-black text-[#261A23] leading-none">
                    279 грн
                  </span>
                  <span className="text-xs text-slate-400 line-through leading-none">
                    3999 грн
                  </span>
                </div>
              </div>

              {/* ACTION BUTTON */}
              <button
                onClick={handleOpenModal}
                className="px-5 py-2.5 rounded-full bg-gradient-to-r from-[#DE438E] to-[#CD327E] hover:brightness-105 text-white font-bold text-sm uppercase tracking-wider shadow-[0_6px_15px_rgba(217,67,142,0.35)] shrink-0 transition-transform active:scale-95"
              >
                <span>Отримати міні-курс</span>
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
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* MODAL CARD */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-[420px] rounded-3xl bg-white border border-[#F2DEE9] shadow-2xl p-6 text-[#261A23] z-10 overflow-hidden"
            >
              {/* CLOSE BUTTON */}
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute top-4 right-4 p-2 rounded-full bg-[#FAF1F6] text-[#261A23] hover:bg-[#F2DEE9] transition-colors"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="space-y-4">
                
                {/* HEADER */}
                <div className="space-y-1 text-left">
                  <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#FCE1ED] text-[#D8438A] text-[10px] font-black uppercase tracking-wider">
                    🔥 ЗНИЖКА -93% ДІЄ СЬОГОДНІ
                  </div>
                  <h3 className="font-playfair text-2xl font-black text-[#261A23] leading-tight">
                    Отримати міні-курс
                  </h3>
                  <p className="text-xs text-[#5A4B56]">
                    Заповніть форму для миттєвого переходу до безпечної оплати (279 грн).
                  </p>
                </div>

                {/* FORM */}
                <form onSubmit={handleSubmit} className="space-y-3">
                  
                  {/* NAME */}
                  <div className="space-y-1 text-left">
                    <label className="text-[11px] font-bold text-[#5A4B56] uppercase tracking-wider flex items-center gap-1">
                      <User className="w-3 h-3 text-[#D8438A]" /> Ваше ім'я
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Олена"
                      value={formData.name}
                      onChange={(e) => handleInputChange("name", e.target.value)}
                      className="w-full px-3.5 py-3 rounded-2xl bg-[#FAF4F7] border border-[#F2DEE9] text-[#261A23] placeholder-[#A0939D] focus:outline-none focus:border-[#D8438A] transition-colors text-sm"
                    />
                  </div>

                  {/* PHONE */}
                  <div className="space-y-1 text-left">
                    <label className="text-[11px] font-bold text-[#5A4B56] uppercase tracking-wider flex items-center gap-1">
                      <Phone className="w-3 h-3 text-[#D8438A]" /> Номер телефону
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="+380"
                      value={formData.phone}
                      onChange={handlePhoneChange}
                      className="w-full px-3.5 py-3 rounded-2xl bg-[#FAF4F7] border border-[#F2DEE9] text-[#261A23] placeholder-[#A0939D] focus:outline-none focus:border-[#D8438A] transition-colors text-sm"
                    />
                  </div>

                  {/* TELEGRAM */}
                  <div className="space-y-1 text-left">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-[#5A4B56] uppercase tracking-wider flex items-center gap-1">
                        <MessageCircle className="w-3 h-3 text-[#D8438A]" /> Telegram нікнейм
                      </label>
                      <button
                        type="button"
                        onClick={handleNoTelegramClick}
                        className="text-[10px] text-[#D8438A] hover:underline"
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
                      className="w-full px-3.5 py-3 rounded-2xl bg-[#FAF4F7] border border-[#F2DEE9] text-[#261A23] placeholder-[#A0939D] focus:outline-none focus:border-[#D8438A] transition-colors text-sm"
                    />
                  </div>

                  {/* ERROR */}
                  {errorMessage && (
                    <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs font-medium">
                      {errorMessage}
                    </div>
                  )}

                  {/* SUBMIT BUTTON */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3.5 rounded-full bg-gradient-to-r from-[#DE438E] to-[#CD327E] hover:brightness-105 disabled:opacity-50 text-white font-bold text-base uppercase tracking-wider shadow-[0_10px_25px_rgba(217,67,142,0.35)] flex items-center justify-center gap-2 transition-all active:scale-95"
                  >
                    {isSubmitting ? (
                      <span>Обробка...</span>
                    ) : (
                      <>
                        <span>Перейти до оплати 279 грн</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  {/* GUARANTEE */}
                  <p className="text-[10px] text-[#7A6B76] text-center flex items-center justify-center gap-1">
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
            <button
              onClick={() => setActiveCaseImage(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors z-20"
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
