import { Suspense } from "react";
import FlatBellyLanding from "@/components/FlatBellyLanding";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Зроби плаский живіт та струнку талію всього за 20 хвилин на день | Анастасія Сич",
  description:
    "Без страху зʼїсти щось «не те», без тренувань після яких неможливо підвестись на ноги, за чіткою системою від фітнес тренерки Анастасії Сич. СТАРТ 24.08.",
  openGraph: {
    title: "Зроби плаский живіт та струнку талію всього за 20 хвилин на день | Анастасія Сич",
    description:
      "Без страху зʼїсти щось «не те», без тренувань після яких неможливо підвестись на ноги, за чіткою системою від фітнес тренерки Анастасії Сич. СТАРТ 24.08.",
    url: "https://anastasiia-sych.vercel.app/mini-course/flat-belly",
    siteName: "Анастасія Сич",
    type: "website",
  },
  alternates: {
    canonical: "https://anastasiia-sych.vercel.app/mini-course/flat-belly",
  },
};

export default function FlatBellyPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#070607] flex items-center justify-center text-[#F01147] font-bold">
          Завантаження міні-курсу...
        </div>
      }
    >
      <FlatBellyLanding />
    </Suspense>
  );
}
