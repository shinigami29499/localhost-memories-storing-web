import { formatLastActive, useUsersPage } from "@/pages/users/useUsersPage";
import { PushTransition } from "@/hooks/PushTransition";
import { AnimateIcon } from "@/components/animate-ui/icons/icon";
import { Tabs } from "@base-ui/react/tabs";
import { HighlightItem } from "@animate-ui/react/primitives/effects/highlight";
import { NavigationHighlight, SwapLabel } from "@/components/ui";
import { PageHighlightBar } from "@/components/ui/PageHighlightBar";
import { startTransition, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { userService } from "@/features/users";
import { ApiError } from "@/services/api";
import { useAuthStore } from "@/store/authStore";
import { EmptyState, ErrorState, Spinner } from "@/components/ui/Status";
import { showToast } from "@/components/ui/Toast";
import { Check } from "@/components/animate-ui/icons/check";
import { LoaderCircle } from "@/components/animate-ui/icons/loader-circle";
import { Trash2 } from "@/components/animate-ui/icons/trash-2";
import { Bot } from "@/components/animate-ui/icons/bot";
import { Ban } from "@/components/animate-ui/icons/ban";
import { UserRound } from "@/components/animate-ui/icons/user-round";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { PageActionBar } from "@/components/layout/PageActionBar";
import { Search } from "@/components/animate-ui/icons/search";
import "../place/place.css";
import type { AuthUser } from "@/features/auth";
import "./users.css";
import { useLocale } from "@/context/LocaleContext";
import { UserAvatar } from "@/components/common/UserAvatar";
import { useUserPresenceStore } from "@/features/users/store/userPresenceStore";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { HeaderFilters, inDateRange } from "@/components/ui/HeaderFilters";

const ONLINE_WINDOW_MS = 300_000;


type UserFilter = "all" | "pending_approval" | "blocked";

const userFilters: { value: UserFilter; label: string }[] = [
  { value: "all", label: "All users" },
  { value: "pending_approval", label: "Pending" },
  { value: "blocked", label: "Blocked" },
];

export function UsersPage() {
  const { language, t, isMobile, me, isAdmin, action, setAction, navigate, filter, search, setSearch, role, setRole, joinedFrom, setJoinedFrom, joinedTo, setJoinedTo, useList, sentinel, now, offlineUsers, users, activeQuery, approve, remove, disable, activate, updateRole, pagedUsers } = useUsersPage();

  const headerActions = document.getElementById("page-header-actions");
  const searchForm = (
    <form className={`place__search-bar${isMobile ? "" : " place__search-bar--header"}`} role="search" onSubmit={(event) => event.preventDefault()}>
      <input type="search" aria-label={t("Search users")} placeholder={t("Search users")} value={search} maxLength={120} onChange={(event) => setSearch(event.target.value)} />
      {search && <><span className="place__search-divider" aria-hidden="true" /><button type="button" className="place__search-clear" aria-label={t("Clear search")} title={t("Clear search")} onClick={() => setSearch("")}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" /></svg></button></>}
      <AnimateIcon animateOnHover animateOnTap={false} completeOnStop asChild><span className="place__search-icon" aria-hidden="true"><Search size={22} /></span></AnimateIcon>
    </form>
  );

  return (
    <>
      <main className="admin-page admin-page--users" aria-label={t("Users")}>
        <div className="admin-users__content">
        <section className="admin-users" aria-label={t("Users")}>

          <Tabs.Root
              value={filter}
              onValueChange={(value) => {
                if (value === "all" || value === "pending_approval" || value === "blocked") {
                  startTransition(() => {
                    navigate(value === "all" ? "/users" : value === "pending_approval" ? "/users/pending" : "/users/blocked");
                  });
                }
              }}
            >
              <div className="admin-users__toolbar">
                <PageHighlightBar id="users-navigation" label="users navigation">
                <Tabs.List
                  className="navigation-highlight-bar"
                  aria-label={t("Filter users by status")}
                >
                  <NavigationHighlight value={filter}>
                  {userFilters.filter((option) => isAdmin || option.value !== "blocked").map((option, index) => {
                    return (
                      <HighlightItem key={option.value} value={option.value} asChild>
                      <Tabs.Tab
                        value={option.value}
                        className="admin-users__tab"
                      >
                        <SwapLabel text={t(option.label)} index={index} />
                      </Tabs.Tab>
                      </HighlightItem>
                    );
                  })}
                  </NavigationHighlight>
                </Tabs.List>
                </PageHighlightBar>
              </div>
              <div data-push-page-content>
              <PushTransition transitionKey={filter} />
              {activeQuery.isLoading ? <Spinner page label={t("Loading users...")} /> : null}
              {activeQuery.isError && !pagedUsers.length ? (
                <ErrorState message={t("Could not load users.")} onRetry={() => void activeQuery.refetch()} />
              ) : null}
              <Tabs.Panel key={filter} value={filter}>
                {!activeQuery.data ? null : pagedUsers.length === 0 ? (
                  <EmptyState
                    title={useList ? "No matching users" : filter === "pending_approval" ? "No pending users" : filter === "blocked" ? "No blocked users" : "No users yet"}
                    hint={useList ? "Try a different search." : filter === "pending_approval"
                      ? "Accounts awaiting approval will appear here."
                      : filter === "blocked" ? "Blocked accounts will appear here." : "User accounts will appear here."}
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
                            canManageUser={user.id !== me?.id && (me?.role?.toLowerCase() === "superadmin" ? user.role.toLowerCase() !== "superadmin" : isAdmin && user.role.toLowerCase() === "user")}
                            canChangeRole={me?.role?.toLowerCase() === "superadmin" && user.role.toLowerCase() !== "superadmin"}
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
                {!useList && users.isFetchNextPageError && <ErrorState message={t("Could not load more users.")} onRetry={() => void users.fetchNextPage()} />}
                {!useList && users.hasNextPage && <div ref={sentinel}>{users.isFetchingNextPage && <Spinner />}</div>}
              </Tabs.Panel>
              </div>
          </Tabs.Root>
        </section>
        </div>
        {isMobile ? <PageActionBar className="place__action-bar users__action-bar">{searchForm}</PageActionBar>
          : headerActions ? createPortal(<div className="header-search-controls">{searchForm}<HeaderFilters selects={[{ label: "Role", value: role, onChange: setRole, options: [{ value: "superadmin", label: t("SuperAdmin") }, { value: "admin", label: t("admin") }, { value: "user", label: t("user") }] }]} date={{ label: "Joined", from: joinedFrom, to: joinedTo, setFrom: setJoinedFrom, setTo: setJoinedTo }} /></div>, headerActions) : searchForm}
      </main>
      {action && isAdmin ? (
        <ConfirmationDialog
          confirmLabel={t(action.type === "approve" ? "Approve {username}"
            : action.type === "role" ? "Change role for {username}"
            : action.type === "activate" ? "Unblock {username}"
            : action.type === "disable" ? "Block {username}" : "Delete {username}", { username: action.user.username })}
          title={action.type === "approve"
            ? t("Approve {username}?", { username: action.user.username })
            : action.type === "role"
            ? t("Change role for {username}?", { username: action.user.username })
            : action.type === "activate"
            ? t("Unblock {username}?", { username: action.user.username })
            : action.type === "disable"
            ? t("Block {username}?", { username: action.user.username })
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
            ? t("Unblock {username} so they can sign in again?", { username: action.user.username })
            : action.type === "disable"
            ? t("Block {username}? They will no longer be able to sign in or refresh their session.", { username: action.user.username })
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
  canManageUser: boolean;
  canChangeRole: boolean;
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
  user, language, now, isOnline, canManage, canManageUser, canChangeRole, isSelf, isLoading, isApproving, isActivating, isDisabling, isDeleting, onApprove, onActivate, onDisable, onRoleChange, onDelete,
}: RowProps) {
  const { t } = useLocale();
  const isPending = user.status === "pending_approval";
  const presence = user.status === "disabled" ? "disabled" : isPending ? "pending" : isOnline ? "online" : "offline";
  const presenceLabel = presence === "disabled" ? "Blocked" : presence === "pending" ? "Pending approval" : presence === "online" ? "Online" : "Offline";
  return (
    <tr>
      <td data-label={t("Member")}>
        <div className="admin-users__identity">
          <UserAvatar user={user} className="admin-users__avatar" />
          <span className="admin-users__username">{user.username}</span>
        </div>
      </td>
      <td data-label={t("Role")}>
        <AnimateIcon animateOnHover animateOnTap completeOnStop asChild>
          {canChangeRole && !isSelf ? <button type="button" className="admin-users__role admin-users__role--button" disabled={isLoading} aria-label={t("Change role for {username}", { username: user.username })} title={t("Change role for {username}", { username: user.username })} onClick={onRoleChange}>
            {["admin", "superadmin"].includes(user.role.toLowerCase() ?? "") ? <Bot size={16} aria-hidden="true" /> : <UserRound size={16} aria-hidden="true" />}
          </button> : <span className="admin-users__role" role="img" aria-label={t(user.role)} title={t(user.role)}>
            {["admin", "superadmin"].includes(user.role.toLowerCase() ?? "") ? <Bot size={16} aria-hidden="true" /> : <UserRound size={16} aria-hidden="true" />}
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
        {canManageUser && <>
        {user.status === "disabled" ? (
          <AnimateIcon animateOnHover animateOnTap completeOnStop asChild>
            <button type="button" className="btn btn--primary admin-icon-btn" disabled={isLoading} aria-busy={isActivating || undefined}
              aria-label={t("Unblock {username}", { username: user.username })} title={t("Unblock {username}", { username: user.username })} onClick={onActivate}>
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
              aria-label={t("Block {username}", { username: user.username })} title={t("Block {username}", { username: user.username })} onClick={onDisable}>
              {isDisabling ? <LoaderCircle animate={false} className="btn__spinner" aria-hidden="true" /> : <Ban size={16} aria-hidden="true" />}
            </button>
          </AnimateIcon>
        ) : null}
        {!isSelf ? (
          <AnimateIcon animateOnHover animateOnTap completeOnStop asChild>
            <button
              type="button"
              className="btn btn--danger-solid admin-icon-btn"
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
        </>}
      </td>
      ) : null}
    </tr>
  );
}
