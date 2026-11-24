import { CalendarDays, Circle } from "lucide-react";
import { AnimatePresence, motion, useIsPresent, useReducedMotion } from "motion/react";
import { SwappingText } from "@animate-ui/react/primitives/texts/swapping";
import { Shield, ShieldCheck, Unplug, User, Zap } from "lucide-react";
import { useAnimationStore } from "@/store/animationStore";
import "@/features/albums/components/album-date-sheet.css";
import { DropdownRangeDatePicker } from "@/components/ui/dropdown-range-date-picker";
import { Check } from "@/components/animate-ui/icons/check";
import { Pause } from "@/components/animate-ui/icons/pause";
import { Play } from "@/components/animate-ui/icons/play";
import { X } from "@/components/animate-ui/icons/x";
import { UserRoundCog } from "@/components/animate-ui/icons/user-round-cog";
import { CircleX } from "@/components/animate-ui/icons/circle-x";
import { LoaderCircle } from "@/components/animate-ui/icons/loader-circle";
import { Trash2 } from "@/components/animate-ui/icons/trash-2";
import { UserRound } from "@/components/animate-ui/icons/user-round";
import { UserAvatar } from "@/components/common/UserAvatar";
import { Search } from "@/components/animate-ui/icons/search";
import { IconButton, EmptyState, ErrorState, Spinner } from "@/components/ui";
import { PageDataPlaceholder } from "@/components/ui/PageDataPlaceholder";
import { MobileConfirmationDialog as ConfirmationDialog } from "../gallery/MobileConfirmationDialog";
import { formatLastActive, useUsersPage } from "@/pages/users/useUsersPage";
import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useRouteLoadingOverlay } from "@/features/ui-resources/useRouteLoadingOverlay";
import { useLocation } from "react-router-dom";
import "./mobile-users.css";

const roleOptions = [
  { value: "admin", label: "Admin", Icon: Shield },
  { value: "superadmin", label: "S-Admin", Icon: ShieldCheck },
  { value: "user", label: "User", Icon: User },
];

const statusOptions = [
  { value: "active", label: "Active", Icon: null },
  { value: "pending_approval", label: "Pending", Icon: null },
  { value: "disabled", label: "Paused", Icon: null },
];

function RowText({ text, animate }: { text: string; animate: boolean }) {
  return animate ? <SwappingText text={text} stagger={0.015} style={{ display: "inline", whiteSpace: "pre-wrap" }} /> : text;
}

const VisibleUserIds = createContext<ReadonlySet<string>>(new Set());

function RowAvatar({ userId, status, animate, fadeIn, children }: {
  userId: string; status: string; animate: boolean; fadeIn: boolean; children: ReactNode;
}) {
  const rowPresent = useIsPresent();
  const visibleIds = useContext(VisibleUserIds);
  if (!rowPresent && visibleIds.has(userId)) return null;

  return <span className="mobile-users__avatar-swap">
    <AnimatePresence initial={false} custom={visibleIds}>
      <motion.span key={userId} className="mobile-users__avatar-layer" data-avatar-id={userId} data-status={status}
        initial={animate && fadeIn ? { opacity: 0 } : false} animate={{ opacity: 1 }}
        exit="removed" variants={{ removed: (nextIds: ReadonlySet<string>) => ({
          opacity: 0, transition: { duration: animate && !nextIds.has(userId) ? 0.2 : 0 },
        }) }} transition={{ duration: animate ? 0.2 : 0 }}>
        {children}
      </motion.span>
    </AnimatePresence>
  </span>;
}

export function MobileUsersPage() {
  const { directoryUsers, language, t, me, isAdmin, action, setAction, search, setSearch, roles, setRoles, statuses, setStatuses, joinedFrom, setJoinedFrom, joinedTo, setJoinedTo, useList, sentinel, now, isOnline, users, activeQuery, approve, reject, remove, disable, activate, updateRole, pagedUsers } = useUsersPage(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const profileDialog = useRef<HTMLDialogElement>(null);
  const selectedUser = pagedUsers.find((user) => user.id === selectedId);
  useEffect(() => {
    const dialog = profileDialog.current;
    if (!dialog) return;
    if (selectedUser && !dialog.open) dialog.showModal();
    if (!selectedUser && !action && dialog.open) dialog.close();
  }, [selectedUser, action]);
  const [searchDraft, setSearchDraft] = useState(search);
  const [filterDraft, setFilterDraft] = useState({ joinedFrom: "", joinedTo: "" });
  const [openFilter, setOpenFilter] = useState<"role" | "status">("role");
  const debouncedSearch = useDebouncedValue(searchDraft);
  const searchDialog = useRef<HTMLDialogElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const filterTrigger = useRef<HTMLButtonElement>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetClosing, setSheetClosing] = useState(false);
  const motionEnabled = useAnimationStore((state) => state.enabled);
  const reducedMotion = useReducedMotion();
  const animateSheet = motionEnabled && !reducedMotion;
  const { path: overlayPath } = useRouteLoadingOverlay();
  const { pathname } = useLocation();
  const rowsCovered = overlayPath === pathname;
  const slideAvatars = animateSheet && !rowsCovered;
  const visibleUserIds = new Set(pagedUsers.map((user) => user.id));
  const listRef = useRef<HTMLUListElement>(null);
  const avatarPositions = useRef(new Map<string, { layer: HTMLElement; top: number; animation?: Animation }>());
  useLayoutEffect(() => {
    const list = listRef.current;
    const previous = avatarPositions.current;
    const next = new Map<string, { layer: HTMLElement; top: number; animation?: Animation }>();
    const listTop = list?.getBoundingClientRect().top ?? 0;

    list?.querySelectorAll<HTMLButtonElement>("[data-avatar-user]").forEach((button, index) => {
      const userId = pagedUsers[index]?.id;
      if (userId === undefined || button.dataset.avatarUser !== userId) return;
      const layer = Array.from(button.querySelectorAll<HTMLElement>("[data-avatar-id]"))
        .find((element) => element.dataset.avatarId === userId);
      if (!layer) return;

      const top = button.getBoundingClientRect().top - listTop;
      const old = previous.get(userId);
      if (slideAvatars && old?.layer === layer && old.top === top) {
        next.set(userId, old);
        return;
      }

      let animation: Animation | undefined;
      if (slideAvatars && old) {
        const transform = old.animation && getComputedStyle(old.layer).transform;
        const offset = transform && transform !== "none" ? new DOMMatrixReadOnly(transform).m42 : 0;
        const delta = old.top + offset - top;
        if (Math.abs(delta) > 0.5) {
          animation = layer.animate([{ transform: `translateY(${delta}px)` }, { transform: "translateY(0)" }], {
            duration: 240, easing: "cubic-bezier(.22, 1, .36, 1)",
          });
        }
      }
      old?.animation?.cancel();
      next.set(userId, { layer, top, animation });
    });

    for (const [userId, old] of previous) {
      if (!next.has(userId)) old.animation?.cancel();
    }
    avatarPositions.current = next;
  });
  const previousRowCount = useRef(pagedUsers.length);
  const lastExitIndex = previousRowCount.current - 1;
  useLayoutEffect(() => { previousRowCount.current = pagedUsers.length; }, [pagedUsers.length]);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  useEffect(() => { if (sheetOpen) searchDialog.current?.showModal(); }, [sheetOpen]);
  useEffect(() => {
    const query = debouncedSearch.trim();
    setSearch(query.length >= 3 ? query : "");
  }, [debouncedSearch, setSearch]);
  function openFilters() {
    setFilterDraft({ joinedFrom, joinedTo });
    searchInput.current?.blur();
    setSheetClosing(false);
    setSheetOpen(true);
  }

  function finishCloseSheet() {
    searchDialog.current?.close();
    setSheetOpen(false);
    setSheetClosing(false);
    filterTrigger.current?.focus();
  }

  function closeSheet() {
    if (animateSheet) setSheetClosing(true);
    else finishCloseSheet();
  }

  function applyFilters() {
    setJoinedFrom(filterDraft.joinedFrom);
    setJoinedTo(filterDraft.joinedTo);
    closeSheet();
  }

  const inlineFilters = [
    { id: "role", label: "Role", Icon: Zap, options: roleOptions, selected: roles, setSelected: setRoles },
    { id: "status", label: "Status", Icon: Unplug, options: statusOptions, selected: statuses, setSelected: setStatuses },
  ] as const;

  const busy = approve.isPending || reject.isPending || activate.isPending || disable.isPending || updateRole.isPending || remove.isPending || action !== null;
  return <>
    <main className="mobile-users" aria-label={t("Users")}>
      <form className="mobile-users__search" role="search" onSubmit={(event) => { event.preventDefault(); searchInput.current?.blur(); }}>
        <Search size={18} aria-hidden="true" />
        <input ref={searchInput} type="search" aria-label={t("Search users")} placeholder={t("Search users")} value={searchDraft} maxLength={120} onChange={(event) => { const value = event.target.value; setSearchDraft(value); if (value.trim().length < 3) setSearch(""); }} />
        <div className="mobile-users__action-slot">
          <motion.div className="mobile-users__calendar-motion" initial={false}
            animate={searchDraft ? { x: ["0%", "90%", "100%"], opacity: [1, 1, 0] } : { x: ["100%", "90%", "0%"], opacity: [0, 1, 1] }}
            transition={{ duration: animateSheet ? .3 : 0, times: searchDraft ? [0, .9, 1] : [0, .1, 1], ease: "linear" }}>
            <IconButton ref={filterTrigger} className="mobile-users__search-action" aria-label={t("Joined date")} title={t("Joined date")} aria-haspopup="dialog" disabled={!!searchDraft} onClick={openFilters}>
              <CalendarDays />
            </IconButton>
          </motion.div>
          <motion.button type="button" className="mobile-users__clear" aria-label={t("Clear search")} disabled={!searchDraft}
            initial={false} animate={searchDraft ? { opacity: [0, 0, 1] } : { opacity: [1, 0, 0] }}
            transition={{ duration: animateSheet ? .3 : 0, times: searchDraft ? [0, .85, 1] : [0, .15, 1], ease: "linear" }}
            onClick={() => { setSearchDraft(""); setSearch(""); searchInput.current?.focus(); }}><CircleX size={18} aria-hidden="true" /></motion.button>
        </div>
      </form>
      {isAdmin && (
        <div className="mobile-users__filters" data-animate={animateSheet}>
          {inlineFilters.map(({ id, label, Icon, options, selected, setSelected }) => {
            const expanded = openFilter === id;
            const panelId = `mobile-users-filter-${id}`;
            return (
              <div key={id} className="mobile-users__filter" data-filter={id} data-expanded={expanded}>
                <button
                  type="button"
                  className="mobile-users__filter-trigger"
                  aria-expanded={expanded}
                  aria-controls={panelId}
                  onClick={() => setOpenFilter(id)}
                >
                  <Icon size={18} aria-hidden="true" />
                  <span>{t(label)}</span>
                </button>
                <div id={panelId} className="mobile-users__filter-panel" aria-hidden={!expanded}>
                  <div className="mobile-users__filter-clip">
                    <div className="mobile-users__filter-options" role="group" aria-label={t(label)}>
                      {options.map(({ value, label: optionLabel, Icon: OptionIcon }) => (
                        <button
                          key={value}
                          type="button"
                          disabled={!expanded}
                          aria-pressed={selected.includes(value)}
                          onClick={() => setSelected((current) => current.includes(value)
                            ? current.filter((item) => item !== value)
                            : [...current, value])}
                        >
                          {OptionIcon
                            ? <OptionIcon size={18} aria-hidden="true" />
                            : <span className="mobile-users__status-dot" data-status={value} aria-hidden="true" />}
                          <span>{optionLabel === "S-Admin" ? optionLabel : t(optionLabel)}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <div className="mobile-users__content admin-users__content">
        {activeQuery.isLoading && <PageDataPlaceholder layout="users" label={t("Loading users...")} />}
        {activeQuery.isError && !pagedUsers.length && <ErrorState message={t("Could not load users.")} onRetry={() => void activeQuery.refetch()} />}
        {activeQuery.data && <>
          <VisibleUserIds.Provider value={visibleUserIds}>
          <ul ref={listRef} className="mobile-users__list"><AnimatePresence custom={lastExitIndex}>{pagedUsers.map((user, index) => {
            const online = isOnline(user);
            const joinedDate = new Date(user.createdAt);
            const joined = Number.isNaN(joinedDate.getTime()) ? "" : joinedDate.toLocaleDateString(language === "vi" ? "vi-VN" : "en-US", {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
            });
            const statusLabel = user.status === "disabled" ? t("Paused") : user.status === "pending_approval" ? t("Pending") : null;
            const joinedLabel = joined ? `${t("Joined")} ${joined}` : "";
            const roleLabel = t(user.role.toLowerCase() === "superadmin" ? "Super admin" : user.role);
            const swapText = slideAvatars;
            const newAvatar = !avatarPositions.current.has(user.id);
            const elapsed = user.lastSeenAt ? Math.max(0, now - Date.parse(user.lastSeenAt)) : NaN;
            const recent = user.status === "active" && Number.isFinite(elapsed) && elapsed >= 0 && elapsed <= 6 * 60 * 60 * 1000;
            const lastActive = recent ? formatLastActive(user.lastSeenAt, language, now) : "";
            return <motion.li key={index} className="mobile-users__item" data-status={user.status}
              initial={animateSheet && newAvatar ? { opacity: 0 } : false} animate={{ opacity: animateSheet && rowsCovered ? 0 : 1 }}
              variants={{ exit: (lastIndex: number) => ({ opacity: 0, transition: { duration: animateSheet ? 0.2 : 0, delay: animateSheet ? Math.max(0, lastIndex - index) * 0.06 : 0 } }) }}
              exit="exit" transition={{ duration: animateSheet && !rowsCovered ? 0.24 : 0, delay: animateSheet && !rowsCovered ? Math.min(index, 6) * 0.04 : 0 }}>
              <button type="button" className="mobile-users__avatar-wrap" data-avatar-user={user.id} aria-label={user.username} onClick={() => setSelectedId(user.id)}>
                <RowAvatar userId={user.id} status={user.status} animate={slideAvatars} fadeIn={newAvatar}>
                <UserAvatar user={user} className="mobile-users__avatar" />
                <AnimatePresence>{statusLabel && <motion.span key={user.status} className="mobile-users__avatar-mask" aria-hidden="true" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: animateSheet ? 0.2 : 0 }}>
                  {user.status === "disabled" ? <Pause size={20} /> : (
                    <Circle size={20}>
                      <path d="M12 12l4 2" />
                      <path className="mobile-users__clock-hand" d="M12 12V6" />
                    </Circle>
                  )}
                </motion.span>}</AnimatePresence>
                {recent && (online
                  ? <span className="mobile-users__presence mobile-users__presence--online" role="img" aria-label={t("Online")} />
                  : <span className="mobile-users__presence" aria-label={`${t("Last active")} ${lastActive}`}>{elapsed < 3600000 ? `${Math.max(1, Math.floor(elapsed / 60000))}m` : `${Math.floor(elapsed / 3600000)}h`}</span>)}
                </RowAvatar>
              </button>
              <div className="mobile-users__details">
                <div className="mobile-users__identity">
                  <div>
                    <button type="button" className="mobile-users__name" aria-label={user.username} onClick={() => setSelectedId(user.id)}>
                      <RowText text={user.username} animate={swapText} />
                    </button>
                  </div>
                  <span>
                    <RowText text={joinedLabel ? `${joinedLabel} · ${roleLabel}` : roleLabel} animate={swapText} />
                    <span className="mobile-users__status"><RowText text={statusLabel ? ` ·\u00a0${statusLabel}` : ""} animate={swapText} /></span>
                  </span>
                </div>
              </div>
            </motion.li>;
          })}</AnimatePresence></ul>
          </VisibleUserIds.Provider>
          {pagedUsers.length === 0 && <EmptyState title={search.trim() || roles.length > 0 || statuses.length > 0 || joinedFrom || joinedTo ? "No matching users" : "No users yet"} hint={search.trim() || roles.length > 0 || statuses.length > 0 || joinedFrom || joinedTo ? "Try a different search." : "User accounts will appear here."} />}
        </>}
        {!useList && users.isFetchNextPageError && <ErrorState message={t("Could not load more users.")} onRetry={() => void users.fetchNextPage()} />}
        {!useList && users.hasNextPage && <div ref={sentinel}>{users.isFetchingNextPage && <Spinner />}</div>}
      </div>
    </main>
    {sheetOpen && <dialog ref={searchDialog} className="album-date-sheet mobile-users-date-sheet" aria-label={t("Joined date")}
      onCancel={(event) => { event.preventDefault(); closeSheet(); }}>
      <motion.div aria-hidden="true" className="album-date-sheet__scrim" initial={animateSheet ? { opacity: 0 } : false}
        animate={{ opacity: sheetClosing ? 0 : 1 }} transition={{ duration: animateSheet ? .08 : 0, delay: sheetClosing && animateSheet ? .24 : 0 }}
        onAnimationComplete={() => { if (sheetClosing) finishCloseSheet(); }} onClick={closeSheet} />
      <motion.section className="album-date-sheet__panel" initial={animateSheet ? { y: "100%" } : false}
        animate={{ y: sheetClosing ? "100%" : 0 }} transition={{ duration: animateSheet ? .24 : 0, delay: !sheetClosing && animateSheet ? .08 : 0, ease: sheetClosing ? "easeIn" : "easeOut" }}>
        <header className="album-date-sheet__header" onTouchStart={(event) => { const touch = event.touches[0]; touchStart.current = { x: touch.clientX, y: touch.clientY }; }}
          onTouchEnd={(event) => { const start = touchStart.current; touchStart.current = null; const touch = event.changedTouches[0]; if (start && touch.clientY - start.y >= 64 && touch.clientY - start.y > Math.abs(touch.clientX - start.x)) closeSheet(); }}>
          <span className="album-date-sheet__handle" aria-hidden="true" /><h2>{t("Joined date")}</h2>
        </header>
        <div className="album-date-sheet__body"><DropdownRangeDatePicker from={filterDraft.joinedFrom} to={filterDraft.joinedTo} container={searchDialog} markedDates={directoryUsers.filter((user) => user.id !== me?.id && user.status !== "rejected").map((user) => user.createdAt)} onChange={(from, to) => setFilterDraft((current) => ({ ...current, joinedFrom: from, joinedTo: to }))} /></div>
        <footer className="album-date-sheet__footer mobile-users-date-sheet__footer">
          <button type="button" onClick={applyFilters}>{t("Done")}</button>
        </footer>
      </motion.section>
    </dialog>}
    <dialog ref={profileDialog} className="mobile-user-profile" aria-label={selectedUser?.username} onClose={() => setSelectedId(null)}>
      {selectedUser && <><div className="mobile-user-profile__hero">
        <UserAvatar user={selectedUser} className="mobile-user-profile__image" />
        <div className="mobile-user-profile__shade" />
        <button type="button" className="mobile-user-profile__close" aria-label={t("Close")} onClick={() => profileDialog.current?.close()}><X size={20} aria-hidden="true" /></button>
        <div className="mobile-user-profile__identity"><h2>{selectedUser.username}</h2><p>{t(selectedUser.role.toLowerCase() === "superadmin" ? "Super admin" : selectedUser.role)}</p>
              {isAdmin && selectedUser.id !== me?.id && (me?.role?.toLowerCase() === "superadmin" ? selectedUser.role.toLowerCase() !== "superadmin" : selectedUser.role.toLowerCase() === "user") && <div className="mobile-user-profile__actions">
                {selectedUser.status === "disabled" && <IconButton size="button" shape="circle" type="button" disabled={busy} aria-label={t("Resume {username}", { username: selectedUser.username })} onClick={() => setAction({ type: "activate", user: selectedUser })}>{activate.isPending && activate.variables === selectedUser.id ? <LoaderCircle size={18} aria-hidden="true" /> : <Play size={20} aria-hidden="true" />}</IconButton>}
                {selectedUser.status === "pending_approval" && <IconButton size="button" shape="circle" type="button" disabled={busy} aria-label={t("Approve {username}", { username: selectedUser.username })} onClick={() => setAction({ type: "approve", user: selectedUser })}>{approve.isPending && approve.variables === selectedUser.id ? <LoaderCircle size={18} aria-hidden="true" /> : <Check size={20} aria-hidden="true" />}</IconButton>}
                {selectedUser.id !== me?.id && selectedUser.status === "active" && <IconButton size="button" shape="circle" type="button" disabled={busy} aria-label={t("Pause {username}", { username: selectedUser.username })} onClick={() => setAction({ type: "disable", user: selectedUser })}>{disable.isPending && disable.variables === selectedUser.id ? <LoaderCircle size={18} aria-hidden="true" /> : <Pause size={20} aria-hidden="true" />}</IconButton>}
                {me?.role?.toLowerCase() === "superadmin" && <IconButton size="button" shape="circle" type="button" disabled={busy} aria-label={t("Change role for {username}", { username: selectedUser.username })} title={t("Change role for {username}", { username: selectedUser.username })} onClick={() => setAction({ type: "role", user: selectedUser })}>{updateRole.isPending && updateRole.variables?.id === selectedUser.id ? <LoaderCircle size={18} aria-hidden="true" /> : selectedUser.role.toLowerCase() === "admin" ? <UserRoundCog size={18} aria-hidden="true" /> : <UserRound size={18} aria-hidden="true" />}</IconButton>}
                {selectedUser.id !== me?.id && <IconButton size="button" shape="circle" className="mobile-user-profile__delete" type="button" disabled={busy} aria-label={t(selectedUser.status === "pending_approval" ? "Reject {username}" : "Delete {username}", { username: selectedUser.username })} title={t(selectedUser.status === "pending_approval" ? "Reject {username}" : "Delete {username}", { username: selectedUser.username })} onClick={() => setAction({ type: selectedUser.status === "pending_approval" ? "reject" : "delete", user: selectedUser })}>{(reject.isPending && reject.variables === selectedUser.id) || (remove.isPending && remove.variables === selectedUser.id) ? <LoaderCircle size={18} aria-hidden="true" /> : selectedUser.status === "pending_approval" ? <X size={20} aria-hidden="true" /> : <Trash2 size={20} aria-hidden="true" />}</IconButton>}
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

