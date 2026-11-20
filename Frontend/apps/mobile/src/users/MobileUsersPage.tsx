import { DropdownRangeDatePicker } from "@/components/ui/dropdown-range-date-picker";
import { Check } from "@/components/animate-ui/icons/check";
import { Pause } from "@/components/animate-ui/icons/pause";
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
import { IconButton, EmptyState, ErrorState, Spinner } from "@/components/ui";
import { MobileConfirmationDialog as ConfirmationDialog } from "../gallery/MobileConfirmationDialog";
import { formatLastActive, useUsersPage } from "@/pages/users/useUsersPage";
import { useEffect, useRef, useState } from "react";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import "./mobile-users.css";

export function MobileUsersPage() {
  const { language, t, me, isAdmin, navigate, action, setAction, search, setSearch, roles, setRoles, statuses, setStatuses, joinedFrom, setJoinedFrom, joinedTo, setJoinedTo, useList, sentinel, now, offlineUsers, users, activeQuery, approve, reject, remove, disable, activate, updateRole, pagedUsers } = useUsersPage(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const profileDialog = useRef<HTMLDialogElement>(null);
  const selectedUser = pagedUsers.find((user) => user.id === selectedId);
  useEffect(() => { if (selectedId && profileDialog.current && !profileDialog.current.open) profileDialog.current.showModal(); }, [selectedId]);
  const [searchDraft, setSearchDraft] = useState(search);
  const debouncedSearch = useDebouncedValue(searchDraft, 300);
  const searchDialog = useRef<HTMLDialogElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const filterTrigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const query = debouncedSearch.trim();
    setSearch(query.length >= 3 ? query : "");
  }, [debouncedSearch, setSearch]);
  const busy = approve.isPending || reject.isPending || activate.isPending || disable.isPending || updateRole.isPending || remove.isPending || action !== null;
  return <>
    <main className="mobile-users" aria-label={t("Users")}>
      <h1 className="mobile-users__title"><span>{t("User")}</span></h1>
      <form className="mobile-users__search" role="search" onSubmit={(event) => { event.preventDefault(); searchInput.current?.blur(); }}>
        <Search size={18} aria-hidden="true" />
        <input ref={searchInput} type="search" aria-label={t("Search users")} placeholder={t("Search users")} value={searchDraft} maxLength={120} onChange={(event) => { const value = event.target.value; setSearchDraft(value); if (value.trim().length < 3) setSearch(""); }} />
        {searchDraft && <button type="button" className="mobile-users__clear" aria-label={t("Clear search")} onClick={() => { setSearchDraft(""); setSearch(""); searchInput.current?.focus(); }}><CircleX size={18} aria-hidden="true" /></button>}
        <span className="mobile-user-search__divider" aria-hidden="true" />
        <button ref={filterTrigger} type="button" className="mobile-user-search__filter-button" aria-label={t("Filters")} aria-haspopup="dialog" onClick={() => { const dialog = searchDialog.current; if (!dialog) return; searchInput.current?.blur(); const sections = dialog.querySelectorAll<HTMLDetailsElement>('.mobile-user-search__content > details'); sections.forEach((section) => { section.open = false; }); if (sections[0]) sections[0].open = true; dialog.showModal(); }}><ListFilter size={20} aria-hidden="true" /></button>
      </form>
      <div className="mobile-users__content admin-users__content">
        {activeQuery.isLoading && <Spinner label={t("Loading users...")} />}
        {activeQuery.isError && !pagedUsers.length && <ErrorState message={t("Could not load users.")} onRetry={() => void activeQuery.refetch()} />}
        {activeQuery.data && (pagedUsers.length === 0 ? <EmptyState title={search.trim() || roles.length > 0 || statuses.length > 0 || joinedFrom || joinedTo ? "No matching users" : "No users yet"} hint={search.trim() || roles.length > 0 || statuses.length > 0 || joinedFrom || joinedTo ? "Try a different search." : "User accounts will appear here."} /> :
          <ul className="mobile-users__list">{pagedUsers.map((user) => {
            const online = !offlineUsers[user.id] && !!user.lastSeenAt && now - Date.parse(user.lastSeenAt) < 300_000;
            const joinedDate = new Date(user.createdAt);
            const joined = Number.isNaN(joinedDate.getTime()) ? "" : joinedDate.toLocaleDateString(language === "vi" ? "vi-VN" : "en-US");
            const elapsed = user.lastSeenAt ? now - Date.parse(user.lastSeenAt) : NaN;
            const recent = user.status === "active" && Number.isFinite(elapsed) && elapsed >= 0 && elapsed <= 6 * 60 * 60 * 1000;
            const lastActive = recent ? formatLastActive(user.lastSeenAt, language, now) : "";
            return <li key={user.id} className="mobile-users__item">
              <button type="button" className="mobile-users__avatar-wrap" aria-label={user.username} onClick={() => setSelectedId(user.id)}>
                <UserAvatar user={user} className="mobile-users__avatar" />
                {recent && (online
                  ? <span className="mobile-users__presence mobile-users__presence--online" role="img" aria-label={t("Online")} />
                  : <span className="mobile-users__presence" aria-label={`${t("Last active")} ${lastActive}`}>{elapsed < 3600000 ? `${Math.max(1, Math.floor(elapsed / 60000))}m` : `${Math.floor(elapsed / 3600000)}h`}</span>)}
              </button>
              <div className="mobile-users__details">
              <div className="mobile-users__identity"><div><button type="button" className="mobile-users__name" onClick={() => setSelectedId(user.id)}>{user.username}</button> <span aria-hidden="true">·</span> <span>{t(user.role.toLowerCase() === "superadmin" ? "Super admin" : user.role)}</span></div>{joined && <span>{t("Joined")} {joined}</span>}</div>
              {isAdmin && user.id !== me?.id && (me?.role?.toLowerCase() === "superadmin" ? user.role.toLowerCase() !== "superadmin" : user.role.toLowerCase() === "user") && <div className="mobile-users__actions">
                {user.status === "pending_approval" && <button type="button" disabled={busy} aria-label={t("Approve {username}", { username: user.username })} onClick={() => setAction({ type: "approve", user })}>{approve.isPending && approve.variables === user.id ? <LoaderCircle size={18} aria-hidden="true" /> : <Check size={20} aria-hidden="true" />}{t("Approve")}</button>}
                {user.status === "disabled" && <IconButton size="button" type="button" disabled={busy} aria-label={t("Resume {username}", { username: user.username })} title={t("Resume {username}", { username: user.username })} onClick={() => setAction({ type: "activate", user })}>{activate.isPending && activate.variables === user.id ? <LoaderCircle size={18} aria-hidden="true" /> : <UserRound size={20} aria-hidden="true" />}</IconButton>}
                {user.status === "active" && <button type="button" disabled={busy} aria-label={t("Pause {username}", { username: user.username })} onClick={() => setAction({ type: "disable", user })}>{disable.isPending && disable.variables === user.id ? <LoaderCircle size={18} aria-hidden="true" /> : <Pause size={20} aria-hidden="true" />}{t("Pause")}</button>}
                {me?.role?.toLowerCase() === "superadmin" && <IconButton size="button" type="button" className="mobile-users__role" disabled={busy} aria-label={t("Change role for {username}", { username: user.username })} title={t("Change role for {username}", { username: user.username })} onClick={() => setAction({ type: "role", user })}>{updateRole.isPending && updateRole.variables?.id === user.id ? <LoaderCircle size={18} aria-hidden="true" /> : user.role.toLowerCase() === "admin" ? <UserRoundCog size={18} aria-hidden="true" /> : <UserRound size={18} aria-hidden="true" />}</IconButton>}
                <IconButton size="button" type="button" className="mobile-users__delete" disabled={busy} aria-label={t(user.status === "pending_approval" ? "Reject {username}" : "Delete {username}", { username: user.username })} title={t(user.status === "pending_approval" ? "Reject {username}" : "Delete {username}", { username: user.username })} onClick={() => setAction({ type: user.status === "pending_approval" ? "reject" : "delete", user })}>{(reject.isPending && reject.variables === user.id) || (remove.isPending && remove.variables === user.id) ? <LoaderCircle size={18} aria-hidden="true" /> : user.status === "pending_approval" ? <X size={20} aria-hidden="true" /> : <Trash2 size={20} aria-hidden="true" />}</IconButton>
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
    <dialog ref={searchDialog} className="mobile-user-search" aria-label={t("Filters")} onClose={() => { searchInput.current?.blur(); filterTrigger.current?.focus(); }}>
      <div className="mobile-user-search__content" onToggle={(event) => { const section = event.target; if (section instanceof HTMLDetailsElement && section.open && section.classList.contains("mobile-user-search__card")) { const joined = searchDialog.current?.querySelector<HTMLDetailsElement>(".mobile-user-search__when"); if (joined) joined.open = false; } }}>
      <div className="mobile-user-search__header"><button type="button" className="mobile-user-search__close" aria-label={t("Close")} onClick={() => searchDialog.current?.close()}><X size={20} aria-hidden="true" /></button></div>
      <details className="mobile-user-search__card"><summary id="role-filter-heading">{t("Role")}<ChevronDown size={18} aria-hidden="true" /></summary><div className="mobile-user-search__roles" role="group" aria-labelledby="role-filter-heading">{([{ value: "superadmin", label: "S-Admin", icon: Terminal }, { value: "admin", label: "Admin", icon: UserRoundCog }, { value: "user", label: "User", icon: UserRound }] as const).map(({ value, label, icon: Icon }) => <label key={value} className="mobile-user-search__role"><input type="checkbox" checked={roles.includes(value)} onChange={() => setRoles((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value])} /><Icon size={20} aria-hidden="true" /><span>{label}</span></label>)}</div></details>
      <details className="mobile-user-search__card mobile-user-search__status-card"><summary id="status-filter-heading">{t("Status")}<ChevronDown size={18} aria-hidden="true" /></summary><div className="mobile-user-search__roles" role="group" aria-labelledby="status-filter-heading">{([{ value: "active", label: t("Active"), color: "active" }, { value: "pending_approval", label: t("Pending"), color: "pending" }, ...(isAdmin ? [{ value: "disabled", label: t("Paused"), color: "blocked" }, { value: "rejected", label: t("Rejected"), color: "blocked" }] : [])]).map(({ value, label, color }) => <label key={value} className="mobile-user-search__role"><input type="checkbox" checked={statuses.includes(value)} onChange={() => setStatuses((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value])} /><span className={`mobile-user-search__status-dot mobile-user-search__status-dot--${color}`} aria-hidden="true" /><span>{label}</span></label>)}</div></details>
      <details className="mobile-user-search__when" onToggle={(event) => { if (event.currentTarget.open) searchDialog.current?.querySelectorAll<HTMLDetailsElement>(".mobile-user-search__card[open]").forEach((section) => { section.open = false; }); }}><summary><span>{t("Joined date")}</span><ChevronDown size={18} aria-hidden="true" /></summary><div className="mobile-user-search__dates"><DropdownRangeDatePicker from={joinedFrom} to={joinedTo} container={searchDialog} onChange={(from, to) => { setJoinedFrom(from); setJoinedTo(to); }} /></div></details>
      </div>
      <div className="mobile-user-search__footer"><button type="button" onClick={() => { setRoles([]); setStatuses([]); setJoinedFrom(""); setJoinedTo(""); }}>{t("Clear all")}</button><button type="button" onClick={() => searchDialog.current?.close()}><Search size={18} aria-hidden="true" />{t("Search")}</button></div>
    </dialog>
    <dialog ref={profileDialog} className="mobile-user-profile" aria-label={selectedUser?.username} onClose={() => setSelectedId(null)}>
      {selectedUser && <><div className="mobile-user-profile__hero">
        <UserAvatar user={selectedUser} className="mobile-user-profile__image" />
        <div className="mobile-user-profile__shade" />
        <button type="button" className="mobile-user-profile__close" aria-label={t("Close")} onClick={() => profileDialog.current?.close()}><X size={20} aria-hidden="true" /></button>
        <div className="mobile-user-profile__identity"><h2>{selectedUser.username}</h2><p>{t(selectedUser.role.toLowerCase() === "superadmin" ? "Super admin" : selectedUser.role)}</p>
              {isAdmin && selectedUser.id !== me?.id && (me?.role?.toLowerCase() === "superadmin" ? selectedUser.role.toLowerCase() !== "superadmin" : selectedUser.role.toLowerCase() === "user") && <div className="mobile-user-profile__actions">
                {selectedUser.status === "disabled" && <IconButton size="button" shape="circle" type="button" disabled={busy} aria-label={t("Resume {username}", { username: selectedUser.username })} onClick={() => setAction({ type: "activate", user: selectedUser })}>{activate.isPending && activate.variables === selectedUser.id && <LoaderCircle size={18} aria-hidden="true" />}<UserRound size={20} aria-hidden="true" /></IconButton>}
                {selectedUser.status === "pending_approval" && <IconButton size="button" shape="circle" type="button" disabled={busy} aria-label={t("Approve {username}", { username: selectedUser.username })} onClick={() => setAction({ type: "approve", user: selectedUser })}>{approve.isPending && approve.variables === selectedUser.id ? <LoaderCircle size={18} aria-hidden="true" /> : <Check size={20} aria-hidden="true" />}</IconButton>}
                {selectedUser.id !== me?.id && selectedUser.status === "active" && <IconButton size="button" shape="circle" type="button" disabled={busy} aria-label={t("Pause {username}", { username: selectedUser.username })} onClick={() => setAction({ type: "disable", user: selectedUser })}>{disable.isPending && disable.variables === selectedUser.id ? <LoaderCircle size={18} aria-hidden="true" /> : <Pause size={20} aria-hidden="true" />}</IconButton>}
                {me?.role?.toLowerCase() === "superadmin" && <IconButton size="button" shape="circle" className="mobile-users__role" type="button" disabled={busy} aria-label={t("Change role for {username}", { username: selectedUser.username })} title={t("Change role for {username}", { username: selectedUser.username })} onClick={() => setAction({ type: "role", user: selectedUser })}>{updateRole.isPending && updateRole.variables?.id === selectedUser.id ? <LoaderCircle size={18} aria-hidden="true" /> : selectedUser.role.toLowerCase() === "admin" ? <UserRoundCog size={18} aria-hidden="true" /> : <UserRound size={18} aria-hidden="true" />}</IconButton>}
                {selectedUser.id !== me?.id && <IconButton size="button" shape="circle" className="mobile-users__delete" type="button" disabled={busy} aria-label={t(selectedUser.status === "pending_approval" ? "Reject {username}" : "Delete {username}", { username: selectedUser.username })} title={t(selectedUser.status === "pending_approval" ? "Reject {username}" : "Delete {username}", { username: selectedUser.username })} onClick={() => setAction({ type: selectedUser.status === "pending_approval" ? "reject" : "delete", user: selectedUser })}>{(reject.isPending && reject.variables === selectedUser.id) || (remove.isPending && remove.variables === selectedUser.id) ? <LoaderCircle size={18} aria-hidden="true" /> : selectedUser.status === "pending_approval" ? <X size={20} aria-hidden="true" /> : <Trash2 size={20} aria-hidden="true" />}</IconButton>}
              </div>}
        </div></div><div className="mobile-user-profile__body" /></>}
    </dialog>
    {action && isAdmin && <ConfirmationDialog
      portalContainer={profileDialog.current?.open ? profileDialog.current : undefined}
      confirmLabel={t(action.type === "approve" ? "Approve {username}" : action.type === "reject" ? "Reject {username}" : action.type === "role" ? "Change role for {username}" : action.type === "activate" ? "Resume {username}" : action.type === "disable" ? "Pause {username}" : "Delete {username}", { username: action.user.username })}
      title={t(action.type === "approve" ? "Approve {username}?" : action.type === "reject" ? "Reject {username}?" : action.type === "role" ? "Change role for {username}?" : action.type === "activate" ? "Resume {username}?" : action.type === "disable" ? "Pause {username}?" : "Delete {username}?", { username: action.user.username })}
      danger={action.type === "disable" || action.type === "reject" || action.type === "delete"} onClose={() => setAction(null)}
      onConfirm={async () => { if (action.type === "approve") await approve.mutateAsync(action.user.id); else if (action.type === "reject") await reject.mutateAsync(action.user.id); else if (action.type === "role") await updateRole.mutateAsync(action.user); else if (action.type === "activate") await activate.mutateAsync(action.user.id); else if (action.type === "disable") await disable.mutateAsync(action.user.id); else await remove.mutateAsync(action.user.id); }}>
      <p>{action.type === "approve" ? t("Approve {username} and allow them to create and update content?", { username: action.user.username }) : action.type === "reject" ? t("Reject {username}? They can request approval again.", { username: action.user.username }) : action.type === "role" ? t("Change {username} to {role}? They will need to sign in again to receive the new role.", { username: action.user.username, role: t(action.user.role.toLowerCase() === "admin" ? "user" : "admin") }) : action.type === "activate" ? t("Resume {username} so they can make changes again?", { username: action.user.username }) : action.type === "disable" ? t("Pause {username}? They can view content but cannot make changes.", { username: action.user.username }) : t("Delete {username}? Their account will be disabled and their sessions revoked.", { username: action.user.username })}</p>
    </ConfirmationDialog>}
  </>;
}

