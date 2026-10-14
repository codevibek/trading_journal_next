"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon, { type IconName } from "./Icon";

const LINKS: { href: string; label: string; icon: IconName }[] = [
  { href: "/", label: "Home", icon: "home" },
  { href: "/news", label: "News", icon: "news" },
  { href: "/journal", label: "Journal", icon: "journal" },
  { href: "/insights", label: "Insights", icon: "insights" },
  { href: "/import", label: "Import", icon: "import" },
];

export default function Nav() {
  const path = usePathname();
  if (path === "/login") return null;
  const active = (href: string) => (href === "/" ? path === "/" : path.startsWith(href) && path !== "/journal/new");
  const tabs = [LINKS[0], LINKS[1], null, LINKS[2], LINKS[3]];

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-60 flex-col gap-6 border-r border-line bg-panel px-4 py-6 lg:flex">
        <Link href="/" className="flex items-center gap-2.5 px-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon-192.png" alt="" className="h-8 w-8 rounded-lg" />
          <span className="text-lg font-bold tracking-tight">Trade Desk</span>
        </Link>
        <Link href="/journal/new" className="btn-primary">
          <Icon name="plus" className="h-4 w-4" /> Log a trade
        </Link>
        <nav className="flex flex-col gap-1">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 font-medium ${active(l.href) ? "bg-brand-soft text-brand" : "text-muted hover:bg-raised hover:text-text"}`}
            >
              <Icon name={l.icon} />
              {l.label}
            </Link>
          ))}
        </nav>
      </aside>

      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-panel/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        <div className="grid grid-cols-5 items-end">
          {tabs.map((l) =>
            l ? (
              <Link
                key={l.href}
                href={l.href}
                className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium ${active(l.href) ? "text-brand" : "text-muted"}`}
              >
                <Icon name={l.icon} />
                {l.label}
              </Link>
            ) : (
              <Link key="log" href="/journal/new" aria-label="Log a trade" className="flex justify-center pb-2">
                <span className="-mt-5 flex h-13 w-13 items-center justify-center rounded-2xl bg-brand-strong text-white shadow-lg shadow-brand/30">
                  <Icon name="plus" className="h-6 w-6" />
                </span>
              </Link>
            ),
          )}
        </div>
      </nav>
    </>
  );
}
