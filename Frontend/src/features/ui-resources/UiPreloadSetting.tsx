import { useEffect, useId, useState } from "react";
import { Switch } from "@animate-ui/react/primitives/base-ui/switch";
import { useLocale } from "@/context/LocaleContext";
import { useAuthStore } from "@/store/authStore";
import { canSkipUiPreload, readSkipUiPreload, setSkipUiPreload } from "./uiResources";

export function UiPreloadSetting({ classPrefix }: { classPrefix: "settings-page" | "mobile-settings" }) {
  const { t } = useLocale();
  const id = useId();
  const user = useAuthStore((state) => state.user);
  const allowed = Boolean(user && canSkipUiPreload());
  const [skip, setSkip] = useState(readSkipUiPreload);
  useEffect(() => { setSkip(readSkipUiPreload()); }, [allowed]);
  if (!allowed) return null;

  return <div className={`${classPrefix}__field`}>
    <div className={`${classPrefix}__field-copy`}>
      <label htmlFor={id}>{t("Skip UI preload")}</label>
      <p id={`${id}-help`}>{t("Development only. Applies after reloading this browser.")}</p>
    </div>
    <Switch.Root id={id} className={`${classPrefix}__switch`} checked={skip} aria-describedby={`${id}-help`}
      onCheckedChange={(checked) => {
        setSkipUiPreload(checked);
        setSkip(readSkipUiPreload());
      }}>
      <Switch.Thumb className={`${classPrefix}__switch-thumb`} />
    </Switch.Root>
  </div>;
}
