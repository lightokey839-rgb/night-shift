"use client";

import { useState } from "react";

// Native share sheet where available, otherwise copy the link. Plus a post-to-X link.
export function ShareButton({ title, path }: { title: string; path: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = new URL(path, window.location.origin).toString();
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        // Cancelled or unsupported: fall back to copying.
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy this link", url);
    }
  }

  const tweet = () => {
    const url = new URL(path, window.location.origin).toString();
    const text = `${title} 🌙 via Night Shift`;
    window.open(
      `https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  return (
    <div className="flex flex-wrap gap-2">
      <button onClick={share} className="rounded-xl border border-line px-4 py-2 text-sm hover:border-signal">
        {copied ? "Link copied" : "Share"}
      </button>
      <button onClick={tweet} className="rounded-xl border border-line px-4 py-2 text-sm hover:border-signal">
        Post on X
      </button>
    </div>
  );
}
