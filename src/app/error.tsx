"use client";

import Link from "next/link";
import { useEffect } from "react";

// Any unexpected failure lands here instead of a blank page.
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-4 sm:px-6">
      <p className="font-mono text-xs uppercase tracking-widest text-amber-200">&gt;_ something went dark</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">A light went out on our side.</h1>
      <p className="mt-3 text-muted">The page couldn&apos;t load. Nothing you did caused it.</p>
      <div className="mt-6 flex gap-3">
        <button onClick={reset} className="rounded-xl bg-signal px-5 py-3 font-semibold text-night">
          Try again
        </button>
        <Link href="/" className="rounded-xl border border-line px-5 py-3">
          Tonight&apos;s board
        </Link>
      </div>
    </div>
  );
}
