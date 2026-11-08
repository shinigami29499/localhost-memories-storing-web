import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "../../store/authStore";
import { useLocale } from "../../context/LocaleContext";
import { UserAvatar } from "../../components/common/UserAvatar";
import { ErrorState } from "../../components/ui/Status";
import { AvatarPicker } from "../../features/users/components/AvatarPicker";
import { useAlbums } from "../../features/albums/hooks/useAlbums";
import { mediaService } from "../../features/media/services/mediaService";
import { userService } from "../../features/users/services/userService";
import "./profile.css";

export function ProfilePage() {
  const { t } = useLocale();
  const user = useAuthStore((state) => state.user);
  const profile = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: userService.profile,
    enabled: Boolean(user),
  });

  const albums = useAlbums("mine", Boolean(user));
  const images = useQuery({ queryKey: ["profile-count", user?.id, "image"], queryFn: () => mediaService.list(0, 1, "image"), enabled: Boolean(user) });
  const videos = useQuery({ queryKey: ["profile-count", user?.id, "video"], queryFn: () => mediaService.list(0, 1, "video"), enabled: Boolean(user) });

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

  return (
    <main className="profile-page">
      <div className="profile-page__inner">

        <section className="profile-page__card" aria-labelledby="profile-account-title">
          <div className="profile-page__identity">
            <UserAvatar user={user} className="profile-page__avatar" />
            <div>
              <h2 id="profile-account-title">{t("Account details")}</h2>
              <p>{user.username}</p>
            </div>
          </div>

          <dl className="profile-page__stats">
            {[
              { label: "Albums", count: albums.data?.length, icon: "album" },
              { label: "Videos", count: videos.data?.total, icon: "video" },
              { label: "Images", count: images.data?.total, icon: "image" },
            ].map(({ label, count, icon }) => (
              <div key={label}>
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  {icon === "album" ? <><rect x="3" y="5" width="18" height="15" rx="2" /><path d="M7 5V3h10v2M7 15l3-3 3 3 2-2 3 3" /></> : icon === "video" ? <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m10 9 5 3-5 3z" /></> : <><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="8" cy="9" r="1.5" /><path d="m4 17 5-5 4 4 2-2 5 4" /></>}
                </svg>
                <dt>{t(label)}</dt><dd>{count === undefined ? "?" : new Intl.NumberFormat().format(count)}</dd>
              </div>
            ))}
          </dl>
          {(albums.isError || images.isError || videos.isError) && <p role="status" className="profile-page__stats-error">{t("Could not load counts.")}</p>}
          {profile.isError ? (
            <ErrorState message={t("Could not load your profile.")} onRetry={() => void profile.refetch()} />
          ) : null}
          {profile.isSuccess ? <AvatarPicker key={user.id} user={user} /> : null}
        </section>
      </div>
    </main>
  );
}
