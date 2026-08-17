"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  Sparkles,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Calendar,
  Send,
  X,
  Phone,
  User,
  MessageCircle,
  Award,
  ArrowRight,
  Check,
  ShieldCheck,
  ZoomIn,
  RotateCw,
  Gift,
  Flame,
  Clock,
  HeartPulse,
  GraduationCap,
  Shield,
  Star
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

  // Modal State
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
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Carousel ref
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
    setSubmitSuccess(false);
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
          setSubmitSuccess(true);
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

  // Section: What You Get (Pure Benefit/Outcome list matching lifetime-splits.com .s9 structure)
  const whatYouGetItems = [
    {
      num: "01",
      heading: "Зрозумієте, що реально впливає на живіт і талію",
      desc: "Без хаотичних порад з TikTok та Instagram. Дізнаєтесь справжні фізіологічні причини відкладення жиру та як їх усунути.",
      icon: "🎯",
    },
    {
      num: "02",
      heading: "Розберете систему харчування",
      desc: "Зрозумієте, що змінити в раціоні, щоб не жити в постійному обмеженні. Складете ситну тарілку без підрахунку калорій.",
      icon: "🥗",
    },
    {
      num: "03",
      heading: "Навчитеся тренуватися без виснаження",
      desc: "Зрозумієте, яке навантаження потрібне для вашої цілі. Без годин кардіо — робота з поставою та глибокими м'язами живота.",
      icon: "⚡",
    },
    {
      num: "04",
      heading: "Побачите, де самі гальмуєте свій результат",
      desc: "Харчування, режим, тренування, відновлення — побачите всю систему цілком та приберете неочевидні помилки.",
      icon: "🔍",
    },
    {
      num: "05",
      heading: "Отримаєте зрозумілий план дій",
      desc: "Що робити зараз, щоб почати змінювати тіло без чергового марафону «з понеділка», зривів та повернення ваги.",
      icon: "📋",
    },
  ];

  // Section: 4 Steps
  const steps = [
    {
      step: "КРОК 1",
      title: "Розбираємо основу",
      desc: "Харчування, активність, режим та звички, які реально впливають на результат.",
    },
    {
      step: "КРОК 2",
      title: "Прибираємо те, що заважає",
      desc: "Без списку з 50 заборон, жорстких рамок і сумного життя на одній курячій грудці.",
    },
    {
      step: "КРОК 3",
      title: "Додаємо те, що працює",
      desc: "Зрозуміле збалансоване харчування та адекватне фізичне навантаження.",
    },
    {
      step: "КРОК 4",
      title: "Закріплюємо",
      desc: "Щоб ви не повернулися до старого режиму та зривів після першого ж тижня.",
    },
  ];

  // Real transformation cases
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
      desc: "-5 кг, -4 см в талії, -3 см в стегнах, гарний тонус шкіри",
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

  // FAQ Items matching .s7 accordion
  const faqItems = [
    {
      q: "А якщо я ніколи не займалась спортом?",
      a: "Міні-курс розрахований на звичайний ритм життя та будь-який рівень підготовки, а не на професійних спортсменок. Всі рекомендації та вправи максимально фізіологічні, безпечні та адаптовані під щоденну рутину.",
    },
    {
      q: "Чи потрібно сидіти на дієті?",
      a: "Ні. Завдання курсу — показати, як вибудувати смачне та повноцінне харчування без постійних жорстких обмежень, щоб ви могли насолоджуватися їжею та стабільно бачити зменшення талії.",
    },
    {
      q: "А якщо я вже багато чого пробувала?",
      a: "Саме тому важливо не починати ще одну дієту чи марафон навмання, а зрозуміти, чому попередні підходи не дали стабільного результату. Ми розберемо справжні фізіологічні та психологічні механізми.",
    },
    {
      q: "Чи допоможе, якщо у мене вага постійно повертається назад?",
      a: "Задача цього курсу — не ввести вас у короткотривалі екстремальні обмеження, а вибудувати зрозумілу систему, яка органічно стане частиною вашого життя на довгі роки.",
    },
  ];

  return (
    <div className="min-h-screen bg-[#070607] text-[#FFFFFF] font-source selection:bg-[#DB0B3E] selection:text-white pb-28 sm:pb-24 overflow-x-hidden">

      {/* TOP RED ANNOUNCEMENT BANNER */}
      <div className="bg-gradient-to-r from-[#BA022F] to-[#D00839] text-white py-2 overflow-hidden shadow-lg sticky top-0 z-40 border-b border-[#F01147]/30">
        <div className="animate-marquee font-extrabold text-xs sm:text-sm tracking-wider uppercase flex items-center gap-8">
          <span>🔥 СТАРТ МІНІ-КУРСУ 24.08</span>
          <span className="text-white/60">✦</span>
          <span>ЗНИЖКА -87% ДІЄ СЬОГОДНІ</span>
          <span className="text-white/60">✦</span>
          <span>6 УРОКІВ + БОНУС «ЯК СПАЛИТИ ЖИР»</span>
          <span className="text-white/60">✦</span>
          <span>ДОСТУП НАЗАВЖДИ</span>
          <span className="text-white/60">✦</span>
          <span>🔥 СТАРТ МІНІ-КУРСУ 24.08</span>
          <span className="text-white/60">✦</span>
          <span>ЗНИЖКА -87% ДІЄ СЬОГОДНІ</span>
          <span className="text-white/60">✦</span>
        </div>
      </div>

      {/* =========================================================================
          SECTION 1: HERO (MATCHING LIFETIME-SPLITS.COM .s1 SECTION)
          ========================================================================= */}
      <section className="relative pt-6 pb-12 sm:pt-10 sm:pb-16 px-4 sm:px-6 max-w-4xl mx-auto flex flex-col items-center text-center">

        {/* AMBIENT GLOW CIRCLE */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[340px] h-[340px] bg-[#3E1322] rounded-full blur-[90px] opacity-75 pointer-events-none -z-0" />

        {/* DATE PILL BADGE */}
        <div className="relative z-10 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-[#EB94A9]/40 text-[#EB94A9] text-xs sm:text-sm font-semibold tracking-wider uppercase backdrop-blur-md shadow-md mb-4">
          <Calendar className="w-4 h-4 text-[#EB94A9]" />
          <span>START: 24 AUGUST</span>
        </div>

        {/* HUGE CONDENSED HEADLINES */}
        <div className="relative z-10 space-y-1">
          <h1 className="font-league text-5xl sm:text-7xl md:text-8xl font-normal text-[#FFF3F6] uppercase tracking-wide leading-[0.95] drop-shadow-md">
            ОТРИМАЙ ПЛАСКИЙ ЖИВІТ
          </h1>
          <div className="font-league text-3xl sm:text-5xl md:text-6xl font-normal text-[#F01147] uppercase tracking-wide leading-tight">
            ТА СТРУНКУ ТАЛІЮ
          </div>
        </div>

        {/* HERO ATHLETIC FIGURE OF ANASTASIA */}
        <div className="relative z-10 w-full max-w-md my-4 sm:my-6">
          <div className="relative h-[380px] sm:h-[440px] w-full rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-gradient-to-b from-transparent via-[#140D10]/40 to-[#070607]">
            <Image
              src="/images/anastasia_hero_blue.webp"
              alt="Анастасія Сич"
              fill
              priority
              className="object-cover object-[center_18%] filter brightness-105 contrast-[1.05]"
              sizes="(max-width: 768px) 100vw, 440px"
            />
            {/* Bottom smooth dark gradient fade */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#070607] via-[#070607]/20 to-transparent" />

            {/* TRAINER BADGE OVERLAY */}
            <div className="absolute bottom-3 left-3 right-3 p-3 rounded-2xl bg-black/75 backdrop-blur-md border border-white/10 flex items-center justify-between text-left">
              <div>
                <div className="text-white font-extrabold text-xs sm:text-sm">Анастасія Сич</div>
                <div className="text-[11px] text-[#EB94A9] font-medium">8 років досвіду • Вища медична освіта</div>
              </div>
              <div className="w-8 h-8 rounded-full bg-[#F01147]/20 border border-[#F01147]/40 text-[#F01147] flex items-center justify-center shrink-0">
                <Award className="w-4 h-4" />
              </div>
            </div>
          </div>
        </div>

        {/* DUAL PRICING COMPARISON ROW (EXACT REFERENCE .s1-pricing-row) */}
        <div className="relative z-10 w-full max-w-md grid grid-cols-2 gap-2.5 sm:gap-3 my-2">
          
          {/* ACTIVE RED BOX (PAY ONCE) */}
          <div
            onClick={handleOpenModal}
            className="cursor-pointer p-4 rounded-2xl bg-gradient-to-br from-[#F01147] to-[#B0002B] text-white flex flex-col justify-center items-center shadow-xl border border-[#F01147]/50 hover:scale-[1.02] transition-transform"
          >
            <span className="text-xs sm:text-sm font-bold text-white/90 uppercase tracking-wide">
              Сплатіть 1 раз
            </span>
            <span className="font-league text-4xl sm:text-5xl font-normal leading-none mt-1">
              399 грн
            </span>
          </div>

          {/* GRAY BOX (DON'T PAY REGULAR) */}
          <div
            onClick={handleOpenModal}
            className="cursor-pointer p-4 rounded-2xl bg-white/[0.08] text-slate-400 flex flex-col justify-center items-center border border-white/10 hover:scale-[1.02] transition-transform"
          >
            <span className="text-xs sm:text-sm font-semibold text-slate-400 uppercase tracking-wide">
              Звичайна ціна
            </span>
            <span className="font-league text-4xl sm:text-5xl font-normal leading-none mt-1 line-through decoration-slate-500 decoration-2 text-slate-400">
              2999 грн
            </span>
          </div>

        </div>

        {/* VALUE SUMMARY COPY */}
        <p className="relative z-10 text-xs sm:text-sm text-[#EB94A9] font-semibold max-w-md my-3 leading-relaxed">
          <span className="text-white font-bold">Міні-курс для жінок</span>, які хочуть змінити своє тіло без постійних дієт, зривів та виснаження.
        </p>

        {/* BIG HIGH-IMPACT RED CTA BUTTON (.s1-cta-btn) */}
        <div className="relative z-10 w-full max-w-md pt-1">
          <motion.button
            whileTap={{ scale: 0.98 }}
            animate={{ scale: [1, 1.02, 1] }}
            transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}
            onClick={handleOpenModal}
            className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-[#F01147] via-[#DB0B3E] to-[#B0002B] text-white font-league text-2xl sm:text-3xl tracking-wider uppercase shadow-2xl border border-[#F01147]/60 flex items-center justify-center gap-2 cursor-pointer hover:brightness-110 transition-all"
          >
            <span>ОТРИМАТИ МІНІ-КУРС ЗА 399 ГРН</span>
            <ArrowRight className="w-6 h-6 text-white shrink-0" />
          </motion.button>
        </div>

        {/* TRUST BADGE ROW */}
        <div className="relative z-10 flex items-center justify-center gap-4 text-xs font-semibold text-white/80 pt-4">
          <span className="flex items-center gap-1">
            <Star className="w-3.5 h-3.5 fill-[#F01147] text-[#F01147]" /> 4.9/5 рейтинг
          </span>
          <span className="text-white/30">•</span>
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-4 h-4 text-[#059669]" /> Доступ назавжди
          </span>
          <span className="text-white/30">•</span>
          <span className="flex items-center gap-1">
            <Gift className="w-3.5 h-3.5 text-[#F01147]" /> + Бонусний урок
          </span>
        </div>

      </section>

      {/* =========================================================================
          SECTION 2: WHAT YOU GET AFTER PAYMENT (MATCHING .s9 SECTION)
          ========================================================================= */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 max-w-4xl mx-auto space-y-8 border-t border-white/10">

        {/* SECTION HEADER */}
        <div className="text-center space-y-1">
          <h2 className="font-league text-4xl sm:text-6xl font-normal uppercase tracking-wide">
            <span className="text-[#F01147]">ЩО ВИ ОТРИМАЄТЕ</span>{" "}
            <span className="text-white">ПІСЛЯ ОПЛАТИ</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 font-semibold">
            Повна покрокова система для гарантованого результату:
          </p>
        </div>

        {/* LIST OF OUTCOMES (.s9-list style) */}
        <div className="space-y-3.5 max-w-3xl mx-auto">
          {whatYouGetItems.map((item, idx) => (
            <div
              key={idx}
              className="p-4 sm:p-5 rounded-2xl bg-[#120E10] border border-white/10 flex items-start gap-4 hover:border-[#F01147]/50 transition-colors shadow-lg"
            >
              {/* CRIMSON ICON WRAPPER */}
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#F01147]/20 to-[#B0002B]/30 border border-[#F01147]/40 flex items-center justify-center text-xl shrink-0 mt-0.5 shadow-sm">
                <span>{item.icon}</span>
              </div>

              {/* ITEM TEXT */}
              <div className="space-y-1">
                <h3 className="text-base sm:text-lg font-bold text-white leading-snug">
                  {item.heading}
                </h3>
                <p className="text-xs sm:text-sm text-slate-400 font-medium leading-relaxed">
                  {item.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

      </section>

      {/* =========================================================================
          SECTION 3: EVERYTHING YOU GET TODAY + EXTRAS (.s25 SECTION STYLE)
          ========================================================================= */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 max-w-4xl mx-auto space-y-8 border-t border-white/10">

        <div className="text-center space-y-3">
          <h2 className="font-league text-4xl sm:text-6xl font-normal uppercase tracking-wide leading-none">
            ВСЕ, ЩО ВИ ОТРИМУЄТЕ<br />
            <span className="text-[#F01147]">СЬОГОДНІ</span>
          </h2>

          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-[#B0002B] to-[#660A22] border border-[#F01147]/50 text-white text-xs sm:text-sm font-bold shadow-md">
            <Gift className="w-4 h-4 text-white" />
            <span>Тільки сьогодні додаємо безкоштовний бонус</span>
          </div>

          <p className="text-xs sm:text-sm text-slate-300 max-w-lg mx-auto leading-relaxed">
            Замість купівлі окремо пізніше, ви отримуєте цей урок <strong>БЕЗКОШТОВНО</strong> при замовленні <strong>МІНІ-КУРСУ СЬОГОДНІ</strong>
          </p>
        </div>

        {/* 3 EXTRA CARDS (.s25-card style) */}
        <div className="space-y-4 max-w-3xl mx-auto">
          
          {/* CARD 1: BONUS LESSON */}
          <div className="p-6 rounded-3xl bg-gradient-to-br from-[#1A0E13] via-[#120E10] to-[#0A0708] border border-[#F01147]/40 shadow-xl space-y-3 relative overflow-hidden">
            <div className="inline-block px-3 py-1 rounded-full bg-[#F01147]/20 border border-[#F01147]/50 text-[#EB94A9] text-xs font-bold uppercase tracking-wider">
              🎁 Подарунок до замовлення
            </div>
            <h3 className="font-league text-2xl sm:text-3xl text-white uppercase tracking-wide">
              БОНУСНИЙ УРОК «ЯК СПАЛИТИ ЖИР»
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-medium">
              5 правил здорового схуднення, режим навантажень та харчування, щоб позбутися саме жирової тканини, а не втрачати м'язи.
            </p>
          </div>

          {/* CARD 2: PLATE CONSTRUCTOR */}
          <div className="p-6 rounded-3xl bg-[#120E10] border border-white/10 shadow-lg space-y-3">
            <div className="inline-block px-3 py-1 rounded-full bg-white/10 text-slate-300 text-xs font-bold uppercase tracking-wider">
              🥗 Практичний інструмент
            </div>
            <h3 className="font-league text-2xl sm:text-3xl text-white uppercase tracking-wide">
              КОНСТРУКТОР ЗБАЛАНСОВАНОЇ ТАРІЛКИ
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed font-medium">
              Зрозуміла схема щоденного раціону без необхідності зважувати їжу чи рахувати кожну калорію.
            </p>
          </div>

          {/* CARD 3: TELEGRAM BOT */}
          <div className="p-6 rounded-3xl bg-[#120E10] border border-white/10 shadow-lg space-y-3">
            <div className="inline-block px-3 py-1 rounded-full bg-white/10 text-slate-300 text-xs font-bold uppercase tracking-wider">
              📱 Зручний доступ
            </div>
            <h3 className="font-league text-2xl sm:text-3xl text-white uppercase tracking-wide">
              TELEGRAM-БОТ З МИТТЄВИМ ДОСТУПОМ
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed font-medium">
              Всі 6 уроків та бонусний матеріал завжди під рукою у вашому месенджері назавжди.
            </p>
          </div>

        </div>

        {/* TOTAL SUMMARY BOX (.s25-total-box) */}
        <div
          onClick={handleOpenModal}
          className="cursor-pointer max-w-3xl mx-auto p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-[#B0002B] to-[#660A22] border border-[#F01147]/60 shadow-2xl flex flex-col items-center text-center gap-4 hover:brightness-105 transition-all"
        >
          <h3 className="font-league text-2xl sm:text-4xl text-white uppercase tracking-wide leading-tight">
            6 УРОКІВ ТА БОНУСНИЙ МАТЕРІАЛ.<br />
            ОДИН ПЛАТІЖ. ДОСТУП НАЗАВЖДИ.
          </h3>
          <p className="text-xs sm:text-sm text-white/90 font-medium">
            Без щомісячних підписок. Без прихованих платежів. Без дедлайнів.
          </p>

          {/* WHITE PRICE PILL (.s25-price-pill) */}
          <div className="w-full max-w-md bg-white rounded-full py-3 px-6 sm:px-8 flex items-center justify-between shadow-xl">
            <div className="text-left text-[#730924] font-bold text-xs sm:text-sm uppercase leading-tight font-source">
              Отримати все<br />сьогодні за
            </div>
            <div className="font-league text-4xl sm:text-5xl font-normal text-[#730924] leading-none">
              399 грн
            </div>
          </div>
        </div>

      </section>

      {/* =========================================================================
          SECTION 4: GUARANTEE (.s3 SECTION STYLE)
          ========================================================================= */}
      <section className="py-10 px-4 sm:px-6 max-w-3xl mx-auto">
        <div className="p-6 sm:p-8 rounded-3xl bg-[#120E10] border border-[#EB94A9]/30 shadow-xl flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#F01147]/20 to-[#B0002B]/30 border border-[#F01147]/40 flex items-center justify-center shrink-0">
            <Shield className="w-8 h-8 text-[#EB94A9]" />
          </div>
          <div className="space-y-1">
            <div className="font-league text-2xl text-white uppercase tracking-wide">
              100% ПЕРЕВІРЕНА СИСТЕМА
            </div>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-medium">
              Програма базується на медичному підході до здоров'я та фізіології жіночого тіла від дипломованого фахівця з 8-річним практичним досвідом.
            </p>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 5: PAIN POINTS & VICIOUS CYCLE (.s2 / .s5 STYLE)
          ========================================================================= */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 max-w-4xl mx-auto space-y-8 border-t border-white/10">

        <div className="text-center space-y-2">
          <h2 className="font-league text-4xl sm:text-6xl font-normal uppercase tracking-wide">
            ЧОМУ ДІЄТИ <span className="text-[#F01147]">НЕ ПРАЦЮЮТЬ?</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 font-semibold max-w-xl mx-auto">
            Ви наче все робите правильно, але живіт і талія не змінюються?
          </p>
        </div>

        {/* PREVIOUS FAILED ATTEMPTS */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-3xl mx-auto">
          {[
            "менше їсти",
            "прибирати солодке",
            "сідати на дієту",
            "більше тренуватися",
            "починати «з понеділка»",
            "триматися і зриватися",
          ].map((attempt, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-2xl bg-[#120E10] border border-white/10 flex items-center gap-2.5 text-xs sm:text-sm font-semibold text-slate-300"
            >
              <div className="w-5 h-5 rounded-full bg-rose-900/50 text-rose-400 flex items-center justify-center text-[10px] shrink-0 font-bold">
                ✕
              </div>
              <span>{attempt}</span>
            </div>
          ))}
        </div>

        {/* CIRCULAR INFOGRAPHIC CYCLE */}
        <div className="p-6 sm:p-8 rounded-3xl bg-[#0D0B0C] border border-[#F01147]/30 shadow-xl space-y-5 max-w-3xl mx-auto">
          <div className="text-center space-y-1">
            <span className="text-[#F01147] font-bold text-xs uppercase tracking-widest">
              Замкнене коло
            </span>
            <h3 className="font-league text-2xl sm:text-3xl text-white uppercase">
              Кругообіг, який виснажує організм:
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5 items-center">
            {[
              { step: "1", title: "ОБМЕЖЕННЯ", desc: "Суворий дефіцит" },
              { step: "2", title: "ГОЛОД", desc: "Організм вимагає сил" },
              { step: "3", title: "ПЕРЕЇДАННЯ", desc: "Втрата контролю" },
              { step: "4", title: "ЗРИВ", desc: "Почуття провини" },
              { step: "5", title: "СПОЧАТКУ", desc: "Спроба з понеділка" },
            ].map((item, idx, arr) => (
              <React.Fragment key={idx}>
                <div className="p-3.5 rounded-2xl bg-[#1A0E13] border border-[#F01147]/40 text-center space-y-0.5">
                  <div className="text-[10px] text-[#EB94A9] font-bold uppercase">0{item.step}</div>
                  <div className="font-league text-lg text-white tracking-wide">{item.title}</div>
                  <div className="text-[10px] text-slate-400">{item.desc}</div>
                </div>
                {idx < arr.length - 1 && (
                  <div className="hidden sm:flex justify-center text-[#F01147]">
                    <ArrowRight className="w-4 h-4 animate-pulse" />
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>

          <div className="p-3.5 rounded-xl bg-white/[0.04] border border-white/10 text-center text-xs text-slate-300 font-medium flex items-center justify-center gap-2">
            <RotateCw className="w-4 h-4 text-[#F01147] animate-spin-slow shrink-0" />
            <span>Проблема не в силі волі — проблема у невідповідному підході.</span>
          </div>
        </div>

      </section>

      {/* =========================================================================
          SECTION 6: 4 STEPS TO SUSTAINABLE RESULTS (.st7 STYLE)
          ========================================================================= */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 max-w-4xl mx-auto space-y-8 border-t border-white/10">

        <div className="text-center space-y-1">
          <h2 className="font-league text-4xl sm:text-6xl font-normal uppercase tracking-wide">
            4 КРОКИ ДО <span className="text-[#F01147]">РЕЗУЛЬТАТУ</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 font-semibold">
            Покроковий план трансформації без крайнощів:
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl mx-auto">
          {steps.map((st, idx) => (
            <div
              key={idx}
              className="p-5 sm:p-6 rounded-3xl bg-[#120E10] border border-white/10 shadow-lg space-y-2 hover:border-[#F01147]/50 transition-colors"
            >
              <span className="inline-block px-3 py-0.5 rounded-full bg-[#F01147]/20 border border-[#F01147]/40 text-[#EB94A9] text-xs font-bold uppercase">
                {st.step}
              </span>
              <h3 className="font-league text-2xl text-white uppercase tracking-wide">
                {st.title}
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed font-medium">
                {st.desc}
              </p>
            </div>
          ))}
        </div>

      </section>

      {/* =========================================================================
          SECTION 7: ABOUT ANASTASIA SYCH
          ========================================================================= */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 max-w-4xl mx-auto space-y-8 border-t border-white/10" id="about">

        <div className="text-center space-y-1">
          <h2 className="font-league text-4xl sm:text-6xl font-normal uppercase tracking-wide">
            ПРО АВТОРА <span className="text-[#F01147]">КУРСУ</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center max-w-3xl mx-auto">
          
          <div className="md:col-span-5 flex justify-center">
            <div className="relative w-full max-w-xs h-[360px] rounded-3xl overflow-hidden border border-white/10 shadow-xl bg-slate-900">
              <Image
                src="/images/anastasia_portrait_black.webp"
                alt="Анастасія Сич"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 320px"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
              <div className="absolute bottom-3 left-3 right-3 p-3 rounded-2xl bg-black/80 backdrop-blur-md border border-white/10 text-center">
                <div className="text-white font-bold text-xs">Анастасія Сич</div>
                <div className="text-[10px] text-[#EB94A9]">8 років досвіду • Медична освіта</div>
              </div>
            </div>
          </div>

          <div className="md:col-span-7 space-y-4 text-xs sm:text-sm text-slate-300 font-medium leading-relaxed">
            <h3 className="font-league text-3xl text-white uppercase tracking-wide leading-tight">
              Я — Анастасія, фітнес-тренерка з вищою медичною освітою
            </h3>

            <p>
              Я працюю з жінками не тільки над тілом, а й над тим, щоб харчування та тренування стали частиною нормального комфортного життя.
            </p>

            <p>
              Без жорстких заборон, постійних дієт та виснажливого підходу «терпіть ще трохи».
            </p>

            <div className="p-4 rounded-2xl bg-[#1A0E13] border border-[#F01147]/40 space-y-1">
              <p className="font-bold text-white text-xs sm:text-sm">
                Моя задача — допомогти вам зрозуміти систему, яка залишиться з вами назавжди.
              </p>
            </div>
          </div>

        </div>

      </section>

      {/* =========================================================================
          SECTION 8: CLIENT TRANSFORMATION WINS (.s6 STYLE)
          ========================================================================= */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 max-w-4xl mx-auto space-y-8 border-t border-white/10" id="cases">

        <div className="flex items-center justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-[#EB94A9] text-xs font-bold uppercase tracking-wider mb-2">
              Before / After
            </div>
            <h2 className="font-league text-4xl sm:text-6xl font-normal text-white uppercase tracking-wide">
              РЕЗУЛЬТАТИ <span className="text-[#F01147]">КЛІЄНТОК</span>
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => scrollCarousel("left")}
              className="p-3 rounded-full bg-[#120E10] hover:bg-[#F01147]/20 text-white transition-colors border border-white/10"
              aria-label="Попередній кейс"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => scrollCarousel("right")}
              className="p-3 rounded-full bg-[#120E10] hover:bg-[#F01147]/20 text-white transition-colors border border-white/10"
              aria-label="Наступний кейс"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* SWIPER CAROUSEL */}
        <div
          ref={carouselRef}
          className="flex items-stretch gap-4 overflow-x-auto snap-x snap-mandatory py-2 pb-4 scrollbar-none [::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
          style={{ scrollSnapType: "x mandatory", WebkitOverflowScrolling: "touch" }}
        >
          {realCaseGalleries.map((cs) => (
            <div
              key={cs.id}
              onClick={() => setActiveCaseImage(cs.image)}
              className="min-w-[260px] sm:min-w-[300px] max-w-[320px] snap-start rounded-3xl bg-[#120E10] border border-white/10 overflow-hidden shadow-xl hover:border-[#F01147]/50 transition-all cursor-pointer flex flex-col justify-between group"
            >
              <div className="relative h-64 w-full bg-black overflow-hidden">
                <Image
                  src={cs.image}
                  alt={cs.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                  sizes="(max-width: 768px) 80vw, 300px"
                />
                <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-[#F01147] text-white text-[11px] font-bold uppercase shadow-md">
                  {cs.badge}
                </div>
                <div className="absolute bottom-3 right-3 p-2 rounded-full bg-black/80 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                  <ZoomIn className="w-4 h-4 text-[#EB94A9]" />
                </div>
              </div>

              <div className="p-4 space-y-1">
                <div className="font-bold text-white text-sm">{cs.title}</div>
                <p className="text-xs text-slate-400 font-medium leading-relaxed">
                  {cs.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

      </section>

      {/* =========================================================================
          SECTION 9: FAQ ACCORDION (MATCHING .s7 FAQ SECTION)
          ========================================================================= */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 max-w-3xl mx-auto space-y-8 border-t border-white/10" id="faq">

        <div className="text-center space-y-1">
          <h2 className="font-league text-5xl sm:text-7xl font-normal text-white uppercase tracking-wide">
            FAQ
          </h2>
        </div>

        <div className="space-y-3">
          {faqItems.map((item, idx) => {
            const isOpen = openFaqIndex === idx;
            return (
              <div
                key={idx}
                className="rounded-2xl border border-white/10 bg-[#120E10] overflow-hidden shadow-md transition-all"
              >
                <button
                  onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                  className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-3 font-bold text-sm sm:text-base text-white hover:text-[#EB94A9] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-[#F01147]/20 border border-[#F01147]/40 text-[#F01147] font-bold text-xs flex items-center justify-center shrink-0">
                      Q
                    </span>
                    <span>{item.q}</span>
                  </div>
                  <ChevronDown
                    className={`w-5 h-5 text-slate-400 transition-transform duration-300 shrink-0 ${
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
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 sm:px-5 sm:pb-5 pt-1 border-t border-white/5">
                        <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 text-xs sm:text-sm text-slate-300 leading-relaxed">
                          <div className="relative w-8 h-8 rounded-full overflow-hidden shrink-0 border border-[#F01147]/40">
                            <Image
                              src="/images/anastasia_hero_blue.webp"
                              alt="Анастасія"
                              fill
                              className="object-cover object-top"
                            />
                          </div>
                          <div className="flex-1">{item.a}</div>
                        </div>
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
          SECTION 10: FINAL SUMMARY CTA
          ========================================================================= */}
      <section className="py-12 sm:py-20 px-4 sm:px-6 max-w-3xl mx-auto text-center space-y-6 border-t border-white/10">

        <h2 className="font-league text-5xl sm:text-7xl font-normal text-white uppercase tracking-wide leading-none">
          ОТРИМАЙ ПЛАСКИЙ ЖИВІТ<br />
          <span className="text-[#F01147]">ТА СТРУНКУ ТАЛІЮ</span>
        </h2>

        <p className="text-xs sm:text-sm text-slate-300 max-w-lg mx-auto font-medium leading-relaxed">
          Перший результат вже за 7 днів, без виснажливих тренувань та обмежень в їжі, за перевіреною системою від фітнес-тренерки.
        </p>

        <div className="flex items-center justify-center gap-3 font-league text-4xl sm:text-5xl text-[#F01147] pt-2">
          <span>399 грн</span>
          <span className="text-2xl sm:text-3xl line-through text-slate-500 font-normal">2999 грн</span>
        </div>

        <div className="pt-2 max-w-md mx-auto">
          <motion.button
            whileTap={{ scale: 0.98 }}
            animate={{ scale: [1, 1.02, 1] }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            onClick={handleOpenModal}
            className="w-full py-4 px-8 rounded-2xl bg-gradient-to-r from-[#F01147] via-[#DB0B3E] to-[#B0002B] text-white font-league text-2xl sm:text-3xl uppercase tracking-wider shadow-2xl border border-[#F01147]/60 cursor-pointer flex items-center justify-center gap-2 hover:brightness-110"
          >
            <span>ОТРИМАТИ МІНІ-КУРС</span>
            <ArrowRight className="w-6 h-6 text-white" />
          </motion.button>
        </div>

      </section>

      {/* =========================================================================
          STICKY FLOATING FOOTER BAR (.footer-bg STYLE WITH LIVE COUNTDOWN TIMER)
          ========================================================================= */}
      <AnimatePresence>
        {showStickyUI && (
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 60 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-[#0C090A]/95 backdrop-blur-xl border-t border-[#F01147]/40 p-3 sm:p-4 shadow-2xl"
          >
            <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
              
              {/* LEFT INFO + COUNTDOWN TIMER */}
              <div className="flex items-center gap-3">
                <div className="hidden sm:block text-left">
                  <div className="font-league text-lg text-white uppercase leading-none">
                    Купуйте сьогодні та забирайте подарунок
                  </div>
                  <div className="text-[11px] text-[#EB94A9]">Міні-курс за 399 грн</div>
                </div>

                {/* COUNTDOWN DIGITS */}
                <div className="flex items-center gap-1 font-league text-lg sm:text-xl text-white">
                  <div className="px-2 py-0.5 rounded-md bg-black/60 border border-white/10">{timeLeft.hours}</div>
                  <span>:</span>
                  <div className="px-2 py-0.5 rounded-md bg-black/60 border border-white/10">{timeLeft.minutes}</div>
                  <span>:</span>
                  <div className="px-2 py-0.5 rounded-md bg-black/60 border border-white/10">{timeLeft.seconds}</div>
                </div>
              </div>

              {/* CTA BUTTON */}
              <button
                onClick={handleOpenModal}
                className="py-3 px-5 sm:px-8 rounded-xl bg-gradient-to-r from-[#F01147] to-[#B0002B] text-white font-league text-xl sm:text-2xl uppercase tracking-wider shadow-lg hover:brightness-110 cursor-pointer whitespace-nowrap border border-[#F01147]/60"
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
            {/* BACKDROP */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isSubmitting && setIsModalOpen(false)}
              className="absolute inset-0 bg-black/85 backdrop-blur-md"
            />

            {/* MODAL CONTENT */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg rounded-3xl bg-[#120E10] border border-[#F01147]/50 shadow-2xl p-6 sm:p-8 space-y-5 overflow-hidden z-10 max-h-[92vh] overflow-y-auto"
            >
              <button
                onClick={() => !isSubmitting && setIsModalOpen(false)}
                className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-white bg-white/10 hover:bg-white/20 transition-colors"
                aria-label="Закрити"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F01147]/20 text-[#EB94A9] text-xs font-bold border border-[#F01147]/40">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Старт 24.08 • Доступ назавжди</span>
                </div>
                <h3 className="font-league text-3xl sm:text-4xl text-white uppercase leading-none pt-1">
                  Отримати міні-курс
                </h3>
                <p className="text-xs sm:text-sm text-slate-400 font-medium">
                  Заповніть форму для переходу до захищеної оплати через WayForPay.
                </p>
              </div>

              {/* PRICE HIGHLIGHT IN MODAL */}
              <div className="p-4 rounded-2xl bg-[#1A0E13] border border-[#F01147]/40 flex items-center justify-between text-xs font-bold text-slate-200">
                <span>Вартість зі знижкою -87%:</span>
                <div className="flex items-center gap-2">
                  <span className="line-through text-slate-500 font-league text-lg">2999 грн</span>
                  <span className="font-league text-3xl text-[#F01147]">399 грн</span>
                </div>
              </div>

              {errorMessage && (
                <div className="p-3.5 rounded-xl bg-rose-950/80 border border-rose-600 text-rose-300 text-xs font-bold flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* NAME INPUT */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-[#EB94A9]" />
                    <span>Ваше ім'я:</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Олена"
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-black/60 border border-white/20 focus:border-[#F01147] focus:ring-2 focus:ring-[#F01147]/20 outline-none text-sm text-white font-medium"
                  />
                </div>

                {/* PHONE INPUT */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-[#EB94A9]" />
                    <span>Номер телефону (Viber / Telegram):</span>
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="+380"
                    value={formData.phone}
                    onChange={handlePhoneChange}
                    className="w-full px-4 py-3 rounded-xl bg-black/60 border border-white/20 focus:border-[#F01147] focus:ring-2 focus:ring-[#F01147]/20 outline-none text-sm text-white font-medium font-mono"
                  />
                </div>

                {/* TELEGRAM INPUT */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
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
                    className="w-full px-4 py-3 rounded-xl bg-black/60 border border-white/20 focus:border-[#F01147] focus:ring-2 focus:ring-[#F01147]/20 outline-none text-sm text-white font-medium"
                  />
                </div>

                {/* SUBMIT BUTTON */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#F01147] via-[#DB0B3E] to-[#B0002B] text-white font-league text-2xl uppercase tracking-wider shadow-xl border border-[#F01147]/50 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition-all hover:brightness-110"
                >
                  {isSubmitting ? (
                    <span>Перенаправлення на оплату...</span>
                  ) : (
                    <>
                      <span>Перейти до оплати 399 грн</span>
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>

                <p className="text-[11px] text-slate-500 text-center font-medium">
                  Безпечна оплата через WayForPay (Apple Pay, Google Pay, картка).
                </p>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* =========================================================================
          CASE PHOTO LIGHTBOX
          ========================================================================= */}
      <AnimatePresence>
        {activeCaseImage && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <button
              onClick={() => setActiveCaseImage(null)}
              className="absolute top-4 right-4 p-3 rounded-full text-white bg-white/10 hover:bg-white/20 transition-colors"
              aria-label="Закрити фото"
            >
              <X className="w-6 h-6" />
            </button>
            <div className="relative max-w-2xl w-full h-[80vh] rounded-2xl overflow-hidden">
              <Image
                src={activeCaseImage}
                alt="Результат клієнтки"
                fill
                className="object-contain"
                sizes="(max-width: 1024px) 100vw, 800px"
              />
            </div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
