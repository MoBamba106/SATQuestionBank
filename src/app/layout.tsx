import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import { Analytics } from "@vercel/analytics/react";
import { NavShell } from "@/components/nav-shell";
import { SettingsProvider } from "@/components/settings-provider";
import { AuthProvider } from "@/components/auth-provider";
import { CSPostHogProvider, PostHogPageview } from "@/components/posthog-provider";
import { Suspense } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "SAT Nexus — SAT Question Bank and Practice",
  description:
    "Practice official SAT questions in the browser. Build quizzes, review mistakes, track progress, and sync with your account.",
  applicationName: "SAT Nexus",
  manifest: "/manifest.json",
  openGraph: {
    title: "SAT Nexus — SAT Question Bank and Practice",
    description: "Practice official SAT questions in the browser. Build quizzes, review mistakes, track progress, and sync with your account.",
    url: "https://satnexus.com",
    siteName: "SAT Nexus",
    images: [
      {
        url: "https://satnexus.com/sat-graph-3f5a3602.svg",
        width: 800,
        height: 600,
        alt: "SAT Nexus",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SAT Nexus — SAT Question Bank and Practice",
    description: "Practice official SAT questions in the browser. Build quizzes, review mistakes, track progress, and sync with your account.",
    images: ["https://satnexus.com/sat-graph-3f5a3602.svg"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#eadcc7" },
    { media: "(prefers-color-scheme: dark)", color: "#0d1726" },
  ],
};

const themeBootScript = `
try {
  const saved = JSON.parse(
    localStorage.getItem('sat-nexus-settings-v3')
      || localStorage.getItem('sat-nexus-settings-v2')
      || localStorage.getItem('sat-nexus-settings-v1')
      || '{}'
  );
  const root = document.documentElement;
  root.dataset.theme = saved.theme || 'light';
  root.dataset.fontScale = saved.fontScale || 'default';
  root.dataset.density = saved.compactMode ? 'compact' : 'comfortable';
  root.dataset.reduceMotion = saved.reducedMotion ? 'true' : 'false';
  root.dataset.expandPassages = saved.expandPassages ? 'true' : 'false';
} catch (_) {}
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body>
        <CSPostHogProvider>
          <Suspense fallback={null}>
            <PostHogPageview />
          </Suspense>
          <SettingsProvider>
            <AuthProvider>
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
            </AuthProvider>
          </SettingsProvider>
        </CSPostHogProvider>
        <Analytics />
      </body>
    </html>
  );
}
