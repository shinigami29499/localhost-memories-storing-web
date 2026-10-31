import { ConfirmationDialog, showToast } from "../../../components/ui";
import { useLocale } from "../../../context/LocaleContext";
import type { HomeLocation } from "../types";

interface Props {
  location: HomeLocation | null;
  onConfirm: (location: HomeLocation) => Promise<unknown>;
  onClose: () => void;
}

export function HomeLocationPhotoConfirmation({ location, onConfirm, onClose }: Props) {
  const { t } = useLocale();
  if (!location) return null;

  return (
    <ConfirmationDialog
      title="Use Home for photos without a location?"
      onConfirm={async () => {
        await onConfirm(location);
        showToast.success(t("Home assigned to photos without a location."));
      }}
      onClose={onClose}
    >
      <p>{t("Assign your saved Home location to your existing photos without a location? Photos with coordinates stay unchanged.")}</p>
      <p>{t("Cancel keeps Home saved and leaves existing photos unchanged. New photos without GPS will use Home.")}</p>
    </ConfirmationDialog>
  );
}
