import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import HouseApp from "@/components/husprojekt/HouseApp";

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

      <div className="mx-auto max-w-7xl">
        <HouseApp floors={floors} houseId={house.id} />
      </div>
    </div>
  );
}