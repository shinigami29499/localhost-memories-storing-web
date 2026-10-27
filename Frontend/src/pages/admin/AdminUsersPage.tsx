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
import { useLocale } from "../../context/LocaleContext";

const statusLabels: Record<string, string> = {
  active: "Active",
  disabled: "Disabled",
  pending_approval: "Pending approval",
};

export function AdminUsersPage() {
  const { language, t } = useLocale();
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
    onError: (err) => setError(err instanceof ApiError ? err.message : t("Could not approve the user.")),
  });

  const remove = useMutation({
    mutationFn: (userId: string) => userService.remove(userId),
    onSuccess: (_data, userId) => copyRemoved(userId),
    onError: (err) => setError(err instanceof ApiError ? err.message : t("Could not delete the user.")),
  });

  return (
    <>
      <main className="admin-page">
        <div className="admin__layout">
          <div className="admin__heading">
            <h2>{t("Manage users")}<span className="brand__dot">.</span></h2>
          </div>

          {error ? <ErrorState message={error} onRetry={() => setError(null)} /> : null}

          {users.isLoading ? <Spinner label={t("Loading users…")} /> : null}
          {users.isError ? (
            <ErrorState message={t("Could not load users.")} onRetry={() => void users.refetch()} />
          ) : null}

          {!users.isLoading && !users.isError && users.data?.length === 0 ? (
            <EmptyState title={t("No members yet")} hint={t("New accounts appear here once they register.")} />
          ) : null}

          {users.data && users.data.length > 0 ? (
            <div className="admin-table-wrap">
              <table className="admin-table" role="table">
                <thead role="rowgroup">
                  <tr role="row">
                    <th role="columnheader" scope="col">{t("Username")}</th>
                    <th role="columnheader" scope="col">{t("Role")}</th>
                    <th role="columnheader" scope="col">{t("Status")}</th>
                    <th role="columnheader" scope="col">{t("Joined")}</th>
                    <th role="columnheader" scope="col" aria-label={t("Actions")}></th>
                  </tr>
                </thead>
                <tbody role="rowgroup">
                  {users.data.map((user) => (
                    <AdminUserRow
                      key={user.id}
                      user={user}
                      language={language}
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
          title={action.type === "approve"
            ? t("Approve {username}?", { username: action.user.username })
            : t("Delete {username}?", { username: action.user.username })}
          danger={action.type === "delete"}
          onClose={() => setAction(null)}
          onConfirm={async () => {
            if (action.type === "approve") await approve.mutateAsync(action.user.id);
            else await remove.mutateAsync(action.user.id);
          }}
        >
          <p>{action.type === "approve"
            ? t("Approve {username} and activate their account so they can sign in?", { username: action.user.username })
            : t("Delete {username}? Their account will be disabled and their sessions revoked.", { username: action.user.username })}</p>
        </ConfirmationDialog>
      ) : null}
    </>
  );
}

interface RowProps {
  user: AuthUser;
  language: "en" | "vi";
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
  user, language, isSelf, isLoading, isApproving, isDeleting, onApprove, onDelete,
}: RowProps) {
  const { t } = useLocale();
  const isPending = user.status === "pending_approval";

  return (
    <tr role="row">
      <td role="cell" data-label={t("Username")}>{user.username}</td>
      <td role="cell" data-label={t("Role")}>{user.role}</td>
      <td role="cell" data-label={t("Status")}>
        <span className={`admin-badge admin-badge--${user.status}`}>{t(statusLabels[user.status] ?? user.status)}</span>
      </td>
      <td role="cell" data-label={t("Joined")}>{new Date(user.createdAt).toLocaleDateString(language === "vi" ? "vi-VN" : "en-US")}</td>
      <td role="cell" className="admin-table__actions" data-label={t("Actions")}>
        {isPending ? (
          <AnimateIcon animateOnHover animateOnTap completeOnStop asChild>
            <button
              type="button"
              className="btn btn--primary admin-icon-btn"
              disabled={isLoading}
              aria-busy={isApproving || undefined}
              aria-label={t("Approve {username}", { username: user.username })}
              title={t("Approve {username}", { username: user.username })}
              onClick={onApprove}
            >
              {isApproving ? <LoaderCircle animate={false} className="btn__spinner" aria-hidden="true" /> : <Check size={16} aria-hidden="true" />}
            </button>
          </AnimateIcon>
        ) : null}
        {!isSelf ? (
          <AnimateIcon animateOnHover animateOnTap completeOnStop asChild>
            <button
              type="button"
              className="btn btn--danger admin-icon-btn"
              disabled={isLoading || isSelf}
              aria-busy={isDeleting || undefined}
              aria-label={t("Delete {username}", { username: user.username })}
              title={t("Delete {username}", { username: user.username })}
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
