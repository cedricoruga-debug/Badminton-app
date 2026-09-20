"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createAccount, deleteAccount, resetAccountPassword, updateAccountRole } from "@/app/users/actions";
import { IconKey, IconTrash } from "@/app/components/icons";
import type { Account, Role } from "@/lib/accounts";

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
  const [role, setRole] = useState<Role>("user");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const formData = new FormData();
    formData.set("username", username);
    formData.set("password", password);
    formData.set("role", role);
    const result = await createAccount(formData);
    setLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }
    setUsername("");
    setPassword("");
    setRole("user");
    onDone();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-xl bg-white p-4 shadow-soft">
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
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as Role)}
          className="w-full rounded border border-black/15 bg-white px-3 py-2 text-sm sm:w-auto"
        >
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </select>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="rounded btn-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
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
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);
  const [isUpdatingRole, startRoleTransition] = useTransition();
  const [roleError, setRoleError] = useState<string | null>(null);

  function handleRoleChange(role: Role) {
    setRoleError(null);
    startRoleTransition(async () => {
      const result = await updateAccountRole(account.id, role);
      if (result.error) {
        setRoleError(result.error);
        return;
      }
      onDone();
    });
  }

  return (
    <div className="rounded-xl bg-white p-4 shadow-soft">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate font-medium">
              {account.username}
              {isSelf && <span className="ml-2 text-xs text-black/40">(you)</span>}
            </p>
          </div>
          <p className="text-xs text-black/40">
            Added {new Date(account.createdAt).toLocaleDateString("en-US")}
          </p>
          {isSelf ? (
            <span
              className={`mt-1 inline-flex w-fit rounded-full px-2 py-0.5 text-[10px] font-medium ${
                account.role === "admin" ? "bg-brand-light text-brand" : "bg-black/5 text-black/50"
              }`}
            >
              {account.role === "admin" ? "Admin" : "User"}
            </span>
          ) : (
            <select
              value={account.role}
              disabled={isUpdatingRole}
              onChange={(e) => handleRoleChange(e.target.value as Role)}
              className="mt-1 rounded border border-black/15 bg-white px-1.5 py-0.5 text-[11px] disabled:opacity-50"
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          )}
          {roleError && <p className="mt-1 text-xs text-red-600">{roleError}</p>}
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
                  onClick={() =>
                    startDeleteTransition(async () => {
                      const result = await deleteAccount(account.id);
                      if (result.error) {
                        setDeleteError(result.error);
                        setConfirmingDelete(false);
                        return;
                      }
                      onDone();
                    })
                  }
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

      {deleteError && <p className="mt-2 text-xs text-red-600">{deleteError}</p>}

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
    const formData = new FormData();
    formData.set("password", password);
    const result = await resetAccountPassword(userId, formData);
    setLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }
    onDone();
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
          className="flex-none rounded btn-brand px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {loading ? "Saving…" : "Save"}
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </form>
  );
}
