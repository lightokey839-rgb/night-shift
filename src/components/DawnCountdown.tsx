"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function DawnCountdown({ dawn }: { dawn: string }) {
  const router = useRouter();
  const target = new Date(dawn).getTime();
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // At dawn, reload the page so the locked board gives way to the new night
  // and the link to the Morning Report appears.
  const reachedDawn = now !== null && now >= target;
  useEffect(() => {
    if (reachedDawn) router.refresh();
  }, [reachedDawn, router]);

  // Render nothing time-dependent until mounted, to avoid a hydration mismatch.
  if (now === null) return <span className="font-mono tabular-nums">--:--:--</span>;

  const left = Math.max(0, target - now);
  const h = Math.floor(left / 3_600_000);
  const m = Math.floor((left % 3_600_000) / 60_000);
  const s = Math.floor((left % 60_000) / 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return <span className="font-mono tabular-nums">{`${pad(h)}:${pad(m)}:${pad(s)}`}</span>;
}
