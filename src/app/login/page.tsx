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
    if (res.ok) window.location.assign("/");
    else setError((await res.json()).error);
  };

  return (
    <form onSubmit={submit} className="card mx-auto mt-16 flex max-w-sm flex-col gap-4 p-6">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icon-192.png" alt="" className="h-12 w-12 rounded-xl" />
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Trade Desk</h1>
        <p className="text-sm text-muted">Enter your password to continue.</p>
      </div>
      <input type="password" autoFocus value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="field" />
      {error && <p className="text-sm text-loss">{error}</p>}
      <button disabled={busy} className="btn-primary py-3">Sign in</button>
    </form>
  );
}
