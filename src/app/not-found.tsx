import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-4 pb-16 sm:px-6">
      <SiteHeader />
      <section className="pt-16">
        <p className="font-mono text-xs uppercase tracking-widest text-muted">&gt;_ 404</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Nothing scouted here.</h1>
        <p className="mt-3 text-muted">That page, project or scout doesn&apos;t exist.</p>
        <Link href="/" className="mt-6 inline-flex rounded-xl bg-signal px-5 py-3 font-semibold text-night">
          Tonight&apos;s board
        </Link>
      </section>
    </div>
  );
}
