import { AnimateIcon } from "@animate-ui/react/icons";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { userService } from "../../features/users";
import { ApiError } from "../../services/api";
import { useAuthStore } from "../../store/authStore";
import { EmptyState, ErrorState, Spinner } from "../../components/ui/Status";
import { ArrowLeft } from "@/components/animate-ui/icons/arrow-left";
import { Check } from "@/components/animate-ui/icons/check";
import { LoaderCircle } from "@/components/animate-ui/icons/loader-circle";
import { Trash2 } from "@/components/animate-ui/icons/trash-2";
import { ConfirmationDialog } from "../../components/ui/ConfirmationDialog";
import type { AuthUser } from "../../features/auth";
import "./admin.css";

const statusLabels: Record<string, string> = {
  active: "Active",
  disabled: "Disabled",
  pending_approval: "Pending approval",
};

export function AdminUsersPage() {
  const me = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [action, setAction] = useState<{ type: "approve" | "delete"; user: AuthUser } | null>(null);

  const users = useQuery({
    queryKey: ["admin-users"],
    queryFn: userService.list,
  });

  const copyUpdated = (updated: AuthUser) => {
    void queryClient.setQueryData<AuthUser[]>(["admin-users"], (existing) =>
      existing?.map((user) => (user.id === updated.id ? updated : user)),
    );
  };

  const copyRemoved = (id: string) => {
    void queryClient.setQueryData<AuthUser[]>(["admin-users"], (existing) =>
      existing?.filter((user) => user.id !== id),
    );
  };

  const approve = useMutation({
    mutationFn: (userId: string) => userService.approve(userId),
    onSuccess: copyUpdated,
    onError: (err) => setError(err instanceof ApiError ? err.message : "Could not approve the user."),
  });

  const remove = useMutation({
    mutationFn: (userId: string) => userService.remove(userId),
    onSuccess: (_data, userId) => copyRemoved(userId),
    onError: (err) => setError(err instanceof ApiError ? err.message : "Could not delete the user."),
  });

  return (
    <>
      <main className="admin-page">
        <div className="admin__layout">
          <div className="admin__heading">
            <h2>Manage users<span className="brand__dot">.</span></h2>
            <AnimateIcon animateOnHover asChild>
              <Link to="/" className="admin__back"><ArrowLeft size={16} aria-hidden="true" /> Back to feed</Link>
            </AnimateIcon>
          </div>

          {error ? <ErrorState message={error} onRetry={() => setError(null)} /> : null}

          {users.isLoading ? <Spinner label="Loading users…" /> : null}
          {users.isError ? (
            <ErrorState message="Could not load users." onRetry={() => void users.refetch()} />
          ) : null}

          {!users.isLoading && !users.isError && users.data?.length === 0 ? (
            <EmptyState title="No members yet" hint="New accounts appear here once they register." />
          ) : null}

          {users.data && users.data.length > 0 ? (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th scope="col">Username</th>
                    <th scope="col">Role</th>
                    <th scope="col">Status</th>
                    <th scope="col">Joined</th>
                    <th scope="col" aria-label="Actions"></th>
                  </tr>
                </thead>
                <tbody>
                  {users.data.map((user) => (
                    <AdminUserRow
                      key={user.id}
                      user={user}
                      isSelf={user.id === me?.id}
                      isLoading={approve.isPending || remove.isPending || action !== null}
                      isApproving={approve.isPending && approve.variables === user.id}
                      isDeleting={remove.isPending && remove.variables === user.id}
                      onApprove={() => { setError(null); setAction({ type: "approve", user }); }}
                      onDelete={() => { setError(null); setAction({ type: "delete", user }); }}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      </main>
      {action ? (
        <ConfirmationDialog
          title={`${action.type === "approve" ? "Approve" : "Delete"} ${action.user.username}?`}
          danger={action.type === "delete"}
          onClose={() => setAction(null)}
          onConfirm={async () => {
            if (action.type === "approve") await approve.mutateAsync(action.user.id);
            else await remove.mutateAsync(action.user.id);
          }}
        >
          <p>{action.type === "approve"
            ? `Approve ${action.user.username} and activate their account so they can sign in?`
            : `Delete ${action.user.username}? Their account will be disabled and their sessions revoked.`}</p>
        </ConfirmationDialog>
      ) : null}
    </>
  );
}

interface RowProps {
  user: AuthUser;
  isSelf: boolean;
  /** Any moderation action in flight disables the row's buttons. */
  isLoading: boolean;
  /** Per-action flags keep the spinner on the exact row and button that started it. */
  isApproving: boolean;
  isDeleting: boolean;
  onApprove: () => void;
  onDelete: () => void;
}

function AdminUserRow({
  user, isSelf, isLoading, isApproving, isDeleting, onApprove, onDelete,
}: RowProps) {
  const isPending = user.status === "pending_approval";

  return (
    <tr>
      <td data-label="Username">{user.username}</td>
      <td data-label="Role">{user.role}</td>
      <td data-label="Status">
        <span className={`admin-badge admin-badge--${user.status}`}>{statusLabels[user.status] ?? user.status}</span>
      </td>
      <td data-label="Joined">{new Date(user.createdAt).toLocaleDateString()}</td>
      <td className="admin-table__actions" data-label="Actions">
        {isPending ? (
          <AnimateIcon animateOnHover asChild>
            <button
              type="button"
              className="btn btn--primary admin-icon-btn"
              disabled={isLoading}
              aria-busy={isApproving || undefined}
              aria-label={`Approve ${user.username}`}
              title={`Approve ${user.username}`}
              onClick={onApprove}
            >
              {isApproving ? <LoaderCircle animate={false} className="btn__spinner" aria-hidden="true" /> : <Check size={16} aria-hidden="true" />}
            </button>
          </AnimateIcon>
        ) : null}
        {!isSelf ? (
          <AnimateIcon animateOnHover asChild>
            <button
              type="button"
              className="btn btn--danger admin-icon-btn"
              disabled={isLoading || isSelf}
              aria-busy={isDeleting || undefined}
              aria-label={`Delete ${user.username}`}
              title={`Delete ${user.username}`}
              onClick={onDelete}
            >
              {isDeleting ? <LoaderCircle animate={false} className="btn__spinner" aria-hidden="true" /> : <Trash2 size={16} aria-hidden="true" />}
            </button>
          </AnimateIcon>
        ) : null}
      </td>
    </tr>
  );
}
