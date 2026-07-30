import { Suspense } from "react";
import DiagnosticLanding from "@/components/DiagnosticLanding";

export const metadata = {
  title: "Персональна діагностика | Анастасія Сич",
  description: "60-хвилинна персональна онлайн-діагностика харчування, звичок та причин зривів від медичного фахівця Анастасії Сич.",
};

export default function DiagnosticPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0b0f17] flex items-center justify-center text-[#ffdc82]">
        Завантаження...
      </div>
    }>
      <DiagnosticLanding />
    </Suspense>
  );
}
