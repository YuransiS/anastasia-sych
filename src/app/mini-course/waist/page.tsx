import { Suspense } from "react";
import WaistMiniCourseLanding from "@/components/WaistMiniCourseLanding";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Позбудься випираючого живота та створи чітку талію з перших тренувань | Анастасія Сич",
  description:
    "Міні-курс від фітнес-тренерки з вищою медичною освітою Анастасії Сич. Без обмежень в їжі, без зривів, за перевіреною системою. Старт 24.08.",
  openGraph: {
    title: "Позбудься випираючого живота та створи чітку талію з перших тренувань | Анастасія Сич",
    description:
      "Міні-курс від фітнес-тренерки з вищою медичною освітою Анастасії Сич. Без обмежень в їжі, без зривів, за перевіреною системою. Старт 24.08.",
    url: "https://anastasiia-sych.vercel.app/mini-course/waist",
    siteName: "Анастасія Сич",
    type: "website",
  },
  alternates: {
    canonical: "https://anastasiia-sych.vercel.app/mini-course/waist",
  },
};

export default function WaistCoursePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center text-[#0284c7] font-bold">
          Завантаження курсу...
        </div>
      }
    >
      <WaistMiniCourseLanding />
    </Suspense>
  );
}
