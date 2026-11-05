import { AnimateIcon } from "@/components/animate-ui/icons/icon";
import { Tabs } from "@base-ui/react/tabs";
import { HighlightItem } from "@animate-ui/react/primitives/effects/highlight";
import { NavigationHighlight } from "../../components/ui";
import { startTransition, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { userService } from "../../features/users";
import { ApiError } from "../../services/api";
import { useAuthStore } from "../../store/authStore";
import { EmptyState, ErrorState, Spinner } from "../../components/ui/Status";
import { showToast } from "../../components/ui/Toast";
import { Check } from "@/components/animate-ui/icons/check";
import { LoaderCircle } from "@/components/animate-ui/icons/loader-circle";
import { Trash2 } from "@/components/animate-ui/icons/trash-2";
import { Bot } from "@/components/animate-ui/icons/bot";
import { Ban } from "@/components/animate-ui/icons/ban";
import { UserRound } from "@/components/animate-ui/icons/user-round";
import { ConfirmationDialog } from "../../components/ui/ConfirmationDialog";
import { Pagination, DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from "../../components/ui/Pagination";
import type { AuthUser } from "../../features/auth";
import "../gallery/gallery.css";
import "./users.css";
import { useLocale } from "../../context/LocaleContext";
import { UserAvatar } from "../../components/common/UserAvatar";
import { useUserPresenceStore } from "../../features/users/store/userPresenceStore";

const ONLINE_WINDOW_MS = 300_000;

function formatLastActive(value: string | null | undefined, language: "en" | "vi", now: number): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const seconds = Math.max(0, Math.floor((now - date.getTime()) / 1000));
  const locale = language === "vi" ? "vi-VN" : "en-US";
  const relative = new Intl.RelativeTimeFormat(locale, { numeric: "always" });
  if (seconds < 60) return relative.format(-seconds, "second");
  if (seconds < 3_600) return relative.format(-Math.floor(seconds / 60), "minute");
  if (seconds < 86_400) return relative.format(-Math.floor(seconds / 3_600), "hour");
  if (seconds < 604_800) return relative.format(-Math.floor(seconds / 86_400), "day");
  if (seconds < 2_592_000) return relative.format(-Math.floor(seconds / 604_800), "week");
  if (seconds < 31_536_000) return relative.format(-Math.floor(seconds / 2_592_000), "month");
  return date.toLocaleString(locale, { dateStyle: "short", timeStyle: "short" });
}

type UserFilter = "all" | "pending_approval";

const userFilters: { value: UserFilter; label: string }[] = [
  { value: "all", label: "All users" },
  { value: "pending_approval", label: "Pending" },
];

export function UsersPage() {
  const { language, t } = useLocale();
  const me = useAuthStore((s) => s.user);
  const isAdmin = me?.role?.toLowerCase() === "admin";
  const queryClient = useQueryClient();
  const [action, setAction] = useState<{ type: "approve" | "activate" | "disable" | "delete" | "role"; user: AuthUser } | null>(null);
  const [filter, setFilter] = useState<UserFilter>("all");
  const [page, setPage] = useState(1);
  const [now, setNow] = useState(() => Date.now());
  const offlineUsers = useUserPresenceStore((state) => state.offlineUsers);
  const [limit, setLimit] = useState<number>(() => {
    const stored = Number(window.localStorage.getItem("users.limit"));
    return PAGE_SIZE_OPTIONS.some((size) => size === stored) ? stored : DEFAULT_PAGE_SIZE;
  });

  const handlePageSizeChange = (newPageSize: number) => {
    setLimit(newPageSize);
    setPage(1);
    window.localStorage.setItem("users.limit", String(newPageSize));
  };

  const users = useQuery({
    queryKey: ["users", "page", filter, page, limit],
    queryFn: ({ signal }) => userService.page(page, limit, filter === "pending_approval", signal),
    refetchInterval: isAdmin ? 60_000 : false,
  });

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 30_000);
    return () => window.clearInterval(timer);
  }, []);



  const refreshUsers = () => void queryClient.invalidateQueries({ queryKey: ["users", "page"] });

  const approve = useMutation({
    mutationFn: (userId: string) => userService.approve(userId),
    onSuccess: refreshUsers,
    onError: (err) => showToast.error(err instanceof ApiError ? err.message : t("Could not approve the user.")),
  });

  const remove = useMutation({
    mutationFn: (userId: string) => userService.remove(userId),
    onSuccess: refreshUsers,
    onError: (err) => showToast.error(err instanceof ApiError ? err.message : t("Could not delete the user.")),
  });

  const disable = useMutation({
    mutationFn: (userId: string) => userService.disable(userId),
    onSuccess: refreshUsers,
  });

  const activate = useMutation({
    mutationFn: (userId: string) => userService.activate(userId),
    onSuccess: (user) => {
      useUserPresenceStore.getState().setOnline(user.id, false);
      refreshUsers();
    },
  });

  const updateRole = useMutation({
    mutationFn: (user: AuthUser) => userService.updateRole(user.id, user.role.toLowerCase() === "admin" ? "user" : "admin"),
    onSuccess: refreshUsers,
  });

  const allUsers = users.data?.items ?? [];
  const total = users.data?.total ?? 0;
  const currentPage = Math.min(page, Math.max(1, Math.ceil(total / limit)));
  const pagedUsers = allUsers;

  useEffect(() => {
    if (users.data && page !== currentPage) setPage(currentPage);
  }, [users.data, page, currentPage]);

  return (
    <>
      <main className="admin-page admin-page--users" aria-label={t("Users")}>
        <header className="admin-users__header">
          <div>
            <p className="admin-users__eyebrow">{t("Community access")}</p>
            <h1 id="admin-users-title">{t("Users")}<span className="brand__dot">.</span></h1>
            <p className="admin-users__description">{t("Review accounts and membership status.")}</p>
          </div>
        </header>
        <div className="admin-users__content">
        <section className="admin-users" aria-labelledby="admin-users-title">

          <Tabs.Root
              value={filter}
              onValueChange={(value) => {
                if (value === "all" || value === "pending_approval") {
                  startTransition(() => {
                    setFilter(value);
                    setPage(1);
                  });
                }
              }}
            >
              <div className="admin-users__toolbar">
                <Tabs.List
                  className="admin-users__filters"
                  aria-label={t("Filter users by status")}
                >
                  <NavigationHighlight value={filter}>
                  {userFilters.map((option) => {
                    return (
                      <HighlightItem key={option.value} value={option.value} asChild>
                      <Tabs.Tab
                        value={option.value}
                        className="admin-users__tab"
                      >
                        {t(option.label)}
                      </Tabs.Tab>
                      </HighlightItem>
                    );
                  })}
                  </NavigationHighlight>
                </Tabs.List>
              </div>
              {users.isLoading ? <Spinner label={t("Loading users…")} /> : null}
              {users.isError ? (
                <ErrorState message={t("Could not load users.")} onRetry={() => void users.refetch()} />
              ) : null}
              <Tabs.Panel key={filter} value={filter}>
                {!users.data ? null : total === 0 ? (
                  <EmptyState
                    title={filter === "pending_approval" ? "No pending users" : "No users yet"}
                    hint={filter === "pending_approval"
                      ? "Accounts awaiting approval will appear here."
                      : "User accounts will appear here."}
                  />
                ) : (
                  <div className="admin-table-wrap">
                    <table className="admin-table admin-users__table">
                      <thead>
                        <tr>
                          <th scope="col">{t("Member")}</th>
                          <th scope="col">{t("Role")}</th>
                          <th scope="col">{t("Status")}</th>
                          <th scope="col">{t("Last active")}</th>
                          <th scope="col">{t("Joined")}</th>
                          {isAdmin ? <th scope="col" aria-label={t("Actions")}></th> : null}
                        </tr>
                      </thead>
                      <tbody>
                        {pagedUsers.map((user) => (
                          <UserRow
                            key={user.id}
                            user={user}
                            language={language}
                            now={now}
                            canManage={isAdmin}
                            isSelf={user.id === me?.id}
                            isLoading={approve.isPending || activate.isPending || disable.isPending || updateRole.isPending || remove.isPending || action !== null}
                            isApproving={approve.isPending && approve.variables === user.id}
                            isActivating={activate.isPending && activate.variables === user.id}
                            isDisabling={disable.isPending && disable.variables === user.id}
                            isDeleting={remove.isPending && remove.variables === user.id}
                            isOnline={!offlineUsers[user.id] && !!user.lastSeenAt && now - Date.parse(user.lastSeenAt) < ONLINE_WINDOW_MS}
                            onApprove={() => setAction({ type: "approve", user })}
                            onActivate={() => setAction({ type: "activate", user })}
                            onDisable={() => setAction({ type: "disable", user })}
                            onRoleChange={() => setAction({ type: "role", user })}
                            onDelete={() => setAction({ type: "delete", user })}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Tabs.Panel>
          </Tabs.Root>
        </section>
        </div>
        {users.data ? (
          <footer className="admin-users__footer">
            <Pagination
              page={currentPage}
              pageSize={limit}
              total={total}
              itemLabel="users"
              isFetching={users.isFetching}
              onPageChange={setPage}
              onPageSizeChange={handlePageSizeChange}
            />
          </footer>
        ) : null}
      </main>
      {action && isAdmin ? (
        <ConfirmationDialog
          title={action.type === "approve"
            ? t("Approve {username}?", { username: action.user.username })
            : action.type === "role"
            ? t("Change role for {username}?", { username: action.user.username })
            : action.type === "activate"
            ? t("Activate {username}?", { username: action.user.username })
            : action.type === "disable"
            ? t("Disable {username}?", { username: action.user.username })
            : t("Delete {username}?", { username: action.user.username })}
          danger={action.type === "disable" || action.type === "delete"}
          onClose={() => setAction(null)}
          onConfirm={async () => {
            if (action.type === "approve") await approve.mutateAsync(action.user.id);
            else if (action.type === "role") await updateRole.mutateAsync(action.user);
            else if (action.type === "activate") await activate.mutateAsync(action.user.id);
            else if (action.type === "disable") await disable.mutateAsync(action.user.id);
            else await remove.mutateAsync(action.user.id);
          }}
        >
          <p>{action.type === "approve"
            ? t("Approve {username} and activate their account so they can sign in?", { username: action.user.username })
            : action.type === "role"
            ? t("Change {username} to {role}? They will need to sign in again to receive the new role.", { username: action.user.username, role: t(action.user.role.toLowerCase() === "admin" ? "user" : "admin") })
            : action.type === "activate"
            ? t("Activate {username} so they can sign in again?", { username: action.user.username })
            : action.type === "disable"
            ? t("Disable {username}? They will no longer be able to sign in or refresh their session.", { username: action.user.username })
            : t("Delete {username}? Their account will be disabled and their sessions revoked.", { username: action.user.username })}</p>
        </ConfirmationDialog>
      ) : null}
    </>
  );
}

interface RowProps {
  user: AuthUser;
  language: "en" | "vi";
  now: number;
  isOnline: boolean;
  /** Approve/delete actions are rendered for administrators only. */
  canManage: boolean;
  isSelf: boolean;
  /** Any moderation action in flight disables the row's buttons. */
  isLoading: boolean;
  /** Per-action flags keep the spinner on the exact row and button that started it. */
  isApproving: boolean;
  isActivating: boolean;
  isDisabling: boolean;
  isDeleting: boolean;
  onApprove: () => void;
  onActivate: () => void;
  onDisable: () => void;
  onRoleChange: () => void;
  onDelete: () => void;
}

function UserRow({
  user, language, now, isOnline, canManage, isSelf, isLoading, isApproving, isActivating, isDisabling, isDeleting, onApprove, onActivate, onDisable, onRoleChange, onDelete,
}: RowProps) {
  const { t } = useLocale();
  const isPending = user.status === "pending_approval";
  const presence = user.status === "disabled" ? "disabled" : isPending ? "pending" : isOnline ? "online" : "offline";
  const presenceLabel = presence === "disabled" ? "Disabled" : presence === "pending" ? "Pending approval" : presence === "online" ? "Online" : "Offline";
  const [expanded, setExpanded] = useState(false);

  return (
    <tr className={expanded ? "admin-users__row--expanded" : undefined} onClick={(event) => {
      if (window.matchMedia("(max-width: 640px)").matches && !(event.target as HTMLElement).closest("button")) {
        setExpanded((value) => !value);
      }
    }}>
      <td data-label={t("Member")}>
        <div className="admin-users__identity admin-users__identity--desktop">
          <UserAvatar user={user} className="admin-users__avatar" />
          <span className="admin-users__username">{user.username}</span>
        </div>
        <button type="button" className="admin-users__identity admin-users__expand" aria-expanded={expanded} onClick={() => setExpanded((value) => !value)}>
          <UserAvatar user={user} className="admin-users__avatar" />
          <span className="admin-users__username">{user.username}</span>
        </button>
      </td>
      <td data-label={t("Role")}>
        <AnimateIcon animateOnHover animateOnTap completeOnStop asChild>
          {canManage && !isSelf ? <button type="button" className="admin-users__role admin-users__role--button" disabled={isLoading} aria-label={t("Change role for {username}", { username: user.username })} title={t("Change role for {username}", { username: user.username })} onClick={onRoleChange}>
            {user.role.toLowerCase() === "admin" ? <Bot size={16} aria-hidden="true" /> : <UserRound size={16} aria-hidden="true" />}
          </button> : <span className="admin-users__role" role="img" aria-label={t(user.role)} title={t(user.role)}>
            {user.role.toLowerCase() === "admin" ? <Bot size={16} aria-hidden="true" /> : <UserRound size={16} aria-hidden="true" />}
          </span>}
        </AnimateIcon>
      </td>
      <td data-label={t("Status")}>
        <span className={`user-presence user-presence--${presence}`} title={t(presenceLabel)} aria-label={t(presenceLabel)}>
          <span aria-hidden="true" />
        </span>
      </td>
      <td data-label={t("Last active")}>{formatLastActive(user.lastSeenAt, language, now)}</td>
      <td data-label={t("Joined")}>{new Date(user.createdAt).toLocaleDateString(language === "vi" ? "vi-VN" : "en-US")}</td>
      {canManage ? (
      <td className="admin-table__actions" data-label={t("Actions")}>
        {user.status === "disabled" ? (
          <AnimateIcon animateOnHover animateOnTap completeOnStop asChild>
            <button type="button" className="btn btn--primary admin-icon-btn" disabled={isLoading} aria-busy={isActivating || undefined}
              aria-label={t("Activate {username}", { username: user.username })} title={t("Activate {username}", { username: user.username })} onClick={onActivate}>
              {isActivating ? <LoaderCircle animate={false} className="btn__spinner" aria-hidden="true" /> : <Check size={16} aria-hidden="true" />}
            </button>
          </AnimateIcon>
        ) : null}
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
        {!isSelf && user.status === "active" ? (
          <AnimateIcon animateOnHover animateOnTap completeOnStop asChild>
            <button type="button" className="btn btn--secondary admin-icon-btn" disabled={isLoading} aria-busy={isDisabling || undefined}
              aria-label={t("Disable {username}", { username: user.username })} title={t("Disable {username}", { username: user.username })} onClick={onDisable}>
              {isDisabling ? <LoaderCircle animate={false} className="btn__spinner" aria-hidden="true" /> : <Ban size={16} aria-hidden="true" />}
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
      ) : null}
    </tr>
  );
}
