import type { Metadata } from "next";
import type { ReactNode } from "react";
import { RegisterSW } from "@/components/register-sw";
import { StoreProvider } from "@/lib/store";
import "./globals.css";

export const metadata: Metadata = {
  title: "Between",
  description: "Your therapist works with you once a week. We work with you every day.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full font-sans">
        <StoreProvider>
          <RegisterSW />
          {children}
        </StoreProvider>
      </body>
    </html>
  );
}
