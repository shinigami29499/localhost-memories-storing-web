import { PageActionBar } from "../../../components/layout/PageActionBar";
import { PageActionButton } from "../../../components/layout/PageActionButton";
import { AnimateIcon } from "../../../components/animate-ui/icons/icon";
import { Plus } from "../../../components/animate-ui/icons/plus";
import { useLocale } from "../../../context/LocaleContext";
import "./mapNavigation.css";

export function AddNavigationToolbar({ onAdd, disabled }: { onAdd: () => void; disabled?: boolean }) {
  const { t } = useLocale();
  return <PageActionBar className="gallery-page__actions map-navigation__toolbar map-navigation__toolbar--add" role="group" aria-label={t("Navigation")}>
    <AnimateIcon animateOnHover animateOnTap completeOnStop asChild>
      <PageActionButton aria-label={t("Add")} title={t("Add")} disabled={disabled} onClick={onAdd}>
        <Plus size={20} aria-hidden="true" />
      </PageActionButton>
    </AnimateIcon>
  </PageActionBar>;
}
