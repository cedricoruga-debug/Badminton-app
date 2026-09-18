"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createAccount, deleteAccount, resetAccountPassword } from "@/app/users/actions";
import { IconKey, IconTrash } from "@/app/components/icons";
import type { Account } from "@/lib/accounts";

export function UsersManager({
  accounts,
  currentUserId,
}: {
  accounts: Account[];
  currentUserId: string;
}) {
  const router = useRouter();

  return (
    <div className="space-y-6">
      <AddAccountForm onDone={() => router.refresh()} />

      <div className="space-y-2">
        {accounts.length === 0 ? (
          <p className="text-sm text-black/40">No accounts yet.</p>
        ) : (
          accounts.map((a) => (
            <AccountRow
              key={a.id}
              account={a}
              isSelf={a.id === currentUserId}
              onDone={() => router.refresh()}
            />
          ))
        )}
      </div>
    </div>
  );
}

function AddAccountForm({ onDone }: { onDone: () => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const formData = new FormData();
      formData.set("username", username);
      formData.set("password", password);
      await createAccount(formData);
      setUsername("");
      setPassword("");
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-xl bg-white p-4 shadow-sm">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-black/40">Add account</h3>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          placeholder="Username"
          autoCapitalize="none"
          autoCorrect="off"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          className="w-full rounded border border-black/15 px-3 py-2 text-sm"
        />
        <input
          type="password"
          placeholder="Password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full rounded border border-black/15 px-3 py-2 text-sm"
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="rounded bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-dark disabled:opacity-50"
      >
        {loading ? "Adding…" : "Add account"}
      </button>
    </form>
  );
}

function AccountRow({
  account,
  isSelf,
  onDone,
}: {
  account: Account;
  isSelf: boolean;
  onDone: () => void;
}) {
  const [isDeleting, startDeleteTransition] = useTransition();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [resetting, setResetting] = useState(false);

  return (
    <div className="rounded-xl bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-medium">
            {account.username}
            {isSelf && <span className="ml-2 text-xs text-black/40">(you)</span>}
          </p>
          <p className="text-xs text-black/40">
            Added {new Date(account.createdAt).toLocaleDateString("en-US")}
          </p>
        </div>
        <div className="flex flex-none items-center gap-1">
          <button
            type="button"
            onClick={() => setResetting((v) => !v)}
            title="Reset password"
            aria-label="Reset password"
            className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
              resetting ? "bg-brand-light text-brand" : "text-black/50 hover:bg-brand-light hover:text-brand"
            }`}
          >
            <IconKey className="h-4 w-4" />
          </button>

          {!isSelf &&
            (confirmingDelete ? (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => startDeleteTransition(() => deleteAccount(account.id).then(onDone))}
                  className="rounded bg-red-500 px-2 py-1 text-[10px] font-medium text-white transition-colors hover:bg-red-600 disabled:opacity-50"
                >
                  Delete
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(false)}
                  className="rounded px-1.5 py-1 text-[10px] font-medium text-black/50 hover:bg-black/5"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={isDeleting}
                title="Delete account"
                aria-label="Delete account"
                onClick={() => setConfirmingDelete(true)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-black/50 transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
              >
                <IconTrash className="h-4 w-4" />
              </button>
            ))}
        </div>
      </div>

      {resetting && (
        <ResetPasswordForm
          userId={account.id}
          onDone={() => {
            setResetting(false);
            onDone();
          }}
        />
      )}
    </div>
  );
}

function ResetPasswordForm({ userId, onDone }: { userId: string; onDone: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const formData = new FormData();
      formData.set("password", password);
      await resetAccountPassword(userId, formData);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 border-t border-black/10 pt-3">
      <div className="flex items-center gap-2">
        <input
          type="password"
          placeholder="New password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full rounded border border-black/15 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={loading}
          className="flex-none rounded bg-brand px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-dark disabled:opacity-50"
        >
          {loading ? "Saving…" : "Save"}
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </form>
  );
}
