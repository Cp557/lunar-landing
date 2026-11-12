"use client";

import { useState } from "react";

export function HelloButton() {
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function callApi() {
    setLoading(true);
    try {
      const res = await fetch("/api/hello");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: { message: string } = await res.json();
      setMessage(data.message);
    } catch (err) {
      setMessage(`Error: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <button
        onClick={callApi}
        disabled={loading}
        className="rounded-full bg-foreground px-6 py-3 font-medium text-background transition-opacity hover:opacity-80 disabled:opacity-50"
      >
        {loading ? "Calling…" : "Call FastAPI"}
      </button>
      {message && <p className="font-mono text-sm">{message}</p>}
    </div>
  );
}
