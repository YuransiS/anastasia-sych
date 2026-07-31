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
  ZoomIn
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

  // Interactive Checklist selection state
  const [selectedProblems, setSelectedProblems] = useState<number[]>([]);

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

  // Toggle problem selection
  const toggleProblem = (idx: number) => {
    if (selectedProblems.includes(idx)) {
      setSelectedProblems(selectedProblems.filter((i) => i !== idx));
    } else {
      setSelectedProblems([...selectedProblems, idx]);
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

  const diagnosticItems = [
    "Чому у вас виникають зриви.",
    "Які звички заважають тримати результат.",
    "З чим пов'язане переїдання.",
    "Чому здорове харчування викликає тривогу чи паніку.",
    "Що потрібно змінити вже зараз.",
    "Який шлях буде найефективнішим у вашій ситуації.",
  ];

  const stepsItems = [
    { step: "Крок 01", title: "Залишаєте заявку", desc: "Заповнюєте коротку форму на цій сторінці" },
    { step: "Крок 02", title: "Обираємо зручний час", desc: "Узгоджуємо дату та час зустрічі в месенджері" },
    { step: "Крок 03", title: "Онлайн-зустріч", desc: "Зустрічаємось 1-на-1 в Zoom на 60 хвилин" },
    { step: "Крок 04", title: "Розбираємо ситуацію", desc: "Знаходимо справжні причини відсутності довготривалого результату" },
    { step: "Крок 05", title: "Персональні рекомендації", desc: "Маєте чіткий покроковий план дій" },
  ];

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
    {
      id: 5,
      title: "Відгук із Telegram",
      badge: "Живі враження",
      desc: "«Боже яка велика різниця!! Я в шоці... Дуже дякую за цей досвід і за ці зміни!»",
      image: "/images/cases/case_tg_review.webp",
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
    <div className="min-h-screen bg-[#f8fafc] text-[#0f172a] selection:bg-[#0284c7] selection:text-white pb-36 sm:pb-28">

      {/* 1. FAST TICKER (8s SPEED, BLUE ACCENT BANNER) */}
      <div className="bg-[#0284c7] text-white py-2.5 overflow-hidden border-b border-[#0369a1] shadow-md sticky top-0 z-40">
        <div className="animate-marquee font-extrabold text-sm sm:text-base tracking-wider uppercase flex items-center gap-8">
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
      </div>

      {/* 2. RESTRUCTURED HERO SECTION */}
      <section className="relative min-h-[90vh] flex flex-col justify-between pt-4 pb-10 px-4 sm:px-6 overflow-hidden">
        
        {/* HERO BACKGROUND PHOTO WITH LIGHT GRADIENT OVERLAY */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/images/anastasia_hero_blue.webp"
            alt="Анастасія Сич"
            fill
            priority
            className="object-cover object-[center_25%] filter brightness-102 contrast-[1.04]"
            sizes="100vw"
          />
          {/* Light gradient overlay starts below mid-screen so upper image is 100% crisp and vivid */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#f8fafc] via-[#f8fafc]/85 via-40% to-transparent to-60% sm:bg-gradient-to-r sm:from-[#f8fafc] sm:via-[#f8fafc]/85 sm:to-transparent z-10" />
        </div>

        {/* TOP BADGE IN HEADER POSITION */}
        <div className="relative z-20 max-w-4xl mx-auto w-full">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/95 border border-slate-200 text-slate-800 text-xs sm:text-sm font-bold backdrop-blur-md shadow-md">
            <span className="font-extrabold text-[#0284c7]">1-НА-1 ЗУСТРІЧ В ZOOM</span>
            <span className="text-slate-300">|</span>
            <div className="flex items-center gap-1.5 text-slate-800">
              <Calendar className="w-4 h-4 text-[#0284c7]" />
              <span>СТАРТ: <b>СЬОГОДНІ / ЗАВТРА</b></span>
            </div>
          </div>
        </div>

        {/* HERO CONTENT BUILT FROM BOTTOM UP */}
        <div className="max-w-4xl mx-auto w-full relative z-20 mt-auto space-y-5 max-w-2xl">
          
          {/* MAIN OFFER HEADLINE */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black leading-[1.15] text-slate-900 tracking-tight drop-shadow-sm uppercase">
            {currentOffer.title}
          </h1>

          {/* SUBTITLE */}
          <p className="text-slate-700 text-sm sm:text-base lg:text-lg leading-relaxed font-semibold">
            {currentOffer.subtitle}
          </p>

          {/* 1-LINE PRICE ROW DIRECTLY ABOVE CTA BUTTON */}
          <div className="flex items-center gap-3.5 font-black pt-1">
            <span className="text-4xl sm:text-5xl font-black text-[#0284c7] font-accent">
              480 грн
            </span>
            <span className="text-lg sm:text-2xl line-through text-slate-400 font-bold">
              1190 грн
            </span>
            <span className="text-xs sm:text-sm px-3 py-1.5 rounded-full bg-[#059669] text-white font-extrabold uppercase shadow-sm">
              -60% знижка
            </span>
          </div>

          {/* ACTION CTA BUTTON WITH PULSING BLUE GLOW */}
          <motion.button
            whileTap={{ scale: 0.97 }}
            animate={{ scale: [1, 1.02, 1] }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            onClick={handleOpenModal}
            className="w-full py-4 sm:py-5 rounded-2xl bg-gradient-to-r from-[#0284c7] to-[#0369a1] text-white font-extrabold text-lg sm:text-xl shadow-xl glow-primary animate-pulse flex items-center justify-center gap-3 cursor-pointer border border-[#0284c7]/30 uppercase tracking-wide"
          >
            <span>ЗАПИСАТИСЬ НА ДІАГНОСТИКУ</span>
            <ArrowRight className="w-6 h-6 text-sky-200" />
          </motion.button>

          {/* TRUST BADGES DIRECTLY UNDERNEATH THE BUTTON */}
          <div className="flex items-center gap-5 text-center text-xs sm:text-sm font-bold text-slate-700 pt-1">
            <div className="flex items-center gap-2">
              <Video className="w-4 h-4 text-[#0284c7]" />
              <span>Zoom 60 хв</span>
            </div>
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-[#0284c7]" />
              <span>Медична освіта</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#059669]" />
              <span>100% користь</span>
            </div>
          </div>

        </div>
      </section>

      {/* 3. BLOCK 2: SELF-RECOGNITION CHECKLIST */}
      <section className="py-14 sm:py-20 px-4 sm:px-6 bg-white border-y border-slate-200">
        <div className="max-w-4xl mx-auto space-y-10">
          <div className="text-center space-y-3">
            <span className="text-[#0284c7] text-xs sm:text-sm font-extrabold uppercase tracking-widest">Тест-самодіагностика</span>
            <h2 className="text-3xl sm:text-5xl font-black text-slate-900 leading-tight">
              Можливо, зараз ви впізнаєте себе хоча б в одному з цих пунктів:
            </h2>
            <p className="text-slate-600 text-sm sm:text-base font-medium">
              Оберіть пункти, які описують вашу поточну ситуацію:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {problemItems.map((item, idx) => {
              const isSelected = selectedProblems.includes(idx);
              return (
                <div
                  key={idx}
                  onClick={() => toggleProblem(idx)}
                  className={`p-5 rounded-2xl cursor-pointer transition-all duration-200 border flex items-start gap-4 ${
                    isSelected
                      ? "bg-sky-50 border-[#0284c7] text-slate-900 shadow-md"
                      : "bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300 hover:text-slate-900"
                  }`}
                >
                  <div className={`p-1 rounded-full mt-0.5 shrink-0 ${isSelected ? "text-[#0284c7]" : "text-slate-400"}`}>
                    {isSelected ? (
                      <CheckCircle2 className="w-6 h-6 text-[#0284c7]" />
                    ) : (
                      <div className="w-6 h-6 rounded-full border-2 border-slate-300" />
                    )}
                  </div>
                  <span className="text-base sm:text-lg font-bold leading-snug">{item}</span>
                </div>
              );
            })}
          </div>

          <div className="glass-card p-6 rounded-2xl border border-sky-200 text-center max-w-2xl mx-auto space-y-3 bg-sky-50/60 shadow-sm">
            <div className="inline-flex items-center justify-center p-3 rounded-full bg-sky-100 text-[#0284c7]">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <p className="text-slate-900 font-bold text-base sm:text-lg leading-relaxed">
              Якщо хоча б <span className="text-[#0284c7] font-black">2–3 пункти про вас</span> — причина може бути значно глибшою, ніж просто «немає сили волі».
            </p>
          </div>
        </div>
      </section>

      {/* 4. BLOCK 3: CORE INSIGHT (WHY DIETS FAIL) WITH HD YOGA PHOTO */}
      <section className="py-14 sm:py-20 px-4 sm:px-6 max-w-5xl mx-auto">
        <div className="glass-card p-8 sm:p-12 rounded-3xl border border-slate-200 grid grid-cols-1 md:grid-cols-12 gap-8 items-center relative overflow-hidden bg-white shadow-md">
          
          <div className="md:col-span-7 space-y-6 text-left">
            <span className="text-[#0284c7] text-xs sm:text-sm font-extrabold uppercase tracking-widest">Головний інсайт</span>

            <h2 className="text-3xl sm:text-5xl font-black text-slate-900 leading-tight">
              Чому дієти працюють лише тимчасово?
            </h2>

            <div className="space-y-4 text-base sm:text-lg text-slate-800 leading-relaxed font-medium">
              <p className="font-extrabold text-[#0284c7] text-lg sm:text-xl">
                Ви не ліниві. Не слабохарактерні. І проблема не у відсутності мотивації.
              </p>
              <p className="text-slate-700 font-medium">
                Проблема в тому, що більшість жінок намагаються змінити поведінку, не розібравшись із причиною, через яку вони постійно повертаються до старих звичок.
              </p>
            </div>

            <div className="inline-block px-6 py-3.5 rounded-2xl bg-sky-50 border border-sky-200 text-[#0284c7] font-extrabold text-sm sm:text-base">
              Саме це ми знаходимо під час діагностики.
            </div>
          </div>

          <div className="md:col-span-5 relative h-80 sm:h-96 rounded-2xl overflow-hidden border border-slate-200 shadow-xl">
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

      {/* 5. BLOCK 4: WHAT WILL HAPPEN AT THE DIAGNOSTIC */}
      <section className="py-14 sm:py-20 px-4 sm:px-6 bg-white border-y border-slate-200" id="program">
        <div className="max-w-4xl mx-auto space-y-10">
          <div className="text-center space-y-3">
            <h2 className="text-3xl sm:text-5xl font-black text-slate-900">Що буде на діагностиці</h2>
            <p className="text-[#0284c7] font-bold text-lg sm:text-xl">За 60 хвилин ми розберемо:</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {diagnosticItems.map((item, idx) => (
              <div key={idx} className="glass-card p-5 rounded-2xl border border-slate-200 flex items-start gap-4 bg-slate-50/70 shadow-sm">
                <div className="p-2.5 rounded-xl bg-emerald-100 text-[#059669] shrink-0 mt-0.5">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <span className="text-slate-900 font-bold text-base sm:text-lg leading-snug">{item}</span>
              </div>
            ))}
          </div>

          <div className="text-center pt-3">
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={handleOpenModal}
              className="w-full sm:w-auto px-10 py-5 rounded-2xl bg-gradient-to-r from-[#0284c7] to-[#0369a1] text-white font-extrabold text-lg sm:text-xl shadow-xl glow-primary uppercase tracking-wide"
            >
              Записатись на діагностику
            </motion.button>
          </div>
        </div>
      </section>

      {/* 6. STEP-BY-STEP PROGRAM GRID */}
      <section className="py-14 sm:py-20 px-4 sm:px-6 max-w-5xl mx-auto">
        <div className="space-y-10">
          <div className="text-center space-y-3">
            <span className="text-[#0284c7] text-xs sm:text-sm font-extrabold uppercase tracking-widest">Процес взаємодії</span>
            <h2 className="text-3xl sm:text-5xl font-black text-slate-900 leading-tight">
              Як проходить діагностична програма
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
            {stepsItems.map((st, idx) => (
              <div key={idx} className="glass-card p-6 rounded-2xl border border-slate-200 space-y-4 relative flex flex-col justify-between bg-white shadow-sm">
                <div className="space-y-3">
                  <div className="inline-block px-3 py-1 rounded-full bg-sky-100 text-[#0284c7] font-extrabold text-xs">
                    {st.step}
                  </div>
                  <h3 className="font-extrabold text-slate-900 text-base sm:text-lg leading-snug">{st.title}</h3>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">{st.desc}</p>
                </div>
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-[#0284c7] font-bold">
                  <span>Крок #{idx + 1}</span>
                  <Check className="w-4 h-4" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 8. REAL CASE PHOTO GALLERY */}
      <section className="py-14 sm:py-20 px-4 sm:px-6 bg-white border-y border-slate-200" id="reviews">
        <div className="max-w-6xl mx-auto space-y-10">
          
          <div className="text-center space-y-3">
            <h2 className="text-3xl sm:text-5xl font-black text-slate-900">
              РЕАЛЬНІ КЕЙСИ ТА <span className="text-[#0284c7]">РЕЗУЛЬТАТИ</span>
            </h2>
          </div>

          {/* REAL CASE PHOTO GALLERY GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
            {realCaseGalleries.map((cs) => (
              <div
                key={cs.id}
                onClick={() => setActiveCaseImage(cs.image)}
                className="glass-card rounded-3xl border border-slate-200 overflow-hidden bg-white shadow-md hover:shadow-2xl transition-all duration-300 flex flex-col justify-between cursor-pointer group"
              >
                <div className="relative w-full h-88 bg-slate-100 overflow-hidden">
                  <Image
                    src={cs.image}
                    alt={cs.title}
                    fill
                    loading="lazy"
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                  <div className="absolute inset-0 bg-slate-900/10 group-hover:bg-slate-900/30 transition-colors duration-300 flex items-center justify-center">
                    <div className="p-3.5 rounded-full bg-white/95 text-slate-900 shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center gap-2 text-sm font-extrabold">
                      <ZoomIn className="w-5 h-5 text-[#0284c7]" />
                      <span>Збільшити фото</span>
                    </div>
                  </div>
                  <div className="absolute top-3 left-3 px-3.5 py-1.5 rounded-full bg-white/95 backdrop-blur-md text-[#0284c7] font-extrabold text-xs sm:text-sm shadow-md border border-sky-100">
                    {cs.badge}
                  </div>
                </div>

                <div className="p-6 space-y-3 bg-white">
                  <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900">{cs.title}</h3>
                  <p className="text-sm sm:text-base text-slate-700 leading-relaxed font-medium">{cs.desc}</p>
                  <div className="pt-2 flex items-center justify-between text-sm text-[#0284c7] font-extrabold">
                    <span>Натисніть для перегляду кейсу</span>
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* 9. AUTHOR SECTION */}
      <section className="py-14 sm:py-20 px-4 sm:px-6 max-w-5xl mx-auto" id="author">
        <div className="glass-card p-8 sm:p-14 rounded-3xl border border-slate-200 space-y-10 bg-white shadow-md">
          <div className="max-w-3xl space-y-3 text-left">
            <span className="text-[#0284c7] text-xs sm:text-sm font-extrabold uppercase tracking-widest">Про автора</span>
            <h2 className="text-3xl sm:text-5xl font-black text-slate-900 leading-tight">
              Привіт! Я — Анастасія Сич
            </h2>
            <p className="text-slate-600 text-base sm:text-lg font-bold">Фахівець з відновлення харчування та реабілітації з понад 8-річним досвідом</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7 space-y-5 text-base sm:text-lg text-slate-800 leading-relaxed font-medium">
              <p className="font-extrabold text-slate-900">
                Я допомагаю жінкам змінювати не лише тіло, а й ставлення до харчування та себе.
              </p>

              <p className="text-slate-700 font-medium">
                Мій підхід сформувався завдяки власному досвіду відновлення після складного періоду та травми хребта. Саме тоді я переконалася, що результат неможливий без комплексної роботи із тілом та мисленням.
              </p>

              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <p className="font-black text-[#0284c7] text-xs sm:text-sm uppercase tracking-wider">У своїй роботі я поєдную:</p>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm sm:text-base text-slate-900 font-bold">
                  <li className="flex items-center gap-2">✓ медичний підхід</li>
                  <li className="flex items-center gap-2">✓ реабілітацію та дихання</li>
                  <li className="flex items-center gap-2">✓ збалансований раціон</li>
                  <li className="flex items-center gap-2">✓ роботу з психосоматикою</li>
                </ul>
              </div>
            </div>

            <div className="lg:col-span-5 flex justify-center">
              <div className="w-full max-w-sm h-96 rounded-2xl overflow-hidden border border-slate-200 relative shadow-xl">
                <Image
                  src="/images/anastasia_portrait_black.webp"
                  alt="Анастасія Сич"
                  fill
                  loading="lazy"
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 35vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent" />
                <div className="absolute bottom-3 left-3 right-3 p-3 rounded-xl bg-white/95 backdrop-blur-md border border-slate-200 text-center shadow-md">
                  <span className="text-sm font-extrabold text-slate-900">Анастасія Сич</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 11. FAQ ACCORDION */}
      <section className="py-14 sm:py-20 px-4 sm:px-6 max-w-4xl mx-auto" id="faq">
        <div className="space-y-10">
          <div className="text-center space-y-3">
            <h2 className="text-3xl sm:text-5xl font-black text-slate-900">Часті запитання (FAQ)</h2>
            <p className="text-slate-600 text-sm sm:text-base font-semibold">Відповіді на найважливіші питання</p>
          </div>

          <div className="space-y-4">
            {faqItems.map((item, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div key={idx} className="glass-card rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-sm">
                  <button
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    className="w-full p-5 sm:p-6 text-left flex items-center justify-between gap-4 font-extrabold text-slate-900 text-base sm:text-xl hover:text-[#0284c7] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-[#0284c7] font-black text-base sm:text-lg">Q{idx + 1}.</span>
                      <span>{item.q}</span>
                    </div>
                    <ChevronDown className={`w-6 h-6 text-[#0284c7] transition-transform duration-300 shrink-0 ${isOpen ? "rotate-180" : ""}`} />
                  </button>

                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="px-5 pb-5 sm:px-6 sm:pb-6 text-sm sm:text-base text-slate-700 border-t border-slate-100 pt-4 leading-relaxed font-medium">
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

      {/* Footer */}
      <footer className="py-8 px-4 text-center text-xs sm:text-sm text-slate-500 border-t border-slate-200 bg-white font-medium">
        <p>© 2026 Анастасія Сич. Всі права захищено. Персональна діагностика та супровід.</p>
      </footer>

      {/* 12. PERMANENT STICKY MOBILE BOTTOM CTA BAR */}
      <div className="fixed bottom-0 left-0 right-0 z-[9990] p-3.5 bg-white/95 backdrop-blur-xl border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.12)] flex items-center justify-between gap-3">
        <div className="flex flex-col shrink-0">
          <span className="text-[11px] text-slate-600 font-extrabold uppercase tracking-wider">Діагностика 60 хв</span>
          <div className="flex items-baseline gap-2 font-black">
            <span className="text-lg sm:text-2xl text-[#0284c7]">480 грн</span>
            <span className="line-through text-xs text-slate-400">1190 грн</span>
          </div>
        </div>

        <motion.button
          whileTap={{ scale: 0.95 }}
          animate={{ scale: [1, 1.03, 1] }}
          transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
          onClick={handleOpenModal}
          className="px-5 sm:px-7 py-3.5 rounded-xl bg-gradient-to-r from-[#0284c7] to-[#0369a1] text-white font-extrabold text-xs sm:text-base shadow-xl glow-primary animate-pulse cursor-pointer flex items-center gap-2 border border-[#0284c7]/40 shrink-0 uppercase tracking-wide"
        >
          <Sparkles className="w-4 h-4 text-sky-200" />
          <span>Записатись на діагностику</span>
        </motion.button>
      </div>

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
                  <div className="space-y-2">
                    <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-sky-50 text-[#0284c7] text-xs sm:text-sm font-extrabold border border-sky-100">
                      <Sparkles className="w-4 h-4" />
                      <span>Запис на діагностику</span>
                    </div>
                    <h3 className="text-2xl sm:text-3xl font-black text-slate-900">Заповніть контактні дані</h3>
                    <p className="text-xs sm:text-sm text-slate-600 font-medium">
                      Зв'яжемося з вами найближчим часом для узгодження дати та часу зустрічі.
                    </p>
                  </div>

                  {errorMessage && (
                    <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm font-bold flex items-center gap-2">
                      <ShieldAlert className="w-5 h-5 shrink-0 text-red-500" />
                      <span>{errorMessage}</span>
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-xs sm:text-sm font-extrabold text-slate-800 mb-1.5">
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
                          className="w-full pl-10 pr-4 py-3.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-sm sm:text-base font-semibold focus:outline-none focus:border-[#0284c7] focus:bg-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs sm:text-sm font-extrabold text-slate-800 mb-1.5">
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
                          className="w-full pl-10 pr-4 py-3.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-sm sm:text-base font-semibold focus:outline-none focus:border-[#0284c7] focus:bg-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs sm:text-sm font-extrabold text-slate-800 mb-1.5">
                        Telegram нік
                      </label>
                      <div className="relative">
                        <MessageCircle className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                        <input
                          type="text"
                          value={formData.telegram}
                          onChange={(e) => setFormData({ ...formData, telegram: e.target.value })}
                          placeholder="@username"
                          className="w-full pl-10 pr-36 py-3.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-sm sm:text-base font-semibold focus:outline-none focus:border-[#0284c7] focus:bg-white"
                        />
                        <button
                          type="button"
                          onClick={handleNoTelegramClick}
                          className="absolute right-2 top-2 bottom-2 px-2.5 bg-slate-200 hover:bg-slate-300 text-[11px] sm:text-xs text-slate-800 rounded-lg transition-colors font-bold flex items-center gap-1"
                        >
                          В мене немає нікнейму
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs sm:text-sm font-extrabold text-slate-800 mb-1.5">
                        Що найбільше турбує зараз? (необов'язково)
                      </label>
                      <textarea
                        rows={2}
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        placeholder="Наприклад: постійні зриви на солодке вечорами..."
                        className="w-full p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-sm sm:text-base font-semibold focus:outline-none focus:border-[#0284c7] focus:bg-white"
                      />
                    </div>

                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs sm:text-sm">
                      <span className="text-slate-700 font-bold">Вартість зустрічі:</span>
                      <span className="font-black text-[#0284c7] text-base sm:text-lg">480 грн</span>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-4 rounded-xl bg-gradient-to-r from-[#0284c7] to-[#0369a1] text-white font-extrabold text-base sm:text-lg shadow-lg glow-primary flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer uppercase tracking-wide"
                    >
                      {isSubmitting ? (
                        <span>Обробка заявки...</span>
                      ) : (
                        <>
                          <Send className="w-5 h-5" />
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
                  <h3 className="text-2xl sm:text-3xl font-black text-slate-900">Дякуємо за заявку!</h3>
                  <p className="text-sm sm:text-base text-slate-700 max-w-sm mx-auto font-medium">
                    Ваша заявка успішно прийнята. Анастасія або асистент зв'яжеться з вами найближчим часом.
                  </p>
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="px-8 py-3.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-900 font-extrabold text-sm hover:bg-slate-200"
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
