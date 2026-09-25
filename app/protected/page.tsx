import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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
        <p className="mt-4">Der blev ikke fundet et hus.</p>
      </main>
    );
  }

  const floors = [...(house.floors ?? [])].sort((a, b) => {
    if (a.name === "Stueetage") return -1;
    if (b.name === "Stueetage") return 1;
    return a.name.localeCompare(b.name, "da");
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-white px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">HusProjekt</h1>
            <p className="text-sm text-slate-500">{house.name}</p>
          </div>

          <div className="text-sm text-slate-500">
            {user.email}
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl">
        <aside className="min-h-[calc(100vh-73px)] w-72 border-r bg-white p-5">
          <button className="mb-6 w-full rounded-lg bg-slate-900 px-4 py-3 text-left font-medium text-white">
            Overblik
          </button>

          <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Etager
          </div>

          <div className="space-y-5">
            {floors.map((floor) => (
              <div key={floor.id}>
                <div className="mb-2 flex items-center justify-between font-semibold text-slate-800">
                  <span>{floor.name}</span>
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-500">
                    {floor.rooms?.length ?? 0}
                  </span>
                </div>

                <div className="space-y-1">
                  {[...(floor.rooms ?? [])]
                    .sort((a, b) => a.name.localeCompare(b.name, "da"))
                    .map((room) => (
                      <button
                        key={room.id}
                        className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                      >
                        <span>{room.name}</span>

                        {room.area_m2 != null && (
                          <span className="text-xs text-slate-400">
                            {Number(room.area_m2).toLocaleString("da-DK")} m²
                          </span>
                        )}
                      </button>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </aside>

        <main className="flex-1 p-8">
          <div className="mb-8">
            <p className="text-sm font-medium text-slate-500">Overblik</p>
            <h2 className="mt-1 text-3xl font-bold text-slate-900">
              Velkommen til {house.name}
            </h2>
            <p className="mt-2 text-slate-500">
              Her får du samlet overblik over husets projekter, økonomi og tidsplan.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <div className="rounded-xl border bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">Aktive projekter</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">0</p>
            </div>

            <div className="rounded-xl border bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">Budget</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">0 kr.</p>
            </div>

            <div className="rounded-xl border bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">Forbrugt</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">0 kr.</p>
            </div>

            <div className="rounded-xl border bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">Rum</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">
                {floors.reduce(
                  (total, floor) => total + (floor.rooms?.length ?? 0),
                  0
                )}
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <section className="min-h-80 rounded-xl border bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Huset</p>
                  <h3 className="text-xl font-semibold text-slate-900">
                    Plantegning
                  </h3>
                </div>

                <button className="rounded-lg border px-3 py-2 text-sm">
                  Vælg etage
                </button>
              </div>

              <div className="mt-6 flex min-h-56 items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50">
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

            <section className="min-h-80 rounded-xl border bg-white p-6 shadow-sm">
              <p className="text-sm text-slate-500">Projekter</p>
              <h3 className="text-xl font-semibold text-slate-900">
                Aktuelle projekter
              </h3>

              <div className="mt-6 rounded-xl bg-slate-50 p-6 text-center">
                <p className="font-medium text-slate-700">
                  Ingen aktive projekter endnu
                </p>
                <p className="mt-1 text-sm text-slate-500">
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