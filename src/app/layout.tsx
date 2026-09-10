import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { SURVEY_INTRO, SURVEY_TITLE } from "@/lib/questions";
import "./globals.css";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: SURVEY_TITLE,
  description: SURVEY_INTRO,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${geist.variable} font-sans antialiased`}>{children}</body>
    </html>
  );
}
