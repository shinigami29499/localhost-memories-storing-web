import { motion } from "motion/react";
import { motionTokens, useShouldReduceMotion, useTempoTransition } from "@animate-ui/react/utils/motion";
import { AnimateIcon } from "@/components/animate-ui/icons/icon";
import { Moon } from "@/components/animate-ui/icons/moon";
import { Sun } from "@/components/animate-ui/icons/sun";
import { Sunrise } from "@/components/animate-ui/icons/sunrise";
import { Sunset } from "@/components/animate-ui/icons/sunset";
import { useLocale } from "@/context/LocaleContext";
import { lightingOptions, colorThemeOptions, type MapLighting } from "@/features/locations/components/mapAppearanceOptions";
import type { useMapAppearance } from "@/features/locations/components/mapAppearance";

function LightingIcon({ value }: { value: MapLighting }) {
  if (value === "night") return <Moon size={18} aria-hidden="true" />;
  if (value === "day") return <Sun size={18} aria-hidden="true" />;

  return value === "dawn"
    ? <Sunrise size={18} aria-hidden="true" />
    : <Sunset size={18} aria-hidden="true" />;
}

export function MobileMapAppearanceSettings({
  isOpen,
  lighting,
  colorTheme,
  selectLighting,
  selectColorTheme,
}: ReturnType<typeof useMapAppearance> & { isOpen: boolean }) {
  const { t } = useLocale();
  const shouldReduceMotion = useShouldReduceMotion();
  const transition = useTempoTransition(motionTokens.transition.reveal);

  return (
    <motion.div
      className="map-appearance"
      initial={shouldReduceMotion ? false : { opacity: 0, y: -6 }}
      animate={isOpen ? { opacity: 1, y: 0 } : { opacity: 0, y: -6 }}
      transition={shouldReduceMotion ? { duration: 0 } : transition}
      aria-hidden={!isOpen}
    >
      <section className="map-appearance__section" aria-labelledby="map-appearance-lighting">
        <h3 id="map-appearance-lighting" className="map-appearance__heading">{t("LIGHTING")}</h3>
        <div className="map-appearance__grid" role="group" aria-label={t("LIGHTING")}>
          {lightingOptions.map(({ value, label }) => (
            <AnimateIcon key={value} animateOnHover animateOnTap completeOnStop asChild>
              <button
                type="button"
                className="map-appearance__option"
                aria-label={t(label)}
                aria-pressed={lighting === value}
                onClick={() => selectLighting(value)}
              >
                {lighting === value && (
                  <motion.span
                    className="map-appearance__selection-indicator"
                    aria-hidden="true"
                    initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.88 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={shouldReduceMotion ? { duration: 0 } : transition}
                  />
                )}
                <LightingIcon value={value} />
                <span>{t(label)}</span>
              </button>
            </AnimateIcon>
          ))}
        </div>
      </section>

      <section className="map-appearance__section" aria-labelledby="map-appearance-color-theme">
        <h3 id="map-appearance-color-theme" className="map-appearance__heading">{t("COLOR THEME")}</h3>
        <div className="map-appearance__grid map-appearance__grid--themes" role="group" aria-label={t("COLOR THEME")}>
          {colorThemeOptions.map(({ value, label }) => (
            <AnimateIcon key={value} animateOnHover animateOnTap completeOnStop asChild>
              <button
                type="button"
                className="map-appearance__option map-appearance__theme"
                data-theme={value}
                aria-label={t(label)}
                aria-pressed={colorTheme === value}
                onClick={() => selectColorTheme(value)}
              >
                {colorTheme === value && (
                  <motion.span
                    className="map-appearance__selection-indicator"
                    aria-hidden="true"
                    initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.88 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={shouldReduceMotion ? { duration: 0 } : transition}
                  />
                )}
                <span className="map-appearance__swatches" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </span>
                <span>{t(label)}</span>
              </button>
            </AnimateIcon>
          ))}
        </div>
      </section>
    </motion.div>
  );
}
