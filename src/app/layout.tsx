import type { Metadata } from "next";
import { Toaster } from "sonner";
import { NavShell } from "@/components/nav-shell";
import { SettingsProvider } from "@/components/settings-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "SAT Nexus — SAT Question Bank and Practice",
  description:
    "Practice official SAT questions, build focused quizzes, review mistakes, and track your progress.",
};

const themeBootScript = `
try {
  const saved = JSON.parse(localStorage.getItem('sat-nexus-settings-v1') || '{}');
  const root = document.documentElement;
  root.dataset.theme = saved.theme || 'soft-paper';
  root.dataset.fontScale = saved.fontScale || 'default';
  root.dataset.density = saved.compactMode ? 'compact' : 'comfortable';
  root.dataset.reduceMotion = saved.reducedMotion ? 'true' : 'false';
} catch (_) {}
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="soft-paper" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body>
        <SettingsProvider>
          <NavShell>{children}</NavShell>
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                background: "var(--paper-raised)",
                border: "1px solid var(--line)",
                color: "var(--ink)",
                boxShadow: "0 10px 28px rgba(20,24,34,0.18)",
                borderRadius: "7px",
                fontFamily: "IBM Plex Sans, ui-sans-serif, system-ui, sans-serif",
              },
            }}
          />
        </SettingsProvider>
      </body>
    </html>
  );
}
