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

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-3xl font-bold">HusProjekt</h1>

        <p className="mt-2 text-gray-600">
          Forbundet til Supabase som {user.email}
        </p>

        {error && (
          <div className="mt-8 rounded-lg bg-red-100 p-4 text-red-700">
            Databasefejl: {error.message}
          </div>
        )}

        {!error && (!memberships || memberships.length === 0) && (
          <div className="mt-8 rounded-lg bg-yellow-100 p-4">
            Forbindelsen virker, men der blev ikke fundet et hus til denne bruger.
          </div>
        )}

        {memberships?.map((membership: any) => {
          const house = membership.houses;

          if (!house) return null;

          return (
            <section
              key={membership.house_id}
              className="mt-8 rounded-xl bg-white p-6 shadow-sm"
            >
              <h2 className="text-2xl font-semibold">{house.name}</h2>

              <div className="mt-6 grid gap-6 md:grid-cols-2">
                {house.floors?.map((floor: any) => (
                  <div
                    key={floor.id}
                    className="rounded-lg border border-gray-200 p-5"
                  >
                    <h3 className="text-xl font-semibold">
                      {floor.name}
                    </h3>

                    <p className="mb-4 text-sm text-gray-500">
                      {floor.rooms?.length ?? 0} rum
                    </p>

                    <div className="space-y-2">
                      {floor.rooms?.map((room: any) => (
                        <div
                          key={room.id}
                          className="flex justify-between border-b py-2"
                        >
                          <span>{room.name}</span>

                          <span className="text-gray-500">
                            {room.area_m2
                              ? `${String(room.area_m2).replace(".", ",")} m²`
                              : ""}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}