import Link from "next/link";

export default function ExitPage() {
  return (
    <main className="grid min-h-dvh place-items-center bg-paper px-5 text-ink">
      <section className="soft-card w-full max-w-md px-6 py-8 text-center">
        <p className="kicker">Between</p>
        <h1 className="mt-4 font-serif text-3xl">You have left the app.</h1>
        <p className="mt-4 text-muted">Your private journal stays on this browser.</p>
        <Link href="/" className="round-next mt-7 inline-flex">
          Return
        </Link>
      </section>
    </main>
  );
}
