import { useLocale } from "@/context/LocaleContext";
import { UserAvatar } from "@/components/common/UserAvatar";
import { ErrorState } from "@/components/ui/Status";
import { AvatarPicker } from "@/features/users/components/AvatarPicker";
import { useProfileData } from "@/features/users/hooks/useProfileData";
import "./profile.css";
import { PageDataPlaceholder } from "@/components/ui/PageDataPlaceholder";

export function ProfilePage() {
  const { t } = useLocale();
  const { user, profile, albums, mediaCounts } = useProfileData();

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
              { label: "Albums", count: albums.data?.length, icon: "album", pending: albums.isPending },
              { label: "Videos", count: mediaCounts.data?.videos, icon: "video", pending: mediaCounts.isPending },
              { label: "Images", count: mediaCounts.data?.images, icon: "image", pending: mediaCounts.isPending },
            ].map(({ label, count, icon, pending }) => (
              <div key={label}>
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  {icon === "album" ? <><rect x="3" y="5" width="18" height="15" rx="2" /><path d="M7 5V3h10v2M7 15l3-3 3 3 2-2 3 3" /></> : icon === "video" ? <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m10 9 5 3-5 3z" /></> : <><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="8" cy="9" r="1.5" /><path d="m4 17 5-5 4 4 2-2 5 4" /></>}
                </svg>
                <dt>{t(label)}</dt><dd>{pending ? <PageDataPlaceholder layout="value" label={t("Loading...")} />
                  : count === undefined ? "?" : new Intl.NumberFormat().format(count)}</dd>
              </div>
            ))}
          </dl>
          {(albums.isError || mediaCounts.isError) && <p role="status" className="profile-page__stats-error">{t("Could not load counts.")}</p>}
          {profile.isError ? (
            <ErrorState message={t("Could not load your profile.")} onRetry={() => void profile.refetch()} />
          ) : null}
          {profile.isSuccess ? <AvatarPicker key={user.id} user={user} /> : null}
          {profile.isPending && <PageDataPlaceholder layout="cards" count={1} label={t("Loading...")} />}
        </section>
      </div>
    </main>
  );
}
