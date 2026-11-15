import { useState } from "react";
import { useLocale } from "../../../context/LocaleContext";
import { usePreviewDrafts } from "../../media/hooks/usePreviewDrafts";
import type { PlaceFormValues } from "./PlaceEditor";

export function usePlaceEditorState(values: PlaceFormValues, saving: boolean, deleting: boolean | undefined, onChange: (values: PlaceFormValues) => void) {
  const { t } = useLocale();
  const [pickingImages, setPickingImages] = useState(false);
  const { register: registerDraft, retain: retainDrafts } = usePreviewDrafts();
  const busy = saving || deleting === true || pickingImages;
  const setMediaIds = (mediaIds: string[]) => onChange({ ...values, mediaIds });
  return { t, pickingImages, setPickingImages, registerDraft, retainDrafts, busy, setMediaIds };
}
