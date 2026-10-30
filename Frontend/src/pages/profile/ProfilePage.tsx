import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "../../store/authStore";
import { useLocale } from "../../context/LocaleContext";
import { UserAvatar } from "../../components/common/UserAvatar";
import { ErrorState } from "../../components/ui/Status";
import { AvatarPicker } from "../../features/users/components/AvatarPicker";
import { userService } from "../../features/users/services/userService";
import "./profile.css";

const statusLabels: Record<string, string> = {
  active: "Active",
  disabled: "Disabled",
  pending_approval: "Pending approval",
};

export function ProfilePage() {
  const { language, t } = useLocale();
  const user = useAuthStore((state) => state.user);
  const profile = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: userService.profile,
    enabled: Boolean(user),
  });

  useEffect(() => {
    if (profile.data) useAuthStore.getState().updateUser(profile.data);
  }, [profile.data]);

  if (!user) {
    return (
      <main className="profile-page">
        <div className="profile-page__inner">
          <p role="status">{t("Profile unavailable.")}</p>
        </div>
      </main>
    );
  }

  const roleName = user.role.charAt(0).toUpperCase() + user.role.slice(1).toLowerCase();
  const createdAt = new Date(user.createdAt);
  const joined = Number.isNaN(createdAt.getTime())
    ? t("Unknown")
    : createdAt.toLocaleDateString(language === "vi" ? "vi-VN" : "en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  return (
    <main className="profile-page">
      <div className="profile-page__inner">
        <header className="profile-page__header">
          <h1>{t("User profile")}<span className="brand__dot">.</span></h1>
          <p>{t("View your account details.")}</p>
        </header>

        <section className="profile-page__card" aria-labelledby="profile-account-title">
          <div className="profile-page__identity">
            <UserAvatar user={user} className="profile-page__avatar" />
            <div>
              <h2 id="profile-account-title">{t("Account details")}</h2>
              <p>{user.username}</p>
            </div>
          </div>

          <dl className="profile-page__details">
            <div>
              <dt>{t("Username")}</dt>
              <dd>{user.username}</dd>
            </div>
            <div>
              <dt>{t("Role")}</dt>
              <dd>{t(roleName)}</dd>
            </div>
            <div>
              <dt>{t("Status")}</dt>
              <dd>{t(statusLabels[user.status] ?? "Unknown")}</dd>
            </div>
            <div>
              <dt>{t("Joined")}</dt>
              <dd>{joined}</dd>
            </div>
          </dl>
          {profile.isError ? (
            <ErrorState message={t("Could not load your profile.")} onRetry={() => void profile.refetch()} />
          ) : null}
          {profile.isSuccess ? <AvatarPicker key={user.id} user={user} /> : null}
        </section>
      </div>
    </main>
  );
}
