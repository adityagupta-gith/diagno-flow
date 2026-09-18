import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Diagnostic AI - Clinical Triage Command Center",
  description: "Real-time AI-powered diagnostic triage dashboard built with Next.js, Amazon Bedrock & FastAPI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-[Plus_Jakarta_Sans] bg-[#070b12] text-slate-100 antialiased selection:bg-blue-500 selection:text-white min-h-screen flex flex-col">
        {children}
      </body>
    </html>
  );
}
