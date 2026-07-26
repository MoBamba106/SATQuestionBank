import type { Metadata } from "next";
import { Toaster } from "sonner";
import { NavShell } from "@/components/nav-shell";
import "./globals.css";

export const metadata: Metadata = {
  title: "SAT Nexus — SAT Question Bank and Practice",
  description:
    "Practice official SAT questions, build focused quizzes, review mistakes, and track your progress.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <NavShell>{children}</NavShell>
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: "#fffdfa",
              border: "1px solid #d4cfc3",
              color: "#25282c",
              boxShadow: "0 10px 28px rgba(37,40,44,0.16)",
              borderRadius: "7px",
              fontFamily: "IBM Plex Sans, ui-sans-serif, system-ui, sans-serif",
            },
          }}
        />
      </body>
    </html>
  );
}
