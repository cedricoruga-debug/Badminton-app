import Link from "next/link";
import { createGame } from "@/app/actions";
import { getAllPlayers, getLatestSession } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function NewGamePage() {
  const session = await getLatestSession();
  const players = session ? await getAllPlayers() : [];

  if (!session) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center text-sm text-black/60">
        No session yet — create one in Supabase first.
      </div>
    );
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-lg font-semibold">Games Form</h1>
        <Link href="/" className="text-sm text-black/50 hover:text-brand">
          Cancel
        </Link>
      </div>

      <form action={createGame} className="space-y-6">
        <input type="hidden" name="session_id" value={session.id} />

        <div>
          <label className="mb-1 block text-sm font-medium text-brand">Date</label>
          <input
            type="date"
            name="game_date"
            defaultValue={today}
            required
            className="w-full rounded border border-black/15 px-3 py-2 text-sm"
          />
        </div>

        <fieldset>
          <legend className="mb-2 block text-sm font-medium">Status</legend>
          <div className="flex gap-2">
            <label className="flex-1">
              <input type="radio" name="status" value="Queued" defaultChecked className="peer sr-only" />
              <span className="block cursor-pointer rounded px-4 py-2 text-center text-sm font-medium text-black/60 peer-checked:bg-brand peer-checked:text-white">
                New
              </span>
            </label>
            <label className="flex-1">
              <input type="radio" name="status" value="Done" className="peer sr-only" />
              <span className="block cursor-pointer rounded bg-black/5 px-4 py-2 text-center text-sm font-medium text-black/60 peer-checked:bg-brand peer-checked:text-white">
                Done
              </span>
            </label>
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-2 block text-sm font-medium">New game (pick up to 4)</legend>
          <div className="flex flex-wrap gap-2">
            {players.map((p) => (
              <label key={p.id}>
                <input type="checkbox" name="player_id" value={p.id} className="peer sr-only" />
                <span className="block cursor-pointer rounded border border-black/15 px-3 py-1.5 text-sm text-black/70 peer-checked:border-brand peer-checked:bg-brand peer-checked:text-white">
                  {p.name}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="flex justify-end gap-2 border-t border-black/10 pt-4">
          <Link
            href="/"
            className="rounded px-4 py-2 text-sm font-medium text-black/60 hover:bg-black/5"
          >
            Cancel
          </Link>
          <button
            type="submit"
            className="rounded bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark"
          >
            Save
          </button>
        </div>
      </form>
    </div>
  );
}
