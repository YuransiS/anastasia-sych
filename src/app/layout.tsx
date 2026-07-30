import type { Metadata } from "next";
import "./globals.css";
import FacebookPixel from "@/components/FacebookPixel";

export const metadata: Metadata = {
  title: "Анастасія Сич | Персональна діагностика харчування та звичок",
  description: "Розберемо, чому дієти і марафони не дали довготривалого результату, і як побудувати стійкі здорові звички без жорстких заборон.",
  keywords: ["діагностика харчування", "Анастасія Сич", "нутриціолог", "схуднення без дієт", "здорові звички"],
  openGraph: {
    title: "Анастасія Сич | Персональна діагностика",
    description: "Персональна діагностика 60 хвилин онлайн",
    locale: "uk_UA",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uk">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Carlito:ital,wght@0,400;0,700;1,400;1,700&family=Yeseva+One&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-[#0b0f17] text-[#e8ecf4] antialiased selection:bg-[#ffdc82] selection:text-[#0b0f17]">
        <FacebookPixel />
        {children}
      </body>
    </html>
  );
}
