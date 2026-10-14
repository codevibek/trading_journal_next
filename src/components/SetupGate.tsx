"use client";

import { usePathname } from "next/navigation";
import { useSetup } from "@/hooks/useSetup";
import Icon from "./Icon";

const STEPS = [
  { title: "Create a free database", body: <>Sign up at <a href="https://neon.tech" target="_blank" rel="noreferrer" className="font-medium text-brand underline">neon.tech</a> and create a project. Any region close to you is fine.</> },
  { title: "Copy the connection string", body: <>On the project dashboard, choose <b>Connect</b> and copy the string that starts with <code className="rounded bg-raised px-1">postgresql://</code>.</> },
  {
    title: "Add it to .env.local",
    body: (
      <>
        In the project folder, create a file called <code className="rounded bg-raised px-1">.env.local</code> containing:
        <pre className="mt-2 overflow-x-auto rounded-lg bg-raised p-3 text-xs">DATABASE_URL=postgresql://…</pre>
      </>
    ),
  },
  { title: "Restart the app", body: <>Stop <code className="rounded bg-raised px-1">npm run dev</code> with Ctrl+C, start it again, and refresh this page. Tables are created automatically.</> },
];

export default function SetupGate({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const setup = useSetup();

  if (path === "/login" || setup.checking || setup.ready) return children;

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-5 py-6">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-soft text-brand">
        <Icon name="database" className="h-6 w-6" />
      </span>
      {setup.configured ? (
        <>
          <h1 className="text-2xl font-bold tracking-tight">Can&apos;t reach the database</h1>
          <p className="text-muted">The connection string in .env.local didn&apos;t work. Check it was copied in full, then restart the app.</p>
          <pre className="card overflow-x-auto p-4 text-sm text-loss">{setup.error}</pre>
        </>
      ) : (
        <>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Connect a database to get started</h1>
            <p className="mt-1 text-muted">Trade Desk keeps your trades and news in a free Postgres database, so your phone and laptop see the same journal. This takes about two minutes.</p>
          </div>
          <ol className="flex flex-col gap-3">
            {STEPS.map((s, i) => (
              <li key={s.title} className="card flex gap-4 p-4">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-strong text-sm font-bold text-white">{i + 1}</span>
                <div>
                  <p className="font-semibold">{s.title}</p>
                  <div className="mt-1 text-sm text-muted">{s.body}</div>
                </div>
              </li>
            ))}
          </ol>
        </>
      )}
    </div>
  );
}
