"use client";

import { useState, useTransition } from "react";
import { promoteToSuperAdmin, demoteToOwner } from "@/app/actions/admin";

type User = {
  id: string;
  email: string;
  role: string;
  shop_id: string;
  created_at: string;
  shopName: string;
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function RoleBadge({ role }: { role: string }) {
  const isAdmin = role === "superadmin";
  return (
    <span
      className="inline-block text-[11px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-lg"
      style={{
        background: isAdmin ? "var(--accent-dim)" : "var(--bg-elevated)",
        color: isAdmin ? "var(--accent)" : "var(--text-muted)",
      }}
    >
      {isAdmin ? "Superadmin" : "Owner"}
    </span>
  );
}

function UserRow({
  user,
  currentAdminId,
}: {
  user: User;
  currentAdminId: string;
}) {
  const [role, setRole] = useState(user.role);
  const [feedback, setFeedback] = useState("");
  const [isPending, startTransition] = useTransition();
  const isSelf = user.id === currentAdminId;

  function handleToggle() {
    const newRole = role === "superadmin" ? "owner" : "superadmin";

    startTransition(async () => {
      setFeedback("");
      const result =
        newRole === "superadmin"
          ? await promoteToSuperAdmin(user.id)
          : await demoteToOwner(user.id);

      if ("error" in result) {
        setFeedback(result.error);
      } else {
        setRole(newRole);
      }
    });
  }

  return (
    <tr
      className="border-b last:border-0"
      style={{ borderColor: "var(--border-color)" }}
    >
      <td className="px-5 py-3.5" style={{ color: "var(--text-primary)" }}>
        <p className="font-medium text-sm">{user.email}</p>
        {feedback && (
          <p
            className="text-xs mt-0.5"
            style={{
              color: feedback.includes("success") || !feedback.includes("Failed")
                ? "var(--success)"
                : "var(--danger)",
            }}
          >
            {feedback}
          </p>
        )}
      </td>
      <td className="px-5 py-3.5 text-sm" style={{ color: "var(--text-muted)" }}>
        {user.shopName}
      </td>
      <td className="px-5 py-3.5">
        <RoleBadge role={role} />
      </td>
      <td className="px-5 py-3.5 text-sm" style={{ color: "var(--text-muted)" }}>
        {formatDate(user.created_at)}
      </td>
      <td className="px-5 py-3.5">
        {isSelf ? (
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            You
          </span>
        ) : (
          <button
            onClick={handleToggle}
            disabled={isPending}
            className="text-xs font-semibold border px-3 py-1.5 rounded-lg transition-all disabled:opacity-50 active:scale-[0.97]"
            style={{
              borderColor: role === "superadmin" ? "var(--warning-border)" : "var(--accent-border)",
              color: role === "superadmin" ? "var(--warning)" : "var(--accent)",
              background: role === "superadmin" ? "var(--warning-dim)" : "var(--accent-dim)",
            }}
          >
            {isPending
              ? "Saving..."
              : role === "superadmin"
              ? "Demote to Owner"
              : "Make Admin"}
          </button>
        )}
      </td>
    </tr>
  );
}

export function UserTable({
  users,
  currentAdminId,
}: {
  users: User[];
  currentAdminId: string;
}) {
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "owner" | "superadmin">("all");

  const filtered = users.filter((u) => {
    const matchesQuery =
      u.email.toLowerCase().includes(query.toLowerCase()) ||
      u.shopName.toLowerCase().includes(query.toLowerCase());
    const matchesRole = roleFilter === "all" || u.role === roleFilter;
    return matchesQuery && matchesRole;
  });

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
            style={{ color: "var(--text-muted)" }}
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Search by email or shop name..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-xl border pl-10 pr-4 py-2.5 text-sm focus:outline-none transition-colors"
            style={{
              background: "var(--bg-surface)",
              borderColor: "var(--border-color)",
              color: "var(--text-primary)",
            }}
            onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
            onBlur={(e) => (e.target.style.borderColor = "var(--border-color)")}
          />
        </div>

        {/* Role filter */}
        <div className="flex gap-2">
          {(["all", "owner", "superadmin"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className="px-3 py-2.5 rounded-xl text-sm font-medium border transition-all"
              style={{
                background: roleFilter === r ? "var(--accent-dim)" : "var(--bg-surface)",
                borderColor: roleFilter === r ? "var(--accent-border)" : "var(--border-color)",
                color: roleFilter === r ? "var(--accent)" : "var(--text-muted)",
              }}
            >
              {r === "all" ? "All" : r === "superadmin" ? "Admins" : "Owners"}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div
        className="rounded-2xl border overflow-hidden bg-white"
        style={{ borderColor: "var(--border-color)" }}
      >
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-sm" style={{ color: "var(--text-muted)" }}>
            {users.length === 0 ? "No users yet." : "No users match your search."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr
                  className="border-b text-xs font-semibold uppercase tracking-wider"
                  style={{
                    borderColor: "var(--border-color)",
                    background: "var(--bg-elevated)",
                    color: "var(--text-muted)",
                  }}
                >
                  <th className="text-left px-5 py-3">Email</th>
                  <th className="text-left px-5 py-3">Shop</th>
                  <th className="text-left px-5 py-3">Role</th>
                  <th className="text-left px-5 py-3">Joined</th>
                  <th className="text-left px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((user) => (
                  <UserRow
                    key={user.id}
                    user={user}
                    currentAdminId={currentAdminId}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {filtered.length > 0 && (
        <p className="text-xs text-right" style={{ color: "var(--text-muted)" }}>
          Showing {filtered.length} of {users.length} users
        </p>
      )}
    </div>
  );
}
