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
  HeartPulse,
  Brain,
  ArrowRight,
  Camera,
  Sliders,
  Check,
  ShieldCheck,
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
  const [formData, setFormData] = useState<LeadFormData>({
    name: "",
    phone: "+380",
    telegram: "",
    notes: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Interactive Checklist selection state
  const [selectedProblems, setSelectedProblems] = useState<number[]>([]);

  // FAQ open items state
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  // Before / After Slider Toggle
  const [beforeAfterStates, setBeforeAfterStates] = useState<Record<number, "before" | "after">>({
    0: "after",
    1: "after",
    2: "after",
  });

  // Countdown timer state for sticky bar
  const [timeLeft, setTimeLeft] = useState({ minutes: 29, seconds: 55 });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { minutes: prev.minutes - 1, seconds: 59 };
        return { minutes: 29, seconds: 55 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

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
      setErrorMessage(phoneVal.error || "Введіть дійсний номер мобільного телефону України.");
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

  const resultsData = [
    {
      id: 0,
      name: "Олена, 34 роки",
      achievement: "-12 кг без зривів та заборон",
      desc: "Прийшла після 5 повторних дієт. Сформували новий раціон та позбулися вечірнього заїдання стресу.",
      beforeTag: "До: 78 кг, зриви кожні 4 дні",
      afterTag: "Після: 66 кг, стабільний результат",
      stats: ["-12 кг ваги", "Без тяги до солодкого", "Впевненість у тілі"],
    },
    {
      id: 1,
      name: "Марія, 29 років",
      achievement: "-8 кг та спокій з їжею",
      desc: "Раніше кожен тиждень починався з понеділка. Навчилися харчуватися без драм та підрахунку калорій.",
      beforeTag: "До: Страх їжі, хаос в раціоні",
      afterTag: "Після: Інтуїтивний спокій, -8 кг",
      stats: ["-8 кг ваги", "Легкість після їди", "Відновлення сну"],
    },
    {
      id: 2,
      name: "Вікторія, 41 рік",
      achievement: "-15 кг та комплексне відновлення",
      desc: "Мала проблеми зі спиною та енергією. Поєднали медичний підхід, дихання та збалансоване харчування.",
      beforeTag: "До: Біль у спині, хронічна втома",
      afterTag: "Після: Енергія, -2 розміри одягу",
      stats: ["-15 кг ваги", "Свобода від обмежень", "Гардероб на 2 розміри менший"],
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
    <div className="min-h-screen bg-[#0b0f17] text-[#e8ecf4] selection:bg-[#ffdc82] selection:text-[#0b0f17] pb-32 sm:pb-24 gpu-layer">

      {/* 1. FAST TICKER (8s SPEED, NO HEADER) */}
      <div className="bg-[#c33624] text-white py-2.5 overflow-hidden border-b border-[#ffdc82]/30 shadow-md sticky top-0 z-40">
        <div className="animate-marquee font-bold text-xs sm:text-sm tracking-wider uppercase flex items-center gap-8">
          <span>🔥 Персональна діагностика 60 хвилин</span>
          <span>✦</span>
          <span>Знижка -60% діє сьогодні</span>
          <span>✦</span>
          <span>Анастасія Сич • Медичний підхід</span>
          <span>✦</span>
          <span>Запис 1-на-1 в Zoom</span>
          <span>✦</span>
          <span>🔥 Персональна діагностика 60 хвилин</span>
          <span>✦</span>
          <span>Знижка -60% діє сьогодні</span>
          <span>✦</span>
          <span>Анастасія Сич • Медичний підхід</span>
          <span>✦</span>
          <span>Запис 1-на-1 в Zoom</span>
        </div>
      </div>

      {/* 2. HERO SECTION WITH BACKGROUND EXPERT PHOTO (MOBILE & DESKTOP BACKGROUND) */}
      <section className="relative min-h-[90vh] sm:min-h-[85vh] flex items-end sm:items-center pt-8 pb-16 px-4 sm:px-6 overflow-hidden">
        
        {/* FULL EXPERT BACKGROUND PHOTO ON MOBILE & DESKTOP */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/images/anastasia_hero_blue.webp"
            alt="Анастасія Сич - Медичний нутриціолог"
            fill
            priority
            unoptimized
            className="object-cover object-top sm:object-right opacity-90 filter brightness-105 contrast-105"
            sizes="100vw"
          />
          {/* Gradient overlays for crystal clear text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0b0f17] via-[#0b0f17]/90 to-transparent sm:bg-gradient-to-r sm:from-[#0b0f17] sm:via-[#0b0f17]/85 sm:to-transparent z-10" />
        </div>

        <div className="max-w-4xl mx-auto w-full relative z-20 space-y-6 pt-12 sm:pt-6">
          
          {/* Start Date Pill */}
          <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-[#0b0f17]/90 border border-[#ffdc82]/40 text-white text-xs sm:text-sm font-medium backdrop-blur-md shadow-lg">
            <span className="font-bold text-[#ffdc82]">1-НА-1 ЗУСТРІЧ В ZOOM</span>
            <span className="text-[#8e9bb0]">|</span>
            <div className="flex items-center gap-1.5 text-white/90">
              <Calendar className="w-3.5 h-3.5 text-[#ffdc82]" />
              <span>СТАРТ: <b>СЬОГОДНІ / ЗАВТРА</b></span>
            </div>
          </div>

          {/* DYNAMIC TITLE */}
          <h1 className="text-3xl sm:text-5xl font-accent leading-tight text-white tracking-tight drop-shadow-lg">
            {currentOffer.title}
          </h1>

          {/* DYNAMIC SUBTITLE / DESCRIPTION */}
          <p className="text-[#e8ecf4] text-base sm:text-xl leading-relaxed max-w-2xl bg-[#0b0f17]/80 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-[#ffdc82]/20 shadow-xl">
            {currentOffer.subtitle}
          </p>

          {/* STREAMLINED INLINE PRICING & ACTION BUTTON (1 ROW ABOVE BUTTON) */}
          <div className="space-y-3 pt-2 max-w-xl">
            
            {/* 1 INLINE ROW PRICING (No big container box) */}
            <div className="flex items-center gap-3 justify-start font-bold">
              <span className="text-3xl sm:text-4xl font-extrabold text-[#ffdc82] font-accent drop-shadow">
                480 грн
              </span>
              <span className="text-base sm:text-lg line-through text-white/50">
                1190 грн
              </span>
              <span className="text-xs px-2.5 py-1 rounded-full bg-[#c33624] text-white font-extrabold uppercase shadow">
                -60% знижка
              </span>
            </div>

            {/* ACTION CTA BUTTON */}
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleOpenModal}
              className="w-full py-4 sm:py-4.5 rounded-2xl bg-gradient-to-r from-[#c33624] to-[#a92b1b] text-white font-bold text-base sm:text-xl shadow-2xl glow-red flex items-center justify-center gap-3 cursor-pointer border border-[#ffdc82]/40"
            >
              <span>ЗАПИСАТИСЬ НА ДІАГНОСТИКУ</span>
              <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6 text-[#ffdc82]" />
            </motion.button>

            {/* Trust Badges Bar */}
            <div className="flex items-center gap-4 text-center text-xs text-[#8e9bb0] pt-1">
              <div className="flex items-center gap-1.5">
                <Video className="w-4 h-4 text-[#ffdc82]" />
                <span>Zoom 60 хв</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Award className="w-4 h-4 text-[#ffdc82]" />
                <span>Медична освіта</span>
              </div>
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>100% користь</span>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* 3. BLOCK 2: SELF-RECOGNITION CHECKLIST */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 bg-[#0d131f] border-y border-[#222c3d]">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <span className="text-[#ffdc82] text-xs font-bold uppercase tracking-widest">Тест-самодіагностика</span>
            <h2 className="text-2xl sm:text-4xl font-accent text-white leading-tight">
              Можливо, зараз ви впізнаєте себе хоча б в одному з цих пунктів:
            </h2>
            <p className="text-[#8e9bb0] text-xs sm:text-sm">
              Оберіть пункти, які описують вашу поточну ситуацію:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {problemItems.map((item, idx) => {
              const isSelected = selectedProblems.includes(idx);
              return (
                <div
                  key={idx}
                  onClick={() => toggleProblem(idx)}
                  className={`p-4 rounded-2xl cursor-pointer transition-all duration-200 border flex items-start gap-3.5 ${
                    isSelected
                      ? "bg-[#c33624]/20 border-[#c33624] text-white shadow-lg glow-red"
                      : "bg-[#131924] border-[#222c3d] text-[#8e9bb0] hover:border-[#ffdc82]/30 hover:text-white"
                  }`}
                >
                  <div className={`p-1 rounded-full mt-0.5 shrink-0 ${isSelected ? "text-[#c33624]" : "text-[#8e9bb0]"}`}>
                    {isSelected ? (
                      <CheckCircle2 className="w-5 h-5 text-[#c33624]" />
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2 border-[#8e9bb0]/30" />
                    )}
                  </div>
                  <span className="text-sm sm:text-base font-medium leading-snug">{item}</span>
                </div>
              );
            })}
          </div>

          <div className="glass-card p-5 sm:p-6 rounded-2xl border border-[#ffdc82]/30 text-center max-w-2xl mx-auto space-y-2">
            <div className="inline-flex items-center justify-center p-2.5 rounded-full bg-[#c33624]/20 text-[#c33624] mb-1">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <p className="text-white font-medium text-sm sm:text-base">
              Якщо хоча б <span className="text-[#ffdc82] font-bold">2–3 пункти про вас</span> — причина може бути значно глибшою, ніж просто «немає сили волі».
            </p>
          </div>
        </div>
      </section>

      {/* 4. BLOCK 3: CORE INSIGHT (WHY DIETS FAIL) WITH HD YOGA PHOTO */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 max-w-5xl mx-auto">
        <div className="glass-card p-6 sm:p-10 rounded-3xl border border-[#ffdc82]/30 grid grid-cols-1 md:grid-cols-12 gap-8 items-center relative overflow-hidden">
          
          <div className="md:col-span-7 space-y-5 text-left">
            <span className="text-[#c33624] text-xs font-bold uppercase tracking-widest">Головний інсайт</span>

            <h2 className="text-2xl sm:text-4xl font-accent text-white leading-tight">
              Чому дієти працюють лише тимчасово?
            </h2>

            <div className="space-y-3 text-sm sm:text-base text-[#e8ecf4] leading-relaxed">
              <p className="font-bold text-[#ffdc82] text-base sm:text-lg">
                Ви не ліниві. Не слабохарактерні. І проблема не у відсутності мотивації.
              </p>
              <p className="text-[#8e9bb0]">
                Проблема в тому, що більшість жінок намагаються змінити поведінку, не розібравшись із причиною, через яку вони постійно повертаються до старих звичок.
              </p>
            </div>

            <div className="inline-block px-5 py-3 rounded-2xl bg-[#c33624]/20 border border-[#c33624]/40 text-white font-bold text-xs sm:text-sm">
              Саме це ми знаходимо під час діагностики.
            </div>
          </div>

          <div className="md:col-span-5 relative h-72 sm:h-80 rounded-2xl overflow-hidden border border-[#ffdc82]/20 shadow-xl">
            <Image
              src="/images/anastasia_yoga_white.webp"
              alt="Анастасія Сич на йога-килимку"
              fill
              unoptimized
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 40vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0b0f17] via-transparent to-transparent opacity-60" />
          </div>

        </div>
      </section>

      {/* 5. BLOCK 4: WHAT WILL HAPPEN AT THE DIAGNOSTIC */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 bg-[#0d131f] border-y border-[#222c3d]" id="program">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-4xl font-accent text-white">Що буде на діагностиці</h2>
            <p className="text-[#ffdc82] font-semibold text-base sm:text-lg">За 60 хвилин ми розберемо:</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {diagnosticItems.map((item, idx) => (
              <div key={idx} className="glass-card p-4 sm:p-5 rounded-2xl border border-[#ffdc82]/15 flex items-start gap-3.5">
                <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400 shrink-0 mt-0.5">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <span className="text-white font-medium text-sm sm:text-base leading-snug">{item}</span>
              </div>
            ))}
          </div>

          <div className="text-center pt-2">
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={handleOpenModal}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-[#c33624] to-[#a92b1b] text-white font-bold text-base sm:text-lg shadow-xl glow-red"
            >
              Записатись на діагностику
            </motion.button>
          </div>
        </div>
      </section>

      {/* 6. STEP-BY-STEP PROGRAM GRID */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 max-w-5xl mx-auto">
        <div className="space-y-8">
          <div className="text-center space-y-2">
            <span className="text-[#ffdc82] text-xs font-bold uppercase tracking-widest">Процес взаємодії</span>
            <h2 className="text-2xl sm:text-4xl font-accent text-white leading-tight">
              Як проходить діагностична програма
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {stepsItems.map((st, idx) => (
              <div key={idx} className="glass-card p-5 rounded-2xl border border-[#ffdc82]/20 space-y-3 relative flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="inline-block px-2.5 py-0.5 rounded-full bg-[#c33624]/20 text-[#c33624] font-bold text-[10px]">
                    {st.step}
                  </div>
                  <h3 className="font-bold text-white text-sm leading-snug">{st.title}</h3>
                  <p className="text-xs text-[#8e9bb0] leading-relaxed">{st.desc}</p>
                </div>
                <div className="pt-2 border-t border-[#222c3d]/60 flex items-center justify-between text-[10px] text-[#ffdc82]">
                  <span>Крок #{idx + 1}</span>
                  <Check className="w-3.5 h-3.5" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. GUARANTEE BANNER */}
      <section className="py-8 px-4 sm:px-6 max-w-4xl mx-auto">
        <div className="glass-card p-6 sm:p-8 rounded-3xl border border-emerald-500/30 flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left bg-gradient-to-r from-[#131924] via-[#101a26] to-[#131924]">
          <div className="p-4 rounded-2xl bg-emerald-500/20 text-emerald-400 shrink-0 border border-emerald-500/30">
            <ShieldCheck className="w-12 h-12" />
          </div>
          <div className="space-y-1.5">
            <div className="inline-block px-2.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[11px] font-bold uppercase tracking-wider">
              100% ГАРАНТІЯ КОРИСТІ
            </div>
            <h3 className="text-xl font-accent text-white">НЕ ВПЕВНЕНІ? СТИСЛО СПРОБУЙТЕ.</h3>
            <p className="text-xs sm:text-sm text-[#8e9bb0] leading-relaxed">
              Якщо під час 60 хвилин діагностики ви зрозумієте, що зустріч не була для вас корисною — ми повернемо кошти у повному обсязі без зайвих запитань.
            </p>
          </div>
        </div>
      </section>

      {/* 8. SYSTEM DIAGRAM + RESULTS */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 bg-[#0d131f] border-y border-[#222c3d]" id="why-works">
        <div className="max-w-5xl mx-auto space-y-10">
          
          <div className="text-center space-y-3">
            <span className="text-[#ffdc82] text-xs font-bold uppercase tracking-widest">Комплексна методологія</span>
            <h2 className="text-2xl sm:text-4xl font-accent text-white">
              ЧОМУ ЦЯ СИСТЕМА <span className="text-[#ffdc82]">ПРАЦЮЄ</span>
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="glass-card p-5 rounded-2xl border border-[#ffdc82]/20 space-y-2">
              <Award className="w-6 h-6 text-[#ffdc82] mx-auto" />
              <div className="font-bold text-white text-sm">Вища медична освіта</div>
              <p className="text-[11px] text-[#8e9bb0]">Аналіз аналізів та гормонального тла</p>
            </div>
            <div className="glass-card p-5 rounded-2xl border border-[#ffdc82]/20 space-y-2">
              <Brain className="w-6 h-6 text-[#c33624] mx-auto" />
              <div className="font-bold text-white text-sm">Аналіз причин зривів</div>
              <p className="text-[11px] text-[#8e9bb0]">Прибираємо психосоматику переїдання</p>
            </div>
            <div className="glass-card p-5 rounded-2xl border border-[#ffdc82]/20 space-y-2">
              <HeartPulse className="w-6 h-6 text-[#ffdc82] mx-auto" />
              <div className="font-bold text-white text-sm">Реабілітація & Дихання</div>
              <p className="text-[11px] text-[#8e9bb0]">Зняття тривожності та напруги</p>
            </div>
            <div className="glass-card p-5 rounded-2xl border border-[#ffdc82]/20 space-y-2">
              <ShieldCheck className="w-6 h-6 text-emerald-400 mx-auto" />
              <div className="font-bold text-white text-sm">Стійкі звички</div>
              <p className="text-[11px] text-[#8e9bb0]">Результат залишається назавжди</p>
            </div>
          </div>

          {/* BEFORE / AFTER SLIDER CARDS */}
          <div className="pt-6 space-y-6" id="reviews">
            <div className="text-center space-y-1">
              <h3 className="text-xl sm:text-2xl font-accent text-white">BEFORE / AFTER РЕЗУЛЬТАТИ</h3>
              <p className="text-xs text-[#8e9bb0]">Натисніть «До / Після» для перегляду прогресу:</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {resultsData.map((res) => {
                const activeTab = beforeAfterStates[res.id] || "after";

                return (
                  <div key={res.id} className="glass-card p-5 rounded-3xl border border-[#ffdc82]/20 space-y-4 flex flex-col justify-between">
                    <div className="w-full h-64 rounded-2xl bg-[#131924] border border-[#222c3d] relative overflow-hidden flex flex-col justify-between p-4">
                      <div className="flex justify-between items-center z-10">
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full bg-[#0b0f17]/90 text-[#ffdc82] border border-[#ffdc82]/30">
                          {activeTab === "before" ? res.beforeTag : res.afterTag}
                        </span>
                        <Sliders className="w-4 h-4 text-[#8e9bb0]" />
                      </div>

                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4 space-y-1.5 pointer-events-none">
                        <div className={`w-16 h-16 rounded-2xl border flex items-center justify-center transition-colors ${
                          activeTab === "before"
                            ? "bg-[#c33624]/20 border-[#c33624]/40 text-[#c33624]"
                            : "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                        }`}>
                          <Camera className="w-8 h-8" />
                        </div>
                        <span className="text-[11px] font-bold text-white uppercase tracking-wider">
                          [ Фото {activeTab === "before" ? "ДО" : "ПІСЛЯ"} — {res.name.split(",")[0]} ]
                        </span>
                        <span className="text-[10px] text-[#8e9bb0]">
                          {activeTab === "before" ? "Початковий стан & зриви" : res.achievement}
                        </span>
                      </div>

                      <div className="relative z-10 grid grid-cols-2 p-1 bg-[#0b0f17]/90 rounded-xl border border-[#222c3d] text-xs font-bold">
                        <button
                          onClick={() => setBeforeAfterStates({ ...beforeAfterStates, [res.id]: "before" })}
                          className={`py-1.5 rounded-lg transition-all ${
                            activeTab === "before" ? "bg-[#c33624] text-white shadow" : "text-[#8e9bb0]"
                          }`}
                        >
                          До
                        </button>
                        <button
                          onClick={() => setBeforeAfterStates({ ...beforeAfterStates, [res.id]: "after" })}
                          className={`py-1.5 rounded-lg transition-all ${
                            activeTab === "after" ? "bg-emerald-600 text-white shadow" : "text-[#8e9bb0]"
                          }`}
                        >
                          Після
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="inline-block px-3 py-1 rounded-full bg-[#c33624]/20 text-[#c33624] text-xs font-bold">
                        {res.achievement}
                      </div>
                      <h3 className="text-lg font-bold text-white">{res.name}</h3>
                      <p className="text-xs text-[#8e9bb0] leading-relaxed">{res.desc}</p>
                    </div>

                    <div className="pt-3 border-t border-[#222c3d] space-y-1">
                      {res.stats.map((st, sIdx) => (
                        <div key={sIdx} className="flex items-center gap-2 text-xs font-medium text-[#ffdc82]">
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>{st}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </section>

      {/* 9. AUTHOR SECTION WITH ELEGANT BLACK DRESS HD PHOTO */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 max-w-5xl mx-auto" id="author">
        <div className="glass-card p-6 sm:p-12 rounded-3xl border border-[#ffdc82]/30 space-y-8">
          <div className="max-w-3xl space-y-3 text-left">
            <span className="text-[#ffdc82] text-xs font-bold uppercase tracking-widest">Про автора</span>
            <h2 className="text-2xl sm:text-4xl font-accent text-white leading-tight">
              Привіт! Я — Анастасія Сич
            </h2>
            <p className="text-[#8e9bb0] text-sm">Медичний нутриціолог та фахівець реабілітації з понад 8-річним досвідом</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7 space-y-4 text-sm sm:text-base text-[#e8ecf4] leading-relaxed">
              <p className="font-semibold text-white">
                Я маю вищу медичну освіту та допомагаю жінкам змінювати не лише тіло, а й ставлення до харчування та себе.
              </p>

              <p className="text-[#8e9bb0]">
                Мій підхід сформувався завдяки власному досвіду відновлення після складного періоду та травми хребта. Саме тоді я переконалася, що результат неможливий без комплексної роботи із тілом та мисленням.
              </p>

              <div className="p-4 rounded-2xl bg-[#131924] border border-[#ffdc82]/20 space-y-2">
                <p className="font-bold text-[#ffdc82] text-xs uppercase tracking-wider">У своїй роботі я поєдную:</p>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm text-white font-medium">
                  <li className="flex items-center gap-2">✓ медичний підхід</li>
                  <li className="flex items-center gap-2">✓ реабілітацію та дихання</li>
                  <li className="flex items-center gap-2">✓ збалансований раціон</li>
                  <li className="flex items-center gap-2">✓ роботу з психосоматикою</li>
                </ul>
              </div>
            </div>

            <div className="lg:col-span-5 flex justify-center">
              <div className="w-full max-w-sm h-96 rounded-2xl overflow-hidden border border-[#ffdc82]/30 relative shadow-2xl">
                <Image
                  src="/images/anastasia_portrait_black.webp"
                  alt="Анастасія Сич"
                  fill
                  unoptimized
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 35vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0b0f17] via-transparent to-transparent opacity-50" />
                <div className="absolute bottom-3 left-3 right-3 p-2.5 rounded-xl bg-[#0b0f17]/90 backdrop-blur-md border border-[#ffdc82]/30 text-center">
                  <span className="text-xs font-bold text-white">Анастасія Сич</span>
                  <p className="text-[10px] text-[#ffdc82]">Медичний нутриціолог</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 10. ACCESS OPTIONS PRICING CARDS */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 bg-[#0d131f] border-t border-[#222c3d]">
        <div className="max-w-4xl mx-auto space-y-8 text-center">
          <div className="space-y-2">
            <h2 className="text-2xl sm:text-4xl font-accent text-white">ОБЕРІТЬ ВАШ ФОРМАТ</h2>
            <p className="text-[#8e9bb0] text-xs sm:text-sm">Зарезервуйте ваше місце на найближчі дати</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
            
            {/* CARD 1: BASE DIAGNOSTIC */}
            <div className="glass-card p-6 rounded-3xl border border-[#ffdc82]/20 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-accent text-white">ПЕРСОНАЛЬНА ДІАГНОСТИКА</h3>
                  <span className="text-[10px] px-2.5 py-1 rounded-full bg-[#131924] text-[#ffdc82] border border-[#ffdc82]/20">60 хвилин</span>
                </div>

                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-accent font-extrabold text-[#ffdc82]">480 грн</span>
                  <span className="text-sm line-through text-[#8e9bb0]">1190 грн</span>
                </div>

                <ul className="space-y-2.5 text-xs text-[#e8ecf4]">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#ffdc82] shrink-0" />
                    <span>Персональна зустріч 1-на-1 в Zoom</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#ffdc82] shrink-0" />
                    <span>Аналіз причин зривів та переїдання</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#ffdc82] shrink-0" />
                    <span>Покроковий план дій</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={handleOpenModal}
                className="w-full py-3.5 rounded-xl bg-[#131924] border border-[#ffdc82]/40 text-[#ffdc82] font-bold text-sm hover:bg-[#ffdc82] hover:text-[#0b0f17] transition-all cursor-pointer"
              >
                ЗАПИСАТИСЬ ЗА 480 ГРН
              </button>
            </div>

            {/* CARD 2: EXTENDED OPTION (POPULAR) */}
            <div className="glass-card p-6 rounded-3xl border-2 border-[#c33624] relative flex flex-col justify-between space-y-6 shadow-2xl glow-red">
              <div className="absolute -top-3 right-6 px-3 py-1 rounded-full bg-[#c33624] text-white text-[10px] font-bold uppercase tracking-wider">
                ПОПУЛЯРНИЙ ВИБІР
              </div>

              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-accent text-white">ДІАГНОСТИКА + СУПРОВІД</h3>
                  <span className="text-[10px] px-2.5 py-1 rounded-full bg-[#c33624]/20 text-[#ffdc82]">Включає діагностику</span>
                </div>

                <div className="space-y-1">
                  <span className="text-xs text-emerald-400 font-bold">Оновлений комплексний формат</span>
                  <p className="text-xs text-[#8e9bb0]">Повний аналіз + розбірка можливості супроводу</p>
                </div>

                <ul className="space-y-2.5 text-xs text-[#e8ecf4]">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Повна 60-хвилинна діагностика</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Персональна стратегія на 30 днів</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Пріоритетне бронювання часу</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={handleOpenModal}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#c33624] to-[#a92b1b] text-white font-bold text-sm shadow-lg hover:opacity-90 transition-all cursor-pointer"
              >
                ОБРАТИ СУПРОВІД
              </button>
            </div>

          </div>
        </div>
      </section>

      {/* 11. FAQ ACCORDION */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 max-w-3xl mx-auto" id="faq">
        <div className="space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-4xl font-accent text-white">Часті запитання (FAQ)</h2>
            <p className="text-[#8e9bb0] text-xs sm:text-sm">Відповіді на найважливіші питання</p>
          </div>

          <div className="space-y-3.5">
            {faqItems.map((item, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div key={idx} className="glass-card rounded-2xl border border-[#ffdc82]/15 overflow-hidden">
                  <button
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 font-bold text-white text-sm sm:text-base hover:text-[#ffdc82] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-[#ffdc82] font-accent text-sm">Q{idx + 1}.</span>
                      <span>{item.q}</span>
                    </div>
                    <ChevronDown className={`w-5 h-5 text-[#ffdc82] transition-transform duration-300 shrink-0 ${isOpen ? "rotate-180" : ""}`} />
                  </button>

                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4 sm:px-5 sm:pb-5 text-xs sm:text-sm text-[#8e9bb0] border-t border-[#222c3d]/50 pt-3 leading-relaxed">
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
      <footer className="py-8 px-4 text-center text-xs text-[#8e9bb0] border-t border-[#222c3d]">
        <p>© 2026 Анастасія Сич. Всі права захищено. Персональна діагностика та нутриціологічний супровід.</p>
      </footer>

      {/* 12. ALWAYS STICKY BOTTOM MOBILE BAR WITH PULSING ACTION BUTTON */}
      <div className="fixed bottom-0 left-0 right-0 p-3 bg-[#0b0f17]/95 backdrop-blur-xl border-t border-[#ffdc82]/30 z-50 flex items-center justify-between gap-3 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <span className="text-[10px] text-[#8e9bb0] font-bold uppercase tracking-wider">Діагностика 60 хв</span>
            <div className="flex items-baseline gap-1.5 font-bold">
              <span className="text-base text-[#ffdc82]">480 грн</span>
              <span className="line-through text-[10px] text-white/50">1190 грн</span>
            </div>
          </div>
        </div>

        <motion.button
          whileTap={{ scale: 0.95 }}
          animate={{ scale: [1, 1.04, 1] }}
          transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
          onClick={handleOpenModal}
          className="px-5 sm:px-6 py-3.5 rounded-xl bg-gradient-to-r from-[#c33624] to-[#a92b1b] text-white font-bold text-xs sm:text-sm shadow-xl glow-red cursor-pointer flex items-center gap-2 border border-[#ffdc82]/40 shrink-0"
        >
          <Sparkles className="w-4 h-4 text-[#ffdc82] animate-spin" />
          <span>Записатись на діагностику</span>
        </motion.button>
      </div>

      {/* LEAD REGISTRATION MODAL */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="glass-card w-full max-w-lg p-6 sm:p-8 rounded-3xl border border-[#ffdc82]/30 relative shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
            >
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute top-4 right-4 p-2 text-[#8e9bb0] hover:text-white rounded-full bg-[#131924] border border-[#222c3d]"
              >
                <X className="w-5 h-5" />
              </button>

              {!submitSuccess ? (
                <div className="space-y-5">
                  <div className="space-y-1.5">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#c33624]/20 text-[#c33624] text-xs font-bold">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Запис на діагностику</span>
                    </div>
                    <h3 className="text-xl sm:text-2xl font-accent text-white">Заповніть контактні дані</h3>
                    <p className="text-xs text-[#8e9bb0]">
                      Зв'яжемося з вами найближчим часом для узгодження дати та часу зустрічі.
                    </p>
                  </div>

                  {errorMessage && (
                    <div className="p-3.5 rounded-xl bg-red-500/20 border border-red-500/40 text-red-300 text-xs font-medium flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 shrink-0 text-red-400" />
                      <span>{errorMessage}</span>
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-[#8e9bb0] mb-1">
                        Ваше ім'я *
                      </label>
                      <div className="relative">
                        <User className="absolute left-3.5 top-3.5 w-4 h-4 text-[#8e9bb0]" />
                        <input
                          type="text"
                          required
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="Анастасія"
                          className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#131924] border border-[#222c3d] text-white text-sm focus:outline-none focus:border-[#ffdc82]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#8e9bb0] mb-1">
                        Номер телефону * (підтримуються 075 Vodafone та 077 Київстар)
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3.5 top-3.5 w-4 h-4 text-[#8e9bb0]" />
                        <input
                          type="tel"
                          required
                          value={formData.phone}
                          onChange={handlePhoneChange}
                          placeholder="+380971234567"
                          className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#131924] border border-[#222c3d] text-white text-sm focus:outline-none focus:border-[#ffdc82]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#8e9bb0] mb-1">
                        Telegram нік або Інстаграм
                      </label>
                      <div className="relative">
                        <MessageCircle className="absolute left-3.5 top-3.5 w-4 h-4 text-[#8e9bb0]" />
                        <input
                          type="text"
                          value={formData.telegram}
                          onChange={(e) => setFormData({ ...formData, telegram: e.target.value })}
                          placeholder="@username"
                          className="w-full pl-10 pr-36 py-3 rounded-xl bg-[#131924] border border-[#222c3d] text-white text-sm focus:outline-none focus:border-[#ffdc82]"
                        />
                        <button
                          type="button"
                          onClick={handleNoTelegramClick}
                          className="absolute right-2 top-2 bottom-2 px-2.5 bg-[#222c3d]/60 hover:bg-[#222c3d] text-[11px] text-[#ffdc82] rounded-lg transition-colors font-medium flex items-center gap-1 border border-[#ffdc82]/20"
                        >
                          В мене немає нікнейму
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#8e9bb0] mb-1">
                        Що найбільше турбує зараз? (необов'язково)
                      </label>
                      <textarea
                        rows={2}
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        placeholder="Наприклад: постійні зриви на солодке вечорами..."
                        className="w-full p-3 rounded-xl bg-[#131924] border border-[#222c3d] text-white text-sm focus:outline-none focus:border-[#ffdc82]"
                      />
                    </div>

                    <div className="p-3.5 rounded-xl bg-[#131924] border border-[#ffdc82]/20 flex items-center justify-between text-xs">
                      <span className="text-[#8e9bb0]">Вартість зустрічі:</span>
                      <span className="font-bold text-[#ffdc82] text-sm">480 грн</span>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-4 rounded-xl bg-gradient-to-r from-[#c33624] to-[#a92b1b] text-white font-bold text-sm sm:text-base shadow-lg glow-red flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
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
                  <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto text-2xl">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                  <h3 className="text-2xl font-accent text-white">Дякуємо за заявку!</h3>
                  <p className="text-sm text-[#8e9bb0] max-w-sm mx-auto">
                    Ваша заявка успішно прийнята. Анастасія або асистент зв'яжеться з вами найближчим часом.
                  </p>
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="px-6 py-3 rounded-xl bg-[#131924] border border-[#ffdc82]/30 text-[#ffdc82] font-bold text-sm"
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
