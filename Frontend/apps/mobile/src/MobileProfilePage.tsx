import { useLocale } from "@/context/LocaleContext";
import { useProfileData } from "@/features/users/hooks/useProfileData";
import { UserAvatar } from "@/components/common/UserAvatar";
import { MobileAvatarPicker } from "./MobileAvatarPicker";
import { ErrorState } from "@/components/ui/Status";
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
        {[{ label: "Albums", count: albums.data?.length }, { label: "Images", count: mediaCounts.data?.images }, { label: "Videos", count: mediaCounts.data?.videos }].map(({ label, count }) =>
          <div key={label}><dt>{t(label)}</dt><dd>{count === undefined ? "?" : new Intl.NumberFormat().format(count)}</dd></div>)}
      </dl>
      {(albums.isError || mediaCounts.isError) && <p role="status">{t("Could not load counts.")}</p>}
      {profile.isError && <ErrorState message={t("Could not load your profile.")} onRetry={() => void profile.refetch()} />}
      {profile.isSuccess && <div className="mobile-profile__avatar-settings"><MobileAvatarPicker key={user.id} user={user} /></div>}
    </section>
  </main>;
}
