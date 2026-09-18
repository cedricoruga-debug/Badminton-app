"use client";

import { useState } from "react";
import { updateAppSettings } from "@/app/actions";
import { Modal } from "@/app/components/Modal";
import { IconSettings } from "@/app/components/icons";
import { createClient } from "@/lib/supabase/client";
import type { AppSettings } from "@/lib/types";

function ChangePasswordSection() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleChangePassword() {
    setError(null);
    setSuccess(false);

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }
    setSuccess(true);
    setNewPassword("");
    setConfirmPassword("");
  }

  return (
    <div className="space-y-3 border-t border-black/10 pt-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-brand">Change password</label>
        <p className="mb-2 text-xs text-black/40">Updates your own login password.</p>
      </div>
      <input
        type="password"
        placeholder="New password"
        autoComplete="new-password"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        className="w-full rounded border border-black/15 px-3 py-2 text-sm"
      />
      <input
        type="password"
        placeholder="Confirm new password"
        autoComplete="new-password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        className="w-full rounded border border-black/15 px-3 py-2 text-sm"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      {success && <p className="text-sm text-green-600">Password updated.</p>}
      <button
        type="button"
        disabled={loading || !newPassword || !confirmPassword}
        onClick={handleChangePassword}
        className="rounded bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-dark disabled:opacity-50"
      >
        {loading ? "Updating…" : "Update password"}
      </button>
    </div>
  );
}

export function SettingsButton({ settings }: { settings: AppSettings | null }) {
  return (
    <Modal
      label="Settings"
      icon={<IconSettings className="h-5 w-5" />}
      title="Settings"
      trigger={(open) => (
        <button
          type="button"
          onClick={open}
          title="Settings"
          aria-label="Settings"
          className="flex h-10 w-10 items-center justify-center rounded-lg text-black/50 transition-colors hover:bg-brand-light hover:text-brand"
        >
          <IconSettings className="h-5 w-5" />
        </button>
      )}
    >
      {(close) => (
        <div className="space-y-6">
        <form action={updateAppSettings} className="space-y-6">
          <div>
            <label className="mb-1 block text-sm font-medium text-brand">App icon</label>
            <p className="mb-2 text-xs text-black/40">Shown next to the app name in the header.</p>
            <div className="flex items-center gap-3">
              {settings?.app_icon_url ? (
                // eslint-disable-next-line @next/next/no-img-element -- user-uploaded image of unknown origin
                <img
                  src={settings.app_icon_url}
                  alt="Current app icon"
                  className="h-12 w-12 flex-none rounded-full border border-black/10 object-cover"
                />
              ) : (
                <div className="flex h-12 w-12 flex-none items-center justify-center rounded-full border border-dashed border-black/15 text-[10px] text-black/40">
                  None
                </div>
              )}
              <input
                type="file"
                name="app_icon"
                accept="image/*"
                className="w-full text-sm text-black/70 file:mr-3 file:rounded file:border-0 file:bg-brand-light file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-brand hover:file:bg-brand/20"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-brand">Payment QR code</label>
            <p className="mb-2 text-xs text-black/40">Shown on the dashboard for players to scan and pay.</p>
            <div className="flex items-center gap-3">
              {settings?.payment_qr_url ? (
                // eslint-disable-next-line @next/next/no-img-element -- user-uploaded image of unknown origin
                <img
                  src={settings.payment_qr_url}
                  alt="Current payment QR code"
                  className="h-12 w-12 flex-none rounded border border-black/10 object-cover"
                />
              ) : (
                <div className="flex h-12 w-12 flex-none items-center justify-center rounded border border-dashed border-black/15 text-[10px] text-black/40">
                  None
                </div>
              )}
              <input
                type="file"
                name="qr_code"
                accept="image/*"
                className="w-full text-sm text-black/70 file:mr-3 file:rounded file:border-0 file:bg-brand-light file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-brand hover:file:bg-brand/20"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-black/10 pt-4">
            <button
              type="button"
              onClick={close}
              className="rounded px-4 py-2 text-sm font-medium text-black/60 hover:bg-black/5"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark"
            >
              Save
            </button>
          </div>
        </form>

        <ChangePasswordSection />
        </div>
      )}
    </Modal>
  );
}


