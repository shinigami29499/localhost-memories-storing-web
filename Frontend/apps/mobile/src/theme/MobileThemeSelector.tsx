import { useId } from "react";
import { useMobileTheme, type MobileThemePreference } from "./MobileThemeProvider";

interface MobileThemeSelectorProps {
  labels?: { legend: string; system: string; light: string; dark: string };
}

export function MobileThemeSelector({ labels = { legend: "Appearance", system: "System", light: "Light", dark: "Dark" } }: MobileThemeSelectorProps) {
  const { preference, setPreference } = useMobileTheme();
  const name = useId();
  const choices: MobileThemePreference[] = ["system", "light", "dark"];

  return (
    <fieldset className="mobile-theme-selector">
      <legend>{labels.legend}</legend>
      <div className="mobile-theme-selector__choices">
        {choices.map((choice) => (
          <label className="mobile-theme-selector__choice" key={choice}>
            <input type="radio" name={name} value={choice} checked={preference === choice}
              onChange={() => setPreference(choice)} />
            <span>{labels[choice]}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
