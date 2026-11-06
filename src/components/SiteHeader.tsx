import Link from "next/link";
import { ConnectButton } from "./ConnectButton";
import { FlaresLeft } from "./FlaresLeft";

export function SiteHeader() {
  return (
    <header className="flex items-center justify-between gap-4 py-5">
      <Link href="/" className="flex items-center gap-2">
        <span className="font-mono text-lg text-signal">&gt;_</span>
        <span className="font-semibold tracking-tight">Night Shift</span>
      </Link>
      <nav className="flex items-center gap-2 sm:gap-4">
        <Link href="/report" className="hidden text-sm text-muted hover:text-ink sm:inline">
          Morning Report
        </Link>
        <FlaresLeft />
        <ConnectButton />
      </nav>
    </header>
  );
}
