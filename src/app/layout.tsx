import type { Metadata } from "next";
import { Toaster } from "sonner";
import { NavShell } from "@/components/nav-shell";
import "./globals.css";

export const metadata: Metadata = {
  title: "SAT Nexus — Official Question Bank & Bluebook Practice",
  description:
    "3,444 official College Board SAT questions, 9 full-length Bluebook practice tests, mistake tracking, and collections — all in a Soft Paper theme.",
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
              background: "#fffdf8",
              border: "1px solid #e2dbc9",
              color: "#2b2b2a",
              boxShadow: "0 10px 30px rgba(60,45,20,0.14)",
              borderRadius: "14px",
            },
          }}
        />
      </body>
    </html>
  );
}
