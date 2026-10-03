"use client";

import { useMemo, useState, useTransition } from "react";
import { Modal } from "@/app/components/Modal";
import { IconPeso, IconPhone } from "@/app/components/icons";
import { queueableMarkPaid, useIsOnline } from "@/lib/offlineQueue";
import type { PlayerSessionWithPlayer } from "@/lib/types";

const peso = (n: number) => `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/**
 * "Payment" shortcut — collect from several players at once (e.g. one
 * person paying for their group). Step 1: tick players from the session's
 * unpaid list. Step 2: a breakdown of what each one owes and the total,
 * then mark them all paid via GCash or Cash in one tap.
 */
export function PayButton({ players }: { players: PlayerSessionWithPlayer[] }) {
  return (
    <Modal label="Payment" icon={<IconPeso className="h-4 w-4" />} title="Payment" size="sm">
      {(close) => <PayFlow players={players} onDone={close} />}
    </Modal>
  );
}

function PayFlow({ players, onDone }: { players: PlayerSessionWithPlayer[]; onDone: () => void }) {
  const isOnline = useIsOnline();
  const [step, setStep] = useState<"pick" | "breakdown">("pick");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPaying, startPaying] = useTransition();

  const unpaid = useMemo(
    () =>
      players
        .filter((ps) => ps.payment_method === null)
        .sort((a, b) => a.player.name.localeCompare(b.player.name)),
    [players]
  );
  const visible = unpaid.filter((ps) => ps.player.name.toLowerCase().includes(filter.trim().toLowerCase()));
  const chosen = unpaid.filter((ps) => selected.has(ps.id));
  const total = chosen.reduce((sum, ps) => sum + Number(ps.payable), 0);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function pay(method: "Cash" | "Gcash") {
    setError(null);
    startPaying(async () => {
      try {
        for (const ps of chosen) await queueableMarkPaid(isOnline, ps.id, method);
        onDone();
      } catch {
        setError("Couldn't save every payment — check the list and try again.");
      }
    });
  }

  if (unpaid.length === 0) {
    return <p className="py-6 text-center text-sm text-black/50">Everyone in this session has paid. 🎉</p>;
  }

  if (step === "pick") {
    return (
      <div className="space-y-3">
        <input
          type="search"
          placeholder="Search players…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-full rounded-lg border border-black/15 px-3 py-2 text-sm"
        />
        <ul className="max-h-[50vh] divide-y divide-black/5 overflow-y-auto rounded-lg border border-black/10">
          {visible.map((ps) => {
            const on = selected.has(ps.id);
            return (
              <li key={ps.id}>
                <label className={`flex cursor-pointer items-center gap-3 px-3 py-2.5 ${on ? "bg-brand-light" : ""}`}>
                  <input type="checkbox" checked={on} onChange={() => toggle(ps.id)} className="h-4 w-4 accent-[var(--color-brand)]" />
                  <span className="min-w-0 flex-1 truncate font-semibold">{ps.player.name}</span>
                  {!ps.done_for_session && (
                    <span className="flex-none rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                      Still playing
                    </span>
                  )}
                </label>
              </li>
            );
          })}
          {visible.length === 0 && <li className="px-3 py-4 text-center text-sm text-black/40">No match.</li>}
        </ul>
        <div className="flex items-center justify-between gap-2 border-t border-black/10 pt-3">
          <span className="text-sm text-black/50">{selected.size} selected</span>
          <button
            type="button"
            disabled={selected.size === 0}
            onClick={() => setStep("breakdown")}
            className="rounded-full btn-brand px-5 py-2 text-sm font-bold text-white disabled:opacity-40"
          >
            See breakdown
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ul className="divide-y divide-black/5 rounded-lg border border-black/10">
        {chosen.map((ps) => (
          <li key={ps.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
            <div className="min-w-0">
              <p className="truncate font-semibold">{ps.player.name}</p>
              <p className="text-xs text-black/45">
                {ps.total_games} game{ps.total_games === 1 ? "" : "s"}
                {ps.discount_percent > 0 && ` · ${ps.discount_percent}% off`}
                {!ps.done_for_session && " · still playing"}
              </p>
            </div>
            <span className="flex-none font-semibold">{peso(Number(ps.payable))}</span>
          </li>
        ))}
      </ul>

      <div className="flex items-center justify-between rounded-xl bg-brand-light px-4 py-3">
        <span className="text-sm font-semibold text-brand-dark">
          Total · {chosen.length} player{chosen.length === 1 ? "" : "s"}
        </span>
        <span className="text-2xl font-extrabold text-brand-dark">{peso(total)}</span>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={isPaying}
          onClick={() => pay("Gcash")}
          className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:opacity-50"
        >
          <IconPhone className="h-4 w-4" /> Paid via GCash
        </button>
        <button
          type="button"
          disabled={isPaying}
          onClick={() => pay("Cash")}
          className="flex items-center justify-center gap-2 rounded-xl bg-green-600 px-3 py-3 text-sm font-bold text-white transition hover:bg-green-700 disabled:opacity-50"
        >
          <IconPeso className="h-4 w-4" /> Paid via Cash
        </button>
      </div>
      <button
        type="button"
        disabled={isPaying}
        onClick={() => setStep("pick")}
        className="w-full text-center text-sm font-medium text-black/50 hover:text-brand"
      >
        ← Change selection
      </button>
    </div>
  );
}
