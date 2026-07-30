"use client";

import React, { useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Video,
  Sparkles,
  ChevronDown,
  UserCheck,
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
  Flame,
  Camera,
  Sliders,
  Check,
  Shield,
  Activity,
  Zap,
  HelpCircle
} from "lucide-react";
import { trackPixelEvent } from "./FacebookPixel";
import {
  formatUkrainianPhone,
  validateUkrainianPhone,
  validateTelegramHandle
} from "@/lib/validation";

// Types
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

  // Interactive Checklist selection state for Block 2
  const [selectedProblems, setSelectedProblems] = useState<number[]>([]);

  // FAQ open items state for Block 11
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  // Before / After Slider Toggle for Block 9
  const [beforeAfterStates, setBeforeAfterStates] = useState<Record<number, "before" | "after">>({
    0: "after",
    1: "after",
    2: "after",
  });

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

    // 1. Name validation
    if (!formData.name.trim()) {
      setErrorMessage("Будь ласка, вкажіть ваше ім'я.");
      return;
    }

    // 2. Phone validation (including 075 Vodafone and 077 Kyivstar operator codes)
    const phoneVal = validateUkrainianPhone(formData.phone);
    if (!phoneVal.isValid) {
      setErrorMessage(phoneVal.error || "Введіть дійсний номер мобільного телефону України.");
      return;
    }

    // 3. Telegram handle validation
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

  // Data Content per TZ
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

  const whatYouGetItems = [
    "розуміння причини",
    "персональні рекомендації",
    "покроковий план",
    "розуміння наступного кроку",
  ];

  const suitableForItems = [
    "вже багато разів худнули, але результат не вдається утримати",
    "втомилися від дієт",
    "хочете навчитися нормально харчуватись",
    "хочете перестати зриватися",
    "хочете повернути собі свою впевненість",
  ];

  const notSuitableForItems = [
    "шукаєте чарівну таблетку",
    "не готові нічого змінювати",
    "шукаєте швидкого вирішення проблеми",
  ];

  const stepsItems = [
    { title: "Залишаєте заявку", desc: "Заповнюєте коротку форму на цій сторінці" },
    { title: "Обираємо зручний час", desc: "Узгоджуємо дату та час зустрічі в месенджері" },
    { title: "Онлайн-зустріч", desc: "Зустрічаємось 1-на-1 в Zoom на 60 хвилин" },
    { title: "Розбираємо вашу ситуацію", desc: "Знаходимо справжні причини відсутності довготривалого результату" },
    { title: "Отримуєте персональні рекомендації", desc: "Маєте чіткий покроковий план подальших дій" },
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

  // Dynamic Hooks for Offer 1, 2, 3
  const getOfferHeadline = () => {
    if (offerVariant === "2") {
      return "Втомилися від постійних зривів на солодке та переїдання?";
    }
    if (offerVariant === "3") {
      return "Хочете нарешті повернутися до тіла, у якому почуватиметеся впевнено?";
    }
    return "Після закінчення дієти здається, що тепер можна нарешті наїстися?";
  };

  return (
    <div className="min-h-screen bg-[#0b0f17] text-[#e8ecf4] selection:bg-[#ffdc82] selection:text-[#0b0f17] pb-28 sm:pb-12 gpu-layer">
      {/* Top Banner Offer Badge */}
      <motion.div
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="bg-gradient-to-r from-[#c33624] via-[#b22e1d] to-[#c33624] text-white text-xs sm:text-sm py-2.5 px-4 text-center font-medium shadow-lg flex items-center justify-center gap-2 sticky top-0 z-40 backdrop-blur-md"
      >
        <Flame className="w-4 h-4 text-[#ffdc82] animate-pulse shrink-0" />
        <span>Спеціальна вартість діагностики — <b className="text-[#ffdc82]">480 грн</b> замість <span className="line-through opacity-75">1190 грн</span></span>
      </motion.div>

      {/* Hero Section - Mobile First Optimized */}
      <header className="relative pt-6 pb-12 sm:pt-16 sm:pb-24 px-4 sm:px-6 max-w-6xl mx-auto overflow-hidden">
        {/* Background Ambient SVG & Glows */}
        <div className="absolute top-10 right-0 w-72 sm:w-96 h-72 sm:h-96 bg-[#ffdc82]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-40 left-0 w-72 sm:w-96 h-72 sm:h-96 bg-[#c33624]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          <div className="lg:col-span-7 space-y-5 text-left">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#131924] border border-[#ffdc82]/30 text-[#ffdc82] text-xs sm:text-sm font-semibold shadow-inner"
            >
              <Sparkles className="w-4 h-4 text-[#ffdc82]" />
              <span>Персональна діагностика 60 хвилин</span>
            </motion.div>

            <motion.h1
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="text-3xl sm:text-5xl font-accent leading-tight text-white tracking-tight"
            >
              {getOfferHeadline()}
            </motion.h1>

            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="space-y-3 text-[#8e9bb0] text-sm sm:text-base leading-relaxed"
            >
              <p className="text-white/95 font-medium text-base sm:text-lg">
                Дивишся в дзеркало і тобі не подобається відображення? Марафон закінчився, мотивація зникла, а старі звички повернулися?
              </p>
              <p>
                Запрошую вас на діагностику, де ми розберемо, чому здорове харчування стало для вас випробуванням, а не способом життя, і як змінити це без жорстких заборон.
              </p>
              <p>
                Розберемо, чому саме у вашому випадку дієти і марафони не дали довготривалого результату, і що заважає повернутись до тіла, у якому ви почуватиметеся впевнено.
              </p>
              <p className="text-[#ffdc82]/90 font-medium pt-1">
                На діагностиці знайдемо, чому тимчасові рішення не працюють саме для вас. І що потрібно змінити, щоб результат залишався з вами, а не зникав після завершення програми.
              </p>
            </motion.div>

            {/* Mobile First Diagnostic Details Cards */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="glass-card p-4 rounded-2xl border border-[#ffdc82]/20 grid grid-cols-1 sm:grid-cols-3 gap-3"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-[#c33624]/20 text-[#c33624] shrink-0">
                  <Video className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[11px] text-[#8e9bb0] uppercase font-bold tracking-wider">Формат</div>
                  <div className="font-semibold text-white text-sm">Онлайн — 60 хвилин</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-[#ffdc82]/20 text-[#ffdc82] shrink-0">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[11px] text-[#8e9bb0] uppercase font-bold tracking-wider">Зустріч</div>
                  <div className="font-semibold text-white text-sm">Персонально 1-на-1</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 shrink-0">
                  <Flame className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[11px] text-[#8e9bb0] uppercase font-bold tracking-wider">Вартість</div>
                  <div className="font-bold text-white text-sm flex items-center gap-2">
                    <span className="line-through text-[#8e9bb0] text-xs">1190 грн</span>
                    <span className="text-[#ffdc82] text-base">480 грн</span>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="pt-2"
            >
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={handleOpenModal}
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-[#c33624] to-[#a92b1b] text-white font-bold text-lg shadow-xl glow-red flex items-center justify-center gap-3 cursor-pointer"
              >
                <span>Записатись на діагностику</span>
                <ArrowRight className="w-5 h-5" />
              </motion.button>
            </motion.div>
          </div>

          {/* Hero Photo Placeholder Container */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.7 }}
            className="lg:col-span-5 flex justify-center"
          >
            <div className="relative max-w-sm w-full">
              <div className="absolute -inset-1.5 rounded-3xl bg-gradient-to-r from-[#ffdc82] to-[#c33624] opacity-35 blur-xl pointer-events-none" />

              <div className="relative glass-card p-3.5 rounded-3xl border border-[#ffdc82]/30 overflow-hidden shadow-2xl">
                <div className="w-full h-96 sm:h-[420px] rounded-2xl bg-[#131924] border border-[#222c3d] relative overflow-hidden flex flex-col justify-between p-5">
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0b0f17] via-[#131924]/80 to-transparent z-10" />

                  <div className="relative z-20 flex justify-between items-start">
                    <div className="px-3 py-1 bg-[#0b0f17]/90 backdrop-blur-md rounded-full text-xs text-[#ffdc82] border border-[#ffdc82]/30 flex items-center gap-1.5 font-semibold">
                      <Award className="w-3.5 h-3.5 text-[#ffdc82]" />
                      <span>Вища медична освіта</span>
                    </div>

                    <div className="p-2 rounded-xl bg-[#0b0f17]/80 border border-white/10 text-white/40">
                      <Camera className="w-4 h-4" />
                    </div>
                  </div>

                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 space-y-2 pointer-events-none">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-[#c33624]/30 to-[#ffdc82]/30 border border-[#ffdc82]/30 flex items-center justify-center text-[#ffdc82]">
                      <User className="w-12 h-12" />
                    </div>
                    <span className="text-xs font-bold text-[#8e9bb0] uppercase tracking-widest pt-2">[ Фото Анастасії Сич ]</span>
                    <span className="text-[11px] text-[#8e9bb0]/70">Медичний нутриціолог & Фахівець реабілітації</span>
                  </div>

                  <div className="relative z-20 space-y-1">
                    <h3 className="text-2xl font-accent text-white">Анастасія Сич</h3>
                    <p className="text-[#ffdc82] text-sm font-medium">8+ років досвіду роботи з жіночим здоров'ям</p>
                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-medium">Медичний підхід</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-[#c33624]/20 text-[#c33624] font-medium">Без суворих дієт</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </header>

      {/* BLOCK 2: Mobile-First Interactive Self-Recognition */}
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
                <motion.div
                  key={idx}
                  whileTap={{ scale: 0.98 }}
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
                </motion.div>
              );
            })}
          </div>

          <motion.div
            initial={{ scale: 0.98 }}
            animate={{ scale: 1 }}
            className="glass-card p-5 sm:p-6 rounded-2xl border border-[#ffdc82]/30 text-center max-w-2xl mx-auto space-y-2"
          >
            <div className="inline-flex items-center justify-center p-2.5 rounded-full bg-[#c33624]/20 text-[#c33624] mb-1">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <p className="text-white font-medium text-sm sm:text-base">
              Якщо хоча б <span className="text-[#ffdc82] font-bold">2–3 пункти про вас</span> — причина може бути значно глибшою, ніж просто «немає сили волі».
            </p>
          </motion.div>
        </div>
      </section>

      {/* BLOCK 3: Why Diets Fail (Core Insight Card) */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 max-w-4xl mx-auto">
        <div className="glass-card p-6 sm:p-12 rounded-3xl border border-[#ffdc82]/30 relative overflow-hidden text-center space-y-6">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#ffdc82]/10 rounded-full blur-3xl pointer-events-none" />

          <span className="text-[#c33624] text-xs font-bold uppercase tracking-widest">Головний інсайт</span>

          <h2 className="text-2xl sm:text-4xl font-accent text-white leading-tight">
            Чому дієти працюють лише тимчасово?
          </h2>

          <div className="space-y-4 text-sm sm:text-lg text-[#e8ecf4] leading-relaxed max-w-2xl mx-auto">
            <p className="font-bold text-[#ffdc82] text-lg sm:text-xl">
              Ви не ліниві. Не слабохарактерні. І проблема не у відсутності мотивації.
            </p>
            <p className="text-[#8e9bb0]">
              Проблема в тому, що більшість жінок намагаються змінити поведінку, не розібравшись із причиною, через яку вони постійно повертаються до старих звичок.
            </p>
          </div>

          <div className="inline-block px-6 py-3 rounded-2xl bg-[#c33624]/20 border border-[#c33624]/40 text-white font-bold text-sm sm:text-base shadow-inner">
            Саме це ми знаходимо під час діагностики.
          </div>
        </div>
      </section>

      {/* BLOCK 4: What Will Happen at the Diagnostic */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 bg-[#0d131f] border-y border-[#222c3d]">
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

      {/* BLOCK 5: What You Will Get */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 max-w-4xl mx-auto">
        <div className="space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-4xl font-accent text-white">Що ви отримаєте:</h2>
            <p className="text-[#8e9bb0] text-sm">Після діагностики у вас буде:</p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            {whatYouGetItems.map((item, idx) => (
              <div key={idx} className="glass-card p-5 rounded-2xl border border-[#ffdc82]/20 text-center space-y-3 glass-card-interactive">
                <div className="w-10 h-10 rounded-xl bg-[#ffdc82]/10 text-[#ffdc82] flex items-center justify-center mx-auto text-base font-bold font-accent">
                  0{idx + 1}
                </div>
                <div className="font-bold text-white text-xs sm:text-sm capitalize">{item}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BLOCK 6 & 7: For Whom / Not For Whom */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 bg-[#0d131f] border-y border-[#222c3d]">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* BLOCK 6: Suitable */}
          <div className="glass-card p-6 sm:p-8 rounded-3xl border border-emerald-500/20 space-y-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-emerald-500/20 text-emerald-400 shrink-0">
                <UserCheck className="w-6 h-6" />
              </div>
              <h3 className="text-xl sm:text-2xl font-accent text-white">
                Для кого ця діагностика підійде:
              </h3>
            </div>

            <div className="space-y-3">
              {suitableForItems.map((item, idx) => (
                <div key={idx} className="flex items-start gap-3 text-sm text-[#e8ecf4]">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* BLOCK 7: Not Suitable */}
          <div className="glass-card p-6 sm:p-8 rounded-3xl border border-[#c33624]/20 space-y-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-[#c33624]/20 text-[#c33624] shrink-0">
                <XCircle className="w-6 h-6" />
              </div>
              <h3 className="text-xl sm:text-2xl font-accent text-white">
                Для кого НЕ підійде:
              </h3>
            </div>

            <div className="space-y-3">
              {notSuitableForItems.map((item, idx) => (
                <div key={idx} className="flex items-start gap-3 text-sm text-[#8e9bb0]">
                  <XCircle className="w-4 h-4 text-[#c33624] shrink-0 mt-0.5" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* BLOCK 8: About Anastasia Sych */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 max-w-5xl mx-auto">
        <div className="glass-card p-6 sm:p-12 rounded-3xl border border-[#ffdc82]/30 space-y-8">
          <div className="max-w-3xl space-y-3 text-left">
            <span className="text-[#ffdc82] text-xs font-bold uppercase tracking-widest">Про автора</span>
            <h2 className="text-2xl sm:text-4xl font-accent text-white leading-tight">
              Чому я дивлюся на проблему ширше, ніж просто «треба менше їсти»
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7 space-y-4 text-sm sm:text-base text-[#e8ecf4] leading-relaxed">
              <p className="font-semibold text-white text-base sm:text-lg">
                Мене звати Анастасія Сич. Я маю вищу медичну освіту та понад 8 років допомагаю жінкам змінювати не лише тіло, а й ставлення до харчування та себе.
              </p>

              <p className="text-[#8e9bb0]">
                Мій підхід сформувався не лише завдяки медицині, а й власному досвіду. Після серйозної травми хребта та складного періоду в житті я пройшла шлях від реабілітації до повноцінного відновлення. Саме тоді зрозуміла, що стійкий результат неможливий без комплексної роботи.
              </p>

              <div className="p-4 rounded-2xl bg-[#131924] border border-[#ffdc82]/20 space-y-2">
                <p className="font-bold text-[#ffdc82] text-xs uppercase tracking-wider">Тому сьогодні у своїй роботі я поєдную:</p>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm text-white font-medium">
                  <li className="flex items-center gap-2">✓ медичний підхід</li>
                  <li className="flex items-center gap-2">✓ тренування</li>
                  <li className="flex items-center gap-2">✓ елементи реабілітації та дихання</li>
                  <li className="flex items-center gap-2">✓ здорові харчові звички</li>
                  <li className="flex items-center gap-2 col-span-1 sm:col-span-2">✓ роботу з мисленням і мотивацією</li>
                </ul>
              </div>

              <p className="italic text-[#ffdc82]/90 font-medium text-xs sm:text-sm pt-1">
                «Моє завдання — допомогти вам побудувати такий спосіб життя, при якому здорове харчування і рух стануть природною частиною вашого життя, а не черговою спробою "почати з понеділка".»
              </p>
            </div>

            <div className="lg:col-span-5 space-y-4">
              <div className="glass-card p-5 rounded-2xl border border-[#ffdc82]/20 space-y-2">
                <HeartPulse className="w-7 h-7 text-[#c33624]" />
                <div className="font-bold text-white text-sm sm:text-base">Медичний & Доказовий Підхід</div>
                <p className="text-xs text-[#8e9bb0]">Без екстремальних голодувань та збитків для гормонального здоров'я.</p>
              </div>

              <div className="glass-card p-5 rounded-2xl border border-[#ffdc82]/20 space-y-2">
                <Brain className="w-7 h-7 text-[#ffdc82]" />
                <div className="font-bold text-white text-sm sm:text-base">Робота з Психосоматикою</div>
                <p className="text-xs text-[#8e9bb0]">Усуваємо першопричину вечірнього переїдання та тривожності.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* BLOCK 9: Interactive Before / After Results Showcase */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 bg-[#0d131f] border-y border-[#222c3d]">
        <div className="max-w-5xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <span className="text-[#ffdc82] text-xs font-bold uppercase tracking-widest">Результати дівчат</span>
            <h2 className="text-2xl sm:text-4xl font-accent text-white leading-tight">
              Які результати у дівчат на моєму супроводі:
            </h2>
            <p className="text-[#8e9bb0] text-xs sm:text-sm">Натискайте на перемикач «До / Після» для перегляду динаміки:</p>
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
      </section>

      {/* BLOCK 10: Step-by-Step Process */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 max-w-5xl mx-auto">
        <div className="space-y-10">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-4xl font-accent text-white">Як проходить діагностика:</h2>
            <p className="text-[#8e9bb0] text-xs sm:text-sm">5 послідовних кроків до результату</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
            {stepsItems.map((st, idx) => (
              <div key={idx} className="glass-card p-5 rounded-2xl border border-[#ffdc82]/20 space-y-3 relative">
                <div className="w-8 h-8 rounded-full bg-[#c33624] text-white flex items-center justify-center font-bold text-xs font-accent">
                  {idx + 1}
                </div>
                <h3 className="font-bold text-white text-sm leading-snug">{st.title}</h3>
                <p className="text-xs text-[#8e9bb0] leading-relaxed">{st.desc}</p>
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

      {/* BLOCK 11: FAQ Accordion */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 bg-[#0d131f] border-t border-[#222c3d]">
        <div className="max-w-3xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-4xl font-accent text-white">Часті запитання (FAQ)</h2>
            <p className="text-[#8e9bb0] text-xs sm:text-sm">Відповіді на поширені запитання перед діагностикою</p>
          </div>

          <div className="space-y-3.5">
            {faqItems.map((item, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div
                  key={idx}
                  className="glass-card rounded-2xl border border-[#ffdc82]/15 overflow-hidden"
                >
                  <button
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 font-bold text-white text-sm sm:text-base hover:text-[#ffdc82] transition-colors"
                  >
                    <span>{item.q}</span>
                    <ChevronDown
                      className={`w-5 h-5 text-[#ffdc82] transition-transform duration-300 shrink-0 ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    />
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

      {/* ALWAYS STICKY MOBILE BOTTOM BAR WITH PULSING HIGHLIGHT GLOW */}
      <div className="fixed bottom-0 left-0 right-0 p-3 bg-[#0b0f17]/95 backdrop-blur-xl border-t border-[#ffdc82]/30 z-40 sm:hidden flex items-center justify-between gap-3 shadow-2xl">
        <div>
          <div className="text-[10px] text-[#8e9bb0] uppercase tracking-wider font-bold">Діагностика 60 хв</div>
          <div className="text-sm font-bold text-[#ffdc82]">480 грн <span className="line-through text-[10px] text-[#8e9bb0]">1190 грн</span></div>
        </div>
        <motion.button
          whileTap={{ scale: 0.95 }}
          animate={{ scale: [1, 1.03, 1] }}
          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
          onClick={handleOpenModal}
          className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-[#c33624] to-[#a92b1b] text-white font-bold text-xs shadow-xl glow-red cursor-pointer flex items-center gap-2 border border-[#ffdc82]/40"
        >
          <Sparkles className="w-4 h-4 text-[#ffdc82] animate-spin" />
          <span>Записатись на діагностику</span>
        </motion.button>
      </div>

      {/* LEAD REGISTRATION MODAL WITH ENHANCED VALIDATION & HELPER BUTTONS */}
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
                        {/* INLINE "В мене немає нікнейму" HELPER BUTTON */}
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
