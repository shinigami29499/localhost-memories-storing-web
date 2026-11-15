import { useLayoutEffect, useRef, useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button, ConfirmationDialog, ErrorState, showToast } from "../../../components/ui";
import { Check } from "../../../components/animate-ui/icons/check";
import { Trash2 } from "../../../components/animate-ui/icons/trash-2";
import { X } from "../../../components/animate-ui/icons/x";
import { useLocale } from "../../../context/LocaleContext";
import { locationService } from "../services/locationService";
import type { MediaFile, PickedLocation } from "../../media/types";

interface Props {
  media: MediaFile;
  draft: PickedLocation | null;
  onChange: (location: PickedLocation | null) => void;
  onSaved: () => void;
  onCancel: () => void;
}


export function useLocationEditorController({ media, draft, onChange, onSaved }: Props) {
  const { t } = useLocale();
  const queryClient = useQueryClient();
  const [confirming, setConfirming] = useState<"save" | "remove" | null>(null);
  const actionsRef = useRef<HTMLDivElement>(null);
  const [compactActions, setCompactActions] = useState(false);
  const saveLabel = t("Save location");
  const removeLabel = t("Remove location");
  const cancelLabel = t("Cancel");

  useLayoutEffect(() => {
    const actions = actionsRef.current;
    if (!actions) return;
    const labels = actions.querySelectorAll<HTMLElement>(".locations__action-label");
    const measure = () => {
      let requiredWidth = 0;
      for (const label of labels) {
        const button = label.parentElement!;
        const style = getComputedStyle(button);
        requiredWidth += label.getBoundingClientRect().width + 20
          + parseFloat(style.columnGap) + parseFloat(style.paddingLeft) + parseFloat(style.paddingRight)
          + parseFloat(style.borderLeftWidth) + parseFloat(style.borderRightWidth);
      }
      requiredWidth += Math.max(0, labels.length - 1) * parseFloat(getComputedStyle(actions).columnGap);
      setCompactActions(requiredWidth > actions.clientWidth);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(actions);
    labels.forEach((label) => observer.observe(label));
    measure();
    return () => observer.disconnect();
  }, [saveLabel, removeLabel, cancelLabel, media.location]);

  const mutation = useMutation({
    mutationKey: ["media-location", media.id],
    mutationFn: (location: PickedLocation | null) => locationService.set(media.id, location),
    onSuccess: async (_, location) => {
      onChange(location);
      await queryClient.invalidateQueries({ queryKey: ["media"] });
      await queryClient.invalidateQueries({ queryKey: ["albums"] });
      (location ? showToast.success : showToast.delete)(t(location ? "Location saved." : "Location removed."));
      if (location) onSaved();
    },
  });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (draft) setConfirming("save");
  };
  return { t, confirming, setConfirming, actionsRef, compactActions, saveLabel, removeLabel, cancelLabel, mutation, submit };
}
