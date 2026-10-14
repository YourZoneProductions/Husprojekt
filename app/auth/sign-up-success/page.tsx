import Link from "next/link";

export default function Page() {
  return <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
    <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6">
      <h1 className="text-2xl font-bold text-slate-900">Tjek din e-mail</h1>
      <p className="mt-4 text-sm text-slate-600">Hvis adressen kan oprettes, får du en mail med et bekræftelseslink. Åbn linket for at aktivere brugeren. Tjek også spam.</p>
      <p className="mt-3 text-sm text-slate-600">Når du er logget ind, kan du oprette din egen bolig og tilføje rum, projekter og budgetter.</p>
      <Link href="/auth/login" className="mt-6 inline-block rounded-lg bg-slate-900 px-4 py-2 text-sm text-white">Til login</Link>
    </section>
  </main>;
}
