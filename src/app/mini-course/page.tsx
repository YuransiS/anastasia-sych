import { Suspense } from "react";
import MiniCourseLanding from "@/components/MiniCourseLanding";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Міні-курс: Отримай плаский живіт та струнку талію | Анастасія Сич",
  description:
    "Перший результат вже за 7 днів без виснажливих тренувань та обмежень в їжі за перевіреною системою від фітнес-тренерки Анастасії Сич. 6 практичних уроків.",
  openGraph: {
    title: "Міні-курс: Отримай плаский живіт та струнку талію | Анастасія Сич",
    description:
      "Перший результат вже за 7 днів без виснажливих тренувань та обмежень в їжі за перевіреною системою від фітнес-тренерки Анастасії Сич. 6 практичних уроків.",
    url: "https://anastasiia-sych.vercel.app/mini-course",
    siteName: "Анастасія Сич",
    type: "website",
  },
  alternates: {
    canonical: "https://anastasiia-sych.vercel.app/mini-course",
  },
};

export default function MiniCoursePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center text-[#0284c7] font-bold">
          Завантаження міні-курсу...
        </div>
      }
    >
      <MiniCourseLanding />
    </Suspense>
  );
}
