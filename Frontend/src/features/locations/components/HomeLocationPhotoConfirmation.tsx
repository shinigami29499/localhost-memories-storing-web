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
      title="Use Home for media without a location?"
      confirmLabel="Use Home for media"
      onConfirm={async () => {
        await onConfirm(location);
        showToast.success(t("Home assigned to media without a location."));
      }}
      onClose={onClose}
    >
      <p>{t("Assign your saved Home location to your existing media without a location? Media with coordinates stays unchanged.")}</p>
      <p>{t("Cancel keeps Home saved and leaves existing media unchanged. New media without coordinates will use Home.")}</p>
    </ConfirmationDialog>
  );
}
