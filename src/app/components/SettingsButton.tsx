"use client";

import { useState } from "react";
import { updateAppSettings } from "@/app/actions";
import { Modal } from "@/app/components/Modal";
import { IconSettings, IconSport } from "@/app/components/icons";
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
        className="rounded btn-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {loading ? "Updating…" : "Update password"}
      </button>
    </div>
  );
}

/** The club's picture (uploaded icon, or the sport mark as a fallback). */
export function ClubAvatar({ club, className = "h-9 w-9" }: { club: AppSettings | null; className?: string }) {
  return (
    <span
      className={`flex flex-none items-center justify-center overflow-hidden rounded-full bg-brand text-white ring-2 ring-brand/30 ${className}`}
    >
      {club?.app_icon_url ? (
        // eslint-disable-next-line @next/next/no-img-element -- user-uploaded image of unknown origin
        <img src={club.app_icon_url} alt="" className="h-full w-full object-cover" />
      ) : (
        <IconSport sport={club?.sport} className="h-1/2 w-1/2" />
      )}
    </span>
  );
}

/**
 * The club profile — the club's picture at the top of the nav (above Home),
 * opening a popup with the club's name, sport and your role. Admins also
 * get the club settings here (name, sport, picture, payment QR); everyone
 * can change their own password.
 */
export function SettingsButton({ settings, isAdmin }: { settings: AppSettings | null; isAdmin: boolean }) {
  return (
    <Modal
      label="Club profile"
      icon={<IconSettings className="h-5 w-5" />}
      title="Club profile"
      trigger={(open) => (
        <button
          type="button"
          onClick={open}
          title={settings?.name ? `${settings.name} — club profile` : "Club profile"}
          aria-label="Club profile"
          className="flex h-10 w-10 items-center justify-center rounded-full transition-transform hover:scale-105"
        >
          <ClubAvatar club={settings} />
        </button>
      )}
    >
      {(close) => (
        <div className="space-y-6">
        <div className="flex items-center gap-3">
          <ClubAvatar club={settings} className="h-14 w-14" />
          <div className="min-w-0">
            <p className="text-[11px] font-extrabold uppercase tracking-widest text-brand">KRO5</p>
            <p className="truncate text-lg font-extrabold text-brand-dark">{settings?.name ?? "Your club"}</p>
            <p className="text-xs text-black/50">
              {settings?.sport === "pickleball" ? "Pickleball" : "Badminton"} club · You&apos;re {isAdmin ? "an admin" : "a member"}
            </p>
          </div>
        </div>

        {isAdmin && (
        <form action={updateAppSettings} className="space-y-6 border-t border-black/10 pt-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-brand">Club name</label>
            <p className="mb-2 text-xs text-black/40">Shown in the header and on your players&apos; join page.</p>
            <input
              type="text"
              name="club_name"
              maxLength={60}
              defaultValue={settings?.name ?? ""}
              className="w-full rounded border border-black/15 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-brand">Sport</label>
            <p className="mb-2 text-xs text-black/40">
              Changes the wording, score hints, court drawing and how the {settings?.sport === "pickleball" ? "ball" : "shuttle"} cost is split.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {(["badminton", "pickleball"] as const).map((sport) => (
                <label
                  key={sport}
                  className="flex cursor-pointer items-center gap-2 rounded-lg border border-black/15 px-3 py-2 text-sm font-medium has-[:checked]:border-brand has-[:checked]:bg-brand-light has-[:checked]:text-brand"
                >
                  <input
                    type="radio"
                    name="sport"
                    value={sport}
                    defaultChecked={(settings?.sport ?? "badminton") === sport}
                    className="sr-only"
                  />
                  <IconSport sport={sport} className="h-4 w-4" />
                  {sport === "badminton" ? "Badminton" : "Pickleball"}
                </label>
              ))}
            </div>
          </div>

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
              className="rounded btn-brand px-4 py-2 text-sm font-medium text-white"
            >
              Save
            </button>
          </div>
        </form>
        )}

        <ChangePasswordSection />
        </div>
      )}
    </Modal>
  );
}


