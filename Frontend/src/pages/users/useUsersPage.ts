import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale } from "../../context/LocaleContext";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import { useAuthStore } from "../../store/authStore";
import { useUserPresenceStore } from "../../features/users/store/userPresenceStore";
import { userService } from "../../features/users";
import { ApiError } from "../../services/api";
import { showToast } from "../../components/ui/Toast";
import { inDateRange } from "../../utils/dateRange";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import type { AuthUser } from "../../features/auth";

type UserFilter = "all" | "pending_approval" | "blocked";
const ONLINE_WINDOW_MS = 300_000;

function timestamp(value: string | null | undefined): number {
  const parsed = value ? Date.parse(value) : NaN;
  return Number.isFinite(parsed) ? parsed : 0;
}

export function useUsersPage(forceMobile = false) {
  const { language, t } = useLocale();
  const viewportMobile = useMediaQuery("(max-width: 767px)");
  const isMobile = forceMobile || viewportMobile;
  const me = useAuthStore((s) => s.user);
  const isAdmin = me?.status === "active" && ["admin", "superadmin"].includes(me.role.toLowerCase());
  const queryClient = useQueryClient();
  const [action, setAction] = useState<{ type: "approve" | "reject" | "activate" | "disable" | "delete" | "role"; user: AuthUser } | null>(null);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const filter: UserFilter = forceMobile ? "all" : pathname.endsWith("/pending") ? "pending_approval" : pathname.endsWith("/blocked") && isAdmin ? "blocked" : "all";
  useEffect(() => {
    if (!isAdmin && pathname.endsWith("/blocked")) navigate(forceMobile ? "/user" : "/users", { replace: true });
  }, [forceMobile, isAdmin, pathname, navigate]);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search);
  const appliedSearch = forceMobile ? search : debouncedSearch;
  const [role, setRole] = useState("");
  const [roles, setRoles] = useState<string[]>([]);
  const [status, setStatus] = useState("");
  const [statuses, setStatuses] = useState<string[]>([]);
  const [joinedFrom, setJoinedFrom] = useState("");
  const [joinedTo, setJoinedTo] = useState("");
  const hasFilters = !!role || (forceMobile && roles.length > 0) || (forceMobile && statuses.length > 0) || !!joinedFrom || !!joinedTo;
  const useList = forceMobile || !!appliedSearch.trim() || hasFilters;
  const sentinel = useRef<HTMLDivElement>(null);
  const [now, setNow] = useState(() => Date.now());
  const presenceByUser = useUserPresenceStore((state) => state.presenceByUser);
  const users = useInfiniteQuery({
    queryKey: ["users", "page", filter], initialPageParam: 1,
    queryFn: ({ pageParam, signal }) => userService.page(pageParam, 30, filter === "pending_approval", signal, filter === "blocked"),
    getNextPageParam: (lastPage) => lastPage.page * lastPage.limit < lastPage.total ? lastPage.page + 1 : undefined,
    enabled: !useList, refetchInterval: isAdmin ? 60_000 : false,
  });
  const searchUsers = useQuery({ queryKey: ["users", "search-list", isAdmin], queryFn: ({ signal }) => userService.list(signal), enabled: useList, refetchInterval: isAdmin ? 60_000 : false });
  const activeQuery = useList ? searchUsers : users;
  useEffect(() => {
    const target = sentinel.current;
    if (!target || useList || !users.hasNextPage || users.isFetchingNextPage || users.isFetchNextPageError) return;
    const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) void users.fetchNextPage(); }, { root: target.closest(".admin-users__content"), rootMargin: "200px" });
    observer.observe(target);
    return () => observer.disconnect();
  }, [filter, useList, users.hasNextPage, users.isFetchingNextPage, users.isFetchNextPageError, users.fetchNextPage]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 30_000);
    return () => window.clearInterval(timer);
  }, []);



  const refreshUsers = () => void queryClient.invalidateQueries({ queryKey: ["users"] });

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

  const reject = useMutation({
    mutationFn: (userId: string) => userService.reject(userId),
    onSuccess: refreshUsers,
    onError: (err) => showToast.error(err instanceof ApiError ? err.message : t("Could not reject the user.")),
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
    mutationFn: (user: AuthUser) => userService.updateRole(user.id, ["admin", "superadmin"].includes(user.role.toLowerCase() ?? "") ? "user" : "admin"),
    onSuccess: refreshUsers,
  });

  const matchedUsers = useList
    ? (searchUsers.data ?? []).filter((user) => (forceMobile || (filter === "blocked" ? user.status === "disabled" : filter === "pending_approval" ? user.status === "pending_approval" : user.status !== "disabled")) && user.username.toLowerCase().includes(appliedSearch.trim().toLowerCase()) && (!hasFilters || ((forceMobile ? roles.length === 0 || roles.includes(user.role.toLowerCase()) : !role || user.role.toLowerCase() === role) && (!forceMobile || statuses.length === 0 || statuses.includes(user.status)) && inDateRange(user.createdAt, joinedFrom, joinedTo))))
    : users.data?.pages.flatMap((page) => page.items) ?? [];
  const usersWithPresence = matchedUsers.map((user) => {
    const liveLastSeen = presenceByUser[user.id]?.lastSeenAt;
    return liveLastSeen && timestamp(liveLastSeen) > timestamp(user.lastSeenAt)
      ? { ...user, lastSeenAt: liveLastSeen }
      : user;
  });
  const isOnline = (user: AuthUser) => {
    const lastSeen = timestamp(user.lastSeenAt);
    const live = presenceByUser[user.id];
    const explicitlyOffline = live?.online === false &&
      (!live.lastSeenAt || timestamp(live.lastSeenAt) >= lastSeen);
    return !explicitlyOffline && lastSeen > 0 && now - lastSeen < ONLINE_WINDOW_MS;
  };
  const pagedUsers = forceMobile
    ? usersWithPresence.filter((user) => user.id !== me?.id && user.status !== "rejected").sort((a, b) =>
      timestamp(b.lastSeenAt) - timestamp(a.lastSeenAt)
      || a.username.localeCompare(b.username, language === "vi" ? "vi-VN" : "en-US", { sensitivity: "base" })
      || timestamp(b.createdAt) - timestamp(a.createdAt))
    : usersWithPresence;

  return { directoryUsers: searchUsers.data ?? [], language, t, isMobile, me, isAdmin, action, setAction, navigate, filter, search, setSearch, role, setRole, roles, setRoles, status, setStatus, statuses, setStatuses, joinedFrom, setJoinedFrom, joinedTo, setJoinedTo, useList, sentinel, now, isOnline, users, activeQuery, approve, reject, remove, disable, activate, updateRole, pagedUsers };
}

export function formatLastActive(value: string | null | undefined, language: "en" | "vi", now: number): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
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

