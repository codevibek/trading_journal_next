import type { Metadata, Viewport } from "next";
import "@fontsource-variable/plus-jakarta-sans";
import "./globals.css";
import Nav from "@/components/Nav";
import SetupGate from "@/components/SetupGate";

export const metadata: Metadata = {
  title: "Trade Desk",
  description: "Morning news briefing and BTC trade journal",
  appleWebApp: { capable: true, title: "Trade Desk", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f7fb" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1115" },
  ],
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full font-sans">
        <Nav />
        <div className="lg:pl-60">
          <main className="mx-auto w-full max-w-5xl px-4 pt-6 pb-32 sm:px-6 lg:px-10 lg:pt-10 lg:pb-16">
            <SetupGate>{children}</SetupGate>
          </main>
        </div>
      </body>
    </html>
  );
}
