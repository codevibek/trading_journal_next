"use client";

import { useState } from "react";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setBusy(false);
    if (res.ok) window.location.href = "/";
    else setError((await res.json()).error);
  };

  return (
    <form onSubmit={submit} className="mx-auto mt-24 flex max-w-xs flex-col gap-3">
      <h1 className="text-2xl font-semibold">Trade Desk</h1>
      <input
        type="password"
        autoFocus
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        className="rounded-lg border border-line bg-panel px-3 py-2.5"
      />
      {error && <p className="text-sm text-loss">{error}</p>}
      <button disabled={busy} className="rounded-lg bg-amber py-2.5 font-medium text-bg disabled:opacity-60">
        Sign in
      </button>
    </form>
  );
}
