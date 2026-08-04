import { Suspense } from "react";
import DiagnosticLanding from "@/components/DiagnosticLanding";
import { Metadata } from "next";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ o?: string }>;
}): Promise<Metadata> {
  const params = await searchParams;
  const offer = params?.o;

  let title = "Розберемо чому після закінчення марафону зникає мотивація, а разом з нею і результат | Анастасія Сич";
  let description =
    "Запрошую вас на діагностику, де ми розберемо, чому здорове харчування стало для вас випробуванням, а не способом життя, і як змінити це без жорстких заборон.";

  if (offer === "2") {
    title = "Чому ви знову набираєте вагу після схуднення? | Анастасія Сич";
    description =
      "На діагностиці я знайду, де саме ваша система дає збій, і покажу, як побудувати результат, який залишиться з вами.";
  } else if (offer === "3") {
    title = "Марафон закінчився, мотивація зникла, а старі звички повернулися? | Анастасія Сич";
    description =
      "На діагностиці знайдемо, чому тимчасові рішення не працюють саме для вас. І що потрібно змінити, щоб результат залишався з вами.";
  }

  const pageUrl = `https://anastasiia-sych.vercel.app/diagnostic${offer ? `?o=${offer}` : ""}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: pageUrl,
      siteName: "Анастасія Сич",
      type: "website",
    },
    alternates: {
      canonical: pageUrl,
    },
  };
}

export default function DiagnosticPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center text-[#0284c7] font-bold">
          Завантаження...
        </div>
      }
    >
      <DiagnosticLanding />
    </Suspense>
  );
}
