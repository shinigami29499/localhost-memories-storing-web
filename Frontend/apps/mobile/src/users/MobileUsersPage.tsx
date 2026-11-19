import { DropdownRangeDatePicker } from "@/components/ui/dropdown-range-date-picker";
import { X } from "@/components/animate-ui/icons/x";
import { ChevronDown } from "@/components/animate-ui/icons/chevron-down";
﻿import { Terminal } from "@/components/animate-ui/icons/terminal";
import { UserRoundCog } from "@/components/animate-ui/icons/user-round-cog";
import { CircleX } from "@/components/animate-ui/icons/circle-x";
import { ChevronLeft } from "@/components/animate-ui/icons/chevron-left";
import { Plus } from "@/components/animate-ui/icons/plus";
import { showToast } from "@/components/ui/Toast";
import { LoaderCircle } from "@/components/animate-ui/icons/loader-circle";
import { Trash2 } from "@/components/animate-ui/icons/trash-2";
import { UserRound } from "@/components/animate-ui/icons/user-round";
import { UserAvatar } from "@/components/common/UserAvatar";
import { Search } from "@/components/animate-ui/icons/search";
import { ListFilter } from "@/components/animate-ui/icons/list-filter";
import { EmptyState, ErrorState, Spinner } from "@/components/ui";
import { MobileConfirmationDialog as ConfirmationDialog } from "../gallery/MobileConfirmationDialog";
import { formatLastActive, useUsersPage } from "@/pages/users/useUsersPage";
import { useEffect, useRef, useState } from "react";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import "./mobile-users.css";

export function MobileUsersPage() {
  const { language, t, me, isAdmin, navigate, action, setAction, search, setSearch, roles, setRoles, statuses, setStatuses, joinedFrom, setJoinedFrom, joinedTo, setJoinedTo, useList, sentinel, now, offlineUsers, users, activeQuery, approve, remove, disable, activate, updateRole, pagedUsers } = useUsersPage(true);
  const [searchDraft, setSearchDraft] = useState(search);
  const debouncedSearch = useDebouncedValue(searchDraft, 300);
  const searchDialog = useRef<HTMLDialogElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const filterTrigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const query = debouncedSearch.trim();
    setSearch(query.length >= 3 ? query : "");
  }, [debouncedSearch, setSearch]);
  const busy = approve.isPending || activate.isPending || disable.isPending || updateRole.isPending || remove.isPending || action !== null;
  return <>
    <main className="mobile-users" aria-label={t("Users")}>
      <form className="mobile-users__search" role="search" onSubmit={(event) => { event.preventDefault(); searchInput.current?.blur(); }}>
        <Search size={18} aria-hidden="true" />
        <input ref={searchInput} type="search" aria-label={t("Search users")} placeholder={t("Search users")} value={searchDraft} maxLength={120} onChange={(event) => { const value = event.target.value; setSearchDraft(value); if (value.trim().length < 3) setSearch(""); }} />
        {searchDraft && <button type="button" className="mobile-users__clear" aria-label={t("Clear search")} onClick={() => { setSearchDraft(""); setSearch(""); searchInput.current?.focus(); }}><CircleX size={18} aria-hidden="true" /></button>}
        <span className="mobile-user-search__divider" aria-hidden="true" />
        <button ref={filterTrigger} type="button" className="mobile-user-search__filter-button" aria-label={t("Filters")} aria-haspopup="dialog" onClick={() => searchDialog.current?.showModal()}><ListFilter size={20} aria-hidden="true" /></button>
      </form>
      <div className="mobile-users__content admin-users__content">
        {activeQuery.isLoading && <Spinner label={t("Loading users...")} />}
        {activeQuery.isError && !pagedUsers.length && <ErrorState message={t("Could not load users.")} onRetry={() => void activeQuery.refetch()} />}
        {activeQuery.data && (pagedUsers.length === 0 ? <EmptyState title={search.trim() || roles.length > 0 || statuses.length > 0 || joinedFrom || joinedTo ? "No matching users" : "No users yet"} hint={search.trim() || roles.length > 0 || statuses.length > 0 || joinedFrom || joinedTo ? "Try a different search." : "User accounts will appear here."} /> :
          <ul className="mobile-users__list">{pagedUsers.map((user) => {
            const self = user.id === me?.id;
            const online = !offlineUsers[user.id] && !!user.lastSeenAt && now - Date.parse(user.lastSeenAt) < 300_000;
            const joinedDate = new Date(user.createdAt);
            const joined = Number.isNaN(joinedDate.getTime()) ? "" : joinedDate.toLocaleDateString(language === "vi" ? "vi-VN" : "en-US");
            const elapsed = user.lastSeenAt ? now - Date.parse(user.lastSeenAt) : NaN;
            const recent = user.status === "active" && Number.isFinite(elapsed) && elapsed >= 0 && elapsed <= 6 * 60 * 60 * 1000;
            const lastActive = recent ? formatLastActive(user.lastSeenAt, language, now) : "";
            return <li key={user.id} className="mobile-users__item">
              <div className="mobile-users__avatar-wrap">
                <UserAvatar user={user} className="mobile-users__avatar" />
                {recent && (online
                  ? <span className="mobile-users__presence mobile-users__presence--online" role="img" aria-label={t("Online")} />
                  : <span className="mobile-users__presence" aria-label={`${t("Last active")} ${lastActive}`}>{elapsed < 3600000 ? `${Math.max(1, Math.floor(elapsed / 60000))}m` : `${Math.floor(elapsed / 3600000)}h`}</span>)}
              </div>
              <div className="mobile-users__details">
              <div className="mobile-users__identity"><div><strong>{user.username}</strong> <span aria-hidden="true">·</span> <span>{t(user.role)}</span></div>{joined && <span>{t("Joined")} {joined}</span>}</div>
              {isAdmin && !self && (me?.role?.toLowerCase() === "superadmin" ? user.role.toLowerCase() !== "superadmin" : user.role.toLowerCase() === "user") && <div className="mobile-users__actions">
                {user.status === "disabled" && <button type="button" disabled={busy} aria-label={t("Unblock {username}", { username: user.username })} onClick={() => setAction({ type: "activate", user })}>{activate.isPending && activate.variables === user.id && <LoaderCircle size={18} aria-hidden="true" />}{t("Unblock")}</button>}
                {user.status === "pending_approval" && <button type="button" disabled={busy} aria-label={t("Approve {username}", { username: user.username })} onClick={() => setAction({ type: "approve", user })}>{approve.isPending && approve.variables === user.id && <LoaderCircle size={18} aria-hidden="true" />}{t("Approve")}</button>}
                {!self && user.status === "active" && <button type="button" disabled={busy} aria-label={t("Block {username}", { username: user.username })} onClick={() => setAction({ type: "disable", user })}>{disable.isPending && disable.variables === user.id && <LoaderCircle size={18} aria-hidden="true" />}{t("Block")}</button>}
                {me?.role?.toLowerCase() === "superadmin" && <button className="mobile-users__role" type="button" disabled={busy} aria-label={t("Change role for {username}", { username: user.username })} title={t("Change role for {username}", { username: user.username })} onClick={() => setAction({ type: "role", user })}>{updateRole.isPending && updateRole.variables?.id === user.id ? <LoaderCircle size={18} aria-hidden="true" /> : user.role.toLowerCase() === "admin" ? <UserRoundCog size={18} aria-hidden="true" /> : <UserRound size={18} aria-hidden="true" />}</button>}
                {!self && <button className="mobile-users__delete" type="button" disabled={busy} aria-label={t("Delete {username}", { username: user.username })} title={t("Delete {username}", { username: user.username })} onClick={() => setAction({ type: "delete", user })}>{remove.isPending && remove.variables === user.id ? <LoaderCircle size={18} aria-hidden="true" /> : <Trash2 size={18} aria-hidden="true" />}</button>}
              </div>}
              </div>
            </li>;
          })}</ul>)}
        {!useList && users.isFetchNextPageError && <ErrorState message={t("Could not load more users.")} onRetry={() => void users.fetchNextPage()} />}
        {!useList && users.hasNextPage && <div ref={sentinel}>{users.isFetchingNextPage && <Spinner />}</div>}
      </div>
      <div className="mobile-users__bottom-actions">
        <button type="button" className="mobile-users__back" aria-label={t("Back to feed")} title={t("Back to feed")} onClick={() => navigate("/")}><ChevronLeft size={24} aria-hidden="true" /></button>
        {isAdmin && <button type="button" className="mobile-users__add" aria-label={t("Add user")} title={t("Add user")} onClick={() => showToast.info(t("This feature is a work in progress."))}><Plus size={24} aria-hidden="true" /></button>}
      </div>
    </main>
    <dialog ref={searchDialog} className="mobile-user-search" aria-label={t("Filters")} onClose={() => filterTrigger.current?.focus()}>
      <div className="mobile-user-search__header"><button type="button" className="mobile-user-search__close" aria-label={t("Close")} onClick={() => searchDialog.current?.close()}><X size={20} aria-hidden="true" /></button></div>
      <details name="mobile-user-filters" className="mobile-user-search__card"><summary id="role-filter-heading">{t("Role")}<ChevronDown size={18} aria-hidden="true" /></summary><div className="mobile-user-search__roles" role="group" aria-labelledby="role-filter-heading">{([{ value: "superadmin", label: "S-Admin", icon: Terminal }, { value: "admin", label: "Admin", icon: UserRoundCog }, { value: "user", label: "User", icon: UserRound }] as const).map(({ value, label, icon: Icon }) => <label key={value} className="mobile-user-search__role"><input type="checkbox" checked={roles.includes(value)} onChange={() => setRoles((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value])} /><Icon size={20} aria-hidden="true" /><span>{label}</span></label>)}</div></details>
      <details name="mobile-user-filters" className="mobile-user-search__card mobile-user-search__status-card"><summary id="status-filter-heading">{t("Status")}<ChevronDown size={18} aria-hidden="true" /></summary><div className="mobile-user-search__roles" role="group" aria-labelledby="status-filter-heading">{([{ value: "active", label: t("Active"), color: "active" }, { value: "pending_approval", label: t("Pending"), color: "pending" }, ...(isAdmin ? [{ value: "disabled", label: t("Blocked"), color: "blocked" }] : [])]).map(({ value, label, color }) => <label key={value} className="mobile-user-search__role"><input type="checkbox" checked={statuses.includes(value)} onChange={() => setStatuses((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value])} /><span className={`mobile-user-search__status-dot mobile-user-search__status-dot--${color}`} aria-hidden="true" /><span>{label}</span></label>)}</div></details>
      <details name="mobile-user-filters" className="mobile-user-search__when"><summary><span>{t("Joined date")}</span></summary><div className="mobile-user-search__dates"><DropdownRangeDatePicker from={joinedFrom} to={joinedTo} container={searchDialog} onChange={(from, to) => { setJoinedFrom(from); setJoinedTo(to); }} /></div></details>
      <div className="mobile-user-search__footer"><button type="button" onClick={() => { setRoles([]); setStatuses([]); setJoinedFrom(""); setJoinedTo(""); }}>{t("Clear all")}</button><button type="button" onClick={() => searchDialog.current?.close()}><Search size={18} aria-hidden="true" />{t("Search")}</button></div>
    </dialog>
    {action && isAdmin && <ConfirmationDialog
      confirmLabel={t(action.type === "approve" ? "Approve {username}" : action.type === "role" ? "Change role for {username}" : action.type === "activate" ? "Unblock {username}" : action.type === "disable" ? "Block {username}" : "Delete {username}", { username: action.user.username })}
      title={t(action.type === "approve" ? "Approve {username}?" : action.type === "role" ? "Change role for {username}?" : action.type === "activate" ? "Unblock {username}?" : action.type === "disable" ? "Block {username}?" : "Delete {username}?", { username: action.user.username })}
      danger={action.type === "disable" || action.type === "delete"} onClose={() => setAction(null)}
      onConfirm={async () => { if (action.type === "approve") await approve.mutateAsync(action.user.id); else if (action.type === "role") await updateRole.mutateAsync(action.user); else if (action.type === "activate") await activate.mutateAsync(action.user.id); else if (action.type === "disable") await disable.mutateAsync(action.user.id); else await remove.mutateAsync(action.user.id); }}>
      <p>{action.type === "approve" ? t("Approve {username} and activate their account so they can sign in?", { username: action.user.username }) : action.type === "role" ? t("Change {username} to {role}? They will need to sign in again to receive the new role.", { username: action.user.username, role: t(action.user.role.toLowerCase() === "admin" ? "user" : "admin") }) : action.type === "activate" ? t("Unblock {username} so they can sign in again?", { username: action.user.username }) : action.type === "disable" ? t("Block {username}? They will no longer be able to sign in or refresh their session.", { username: action.user.username }) : t("Delete {username}? Their account will be disabled and their sessions revoked.", { username: action.user.username })}</p>
    </ConfirmationDialog>}
  </>;
}

