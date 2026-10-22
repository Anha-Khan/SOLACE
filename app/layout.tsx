import type { Metadata } from "next";
import Script from "next/script";
import type { ReactNode } from "react";
import { RegisterSW } from "@/components/register-sw";
import "./globals.css";

export const metadata: Metadata = {
  title: "Between",
  description: "Your therapist works with you once a week. We work with you every day.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <Script
          id="time-theme"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html:
              '(function(){try{var saved=localStorage.getItem("between.time-theme");var preferred=window.matchMedia("(prefers-color-scheme: dark)").matches?"night":"day";document.documentElement.dataset.time=saved==="day"||saved==="night"?saved:preferred}catch(e){document.documentElement.dataset.time="day"}})();',
          }}
        />
      </head>
      <body className="min-h-full font-sans">
        <RegisterSW />
        {children}
      </body>
    </html>
  );
}
