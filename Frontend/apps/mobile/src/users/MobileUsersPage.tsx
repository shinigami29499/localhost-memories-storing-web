import { startTransition } from "react";
import { Check } from "@/components/animate-ui/icons/check";
import { Ban } from "@/components/animate-ui/icons/ban";
import { Trash2 } from "@/components/animate-ui/icons/trash-2";
import { UserRound } from "@/components/animate-ui/icons/user-round";
import { LoaderCircle } from "@/components/animate-ui/icons/loader-circle";
import { UserAvatar } from "@/components/common/UserAvatar";
import { PageActionBar } from "../layout/MobilePageActionBar";
import { EmptyState, ErrorState, Spinner } from "@/components/ui";
import { MobileConfirmationDialog as ConfirmationDialog } from "../gallery/MobileConfirmationDialog";
import { formatLastActive, useUsersPage } from "@/pages/users/useUsersPage";
import "./mobile-users.css";

export function MobileUsersPage() {
  const { language, t, me, isAdmin, action, setAction, navigate, filter, search, setSearch, useList, sentinel, now, offlineUsers, users, activeQuery, approve, remove, disable, activate, updateRole, pagedUsers } = useUsersPage(true);
  const busy = approve.isPending || activate.isPending || disable.isPending || updateRole.isPending || remove.isPending || action !== null;
  return <>
    <main className="mobile-users" aria-label={t("Users")}>
      <div className="mobile-users__content admin-users__content">
        <nav className="mobile-users__tabs" aria-label={t("Filter users by status")}>
          {[{ value: "all", label: "All users", to: "/users" }, { value: "pending_approval", label: "Pending", to: "/users/pending" }, ...(isAdmin ? [{ value: "blocked", label: "Blocked", to: "/users/blocked" }] : [])].map((item) =>
            <button key={item.value} type="button" aria-current={filter === item.value ? "page" : undefined} onClick={() => startTransition(() => navigate(item.to))}>{t(item.label)}</button>)}
        </nav>
        {activeQuery.isLoading && <Spinner label={t("Loading users...")} />}
        {activeQuery.isError && !pagedUsers.length && <ErrorState message={t("Could not load users.")} onRetry={() => void activeQuery.refetch()} />}
        {activeQuery.data && (pagedUsers.length === 0 ? <EmptyState title={useList ? "No matching users" : filter === "pending_approval" ? "No pending users" : filter === "blocked" ? "No blocked users" : "No users yet"} hint={useList ? "Try a different search." : filter === "pending_approval" ? "Accounts awaiting approval will appear here." : filter === "blocked" ? "Blocked accounts will appear here." : "User accounts will appear here."} /> :
          <ul className="mobile-users__list">{pagedUsers.map((user) => {
            const self = user.id === me?.id;
            const pending = user.status === "pending_approval";
            const online = !offlineUsers[user.id] && !!user.lastSeenAt && now - Date.parse(user.lastSeenAt) < 300_000;
            const presence = user.status === "disabled" ? "Blocked" : pending ? "Pending approval" : online ? "Online" : "Offline";
            const joinedDate = new Date(user.createdAt);
            const joined = Number.isNaN(joinedDate.getTime()) ? "" : joinedDate.toLocaleDateString(language === "vi" ? "vi-VN" : "en-US");
            const lastActive = formatLastActive(user.lastSeenAt, language, now);
            return <li key={user.id} className="mobile-users__item">
              <div className="mobile-users__identity"><UserAvatar user={user} className="mobile-users__avatar" /><div><strong>{user.username}</strong><span>{t(user.role)} · {t(presence)}</span></div></div>
              {(joined || lastActive) && <div className="mobile-users__meta">{joined && <>{t("Joined")} {joined}</>}{joined && lastActive && " · "}{lastActive && <>{t("Last active")} {lastActive}</>}</div>}
              {isAdmin && <div className="mobile-users__actions">
                {!self && <button type="button" disabled={busy} aria-label={t("Change role for {username}", { username: user.username })} title={t("Change role for {username}", { username: user.username })} onClick={() => setAction({ type: "role", user })}><UserRound size={18} aria-hidden="true" />{t("Role")}</button>}
                {user.status === "disabled" && <button type="button" disabled={busy} aria-label={t("Unblock {username}", { username: user.username })} onClick={() => setAction({ type: "activate", user })}>{activate.isPending && activate.variables === user.id ? <LoaderCircle size={18} aria-hidden="true" /> : <Check size={18} aria-hidden="true" />}{t("Unblock")}</button>}
                {pending && <button type="button" disabled={busy} aria-label={t("Approve {username}", { username: user.username })} onClick={() => setAction({ type: "approve", user })}>{approve.isPending && approve.variables === user.id ? <LoaderCircle size={18} aria-hidden="true" /> : <Check size={18} aria-hidden="true" />}{t("Approve")}</button>}
                {!self && user.status === "active" && <button type="button" disabled={busy} aria-label={t("Block {username}", { username: user.username })} onClick={() => setAction({ type: "disable", user })}>{disable.isPending && disable.variables === user.id ? <LoaderCircle size={18} aria-hidden="true" /> : <Ban size={18} aria-hidden="true" />}{t("Block")}</button>}
                {!self && <button type="button" disabled={busy} aria-label={t("Delete {username}", { username: user.username })} onClick={() => setAction({ type: "delete", user })}>{remove.isPending && remove.variables === user.id ? <LoaderCircle size={18} aria-hidden="true" /> : <Trash2 size={18} aria-hidden="true" />}{t("Delete")}</button>}
              </div>}
            </li>;
          })}</ul>)}
        {!useList && users.isFetchNextPageError && <ErrorState message={t("Could not load more users.")} onRetry={() => void users.fetchNextPage()} />}
        {!useList && users.hasNextPage && <div ref={sentinel}>{users.isFetchingNextPage && <Spinner />}</div>}
      </div>
      <PageActionBar className="place__action-bar users__action-bar"><form className="place__search-bar" role="search" onSubmit={(event) => event.preventDefault()}><input type="search" aria-label={t("Search users")} placeholder={t("Search users")} value={search} maxLength={120} onChange={(event) => setSearch(event.target.value)} />{search && <button type="button" className="mobile-users__clear" aria-label={t("Clear search")} onClick={() => setSearch("")}>×</button>}</form></PageActionBar>
    </main>
    {action && isAdmin && <ConfirmationDialog
      confirmLabel={t(action.type === "approve" ? "Approve {username}" : action.type === "role" ? "Change role for {username}" : action.type === "activate" ? "Unblock {username}" : action.type === "disable" ? "Block {username}" : "Delete {username}", { username: action.user.username })}
      title={t(action.type === "approve" ? "Approve {username}?" : action.type === "role" ? "Change role for {username}?" : action.type === "activate" ? "Unblock {username}?" : action.type === "disable" ? "Block {username}?" : "Delete {username}?", { username: action.user.username })}
      danger={action.type === "disable" || action.type === "delete"} onClose={() => setAction(null)}
      onConfirm={async () => { if (action.type === "approve") await approve.mutateAsync(action.user.id); else if (action.type === "role") await updateRole.mutateAsync(action.user); else if (action.type === "activate") await activate.mutateAsync(action.user.id); else if (action.type === "disable") await disable.mutateAsync(action.user.id); else await remove.mutateAsync(action.user.id); }}>
      <p>{action.type === "approve" ? t("Approve {username} and activate their account so they can sign in?", { username: action.user.username }) : action.type === "role" ? t("Change {username} to {role}? They will need to sign in again to receive the new role.", { username: action.user.username, role: t(action.user.role.toLowerCase() === "admin" ? "user" : "admin") }) : action.type === "activate" ? t("Unblock {username} so they can sign in again?", { username: action.user.username }) : action.type === "disable" ? t("Block {username}? They will no longer be able to sign in or refresh their session.", { username: action.user.username }) : t("Delete {username}? Their account will be disabled and their sessions revoked.", { username: action.user.username })}</p>
    </ConfirmationDialog>}
  </>;
}
