export function SetupRequired() {
  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <h1 className="text-xl font-semibold">Supabase isn&apos;t connected yet</h1>
      <p className="mt-3 text-sm text-black/70">
        Copy <code className="rounded bg-black/5 px-1 py-0.5">.env.local.example</code> to{" "}
        <code className="rounded bg-black/5 px-1 py-0.5">.env.local</code>, fill in your
        Supabase project URL and anon key, then run the SQL in{" "}
        <code className="rounded bg-black/5 px-1 py-0.5">supabase/schema.sql</code> from the
        Supabase SQL editor. See <code className="rounded bg-black/5 px-1 py-0.5">README.md</code>{" "}
        for the full walkthrough.
      </p>
    </div>
  );
}
