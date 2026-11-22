import { useLocale } from "@/context/LocaleContext";
import { useProfileData } from "@/features/users/hooks/useProfileData";
import { UserAvatar } from "@/components/common/UserAvatar";
import { MobileAvatarPicker } from "./MobileAvatarPicker";
import { ErrorState } from "@/components/ui/Status";
import { PageDataPlaceholder } from "@/components/ui/PageDataPlaceholder";
import "./mobile-profile.css";

export function ProfilePage() {
  const { t } = useLocale();
  const { user, profile, albums, mediaCounts } = useProfileData();
  if (!user) return <main className="mobile-profile"><p role="status">{t("Profile unavailable.")}</p></main>;

  return <main className="mobile-profile">
    <section aria-labelledby="mobile-profile-account">
      <div className="mobile-profile__identity">
        <UserAvatar user={user} className="mobile-profile__avatar" />
        <div><h2 id="mobile-profile-account">{user.username}</h2><p>{t("Account details")}</p></div>
      </div>
      <dl className="mobile-profile__stats">
        {[
          { label: "Albums", count: albums.data?.length, pending: albums.isPending },
          { label: "Images", count: mediaCounts.data?.images, pending: mediaCounts.isPending },
          { label: "Videos", count: mediaCounts.data?.videos, pending: mediaCounts.isPending },
        ].map(({ label, count, pending }) => (
          <div key={label}><dt>{t(label)}</dt><dd>{pending
            ? <PageDataPlaceholder layout="value" label={t("Loading...")} />
            : count === undefined ? "?" : new Intl.NumberFormat().format(count)}</dd></div>
        ))}
      </dl>
      {(albums.isError || mediaCounts.isError) && <p role="status">{t("Could not load counts.")}</p>}
      {profile.isError && <ErrorState message={t("Could not load your profile.")} onRetry={() => void profile.refetch()} />}
      {profile.isPending && <div className="mobile-profile__avatar-settings"><PageDataPlaceholder layout="cards" count={1} label={t("Loading...")} /></div>}
      {profile.isSuccess && <div className="mobile-profile__avatar-settings"><MobileAvatarPicker key={user.id} user={user} /></div>}
    </section>
  </main>;
}
