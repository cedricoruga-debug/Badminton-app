"use client";

import { useState, type ReactNode } from "react";
import { IconClose } from "@/app/components/icons";

/**
 * A shortcut icon that opens a popup dialog instead of navigating away.
 * `children` is a render-prop so the form inside can close the dialog itself
 * (e.g. a Cancel button) — submitting successfully triggers a redirect back
 * to "/", which naturally resets this component's open state too.
 *
 * By default the trigger is the icon-over-label button used in the dashboard
 * shortcuts grid. Pass `trigger` to render a different trigger element (e.g.
 * a plain square icon button for the side rail) — it receives an `open`
 * callback to wire up.
 *
 * `size` controls the dialog's width: "sm" for a compact form (a couple of
 * fields), "lg" (default) for longer ones.
 */
export function Modal({
  label,
  icon,
  title,
  children,
  trigger,
  size = "lg",
}: {
  label: string;
  icon: ReactNode;
  title: string;
  children: (close: () => void) => ReactNode;
  trigger?: (open: () => void) => ReactNode;
  size?: "sm" | "lg";
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {trigger ? (
        trigger(() => setOpen(true))
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex flex-col items-center gap-1"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full btn-brand text-white transition-transform hover:scale-105">
            {icon}
          </span>
          <span className="text-[10px] leading-tight text-black/60">{label}</span>
        </button>
      )}

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            data-modal-dialog
            className={`max-h-[85vh] w-full overflow-x-hidden overflow-y-auto rounded-lg bg-white shadow-xl ${
              size === "sm" ? "max-w-sm p-4" : "max-w-lg p-6"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative mb-5 flex items-center justify-center">
              <h2 className="text-lg font-semibold">{title}</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="absolute right-0 text-black/40 hover:text-brand"
              >
                <IconClose className="h-5 w-5" />
              </button>
            </div>
            {children(() => setOpen(false))}
          </div>
        </div>
      )}
    </>
  );
}
