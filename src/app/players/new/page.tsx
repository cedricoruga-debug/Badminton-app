import Link from "next/link";
import { createPlayer } from "@/app/actions";

export default function NewPlayerPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-lg font-semibold">New Player</h1>
        <Link href="/" className="text-sm text-black/50 hover:text-brand">
          Cancel
        </Link>
      </div>

      <form action={createPlayer} className="space-y-6">
        <div>
          <label className="mb-1 block text-sm font-medium text-brand">Name</label>
          <input
            type="text"
            name="name"
            required
            autoFocus
            className="w-full rounded border border-black/15 px-3 py-2 text-sm"
          />
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
            className="rounded btn-brand px-4 py-2 text-sm font-medium text-white"
          >
            Save
          </button>
        </div>
      </form>
    </div>
  );
}
