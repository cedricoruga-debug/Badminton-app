"use client";

import { useFormStatus } from "react-dom";

/**
 * A form's Save/Add button, disabled while its submission is in flight.
 *
 * Has to be its own component rather than inlined where the `<form>` is
 * rendered — `useFormStatus` only reports pending state to a *descendant*
 * of the form, not the component that renders the form itself. Without
 * this, a slow save could be clicked again before the first one finished,
 * creating duplicate rows (this is what was producing duplicate queued
 * games when saving was slow).
 */
export function SubmitButton({
  children,
  pendingLabel,
  className,
}: {
  children: React.ReactNode;
  /** Shown in place of `children` while the submission is in flight.
   * Defaults to `children` unchanged if omitted. */
  pendingLabel?: React.ReactNode;
  className: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={`${className} disabled:cursor-not-allowed disabled:opacity-60`}>
      {pending ? (pendingLabel ?? children) : children}
    </button>
  );
}
