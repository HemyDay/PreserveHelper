export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-6 py-16 font-sans text-zinc-950">
      <section className="w-full max-w-xl rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm sm:p-12">
        <p className="text-sm font-semibold tracking-wide text-blue-700">
          NEXT.JS + TAILWIND CSS
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
          Votre projet est prêt.
        </h1>
        <p className="mt-4 text-lg leading-8 text-zinc-600">
          Modifiez{" "}
          <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-base">
            src/app/page.tsx
          </code>{" "}
          pour commencer à créer votre application.
        </p>
        <a
          className="mt-8 inline-flex rounded-lg bg-zinc-950 px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-zinc-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
          href="https://nextjs.org/docs"
          target="_blank"
          rel="noreferrer"
        >
          Consulter la documentation
        </a>
      </section>
    </main>
  );
}
