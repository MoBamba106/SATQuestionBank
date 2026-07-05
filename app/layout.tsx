import type { Metadata } from "next";
import "./globals.css";
import "katex/dist/katex.min.css";
import { Toaster } from "sonner";
import NavShell from "@/components/nav-shell";

export const metadata: Metadata = {
  title: "SAT NEXUS • Premium Question Bank",
  description: "Cyberpunk SAT question bank with OCR, analytics, Desmos, and spaced repetition.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body className="font-sans antialiased">
        <div className="relative min-h-screen">
          <div className="pointer-events-none fixed inset-0 bg-radial-glow opacity-[0.8]" />
          <NavShell>{children}</NavShell>
        </div>
        <Toaster richColors theme="dark" position="top-right" />
      </body>
    </html>
  );
}
