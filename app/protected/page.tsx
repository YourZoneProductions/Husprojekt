import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Sidebar from "@/components/husprojekt/Sidebar";

export default async function ProtectedPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: memberships, error } = await supabase
    .from("house_members")
    .select(`
      house_id,
      houses (
        id,
        name,
        floors (
          id,
          name,
          rooms (
            id,
            name,
            area_m2
          )
        )
      )
    `)
    .eq("user_id", user.id);

  if (error) {
    return (
      <main className="p-8">
        <h1 className="text-2xl font-bold">HusProjekt</h1>
        <p className="mt-4 text-red-600">
          Kunne ikke hente huset: {error.message}
        </p>
      </main>
    );
  }

  const house = memberships?.[0]?.houses;

  if (!house || Array.isArray(house)) {
    return (
      <main className="p-8">
        <h1 className="text-2xl font-bold">HusProjekt</h1>
        <p className="mt-2 text-gray-600">
          Der blev ikke fundet et hus.
        </p>
      </main>
    );
  }

  const floors = [...(house.floors ?? [])].sort((a, b) => {
    if (a.name === "Stueetage") return -1;
    if (b.name === "Stueetage") return 1;
    return a.name.localeCompare(b.name, "da");
  });

  const roomCount = floors.reduce(
    (total, floor) => total + (floor.rooms?.length ?? 0),
    0
  );

  return (
    <div className="min-h-screen bg-slate-50">

      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              HusProjekt
            </h1>

            <p className="text-xs text-slate-500">
              {house.name}
            </p>
          </div>

          <div className="text-xs text-slate-500">
            {user.email}
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl">

        <Sidebar floors={floors} />

        <main className="min-h-[calc(100vh-73px)] flex-1 border-l border-slate-200 bg-slate-50 p-8">

          <div className="mb-8">
            <p className="text-sm text-slate-500">
              Overblik
            </p>

            <h2 className="text-3xl font-bold text-slate-900">
              Velkommen til Husprojekt
            </h2>

            <p className="mt-2 text-slate-500">
              Her får du samlet overblik over husets projekter,
              økonomi og tidsplan.
            </p>
          </div>

          <div className="grid grid-cols-4 gap-4">

            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-sm text-slate-500">
                Aktive projekter
              </p>

              <p className="mt-2 text-3xl font-bold">
                0
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-sm text-slate-500">
                Budget
              </p>

              <p className="mt-2 text-3xl font-bold">
                0 kr.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-sm text-slate-500">
                Forbrugt
              </p>

              <p className="mt-2 text-3xl font-bold">
                0 kr.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-sm text-slate-500">
                Rum
              </p>

              <p className="mt-2 text-3xl font-bold">
                {roomCount}
              </p>
            </div>

          </div>

          <div className="mt-6 grid grid-cols-2 gap-6">

            <section className="rounded-xl border border-slate-200 bg-white p-6">

              <div className="flex items-center justify-between">

                <div>
                  <p className="text-sm text-slate-500">
                    Huset
                  </p>

                  <h3 className="text-xl font-semibold">
                    Plantegning
                  </h3>
                </div>

                <button className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
                  Vælg etage
                </button>

              </div>

              <div className="mt-5 flex h-64 items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50">

                <div className="text-center">
                  <p className="font-medium text-slate-600">
                    Plantegning kommer her
                  </p>

                  <p className="mt-1 text-sm text-slate-400">
                    Senere gør vi rummene klikbare
                  </p>
                </div>

              </div>

            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-6">

              <p className="text-sm text-slate-500">
                Projekter
              </p>

              <h3 className="text-xl font-semibold">
                Aktuelle projekter
              </h3>

              <div className="mt-5 rounded-xl bg-slate-50 p-8 text-center">

                <p className="font-medium text-slate-700">
                  Ingen aktive projekter endnu
                </p>

                <p className="mt-2 text-sm text-slate-500">
                  Her kommer fx Nyt køkken, Nyt badeværelse og Terrasse.
                </p>

                <button className="mt-5 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white">
                  + Nyt projekt
                </button>

              </div>

            </section>

          </div>

        </main>

      </div>

    </div>
  );
}