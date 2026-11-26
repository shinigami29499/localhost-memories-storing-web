import { Images, LibraryBig, Video } from "lucide-react";
import { useLocale } from "@/context/LocaleContext";
import { useProfileData } from "@/features/users/hooks/useProfileData";
import { UserAvatar } from "@/components/common/UserAvatar";
import { ErrorState } from "@/components/ui/Status";
import { PageDataPlaceholder } from "@/components/ui/PageDataPlaceholder";
import { MobileAvatarPicker, MobileAvatarPickerPlaceholder } from "./MobileAvatarPicker";
import "./mobile-profile.css";

export function ProfilePage() {
  const { language, t } = useLocale();
  const { user, profile, albums, mediaCounts } = useProfileData();

  if (!user) {
    return <main className="mobile-profile"><p role="status">{t("Profile unavailable.")}</p></main>;
  }

  const stats = [
    { label: "Albums", icon: LibraryBig, count: albums.data?.length, pending: albums.isPending },
    { label: "Images", icon: Images, count: mediaCounts.data?.images, pending: mediaCounts.isPending },
    { label: "Videos", icon: Video, count: mediaCounts.data?.videos, pending: mediaCounts.isPending },
  ];
  const formatCount = new Intl.NumberFormat(language);

  return (
    <main className="mobile-profile">
      <section className="mobile-profile__account" aria-labelledby="mobile-profile-account">
        <div className="mobile-profile__identity">
          <UserAvatar user={user} className="mobile-profile__avatar" />
          <div>
            <h2 id="mobile-profile-account">{user.username}</h2>
            <p>{t("Account details")}</p>
          </div>
        </div>

        <dl className="mobile-profile__stats">
          {stats.map(({ label, icon: Icon, count, pending }) => (
            <div key={label}>
              <dt><Icon size={16} aria-hidden="true" />{t(label)}</dt>
              <dd>{pending ? <PageDataPlaceholder layout="value" label={t("Loading...")} />
                : count === undefined ? "—" : formatCount.format(count)}</dd>
            </div>
          ))}
        </dl>
        {(albums.isError || mediaCounts.isError) && (
          <p className="mobile-profile__counts-error" role="status">{t("Could not load counts.")}</p>
        )}
      </section>

      <section className="mobile-profile__editor" aria-labelledby="mobile-profile-avatar">
        <h2 id="mobile-profile-avatar">{t("Change avatar")}</h2>
        {profile.isError && <ErrorState message={t("Could not load your profile.")} onRetry={() => void profile.refetch()} />}
        {!profile.isError && (
          <p id="mobile-profile-avatar-hint" className="mobile-profile__avatar-hint">
            {t("Choose an avatar, then save your changes.")}
          </p>
        )}
        {profile.isPending && <MobileAvatarPickerPlaceholder label={t("Loading...")} />}
        {profile.isSuccess && (
          <MobileAvatarPicker key={user.id} user={user} headingId="mobile-profile-avatar" hintId="mobile-profile-avatar-hint" />
        )}
      </section>
    </main>
  );
}
