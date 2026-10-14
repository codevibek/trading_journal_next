"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Briefing", icon: "M4 12h3l2-6 4 12 2-6h5" },
  { href: "/journal", label: "Journal", icon: "M6 4h10l2 2v14H6zM9 9h6M9 13h6M9 17h3" },
  { href: "/insights", label: "Insights", icon: "M5 19V11M10 19V5M15 19v-6M20 19V8" },
  { href: "/import", label: "Import", icon: "M12 4v11m0 0-4-4m4 4 4-4M5 20h14" },
];

export default function Nav() {
  const path = usePathname();
  if (path === "/login") return null;
  const active = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));

  return (
    <>
      <header className="hidden border-b border-line bg-panel sm:block">
        <div className="mx-auto flex max-w-3xl items-center gap-6 px-4 py-3">
          <span className="font-semibold">Trade Desk</span>
          <nav className="flex gap-1">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-md px-3 py-1.5 text-sm ${active(l.href) ? "bg-raised font-medium" : "text-muted hover:text-text"}`}
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-panel pb-[env(safe-area-inset-bottom)] sm:hidden">
        <div className="grid grid-cols-4">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`flex flex-col items-center gap-1 py-2.5 text-xs ${active(l.href) ? "text-amber" : "text-muted"}`}
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d={l.icon} />
              </svg>
              {l.label}
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}
