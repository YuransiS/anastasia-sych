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
  Play,
  RotateCw,
  Gift,
  Flame,
  Clock,
  BookOpen,
  ArrowDown,
  Layers,
  HeartPulse,
  GraduationCap
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

  // Block 4: 5 Lessons structured as YouTube Video Frames
  const lessons = [
    {
      number: "01",
      tag: "УРОК 01 • ТЕОРІЯ + АНАЛІЗ",
      duration: "18 хв",
      title: "Зрозумієте, що реально впливає на живіт і талію",
      desc: "Без хаотичних порад з TikTok та Instagram. Розбір фізіології, гормонів та реальних факторів відкладення жиру в зоні талії.",
      bgGradient: "from-sky-900 via-slate-900 to-slate-950",
      accentColor: "#0284c7",
    },
    {
      number: "02",
      tag: "УРОК 02 • ПРАКТИКА ХАРЧУВАННЯ",
      duration: "24 хв",
      title: "Розберете харчування",
      desc: "Зрозумієте, що варто змінити в раціоні, щоб не жити в постійному обмеженні. Конструктор ситної тарілки без підрахунку кожної калорії.",
      bgGradient: "from-teal-950 via-slate-900 to-slate-950",
      accentColor: "#0d9488",
    },
    {
      number: "03",
      tag: "УРОК 03 • ТРЕНУВАЛЬНИЙ КОМПЛЕКС",
      duration: "22 хв",
      title: "Навчитеся тренуватися без виснаження",
      desc: "Зрозумієте, яке навантаження потрібне саме для вашої цілі. Без годин кардіо та болісних стрибків — робота з поставою та глибокими м'язами.",
      bgGradient: "from-indigo-950 via-slate-900 to-slate-950",
      accentColor: "#6366f1",
    },
    {
      number: "04",
      tag: "УРОК 04 • АУДИТ ПОМИЛОК",
      duration: "20 хв",
      title: "Побачите, де самі гальмуєте свій результат",
      desc: "Харчування, режим сну, навантаження, відновлення та стрес — збираємо всю систему воєдино та усуваємо приховані гальма.",
      bgGradient: "from-blue-950 via-slate-900 to-slate-950",
      accentColor: "#3b82f6",
    },
    {
      number: "05",
      tag: "УРОК 05 • ПОКРОКОВИЙ ПЛАН",
      duration: "19 хв",
      title: "Отримаєте зрозумілий план дій",
      desc: "Що робити зараз, щоб почати змінювати тіло вже цього тижня без чергового марафону «з понеділка» та вигорання.",
      bgGradient: "from-emerald-950 via-slate-900 to-slate-950",
      accentColor: "#059669",
    },
  ];

  // Block 6: 4 Steps
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

  // Block 8: Real Cases
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

  // Block 10: FAQ Items
  const faqItems = [
    {
      q: "А якщо я ніколи не займалась спортом?",
      a: "Міні-курс розрахований на звичайний ритм життя та будь-який рівень підготовки, а не на професійних спортсменок. Всі вправи та рекомендації максимально фізіологічні, безпечні та адаптовані під щоденну рутину.",
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
    <div className="min-h-screen bg-[#f8fafc] text-[#0f172a] selection:bg-[#0284c7] selection:text-white pb-24 sm:pb-16 font-sans">

      {/* TOP NOTIFICATION MARQUEE */}
      <div className="bg-[#0284c7] text-white py-2 overflow-hidden border-b border-[#0369a1] shadow-sm">
        <div className="animate-marquee font-extrabold text-xs sm:text-sm tracking-wider uppercase flex items-center gap-8">
          <span>🔥 СТАРТ МІНІ-КУРСУ 24.08</span>
          <span className="text-[#bae6fd]">✦</span>
          <span>ЗНИЖКА -87% ДІЄ СЬОГОДНІ</span>
          <span className="text-[#bae6fd]">✦</span>
          <span>6 УРОКІВ (ТЕОРІЯ + ПРАКТИКА)</span>
          <span className="text-[#bae6fd]">✦</span>
          <span>БОНУСНИЙ УРОК «ЯК СПАЛИТИ ЖИР» У ПОДАРУНОК</span>
          <span className="text-[#bae6fd]">✦</span>
          <span>🔥 СТАРТ МІНІ-КУРСУ 24.08</span>
          <span className="text-[#bae6fd]">✦</span>
          <span>ЗНИЖКА -87% ДІЄ СЬОГОДНІ</span>
          <span className="text-[#bae6fd]">✦</span>
        </div>
      </div>

      {/* =========================================================================
          BLOCK 1 & BLOCK 2: HERO SECTION WITH ANASTASIA'S PHOTO SPANNING BOTH BLOCKS
          ========================================================================= */}
      <section className="relative pt-6 pb-12 sm:pt-10 sm:pb-16 px-4 sm:px-6 max-w-6xl mx-auto overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-stretch">

          {/* LEFT COLUMN: BLOCK 1 & BLOCK 2 CONTENT */}
          <div className="lg:col-span-7 flex flex-col justify-between space-y-6">

            {/* BLOCK 1: START BADGE, MAIN HEADLINE & BULLETS */}
            <div className="space-y-4">
              {/* TOP START BADGE */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky-50 border border-sky-200 text-[#0284c7] text-xs sm:text-sm font-extrabold shadow-sm">
                <Calendar className="w-4 h-4 text-[#0284c7]" />
                <span>СТАРТ 24.08</span>
                <span className="text-slate-300">|</span>
                <span>6 уроків (теорія + практика)</span>
              </div>

              {/* MAIN HEADLINE */}
              <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 leading-[1.12] tracking-tight uppercase">
                Отримай <span className="text-[#0284c7]">плаский живіт</span> та струнку талію
              </h1>

              {/* BULLETS */}
              <ul className="space-y-3 pt-1 text-sm sm:text-base text-slate-800 font-semibold">
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-sky-100 text-[#0284c7] flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                  <span>перший результат вже за 7 днів</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-sky-100 text-[#0284c7] flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                  <span>без виснажливих тренувань та обмежень в їжі</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-sky-100 text-[#0284c7] flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                  <span>за перевіреною системою від фітнес тренерки з медичною освітою</span>
                </li>
              </ul>
            </div>

            {/* BLOCK 2: TARGET AUDIENCE DESCRIPTION & PRICING CARD */}
            <div className="p-6 sm:p-7 rounded-3xl bg-gradient-to-br from-white via-sky-50/50 to-white border-2 border-sky-200 shadow-xl space-y-5">
              <p className="text-slate-800 text-sm sm:text-base font-bold leading-relaxed">
                Міні-курс для жінок, які хочуть змінити своє тіло без постійних дієт, зривів та виснаження.
              </p>

              {/* PRICE DISPLAY */}
              <div className="flex items-center gap-3 font-extrabold flex-wrap">
                <span className="text-3xl sm:text-4xl font-extrabold text-[#0284c7] tracking-tight">
                  399 грн
                </span>
                <span className="text-base sm:text-xl line-through text-slate-400 font-bold">
                  2999 грн
                </span>
                <span className="text-xs px-2.5 py-1 rounded-full bg-[#059669] text-white font-extrabold uppercase shadow-sm">
                  Знижка -87%
                </span>
              </div>

              {/* CTA BUTTON */}
              <motion.button
                whileTap={{ scale: 0.98 }}
                animate={{ scale: [1, 1.015, 1] }}
                transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}
                onClick={handleOpenModal}
                className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-[#0284c7] to-[#0369a1] text-white font-extrabold text-base sm:text-lg shadow-xl glow-primary flex items-center justify-center gap-2.5 cursor-pointer uppercase tracking-wider transition-all hover:brightness-105"
              >
                <span>Отримати міні-курс за 399 грн</span>
                <ArrowRight className="w-5 h-5 text-sky-200 shrink-0" />
              </motion.button>

              {/* TRUST BADGES */}
              <div className="flex items-center justify-between text-xs font-semibold text-slate-600 pt-1 border-t border-slate-100">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-4 h-4 text-[#059669]" /> Миттєвий доступ
                </span>
                <span className="flex items-center gap-1">
                  <Gift className="w-4 h-4 text-[#0284c7]" /> + Бонусний урок
                </span>
                <span className="flex items-center gap-1">
                  <Sparkles className="w-4 h-4 text-amber-500" /> Старт 24.08
                </span>
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN: ANASTASIA'S PHOTO IN SPORTS FORM SPANNING BLOCKS 1 & 2 */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center">
            <div className="relative w-full max-w-md h-[460px] sm:h-[540px] lg:h-full min-h-[460px] rounded-3xl overflow-hidden border-2 border-sky-200 shadow-2xl bg-slate-900 group">
              <Image
                src="/images/anastasia_hero_blue.webp"
                alt="Анастасія Сич - фітнес-тренерка"
                fill
                priority
                className="object-cover object-[center_18%] filter brightness-102 contrast-[1.03] transition-transform duration-700 group-hover:scale-105"
                sizes="(max-width: 1024px) 100vw, 40vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent" />

              {/* FLOATING EXPERT BADGE AT BOTTOM */}
              <div className="absolute bottom-4 left-4 right-4 p-3.5 rounded-2xl bg-white/95 backdrop-blur-md border border-sky-100 shadow-lg flex items-center justify-between">
                <div>
                  <div className="font-extrabold text-slate-900 text-sm sm:text-base">Анастасія Сич</div>
                  <div className="text-xs text-slate-600 font-medium">8 років досвіду • Вища медична освіта</div>
                </div>
                <div className="w-9 h-9 rounded-xl bg-sky-100 text-[#0284c7] flex items-center justify-center shrink-0">
                  <Award className="w-5 h-5" />
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* =========================================================================
          BLOCK 3: PAIN POINTS & CIRCULAR VICIOUS CYCLE INFOGRAPHIC
          ========================================================================= */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 bg-white border-y border-slate-200">
        <div className="max-w-5xl mx-auto space-y-10">

          <div className="text-center space-y-3 max-w-3xl mx-auto">
            <span className="text-[#0284c7] text-xs font-extrabold uppercase tracking-widest bg-sky-50 px-3 py-1 rounded-full border border-sky-200">
              Поширена проблема
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 leading-tight">
              Ви наче все робите правильно, але живіт і талія не змінюються?
            </h2>
            <p className="text-slate-600 text-sm sm:text-base font-semibold">
              Ви вже пробували різні методи, але щоразу повертаєтеся у вихідну точку:
            </p>
          </div>

          {/* LIST OF PREVIOUS ATTEMPTS */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 max-w-4xl mx-auto">
            {[
              "менше їсти",
              "прибирати солодке",
              "сідати на дієту",
              "більше тренуватися",
              "починати «з понеділка»",
              "триматися кілька днів, а потім зриватися",
            ].map((attempt, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 flex items-center gap-3 shadow-sm hover:border-sky-300 transition-colors"
              >
                <div className="w-6 h-6 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center text-xs font-bold shrink-0">
                  ✕
                </div>
                <span className="text-xs sm:text-sm font-bold leading-snug">{attempt}</span>
              </div>
            ))}
          </div>

          {/* CIRCULAR INFOGRAPHIC CYCLE: ОБМЕЖЕННЯ -> СИЛЬНИЙ ГОЛОД -> ПЕРЕЇДАННЯ -> ЗРИВ -> СПОЧАТКУ */}
          <div className="p-6 sm:p-10 rounded-3xl bg-gradient-to-br from-rose-50/70 via-white to-sky-50/70 border-2 border-rose-200/80 shadow-md space-y-6">
            <div className="text-center space-y-1">
              <span className="text-rose-600 font-extrabold text-xs uppercase tracking-widest">
                Замкнене коло
              </span>
              <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900">
                А потім знову той самий кругообіг:
              </h3>
            </div>

            {/* INTERACTIVE CIRCULAR FLOW CAROUSEL / GRID WITH ARROWS */}
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-center">
              {[
                { step: "1", title: "ОБМЕЖЕННЯ", desc: "Різко урізаєте калорії", color: "bg-rose-100 text-rose-700 border-rose-300" },
                { step: "2", title: "СИЛЬНИЙ ГОЛОД", desc: "Організм вимагає енергії", color: "bg-amber-100 text-amber-800 border-amber-300" },
                { step: "3", title: "ПЕРЕЇДАННЯ", desc: "Неможливо терпіти", color: "bg-orange-100 text-orange-800 border-orange-300" },
                { step: "4", title: "ЗРИВ", desc: "Почуття провини і відкат", color: "bg-red-100 text-red-800 border-red-300" },
                { step: "5", title: "СПОЧАТКУ", desc: "Нова спроба з понеділка", color: "bg-slate-200 text-slate-800 border-slate-300" },
              ].map((item, idx, arr) => (
                <React.Fragment key={idx}>
                  <div className={`p-4 rounded-2xl border ${item.color} text-center space-y-1 shadow-sm relative flex flex-col justify-center min-h-[110px]`}>
                    <div className="text-[10px] font-extrabold uppercase opacity-70">Крок 0{item.step}</div>
                    <div className="text-sm font-extrabold tracking-tight">{item.title}</div>
                    <div className="text-[11px] opacity-80 font-medium leading-tight">{item.desc}</div>
                  </div>
                  {idx < arr.length - 1 && (
                    <div className="hidden sm:flex justify-center text-slate-400">
                      <ArrowRight className="w-5 h-5 text-rose-400 animate-pulse" />
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>

            <div className="flex items-center justify-center gap-2 text-xs font-bold text-rose-600 pt-2">
              <RotateCw className="w-4 h-4 animate-spin-slow" />
              <span>Це замкнене коло виснажує організм і вбиває мотивацію</span>
            </div>
          </div>

          {/* CONCLUDING INSIGHT */}
          <div className="p-6 sm:p-7 rounded-2xl bg-sky-50/80 border border-sky-200 text-slate-800 text-center max-w-3xl mx-auto space-y-2 shadow-sm">
            <p className="text-base sm:text-lg font-extrabold text-slate-900">
              І справа не обов'язково в тому, що вам не вистачає сили волі.
            </p>
            <p className="text-sm sm:text-base font-semibold text-slate-700">
              Можливо, ви просто використовуєте підхід, який не підходить саме вам.
            </p>
          </div>

        </div>
      </section>

      {/* =========================================================================
          BLOCK 4: WHAT YOU GET IN MINI-COURSE (YOUTUBE VIDEO COVER STYLE FRAMES)
          ========================================================================= */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 max-w-5xl mx-auto space-y-10">

        <div className="text-center space-y-2 max-w-3xl mx-auto">
          <span className="text-[#0284c7] text-xs font-extrabold uppercase tracking-widest bg-sky-50 px-3 py-1 rounded-full border border-sky-200">
            Програма навчання
          </span>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 leading-tight">
            Що ви отримаєте на міні-курсі
          </h2>
          <p className="text-slate-600 text-sm sm:text-base font-semibold">
            5 чітких відео-уроків із практичними завданнями та покроковими схемами дій:
          </p>
        </div>

        {/* 5 LESSONS AS YOUTUBE VIDEO COVER FRAMES */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {lessons.map((ls, idx) => (
            <div
              key={idx}
              className={`rounded-3xl bg-white border border-slate-200 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col justify-between group ${
                idx === 4 ? "md:col-span-2 lg:col-span-1" : ""
              }`}
            >
              {/* YOUTUBE STYLE THUMBNAIL COVER */}
              <div className={`relative h-44 bg-gradient-to-tr ${ls.bgGradient} p-4 flex flex-col justify-between text-white overflow-hidden`}>
                <div className="flex items-center justify-between relative z-10">
                  <span className="px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md text-[11px] font-extrabold tracking-wider border border-white/10 uppercase">
                    {ls.tag}
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-rose-600 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {ls.duration}
                  </span>
                </div>

                {/* PLAY BUTTON OVERLAY */}
                <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                  <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-md border border-white/40 flex items-center justify-center text-white shadow-2xl group-hover:scale-110 group-hover:bg-[#0284c7] transition-all duration-300">
                    <Play className="w-6 h-6 fill-white text-white translate-x-0.5" />
                  </div>
                </div>

                {/* LESSON NUMBER WATERMARK */}
                <div className="text-5xl font-black text-white/10 absolute right-3 bottom-1 select-none font-mono">
                  {ls.number}
                </div>

                <div className="relative z-10 text-xs font-bold text-sky-200 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Теорія + Практика
                </div>
              </div>

              {/* CARD BODY */}
              <div className="p-5 sm:p-6 space-y-3 flex-1 flex flex-col justify-between">
                <div className="space-y-2">
                  <h3 className="text-base sm:text-lg font-extrabold text-slate-900 leading-snug group-hover:text-[#0284c7] transition-colors">
                    {ls.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
                    {ls.desc}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center gap-2 text-xs font-bold text-[#0284c7]">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Входить у програму міні-курсу</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA TO ENROLL */}
        <div className="text-center pt-4">
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handleOpenModal}
            className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-[#0284c7] to-[#0369a1] text-white font-extrabold text-base sm:text-lg shadow-xl glow-primary uppercase tracking-wide cursor-pointer inline-flex items-center justify-center gap-2.5"
          >
            <span>Отримати всі 6 уроків за 399 грн</span>
            <ArrowRight className="w-5 h-5 text-sky-200" />
          </motion.button>
        </div>

      </section>

      {/* =========================================================================
          BLOCK 5: ROOT CAUSE & 2ND CYCLE INFOGRAPHIC
          ========================================================================= */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 bg-slate-900 text-white border-y border-slate-800">
        <div className="max-w-5xl mx-auto space-y-10">

          <div className="text-center space-y-3 max-w-3xl mx-auto">
            <span className="text-sky-400 text-xs font-extrabold uppercase tracking-widest bg-sky-950 px-3 py-1 rounded-full border border-sky-800">
              Аналіз причин
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white leading-tight">
              Проблема не в тому, що ви недостатньо стараєтесь
            </h2>
            <p className="text-slate-300 text-sm sm:text-base font-medium">
              Коли ви змушуєте себе діяти за типовим стресовим сценарієм:
            </p>
          </div>

          {/* CIRCULAR LOOP INFOGRAPHIC: РІЗКО ОБМЕЖУЄТЕ -> ВИСНАЖУЄТЕ -> ТЕРПИТЕ -> ЗРИВАЄТЕСЬ */}
          <div className="p-6 sm:p-10 rounded-3xl bg-slate-950 border border-slate-800 shadow-2xl space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-center">
              {[
                { title: "Різко обмежуєте їжу", desc: "Суворий дефіцит, відмова від звичних продуктів", icon: "🍽️" },
                { title: "Виснажуєте тренуваннями", desc: "Надмірні навантаження без адаптації", icon: "⚡" },
                { title: "Терпите на силі волі", desc: "Постійний стрес, втома та роздратування", icon: "⏳" },
                { title: "Зриваєтесь", desc: "Організм вимагає компенсації та відновлення", icon: "💥" },
              ].map((step, idx, arr) => (
                <div
                  key={idx}
                  className="p-5 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-2 relative"
                >
                  <div className="text-2xl">{step.icon}</div>
                  <div className="text-sm font-extrabold text-sky-400 uppercase tracking-tight">{step.title}</div>
                  <div className="text-xs text-slate-400 font-medium leading-snug">{step.desc}</div>
                </div>
              ))}
            </div>

            <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 text-center text-xs sm:text-sm text-slate-300 font-medium flex items-center justify-center gap-2">
              <RotateCw className="w-4 h-4 text-sky-400 shrink-0" />
              <span>Організм і психіка рано чи пізно вимагають повернутися до звичного.</span>
            </div>
          </div>

          {/* CORE TAKEAWAY BOX */}
          <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-sky-900/60 to-blue-900/60 border border-sky-700/60 text-center max-w-3xl mx-auto space-y-3">
            <h3 className="text-lg sm:text-xl font-extrabold text-white">
              Тому наше завдання — не змусити вас ще сильніше себе контролювати.
            </h3>
            <p className="text-sky-200 text-sm sm:text-base font-bold">
              А побудувати систему, якої ви зможете нормально дотримуватися день за днем без страждань.
            </p>
          </div>

        </div>
      </section>

      {/* =========================================================================
          BLOCK 6: 4 STEPS TO SUSTAINABLE RESULTS
          ========================================================================= */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 max-w-5xl mx-auto space-y-10">

        <div className="text-center space-y-3 max-w-3xl mx-auto">
          <span className="text-[#0284c7] text-xs font-extrabold uppercase tracking-widest bg-sky-50 px-3 py-1 rounded-full border border-sky-200">
            Системний підхід
          </span>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 leading-tight">
            Не потрібно міняти все життя за один день
          </h2>
          <p className="text-slate-600 text-sm sm:text-base font-semibold">
            Покроковий план трансформації без крайнощів:
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {steps.map((st, idx) => (
            <div
              key={idx}
              className="p-6 rounded-3xl bg-white border border-slate-200 shadow-md space-y-3 flex flex-col justify-between hover:border-sky-300 transition-all"
            >
              <div className="space-y-2">
                <span className="inline-block px-3 py-1 rounded-xl bg-sky-100 text-[#0284c7] text-xs font-extrabold tracking-wider">
                  {st.step}
                </span>
                <h3 className="text-lg font-extrabold text-slate-900 leading-snug">
                  {st.title}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
                  {st.desc}
                </p>
              </div>

              <div className="pt-2">
                <div className="w-8 h-1 rounded-full bg-sky-200" />
              </div>
            </div>
          ))}
        </div>

      </section>

      {/* =========================================================================
          BLOCK 7: ABOUT ANASTASIA SYCH (EXPERT SECTION WITH OVERLAY BADGES)
          ========================================================================= */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 bg-white border-y border-slate-200" id="about">
        <div className="max-w-5xl mx-auto space-y-8">

          <div className="text-center space-y-2 max-w-3xl mx-auto">
            <span className="text-[#0284c7] text-xs font-extrabold uppercase tracking-widest bg-sky-50 px-3 py-1 rounded-full border border-sky-200">
              Автор міні-курсу
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 leading-tight">
              Хто вас навчатиме
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">

            {/* PHOTO WITH DELICATE BADGES */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="relative w-full max-w-sm h-[440px] rounded-3xl overflow-hidden border-2 border-sky-200 shadow-xl bg-slate-900">
                <Image
                  src="/images/anastasia_portrait_black.webp"
                  alt="Анастасія Сич"
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 40vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />

                {/* DELICATE OVERLAY BADGES ON PHOTO */}
                <div className="absolute bottom-4 left-4 right-4 space-y-2">
                  <div className="p-3.5 rounded-2xl bg-white/95 backdrop-blur-md border border-slate-200 shadow-md space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-[#0284c7] uppercase tracking-wide">
                        8 років досвіду
                      </span>
                      <span className="text-[11px] font-bold text-slate-700">
                        Вища медична освіта
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 font-medium tracking-tight">
                      Фітнес-тренерка та експерт зі здорового схуднення
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* BIO COPY */}
            <div className="lg:col-span-7 space-y-5 text-sm sm:text-base text-slate-800 font-medium leading-relaxed">
              <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 leading-snug">
                Я — Анастасія, фітнес-тренерка з 8-річним досвідом та вищою медичною освітою.
              </h3>

              <p className="text-slate-700">
                Я працюю з жінками не тільки над тілом, а й над тим, щоб харчування та тренування стали частиною нормального життя.
              </p>

              <p className="text-slate-700">
                Без жорстких заборон, постійних дієт та виснажливого підходу «терпіть ще трохи».
              </p>

              <div className="p-5 rounded-2xl bg-sky-50 border border-sky-200 space-y-2">
                <p className="font-extrabold text-[#0284c7] text-sm sm:text-base">
                  Моя задача — допомогти вам зрозуміти систему, а не просто дати черговий план, якого ви будете дотримуватися лише кілька тижнів.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2.5">
                  <HeartPulse className="w-5 h-5 text-[#0284c7] shrink-0" />
                  <span className="text-xs font-bold text-slate-800">Медичний підхід</span>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2.5">
                  <GraduationCap className="w-5 h-5 text-[#059669] shrink-0" />
                  <span className="text-xs font-bold text-slate-800">Безпечні навантаження</span>
                </div>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* =========================================================================
          BLOCK 8: REAL CASES & TRANSFORMATION GALLERY
          ========================================================================= */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 max-w-5xl mx-auto space-y-8" id="cases">

        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[#0284c7] text-xs font-extrabold uppercase tracking-widest bg-sky-50 px-3 py-1 rounded-full border border-sky-200">
              Результати клієнток
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900">
              Дівчата вже проходять цей шлях разом зі мною
            </h2>
          </div>

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

        {/* CAROUSEL CONTAINER */}
        <div
          ref={carouselRef}
          className="flex items-stretch gap-5 overflow-x-auto snap-x snap-mandatory py-2 pb-4 scrollbar-none [::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
          style={{ scrollSnapType: "x mandatory", WebkitOverflowScrolling: "touch" }}
        >
          {realCaseGalleries.map((cs) => (
            <div
              key={cs.id}
              onClick={() => setActiveCaseImage(cs.image)}
              className="min-w-[280px] sm:min-w-[320px] max-w-[340px] snap-start rounded-3xl bg-white border border-slate-200 overflow-hidden shadow-md hover:shadow-xl transition-all cursor-pointer flex flex-col justify-between group"
            >
              <div className="relative h-72 w-full bg-slate-100 overflow-hidden">
                <Image
                  src={cs.image}
                  alt={cs.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                  sizes="(max-width: 768px) 80vw, 320px"
                />
                <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-[#059669] text-white text-xs font-extrabold shadow-md">
                  {cs.badge}
                </div>
                <div className="absolute bottom-3 right-3 p-2 rounded-full bg-white/90 text-slate-800 shadow-md opacity-0 group-hover:opacity-100 transition-opacity">
                  <ZoomIn className="w-4 h-4 text-[#0284c7]" />
                </div>
              </div>

              <div className="p-4 sm:p-5 space-y-1.5">
                <div className="font-extrabold text-slate-900 text-base">{cs.title}</div>
                <p className="text-xs sm:text-sm text-slate-600 font-semibold leading-relaxed">
                  {cs.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

      </section>

      {/* =========================================================================
          BLOCK 9: MID-PAGE URGENCY CTA
          ========================================================================= */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 bg-gradient-to-br from-sky-900 via-slate-900 to-slate-950 text-white text-center">
        <div className="max-w-3xl mx-auto space-y-6">

          <span className="text-sky-400 text-xs font-extrabold uppercase tracking-widest bg-sky-950/80 px-3.5 py-1 rounded-full border border-sky-700">
            Дійте зараз
          </span>

          <h2 className="text-2xl sm:text-4xl font-extrabold text-white leading-tight uppercase">
            Почни змінювати свій підхід вже зараз
          </h2>

          <p className="text-slate-300 text-sm sm:text-base font-semibold leading-relaxed max-w-xl mx-auto">
            Замість чергових спроб навмання — зрозуміла система, з якої ви можете почати вже зараз.
          </p>

          <div className="flex items-center justify-center gap-3 font-extrabold">
            <span className="text-3xl sm:text-4xl font-extrabold text-white">399 грн</span>
            <span className="text-lg line-through text-slate-400">2999 грн</span>
            <span className="text-xs px-2.5 py-1 rounded-full bg-[#059669] text-white font-extrabold uppercase">
              -87%
            </span>
          </div>

          <div className="pt-2">
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={handleOpenModal}
              className="w-full sm:w-auto px-10 py-4 rounded-2xl bg-[#0284c7] hover:bg-[#0369a1] text-white font-extrabold text-base sm:text-lg shadow-2xl glow-primary uppercase tracking-wider cursor-pointer inline-flex items-center justify-center gap-2"
            >
              <span>Отримати міні-курс за 399 грн</span>
              <ArrowRight className="w-5 h-5 text-sky-200" />
            </motion.button>
          </div>

        </div>
      </section>

      {/* =========================================================================
          BLOCK 10: FREQUENTLY ASKED QUESTIONS (FAQ)
          ========================================================================= */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 max-w-4xl mx-auto space-y-8" id="faq">

        <div className="text-center space-y-2">
          <span className="text-[#0284c7] text-xs font-extrabold uppercase tracking-widest bg-sky-50 px-3 py-1 rounded-full border border-sky-200">
            Відповіді на запитання
          </span>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 leading-tight">
            Часті запитання
          </h2>
        </div>

        <div className="space-y-3.5">
          {faqItems.map((item, idx) => {
            const isOpen = openFaqIndex === idx;
            return (
              <div
                key={idx}
                className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm transition-all"
              >
                <button
                  onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                  className="w-full p-5 sm:p-6 text-left flex items-center justify-between gap-4 font-extrabold text-sm sm:text-base text-slate-900 hover:text-[#0284c7] transition-colors"
                >
                  <span>{item.q}</span>
                  <ChevronDown
                    className={`w-5 h-5 text-slate-400 transition-transform duration-300 shrink-0 ${
                      isOpen ? "rotate-180 text-[#0284c7]" : ""
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
                      <div className="px-5 pb-5 sm:px-6 sm:pb-6 text-xs sm:text-sm text-slate-600 font-medium leading-relaxed border-t border-slate-100 pt-3">
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
          BLOCK 11: BONUS LESSON "ЯК СПАЛИТИ ЖИР"
          ========================================================================= */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 bg-gradient-to-br from-amber-50 via-white to-sky-50 border-y border-amber-200">
        <div className="max-w-4xl mx-auto space-y-8">

          <div className="p-6 sm:p-10 rounded-3xl bg-white border-2 border-amber-300 shadow-xl space-y-6 relative overflow-hidden">

            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-amber-100 text-amber-700 shrink-0">
                <Gift className="w-7 h-7 text-amber-600" />
              </div>
              <div>
                <span className="text-amber-700 text-xs font-extrabold uppercase tracking-widest">
                  Ексклюзивний подарунок
                </span>
                <h2 className="text-xl sm:text-3xl font-extrabold text-slate-900 leading-tight">
                  При оплаті міні-курсу прямо зараз отримуйте безкоштовно урок «Як спалити ЖИР»
                </h2>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">
                Що в цьому бонусному уроці:
              </h3>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm text-slate-800 font-semibold">
                <li className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[#059669] font-bold">✅</span>
                  <span>5 правил для здорового схуднення</span>
                </li>
                <li className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[#059669] font-bold">✅</span>
                  <span>Як правильно харчуватись для схуднення</span>
                </li>
                <li className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[#059669] font-bold">✅</span>
                  <span>Який режим навантажень обрати для схуднення</span>
                </li>
                <li className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[#059669] font-bold">✅</span>
                  <span>Чому важливо під час схуднення спалювати жир, а не мʼязи</span>
                </li>
              </ul>
            </div>

            {/* INSTANT BOT ACCESS NOTICE */}
            <div className="p-4 rounded-2xl bg-sky-50 border border-sky-200 flex items-center gap-3">
              <Send className="w-5 h-5 text-[#0284c7] shrink-0" />
              <p className="text-xs sm:text-sm text-slate-700 font-semibold leading-relaxed">
                Після оплати ви одразу потрапляєте в Telegram-бот, який миттєво відкриє для вас цей урок.
              </p>
            </div>

          </div>

        </div>
      </section>

      {/* =========================================================================
          BLOCK 12: FINAL SUMMARY & CTA
          ========================================================================= */}
      <section className="py-12 sm:py-20 px-4 sm:px-6 max-w-4xl mx-auto text-center space-y-6">

        <h2 className="text-3xl sm:text-5xl font-extrabold text-slate-900 leading-tight uppercase tracking-tight">
          Отримай <span className="text-[#0284c7]">плоский живіт</span> та струнку талію
        </h2>

        <p className="text-slate-600 text-sm sm:text-lg font-semibold max-w-2xl mx-auto leading-relaxed">
          Перший результат вже за 7 днів, без виснажливих тренувань та обмежень в їжі, за перевіреною системою від фітнес-тренерки.
        </p>

        <div className="flex items-center justify-center gap-3 font-extrabold text-2xl sm:text-4xl text-[#0284c7] pt-2">
          <span>399 грн</span>
          <span className="text-base sm:text-xl line-through text-slate-400">2999 грн</span>
        </div>

        <div className="pt-2 max-w-md mx-auto">
          <motion.button
            whileTap={{ scale: 0.98 }}
            animate={{ scale: [1, 1.02, 1] }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            onClick={handleOpenModal}
            className="w-full py-4 px-8 rounded-2xl bg-gradient-to-r from-[#0284c7] to-[#0369a1] text-white font-extrabold text-lg shadow-2xl glow-primary uppercase tracking-wider cursor-pointer flex items-center justify-center gap-2"
          >
            <span>Отримати міні-курс</span>
            <ArrowRight className="w-5 h-5 text-sky-200" />
          </motion.button>
        </div>

      </section>

      {/* =========================================================================
          STICKY BOTTOM BAR (REVEALED ON SCROLL)
          ========================================================================= */}
      <AnimatePresence>
        {showStickyUI && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-slate-200 p-3 sm:p-4 shadow-2xl"
          >
            <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="hidden sm:block font-extrabold text-slate-900 text-sm">
                  Міні-курс «Плаский живіт та струнка талія»
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg sm:text-xl font-extrabold text-[#0284c7]">399 грн</span>
                  <span className="text-xs line-through text-slate-400 font-bold hidden sm:inline">2999 грн</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#059669] text-white font-bold uppercase">
                    -87%
                  </span>
                </div>
              </div>

              <button
                onClick={handleOpenModal}
                className="py-2.5 sm:py-3 px-5 sm:px-8 rounded-xl bg-gradient-to-r from-[#0284c7] to-[#0369a1] text-white font-extrabold text-xs sm:text-sm uppercase tracking-wider shadow-md hover:brightness-105 cursor-pointer whitespace-nowrap"
              >
                Отримати міні-курс
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
              className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
            />

            {/* MODAL CONTENT */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg rounded-3xl bg-white border border-sky-200 shadow-2xl p-6 sm:p-8 space-y-5 overflow-hidden z-10 max-h-[92vh] overflow-y-auto"
            >
              <button
                onClick={() => !isSubmitting && setIsModalOpen(false)}
                className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
                aria-label="Закрити"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-50 text-[#0284c7] text-xs font-bold border border-sky-200">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Старт 24.08 • 6 уроків</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 leading-tight">
                  Отримати міні-курс
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 font-medium">
                  Заповніть форму для переходу до оплати. Після оплати ви отримаєте доступ до уроків та бонус.
                </p>
              </div>

              {/* PRICE HIGHLIGHT IN MODAL */}
              <div className="p-3.5 rounded-2xl bg-sky-50/80 border border-sky-200 flex items-center justify-between text-xs font-bold text-slate-800">
                <span>Вартість міні-курсу:</span>
                <div className="flex items-center gap-2">
                  <span className="line-through text-slate-400 text-xs">2999 грн</span>
                  <span className="text-base font-extrabold text-[#0284c7]">399 грн</span>
                </div>
              </div>

              {errorMessage && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* NAME INPUT */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-[#0284c7]" />
                    <span>Ваше ім'я:</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Олена"
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-[#0284c7] focus:ring-2 focus:ring-sky-100 outline-none text-sm text-slate-900 font-medium"
                  />
                </div>

                {/* PHONE INPUT */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-[#0284c7]" />
                    <span>Номер телефону (Viber / Telegram):</span>
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="+380"
                    value={formData.phone}
                    onChange={handlePhoneChange}
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-[#0284c7] focus:ring-2 focus:ring-sky-100 outline-none text-sm text-slate-900 font-medium font-mono"
                  />
                </div>

                {/* TELEGRAM INPUT */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <MessageCircle className="w-3.5 h-3.5 text-[#0284c7]" />
                      <span>Ваш Telegram:</span>
                    </label>
                    <button
                      type="button"
                      onClick={handleNoTelegramClick}
                      className="text-[11px] text-[#0284c7] hover:underline font-semibold"
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
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-[#0284c7] focus:ring-2 focus:ring-sky-100 outline-none text-sm text-slate-900 font-medium"
                  />
                </div>

                {/* SUBMIT BUTTON */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#0284c7] to-[#0369a1] text-white font-extrabold text-base shadow-xl glow-primary flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider disabled:opacity-50 transition-all hover:brightness-105"
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

                <p className="text-[11px] text-slate-400 text-center font-medium">
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
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
