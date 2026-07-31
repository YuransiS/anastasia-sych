"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  Video,
  Sparkles,
  ChevronDown,
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
  Clock,
  Heart,
  Flame,
  Dumbbell
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

export default function DiagnosticLanding() {
  const searchParams = useSearchParams();
  const rawOffer = searchParams.get("o");
  const offerVariant = rawOffer === "2" ? "2" : rawOffer === "3" ? "3" : "1";

  // Capture UTM parameters from URL
  const utmSource = searchParams.get("utm_source") || "";
  const utmMedium = searchParams.get("utm_medium") || "";
  const utmCampaign = searchParams.get("utm_campaign") || "";
  const utmContent = searchParams.get("utm_content") || "";
  const utmTerm = searchParams.get("utm_term") || "";

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeCaseImage, setActiveCaseImage] = useState<string | null>(null);

  // Scroll state to hide ticker marquee and bottom CTA bar on Hero, revealing them only on scroll down
  const [showStickyUI, setShowStickyUI] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 280) {
        setShowStickyUI(true);
      } else {
        setShowStickyUI(false);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const [formData, setFormData] = useState<LeadFormData>({
    name: "",
    phone: "+380",
    telegram: "",
    notes: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

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
    trackPixelEvent("InitiateCheckout", { offer_variant: offerVariant, amount: 480, currency: "UAH" });
  };

  // Ukrainian phone input cleaner/formatter
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatUkrainianPhone(e.target.value);
    setFormData({ ...formData, phone: formatted });
  };

  // Fill "В мене немає нікнейму" helper
  const handleNoTelegramClick = () => {
    setFormData({ ...formData, telegram: "В мене немає нікнейму" });
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
          notes: formData.notes,
          offer_variant: offerVariant,
          utm_source: utmSource,
          utm_medium: utmMedium,
          utm_campaign: utmCampaign,
          utm_content: utmContent,
          utm_term: utmTerm,
          page_path: "/diagnostic",
          page_url: typeof window !== "undefined" ? window.location.href : "/diagnostic",
        }),
      });

      const data = await response.json();

      if (response.ok && data.status === "success") {
        setSubmitSuccess(true);
        trackPixelEvent("Lead", {
          offer_variant: offerVariant,
          value: 480,
          currency: "UAH",
        });
      } else {
        setErrorMessage(data.message || "Помилка при збереженні заявки. Спробуйте ще раз.");
      }
    } catch (err) {
      console.error("Form submit error:", err);
      setErrorMessage("Виникла мережева помилка. Будь ласка, перевірте з'єднання.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Dynamic Offer Content mapping per offerVariant (1, 2, 3)
  const getOfferContent = () => {
    if (offerVariant === "2") {
      return {
        title: "Дивишся в дзеркало і тобі не подобається відображення?",
        subtitle: "Розберемо, чому саме у вашому випадку дієти і марафони не дали довготривалого результату, і що заважає повернутись до тіла, у якому ви почуватиметеся впевнено."
      };
    }
    if (offerVariant === "3") {
      return {
        title: "Марафон закінчився, мотивація зникла, а старі звички повернулися?",
        subtitle: "На діагностиці знайдемо, чому тимчасові рішення не працюють саме для вас. І що потрібно змінити, щоб результат залишався з вами, а не зникав після завершення програми."
      };
    }
    // Offer 1 (Default)
    return {
      title: "Після закінчення дієти здається, що тепер можна нарешті наїстися?",
      subtitle: "Запрошую вас на діагностику, де ми розберемо, чому здорове харчування стало для вас випробуванням, а не способом життя, і як змінити це без жорстких заборон."
    };
  };

  const currentOffer = getOfferContent();

  const problemItems = [
    "Після дієти знову повертаються старі звички.",
    "Постійно починаю «з понеділка».",
    "Постійні зриви на солодке або переїдання.",
    "Не знаю, як харчуватися без контролю.",
    "Постійно думаю про їжу.",
    "Не хочу дивитися на себе в дзеркало.",
    "Не хочу купувати одяг більшого розміру.",
    "Відчуваю, що втратила впевненість у собі.",
  ];

  // Visual 60-Minute Diagnostic Timeline Steps
  const timelineSteps = [
    {
      time: "00 – 15 хв",
      title: "Генезис зривів & Аналіз",
      desc: "З'ясовуємо першопричини вечірніх зривів та потягу до солодкого.",
      icon: Clock,
      tag: "Розбір причин"
    },
    {
      time: "15 – 35 хв",
      title: "Психосоматика харчування",
      desc: "Розбираємо заїдання стресу, тривожність та ставлення до свого тіла.",
      icon: Heart,
      tag: "Психоемоційна частина"
    },
    {
      time: "35 – 50 хв",
      title: "Аналіз гормонального тла",
      desc: "Перевірка харчових звичок, рівня енергії, набряклості та тонусу.",
      icon: Flame,
      tag: "Фізичний стан"
    },
    {
      time: "50 – 60 хв",
      title: "Персональна покрокова стратегія",
      desc: "Отримуєте чіткий вектор дій без виснажливих дієт і жорстких заборон.",
      icon: Sparkles,
      tag: "Ваш результат"
    }
  ];

  const stepsItems = [
    { step: "Крок 01", title: "Залишаєте заявку", desc: "Заповнюєте коротку форму на цій сторінці" },
    { step: "Крок 02", title: "Обираємо зручний час", desc: "Узгоджуємо дату та час зустрічі в месенджері" },
    { step: "Крок 03", title: "Онлайн-зустріч", desc: "Зустрічаємось 1-на-1 в Zoom на 60 хвилин" },
    { step: "Крок 04", title: "Розбираємо ситуацію", desc: "Знаходимо справжні причини відсутності довготривалого результату" },
    { step: "Крок 05", title: "Персональні рекомендації", desc: "Маєте чіткий покроковий план дій" },
  ];

  // 4 Clean Before/After Real Client Transformation Cases (Telegram Chat Review Screenshot Removed)
  const realCaseGalleries = [
    {
      id: 1,
      title: "Ярославна, 34 роки",
      badge: "-12 кг • Талія -5 см",
      desc: "-12 кг; -5 см в талії; -4 см в стегнах; +об'ємна попа; +рельєфний прес.",
      image: "/images/cases/case_5.webp",
    },
    {
      id: 2,
      title: "Наталі",
      badge: "Результат за 3 місяці",
      desc: "Трансформація постави, тонусу та вирівнювання пропорцій без виснажливих дієт.",
      image: "/images/cases/case_2.webp",
    },
    {
      id: 3,
      title: "Передньо-задній фокус",
      badge: "Силует та тонус",
      desc: "Вирівнювання постави, зменшення об'ємів та стабілізація раціону.",
      image: "/images/cases/case_1.webp",
    },
    {
      id: 4,
      title: "Профільна трансформація",
      badge: "-2 розміри одягу",
      desc: "Комплексна робота з набряклістю, жировим прошарком та лімфовідтоком.",
      image: "/images/cases/case_3.webp",
    },
  ];

  const faqItems = [
    {
      q: "Скільки триває?",
      a: "В середньому тривалість діагностики складає 60 хвилин.",
    },
    {
      q: "Онлайн чи офлайн?",
      a: "Формат проведення онлайн у Zoom. Ви можете приєднатися з будь-якого куточка світу.",
    },
    {
      q: "Чи буде запис?",
      a: "Так, запис буде обов'язково. Ви зможете передивитися його у зручний для вас час.",
    },
    {
      q: "Чи буде мені актуально якщо я вже перепробувала все?",
      a: "Так, якщо ви вже пробували всі можливі варіанти, а вага все одно не утримується, тоді вам буде дуже корисно знайти першопричину і почати працювати з основною проблемою.",
    },
    {
      q: "Якщо я знаю, що мені однієї діагностики буде замало для результату?",
      a: "На діагностиці я розкажу вам про можливість долучитись до мого персонального супроводу.",
    },
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc] text-[#0f172a] selection:bg-[#0284c7] selection:text-white pb-24 sm:pb-16 font-sans">

      {/* 1. TICKER BANNER (APPEARS ONLY ON SCROLL DOWN TO UN-CLUTTER HERO) */}
      <AnimatePresence>
        {showStickyUI && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-[#0284c7] text-white py-2 overflow-hidden border-b border-[#0369a1] shadow-md fixed top-0 left-0 right-0 z-40"
          >
            <div className="animate-marquee font-extrabold text-xs sm:text-sm tracking-wider uppercase flex items-center gap-8">
              <span>🔥 Персональна діагностика 60 хвилин</span>
              <span className="text-[#bae6fd]">✦</span>
              <span>Знижка -60% діє сьогодні</span>
              <span className="text-[#bae6fd]">✦</span>
              <span>Анастасія Сич</span>
              <span className="text-[#bae6fd]">✦</span>
              <span>Запис 1-на-1 в Zoom</span>
              <span className="text-[#bae6fd]">✦</span>
              <span>🔥 Персональна діагностика 60 хвилин</span>
              <span className="text-[#bae6fd]">✦</span>
              <span>Знижка -60% діє сьогодні</span>
              <span className="text-[#bae6fd]">✦</span>
              <span>Анастасія Сич</span>
              <span className="text-[#bae6fd]">✦</span>
              <span>Запис 1-на-1 в Zoom</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. OPTIMIZED HERO SECTION (RESPONSIVE SPLIT ON DESKTOP, PERFECT ON MOBILE) */}
      <section className="relative min-h-[88vh] flex flex-col justify-center pt-8 pb-10 px-4 sm:px-6 max-w-6xl mx-auto overflow-hidden">
        
        {/* DECORATIVE FEMININE BACKGROUND BLUR GLOWS */}
        <div className="absolute top-10 left-10 w-72 h-72 bg-sky-200/40 rounded-full blur-3xl -z-10 pointer-events-none" />
        <div className="absolute bottom-10 right-10 w-72 h-72 bg-rose-200/30 rounded-full blur-3xl -z-10 pointer-events-none" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center w-full">
          
          {/* LEFT COLUMN: HERO CONTENT */}
          <div className="lg:col-span-7 space-y-5 text-left order-2 lg:order-1">
            
            {/* TOP HEADER BADGE */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-slate-200 text-slate-800 text-xs sm:text-sm font-bold shadow-sm">
              <span className="font-extrabold text-[#0284c7]">1-НА-1 ЗУСТРІЧ В ZOOM</span>
              <span className="text-slate-300">|</span>
              <div className="flex items-center gap-1.5 text-slate-800">
                <Calendar className="w-3.5 h-3.5 text-[#0284c7]" />
                <span>СТАРТ: <b>СЬОГОДНІ / ЗАВТРА</b></span>
              </div>
            </div>

            {/* MAIN OFFER HEADLINE */}
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold leading-snug text-slate-900 tracking-tight uppercase">
              {currentOffer.title}
            </h1>

            {/* SUBTITLE */}
            <p className="text-slate-700 text-xs sm:text-sm lg:text-base leading-relaxed font-medium max-w-xl">
              {currentOffer.subtitle}
            </p>

            {/* PRICE ROW DIRECTLY ABOVE CTA BUTTON */}
            <div className="flex items-center gap-3.5 font-extrabold pt-1">
              <span className="text-3xl sm:text-4xl font-extrabold text-[#0284c7] font-accent">
                480 грн
              </span>
              <span className="text-base sm:text-lg line-through text-slate-400 font-bold">
                1190 грн
              </span>
              <span className="text-xs px-3 py-1 rounded-full bg-[#059669] text-white font-bold uppercase shadow-sm">
                -60% знижка
              </span>
            </div>

            {/* ACTION CTA BUTTON */}
            <motion.button
              whileTap={{ scale: 0.97 }}
              animate={{ scale: [1, 1.02, 1] }}
              transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
              onClick={handleOpenModal}
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-gradient-to-r from-[#0284c7] to-[#0369a1] text-white font-extrabold text-sm sm:text-base shadow-xl glow-primary animate-pulse flex items-center justify-center gap-2.5 cursor-pointer border border-[#0284c7]/30 uppercase tracking-wide"
            >
              <span>ЗАПИСАТИСЬ НА ДІАГНОСТИКУ</span>
              <ArrowRight className="w-5 h-5 text-sky-200" />
            </motion.button>

            {/* TRUST BADGES DIRECTLY UNDERNEATH THE BUTTON */}
            <div className="flex items-center gap-5 text-center text-xs font-semibold text-slate-700 pt-1 flex-wrap">
              <div className="flex items-center gap-1.5">
                <Video className="w-4 h-4 text-[#0284c7]" />
                <span>Zoom 60 хв</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Award className="w-4 h-4 text-[#0284c7]" />
                <span>Медична освіта</span>
              </div>
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#059669]" />
                <span>100% користь</span>
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN: HD FRAMED ANASTASIA PHOTO (PROPORTIONAL RETINA CONTAINER) */}
          <div className="lg:col-span-5 order-1 lg:order-2 flex justify-center">
            <div className="relative w-full max-w-md h-[440px] sm:h-[500px] rounded-3xl overflow-hidden border-4 border-white shadow-2xl bg-slate-100 group">
              <Image
                src="/images/anastasia_hero_blue.webp"
                alt="Анастасія Сич - Нутриціолог та фахівець реабілітації"
                fill
                priority
                className="object-cover object-[center_20%] group-hover:scale-105 transition-transform duration-700"
                sizes="(max-width: 1024px) 100vw, 40vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 via-transparent to-transparent pointer-events-none" />
              
              {/* FEMININE DECORATIVE BADGE */}
              <div className="absolute bottom-4 left-4 right-4 p-3 rounded-2xl bg-white/95 backdrop-blur-md border border-slate-200 flex items-center justify-between shadow-lg">
                <div className="space-y-0.5">
                  <span className="text-sm font-extrabold text-slate-900 block">Анастасія Сич</span>
                  <span className="text-[11px] text-[#0284c7] font-bold block">Нутриціолог & Фахівець реабілітації</span>
                </div>
                <div className="px-2.5 py-1 rounded-full bg-rose-50 text-rose-600 text-[10px] font-extrabold border border-rose-100 flex items-center gap-1">
                  <Dumbbell className="w-3 h-3 text-rose-500" />
                  <span>М'який фітнес</span>
                </div>
              </div>
            </div>
          </div>

        </div>

      </section>

      {/* 3. BLOCK 2: STATIC PAIN POINTS LIST (CLEAN NON-CLICKABLE BULLETS WITH FEMININE TOUCHES) */}
      <section className="py-14 sm:py-18 px-4 sm:px-6 bg-white border-y border-slate-200">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 leading-tight max-w-2xl mx-auto">
              Можливо, зараз ви впізнаєте себе хоча б в одному з цих пунктів:
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {problemItems.map((item, idx) => (
              <div
                key={idx}
                className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 flex items-start gap-3.5 shadow-sm hover:border-sky-200 transition-colors"
              >
                <div className="p-1.5 rounded-xl bg-sky-100 text-[#0284c7] mt-0.5 shrink-0">
                  <Sparkles className="w-4 h-4 text-[#0284c7]" />
                </div>
                <span className="text-sm sm:text-base font-bold leading-snug">{item}</span>
              </div>
            ))}
          </div>

          <div className="glass-card p-6 rounded-2xl border border-sky-200 text-center max-w-2xl mx-auto space-y-2 bg-gradient-to-r from-sky-50/60 to-rose-50/40 shadow-sm">
            <div className="inline-flex items-center justify-center p-2.5 rounded-full bg-sky-100 text-[#0284c7] mb-1">
              <ShieldAlert className="w-5 h-5 text-[#0284c7]" />
            </div>
            <p className="text-slate-900 font-bold text-sm sm:text-base leading-relaxed">
              Якщо хоча б <span className="text-[#0284c7] font-extrabold">2–3 пункти про вас</span> — причина може бути значно глибшою, ніж просто «немає сили волі».
            </p>
          </div>
        </div>
      </section>

      {/* 4. BLOCK 3: CORE INSIGHT (WHY DIETS FAIL) WITH HD YOGA PHOTO */}
      <section className="py-14 sm:py-18 px-4 sm:px-6 max-w-5xl mx-auto">
        <div className="glass-card p-6 sm:p-10 rounded-3xl border border-slate-200 grid grid-cols-1 md:grid-cols-12 gap-8 items-center relative overflow-hidden bg-white shadow-md">
          
          <div className="md:col-span-7 space-y-5 text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-50 text-rose-600 text-xs font-bold border border-rose-100">
              <Heart className="w-3.5 h-3.5 text-rose-500" />
              <span>Турбота про жіноче здоров'я</span>
            </div>

            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 leading-tight">
              Чому дієти працюють лише тимчасово?
            </h2>

            <div className="space-y-3 text-sm sm:text-base text-slate-800 leading-relaxed font-medium">
              <p className="font-bold text-[#0284c7] text-base sm:text-lg">
                Ви не ліниві. Не слабохарактерні. І проблема не у відсутності мотивації.
              </p>
              <p className="text-slate-700 font-medium">
                Проблема в тому, що більшість жінок намагаються змінити поведінку, не розібравшись із причиною, через яку вони постійно повертаються до старих звичок.
              </p>
            </div>

            <div className="inline-block px-5 py-3 rounded-2xl bg-sky-50 border border-sky-200 text-[#0284c7] font-bold text-xs sm:text-sm">
              Саме це ми знаходимо під час діагностики.
            </div>
          </div>

          <div className="md:col-span-5 relative h-72 sm:h-88 rounded-2xl overflow-hidden border-2 border-slate-100 shadow-xl">
            <Image
              src="/images/anastasia_yoga_white.webp"
              alt="Анастасія Сич на йога-килимку"
              fill
              loading="lazy"
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 40vw"
            />
          </div>

        </div>
      </section>

      {/* 5. BLOCK 4: VISUAL 60-MINUTE DIAGNOSTIC TIMELINE */}
      <section className="py-14 sm:py-18 px-4 sm:px-6 bg-white border-y border-slate-200" id="program">
        <div className="max-w-4xl mx-auto space-y-10">
          <div className="text-center space-y-2">
            <span className="text-[#0284c7] text-xs font-bold uppercase tracking-widest">Таймлайн зустрічі</span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900">Що буде на діагностиці за 60 хвилин</h2>
            <p className="text-slate-600 font-medium text-sm sm:text-base max-w-xl mx-auto">
              Покроковий розбір вашої ситуації в комфортному онлайн-форматі Zoom:
            </p>
          </div>

          {/* VISUAL 60-MINUTE PROGRESS TIMELINE GRID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {timelineSteps.map((step, idx) => {
              const StepIcon = step.icon;
              return (
                <div
                  key={idx}
                  className="glass-card p-6 rounded-3xl border border-slate-200 space-y-4 bg-gradient-to-b from-white to-sky-50/30 relative flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="px-3 py-1 rounded-full bg-sky-100 text-[#0284c7] text-xs font-extrabold flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-[#0284c7]" />
                        <span>{step.time}</span>
                      </span>
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                        {step.tag}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-2xl bg-sky-50 text-[#0284c7] border border-sky-100 shrink-0">
                        <StepIcon className="w-5 h-5" />
                      </div>
                      <h3 className="font-extrabold text-slate-900 text-base sm:text-lg">{step.title}</h3>
                    </div>

                    <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
                      {step.desc}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-[#0284c7] font-bold">
                    <span>Етап #{idx + 1}</span>
                    <CheckCircle2 className="w-4 h-4 text-[#059669]" />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="text-center pt-2">
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={handleOpenModal}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-[#0284c7] to-[#0369a1] text-white font-bold text-base sm:text-lg shadow-xl glow-primary uppercase tracking-wide cursor-pointer"
            >
              Записатись на діагностику
            </motion.button>
          </div>
        </div>
      </section>

      {/* 6. STEP-BY-STEP PROCESS GRID */}
      <section className="py-14 sm:py-18 px-4 sm:px-6 max-w-5xl mx-auto">
        <div className="space-y-8">
          <div className="text-center space-y-2">
            <span className="text-[#0284c7] text-xs font-bold uppercase tracking-widest">Процес взаємодії</span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 leading-tight">
              Як проходить діагностична програма
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {stepsItems.map((st, idx) => (
              <div key={idx} className="glass-card p-5 rounded-2xl border border-slate-200 space-y-3 relative flex flex-col justify-between bg-white shadow-sm">
                <div className="space-y-2">
                  <div className="inline-block px-2.5 py-0.5 rounded-full bg-sky-100 text-[#0284c7] font-bold text-[10px]">
                    {st.step}
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base leading-snug">{st.title}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed font-medium">{st.desc}</p>
                </div>
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-[#0284c7] font-bold">
                  <span>Крок #{idx + 1}</span>
                  <Check className="w-3.5 h-3.5" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 8. REAL BEFORE/AFTER CLIENT CASE PHOTO GALLERY (4 CLEAN TRANSFORMATION CASES) */}
      <section className="py-14 sm:py-18 px-4 sm:px-6 bg-white border-y border-slate-200" id="reviews">
        <div className="max-w-5xl mx-auto space-y-8">
          
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900">
              РЕАЛЬНІ КЕЙСИ ТА <span className="text-[#0284c7]">РЕЗУЛЬТАТИ</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 max-w-xl mx-auto">
              Фотографії трансформації тіла підопічних Анастасії Сич:
            </p>
          </div>

          {/* REAL CASE PHOTO GALLERY GRID (4 BEFORE/AFTER CASES) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {realCaseGalleries.map((cs) => (
              <div
                key={cs.id}
                onClick={() => setActiveCaseImage(cs.image)}
                className="glass-card rounded-3xl border border-slate-200 overflow-hidden bg-white shadow-md hover:shadow-xl transition-all duration-300 flex flex-col justify-between cursor-pointer group"
              >
                <div className="relative w-full h-88 sm:h-96 bg-slate-100 overflow-hidden">
                  <Image
                    src={cs.image}
                    alt={cs.title}
                    fill
                    loading="lazy"
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    sizes="(max-width: 768px) 100vw, 50vw"
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
                    <span>Натисніть для перегляду кейсу</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* 9. AUTHOR SECTION */}
      <section className="py-14 sm:py-18 px-4 sm:px-6 max-w-5xl mx-auto" id="author">
        <div className="glass-card p-6 sm:p-12 rounded-3xl border border-slate-200 space-y-8 bg-white shadow-md">
          <div className="max-w-3xl space-y-2 text-left">
            <span className="text-[#0284c7] text-xs font-bold uppercase tracking-widest">Про автора</span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 leading-tight">
              Привіт! Я — Анастасія Сич
            </h2>
            <p className="text-slate-600 text-sm sm:text-base font-semibold">Фахівець з відновлення харчування та реабілітації з понад 8-річним досвідом</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7 space-y-4 text-sm sm:text-base text-slate-800 leading-relaxed font-medium">
              <p className="font-bold text-slate-900">
                Я допомагаю жінкам змінювати не лише тіло, а й ставлення до харчування та себе.
              </p>

              <p className="text-slate-700 font-medium">
                Мій підхід сформувався завдяки власному досвіду відновлення після складного періоду та травми хребта. Саме тоді я переконалася, що результат неможливий без комплексної роботи із тілом та мисленням.
              </p>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <p className="font-bold text-[#0284c7] text-xs uppercase tracking-wider">У своїй роботі я поєдную:</p>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm text-slate-800 font-bold">
                  <li className="flex items-center gap-2">✓ медичний підхід</li>
                  <li className="flex items-center gap-2">✓ реабілітацію та дихання</li>
                  <li className="flex items-center gap-2">✓ збалансований раціон</li>
                  <li className="flex items-center gap-2">✓ роботу з психосоматикою</li>
                </ul>
              </div>
            </div>

            <div className="lg:col-span-5 flex justify-center">
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
          </div>
        </div>
      </section>

      {/* 11. FAQ ACCORDION */}
      <section className="py-14 sm:py-18 px-4 sm:px-6 max-w-3xl mx-auto" id="faq">
        <div className="space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900">Часті запитання (FAQ)</h2>
            <p className="text-slate-500 text-xs sm:text-sm font-semibold">Відповіді на найважливіші питання</p>
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
                    <div className="flex items-center gap-3">
                      <span className="text-[#0284c7] font-bold text-sm">Q{idx + 1}.</span>
                      <span>{item.q}</span>
                    </div>
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

      {/* 12. FINAL CONVERSION BLOCK */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 max-w-4xl mx-auto text-center" id="final-cta">
        <div className="glass-card p-8 sm:p-12 rounded-3xl border border-sky-200 bg-gradient-to-b from-white via-white to-sky-50/70 space-y-6 shadow-xl relative overflow-hidden">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-sky-100 text-[#0284c7] text-xs sm:text-sm font-bold border border-sky-200">
            <Sparkles className="w-4 h-4 text-[#0284c7]" />
            <span>Персональна зустріч 1-на-1 в Zoom</span>
          </div>

          <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 leading-tight max-w-2xl mx-auto">
            ГОТОВІ ЗМІНИТИ СВОЄ СТАВЛЕННЯ ДО ХАРЧУВАННЯ ТА ТІЛА?
          </h2>

          <p className="text-slate-600 text-xs sm:text-sm max-w-xl mx-auto font-medium">
            Забронюйте персональну 60-хвилинну діагностику з Анастасією Сич зі знижкою -60% вже сьогодні.
          </p>

          <div className="flex items-center justify-center gap-3.5 font-extrabold pt-2">
            <span className="text-3xl sm:text-4xl text-[#0284c7] font-accent">480 грн</span>
            <span className="text-base sm:text-lg line-through text-slate-400 font-bold">1190 грн</span>
            <span className="text-xs px-3 py-1 rounded-full bg-[#059669] text-white font-bold uppercase shadow-sm">
              -60% знижка
            </span>
          </div>

          <div className="pt-2 max-w-md mx-auto">
            <motion.button
              whileTap={{ scale: 0.96 }}
              animate={{ scale: [1, 1.02, 1] }}
              transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
              onClick={handleOpenModal}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#0284c7] to-[#0369a1] text-white font-extrabold text-base sm:text-lg shadow-xl glow-primary cursor-pointer flex items-center justify-center gap-3 border border-[#0284c7]/30 uppercase tracking-wide"
            >
              <span>ЗАПИСАТИСЬ НА ДІАГНОСТИКУ</span>
              <ArrowRight className="w-5 h-5 text-sky-200" />
            </motion.button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 text-center text-xs text-slate-500 border-t border-slate-200 bg-white font-medium">
        <p>© 2026 Анастасія Сич. Всі права захищено. Персональна діагностика та супровід.</p>
      </footer>

      {/* 13. STICKY MOBILE BOTTOM CTA BAR (APPEARS ONLY ON SCROLL DOWN TO PREVENT OVERLAP WITH HERO) */}
      <AnimatePresence>
        {showStickyUI && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-0 left-0 right-0 z-[9990] p-3 bg-white/95 backdrop-blur-xl border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.12)] flex items-center justify-between gap-2.5"
          >
            <div className="flex flex-col shrink-0">
              <span className="text-[10px] text-slate-600 font-bold uppercase tracking-wider">Діагностика 60 хв</span>
              <div className="flex items-baseline gap-1.5 font-extrabold">
                <span className="text-base sm:text-lg text-[#0284c7]">480 грн</span>
                <span className="line-through text-[10px] text-slate-400">1190 грн</span>
              </div>
            </div>

            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleOpenModal}
              className="px-4 sm:px-6 py-3 rounded-xl bg-gradient-to-r from-[#0284c7] to-[#0369a1] text-white font-extrabold text-xs sm:text-sm shadow-xl glow-primary cursor-pointer flex items-center gap-2 border border-[#0284c7]/40 shrink-0 uppercase tracking-wide"
            >
              <Sparkles className="w-4 h-4 text-sky-200" />
              <span>Записатись на діагностику</span>
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

              {!submitSuccess ? (
                <div className="space-y-5">
                  <div className="space-y-1.5">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-50 text-[#0284c7] text-xs font-bold border border-sky-100">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Запис на діагностику</span>
                    </div>
                    <h3 className="text-xl sm:text-2xl font-accent text-slate-900 font-extrabold">Заповніть контактні дані</h3>
                    <p className="text-xs text-slate-500 font-medium">
                      Зв'яжемося з вами найближчим часом для узгодження дати та часу зустрічі.
                    </p>
                  </div>

                  {errorMessage && (
                    <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 shrink-0 text-red-500" />
                      <span>{errorMessage}</span>
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1">
                        Ваше ім'я *
                      </label>
                      <div className="relative">
                        <User className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                        <input
                          type="text"
                          required
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="Анастасія"
                          className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-sm font-semibold focus:outline-none focus:border-[#0284c7] focus:bg-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1">
                        Номер телефону *
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                        <input
                          type="tel"
                          required
                          value={formData.phone}
                          onChange={handlePhoneChange}
                          placeholder="+380971234567"
                          className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-sm font-semibold focus:outline-none focus:border-[#0284c7] focus:bg-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1">
                        Telegram нік
                      </label>
                      <div className="relative">
                        <MessageCircle className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                        <input
                          type="text"
                          value={formData.telegram}
                          onChange={(e) => setFormData({ ...formData, telegram: e.target.value })}
                          placeholder="@username"
                          className="w-full pl-10 pr-36 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-sm font-semibold focus:outline-none focus:border-[#0284c7] focus:bg-white"
                        />
                        <button
                          type="button"
                          onClick={handleNoTelegramClick}
                          className="absolute right-2 top-2 bottom-2 px-2.5 bg-slate-200 hover:bg-slate-300 text-[11px] text-slate-800 rounded-lg transition-colors font-bold flex items-center gap-1"
                        >
                          В мене немає нікнейму
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1">
                        Що найбільше турбує зараз? (необов'язково)
                      </label>
                      <textarea
                        rows={2}
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        placeholder="Наприклад: постійні зриви на солодке вечорами..."
                        className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-sm font-semibold focus:outline-none focus:border-[#0284c7] focus:bg-white"
                      />
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                      <span className="text-slate-700 font-bold">Вартість зустрічі:</span>
                      <span className="font-bold text-[#0284c7] text-sm">480 грн</span>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-4 rounded-xl bg-gradient-to-r from-[#0284c7] to-[#0369a1] text-white font-extrabold text-sm sm:text-base shadow-lg glow-primary flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer uppercase tracking-wide"
                    >
                      {isSubmitting ? (
                        <span>Обробка заявки...</span>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          <span>Підтвердити запис</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>
              ) : (
                <div className="py-8 text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 text-[#059669] flex items-center justify-center mx-auto text-2xl">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                  <h3 className="text-2xl font-accent text-slate-900 font-extrabold">Дякуємо за заявку!</h3>
                  <p className="text-sm text-slate-600 max-w-sm mx-auto font-medium">
                    Ваша заявка успішно прийнята. Анастасія або асистент зв'яжеться з вами найближчим часом.
                  </p>
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="px-6 py-3 rounded-xl bg-slate-100 border border-slate-200 text-slate-800 font-bold text-sm hover:bg-slate-200"
                  >
                    Закрити
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
