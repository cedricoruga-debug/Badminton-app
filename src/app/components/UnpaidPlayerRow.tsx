"use client";

import { useTransition } from "react";
import { cyclePaymentMethod } from "@/app/actions";
import { IconPeso } from "@/app/components/icons";
import type { PlayerSessionWithPlayer } from "@/lib/types";

/** Compact row for the slim "Unpaid" panel — tap the peso icon to mark paid. */
export function UnpaidPlayerRow({ ps }: { ps: PlayerSessionWithPlayer }) {
  const [isPending, startTransition] = useTransition();

  return (
    <li className="flex items-center justify-between border-b border-black/10 py-2.5 last:border-b-0">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{ps.player.name}</p>
        <p className="text-xs text-black/50">{ps.payable.toFixed(2)}</p>
      </div>
      <button
        disabled={isPending}
        title="Mark as paid: click to cycle GCash -> Cash"
        onClick={() => startTransition(() => cyclePaymentMethod(ps.id, ps.payment_method))}
        className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-black/10 text-black/50 transition-colors hover:bg-brand hover:text-white disabled:opacity-50"
      >
        <IconPeso className="h-3.5 w-3.5" />
      </button>
    </li>
  );
}
