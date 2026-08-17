import type { Metadata } from "next";
import "./globals.css";
import FacebookPixel from "@/components/FacebookPixel";
import Script from "next/script";

export const metadata: Metadata = {
  title: "Анастасія Сич | Персональна діагностика харчування та звичок",
  description: "Розберемо, чому дієти і марафони не дали довготривалого результату, і як побудувати стійкі здорові звички без жорстких заборон.",
  keywords: ["діагностика харчування", "Анастасія Сич", "схуднення без дієт", "здорові звички"],
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
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=League+Gothic&family=Montserrat:ital,wght@0,400;0,600;0,700;0,800;0,900;1,700&family=Outfit:wght@400;500;600;700;800;900&family=Source+Sans+3:ital,wght@0,400;0,600;0,700;0,800;0,900;1,400;1,600;1,700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-[#f8fafc] text-[#0f172a] antialiased selection:bg-[#0284c7] selection:text-white">
        <FacebookPixel />
        <Script
          id="microsoft-clarity"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function(c,l,a,r,i,t,y){
                  c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                  t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                  y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
              })(window, document, "clarity", "script", "xwzlekapj3");
            `,
          }}
        />
        {children}
      </body>
    </html>
  );
}
