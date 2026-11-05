import { Switch } from "@animate-ui/react/primitives/base-ui/switch";
import { useLocale } from "../../context/LocaleContext";
import { playUiSound } from "../../services/sounds";
import { useSoundPreferencesStore } from "../../store/soundPreferencesStore";

export function SoundEffectsSettings() {
  const { t } = useLocale();
  const enabled = useSoundPreferencesStore((state) => state.enabled);
  const setEnabled = useSoundPreferencesStore((state) => state.setEnabled);

  return (
    <div className="settings-page__field">
      <div className="settings-page__field-copy">
        <label htmlFor="settings-sounds">{t("Sound effects")}</label>
        <p id="settings-sounds-help">{t("Play subtle sounds for buttons and toast notifications.")}</p>
      </div>
      <Switch.Root id="settings-sounds" className="settings-page__switch"
        checked={enabled} onCheckedChange={(checked) => {
          setEnabled(checked);
          if (checked) playUiSound("ui/toggle_on");
        }} aria-describedby="settings-sounds-help">
        <Switch.Thumb className="settings-page__switch-thumb" />
      </Switch.Root>
    </div>
  );
}
