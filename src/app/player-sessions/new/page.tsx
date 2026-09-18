import Link from "next/link";
import { addPlayerToSession } from "@/app/actions";
import { getAllPlayers, getLatestSession, getPlayerSessions } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function NewPlayerSessionPage() {
  const session = await getLatestSession();
  if (!session) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center text-sm text-black/60">
        No session yet — create one in Supabase first.
      </div>
    );
  }

  const [players, existing] = await Promise.all([getAllPlayers(), getPlayerSessions(session.id)]);
  const existingIds = new Set(existing.map((ps) => ps.player_id));
  const available = players.filter((p) => !existingIds.has(p.id));

  return (
    <div className="mx-auto max-w-md px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-lg font-semibold">PlayerSessions Form</h1>
        <Link href="/" className="text-sm text-black/50 hover:text-brand">
          Cancel
        </Link>
      </div>

      {available.length === 0 ? (
        <p className="text-sm text-black/50">
          Every active player is already in this session.
        </p>
      ) : (
        <form action={addPlayerToSession} className="space-y-6">
          <input type="hidden" name="session_id" value={session.id} />
          <div>
            <label className="mb-1 block text-sm font-medium text-brand">Player</label>
            <select
              name="player_id"
              required
              defaultValue=""
              className="w-full rounded border border-black/15 px-3 py-2 text-sm"
            >
              <option value="" disabled>
                Select a player
              </option>
              {available.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

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
      )}
    </div>
  );
}
