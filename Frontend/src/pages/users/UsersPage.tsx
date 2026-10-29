import { AnimateIcon } from "@animate-ui/react/icons";
import { Tabs } from "@animate-ui/react/primitives/base-ui/tabs";
import { Highlight, HighlightItem } from "@animate-ui/react/primitives/effects/highlight";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { userService } from "../../features/users";
import { ApiError } from "../../services/api";
import { useAuthStore } from "../../store/authStore";
import { EmptyState, ErrorState, Spinner } from "../../components/ui/Status";
import { showToast } from "../../components/ui/Toast";
import { Check } from "@/components/animate-ui/icons/check";
import { LoaderCircle } from "@/components/animate-ui/icons/loader-circle";
import { Trash2 } from "@/components/animate-ui/icons/trash-2";
import { ConfirmationDialog } from "../../components/ui/ConfirmationDialog";
import { Pagination, DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from "../../components/ui/Pagination";
import type { AuthUser } from "../../features/auth";
import "../admin/admin.css";
import { useLocale } from "../../context/LocaleContext";

const statusLabels: Record<string, string> = {
  active: "Active",
  disabled: "Disabled",
  pending_approval: "Pending approval",
};

type UserFilter = "all" | "pending_approval" | "active" | "disabled";

const userFilters: { value: UserFilter; label: string }[] = [
  { value: "all", label: "All users" },
  { value: "pending_approval", label: "Pending" },
  { value: "active", label: "Active" },
  { value: "disabled", label: "Disabled" },
];

export function UsersPage() {
  const { language, t } = useLocale();
  const me = useAuthStore((s) => s.user);
  const isAdmin = me?.role?.toLowerCase() === "admin";
  const queryClient = useQueryClient();
  const [action, setAction] = useState<{ type: "approve" | "delete"; user: AuthUser } | null>(null);
  const [filter, setFilter] = useState<UserFilter>("all");
  const [hoveredTab, setHoveredTab] = useState<UserFilter | null>(null);
  const [focusedTab, setFocusedTab] = useState<UserFilter | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
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
    queryKey: ["users"],
    queryFn: userService.list,
  });

  const copyUpdated = (updated: AuthUser) => {
    void queryClient.setQueryData<AuthUser[]>(["users"], (existing) =>
      existing?.map((user) => (user.id === updated.id ? updated : user)),
    );
  };

  const copyRemoved = (id: string) => {
    void queryClient.setQueryData<AuthUser[]>(["users"], (existing) =>
      existing?.filter((user) => user.id !== id),
    );
  };

  const approve = useMutation({
    mutationFn: (userId: string) => userService.approve(userId),
    onSuccess: copyUpdated,
    onError: (err) => showToast.error(err instanceof ApiError ? err.message : t("Could not approve the user.")),
  });

  const remove = useMutation({
    mutationFn: (userId: string) => userService.remove(userId),
    onSuccess: (_data, userId) => copyRemoved(userId),
    onError: (err) => showToast.error(err instanceof ApiError ? err.message : t("Could not delete the user.")),
  });

  const allUsers = users.data ?? [];
  const pendingCount = allUsers.filter((user) => user.status === "pending_approval").length;
  const activeCount = allUsers.filter((user) => user.status === "active").length;
  const normalizedSearch = search.trim().toLocaleLowerCase();
  const visibleUsers = allUsers.filter((user) => {
    const matchesStatus = filter === "all" || user.status === filter;
    const matchesSearch = !normalizedSearch || `${user.username} ${user.role}`.toLocaleLowerCase().includes(normalizedSearch);
    return matchesStatus && matchesSearch;
  });
  const currentPage = Math.min(page, Math.max(1, Math.ceil(visibleUsers.length / limit)));
  const pagedUsers = visibleUsers.slice((currentPage - 1) * limit, currentPage * limit);

  useEffect(() => {
    if (page !== currentPage) setPage(currentPage);
  }, [page, currentPage]);

  return (
    <>
      <main className="admin-page admin-page--users" aria-label={t("Users")}>
        <div className="admin-users__content">
        <section className="admin-users" aria-labelledby="admin-users-title">
          <header className="admin-users__header">
            <div>
              <p className="admin-users__eyebrow">{t("Community access")}</p>
              <h1 id="admin-users-title">{t("Users")}<span className="brand__dot">.</span></h1>
              <p className="admin-users__description">{t("Review accounts and membership status.")}</p>
            </div>
          </header>

          <div className="admin-users__summary" aria-label={t("User account summary")}>
            <div className="admin-users__stat">
              <span>{t("Total accounts")}</span>
              <strong>{allUsers.length}</strong>
            </div>
            <div className="admin-users__stat admin-users__stat--pending">
              <span>{t("Awaiting approval")}</span>
              <strong>{pendingCount}</strong>
            </div>
            <div className="admin-users__stat admin-users__stat--active">
              <span>{t("Active accounts")}</span>
              <strong>{activeCount}</strong>
            </div>
          </div>

          {users.isLoading ? <Spinner label={t("Loading users…")} /> : null}
          {users.isError ? (
            <ErrorState message={t("Could not load users.")} onRetry={() => void users.refetch()} />
          ) : null}

          {!users.isLoading && !users.isError && allUsers.length === 0 ? (
            <EmptyState title={t("No members yet")} hint={t("New accounts appear here once they register.")} />
          ) : null}

          {allUsers.length > 0 ? (
            <Tabs.Root
              value={filter}
              onValueChange={(value) => {
                if (value === "all" || value === "pending_approval" || value === "active" || value === "disabled") {
                  setFilter(value);
                  setPage(1);
                }
              }}
            >
              <div className="admin-users__toolbar">
                <Highlight
                  mode="parent"
                  controlledItems
                  value={hoveredTab ?? focusedTab}
                  click={false}
                  className="admin-tab-highlight"
                  containerClassName="admin-tabs-highlight admin-users__filters"
                  exitDelay={0}
                >
                  <Tabs.List
                    className="admin-tabs admin-users__tab-list"
                    aria-label={t("Filter users by status")}
                    onPointerLeave={() => setHoveredTab(null)}
                  >
                    {userFilters.map((option) => {
                      const count = option.value === "all"
                        ? allUsers.length
                        : allUsers.filter((user) => user.status === option.value).length;
                      return (
                        <HighlightItem key={option.value} value={option.value} asChild>
                          <AnimateIcon animateOnHover animateOnTap completeOnStop asChild>
                            <Tabs.Tab
                              value={option.value}
                              className="admin-tab admin-users__tab"
                              data-active={filter === option.value ? "true" : undefined}
                              onPointerEnter={(event) => {
                                if (event.pointerType !== "touch" && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
                                  setHoveredTab(option.value);
                                }
                              }}
                              onFocus={() => setFocusedTab(option.value)}
                              onBlur={() => setFocusedTab(null)}
                            >
                              {t(option.label)} <span>{count}</span>
                            </Tabs.Tab>
                          </AnimateIcon>
                        </HighlightItem>
                      );
                    })}
                  </Tabs.List>
                </Highlight>
                <label className="admin-users__search">
                  <svg
                    className="admin-users__search-icon"
                    aria-hidden="true"
                    focusable="false"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="11" cy="11" r="7" />
                    <path d="m20 20-4-4" />
                  </svg>
                  <input
                    type="search"
                    aria-label={t("Search users")}
                    value={search}
                    onChange={(event) => {
                      setSearch(event.target.value);
                      setPage(1);
                    }}
                    placeholder={t("Username or role")}
                  />
                </label>
              </div>

              <Tabs.Panel value={filter}>
                {visibleUsers.length === 0 ? (
                  <EmptyState title={t("No matching users")} hint={t("Try another name or status filter.")} />
                ) : (
                  <div className="admin-table-wrap">
                    <table className="admin-table admin-users__table">
                      <thead>
                        <tr>
                          <th scope="col">{t("Member")}</th>
                          <th scope="col">{t("Role")}</th>
                          <th scope="col">{t("Status")}</th>
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
                            canManage={isAdmin}
                            isSelf={user.id === me?.id}
                            isLoading={approve.isPending || remove.isPending || action !== null}
                            isApproving={approve.isPending && approve.variables === user.id}
                            isDeleting={remove.isPending && remove.variables === user.id}
                            onApprove={() => setAction({ type: "approve", user })}
                            onDelete={() => setAction({ type: "delete", user })}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Tabs.Panel>
            </Tabs.Root>
          ) : null}
        </section>
        </div>
        {users.data ? (
          <footer className="admin-users__footer">
            <Pagination
              page={currentPage}
              pageSize={limit}
              total={visibleUsers.length}
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
  /** Approve/delete actions are rendered for administrators only. */
  canManage: boolean;
  isSelf: boolean;
  /** Any moderation action in flight disables the row's buttons. */
  isLoading: boolean;
  /** Per-action flags keep the spinner on the exact row and button that started it. */
  isApproving: boolean;
  isDeleting: boolean;
  onApprove: () => void;
  onDelete: () => void;
}

function UserRow({
  user, language, canManage, isSelf, isLoading, isApproving, isDeleting, onApprove, onDelete,
}: RowProps) {
  const { t } = useLocale();
  const isPending = user.status === "pending_approval";
  const initials = user.username.slice(0, 2).toLocaleUpperCase();

  return (
    <tr>
      <td data-label={t("Member")}>
        <div className="admin-users__identity">
          <span className="admin-users__avatar" aria-hidden="true">{initials}</span>
          <span className="admin-users__username">{user.username}</span>
        </div>
      </td>
      <td data-label={t("Role")}><span className="admin-users__role">{t(user.role)}</span></td>
      <td data-label={t("Status")}>
        <span className={`admin-badge admin-badge--${user.status}`}>{t(statusLabels[user.status] ?? user.status)}</span>
      </td>
      <td data-label={t("Joined")}>{new Date(user.createdAt).toLocaleDateString(language === "vi" ? "vi-VN" : "en-US")}</td>
      {canManage ? (
      <td className="admin-table__actions" data-label={t("Actions")}>
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
      ) : null}
    </tr>
  );
}
