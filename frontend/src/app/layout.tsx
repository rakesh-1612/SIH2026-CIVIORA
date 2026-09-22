import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { AuthProvider } from "@/lib/auth";
import { LanguageProvider } from "@/lib/LanguageContext";

import { PageTransitionWrapper } from "@/components/animations/PageTransitionWrapper";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CIVIORA — Civic Intelligence Platform",
  description: "Digital platform connecting citizens' societal challenges with universities, experts, industry partners, and administrators.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="light">
      <body className={`${inter.className} bg-[#F8FAFC] text-[#172033] min-h-screen flex flex-col antialiased selection:bg-indigo-600 selection:text-white`}>
        <LanguageProvider>
          <AuthProvider>
            <ToastProvider>
              <Navbar />
              <main className="flex-1">
                <PageTransitionWrapper>
                  {children}
                </PageTransitionWrapper>
              </main>
              <Footer />
            </ToastProvider>
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}

