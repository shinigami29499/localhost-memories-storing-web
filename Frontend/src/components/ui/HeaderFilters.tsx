import { Popover } from "@base-ui/react/popover";
import { useState } from "react";
import { useLocale } from "../../context/LocaleContext";
import { Button } from "./Button";
import "./header-filters.css";

type Option = { value: string; label: string };
type Props = {
  selects: { label: string; value: string; onChange: (value: string) => void; options: Option[] }[];
  date?: { label: string; from: string; to: string; setFrom: (value: string) => void; setTo: (value: string) => void };
};

export function HeaderFilters({ selects, date }: Props) {
  const { t } = useLocale();
  const active = selects.some((select) => select.value) || !!date?.from || !!date?.to;
  const [open, setOpen] = useState(false);
  const [draftSelects, setDraftSelects] = useState<string[]>([]);
  const [draftFrom, setDraftFrom] = useState("");
  const [draftTo, setDraftTo] = useState("");
  const handleOpenChange = (next: boolean) => {
    if (next) {
      setDraftSelects(selects.map((select) => select.value));
      setDraftFrom(date?.from ?? "");
      setDraftTo(date?.to ?? "");
    }
    setOpen(next);
  };
  const clear = () => {
    setDraftSelects(selects.map(() => ""));
    setDraftFrom("");
    setDraftTo("");
    selects.forEach((select) => select.onChange(""));
    date?.setFrom("");
    date?.setTo("");
  };
  const apply = () => {
    selects.forEach((select, index) => select.onChange(draftSelects[index] ?? ""));
    date?.setFrom(draftFrom);
    date?.setTo(draftTo);
    setOpen(false);
  };
  return <Popover.Root open={open} onOpenChange={handleOpenChange}>
    <Popover.Trigger className="header-filters__trigger">{t("Filters")}{active ? " •" : ""}</Popover.Trigger>
    <Popover.Portal>
      <Popover.Positioner className="header-filters__positioner" side="bottom" align="end" sideOffset={8}>
        <Popover.Popup className="header-filters__popup" aria-label={t("Filters")}>
          {selects.map((select, index) => <label key={select.label} className="header-filters__field">
            <span>{t(select.label)}</span>
            <select value={draftSelects[index] ?? ""} onChange={(event) => {
              const next = event.target.value;
              setDraftSelects((values) => values.map((value, itemIndex) => itemIndex === index ? next : value));
            }}>
              <option value="">{t("All")}</option>
              {select.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>)}
          {date && <fieldset className="header-filters__range">
            <legend>{t(date.label)}</legend>
            <div className="header-filters__range-box">
              <label><span>{t("From")}</span><input type="date" aria-label={t("From")} value={draftFrom} max={draftTo || undefined} onChange={(event) => setDraftFrom(event.target.value)} /></label>
              <span aria-hidden="true">–</span>
              <label><span>{t("To")}</span><input type="date" aria-label={t("To")} value={draftTo} min={draftFrom || undefined} onChange={(event) => setDraftTo(event.target.value)} /></label>
            </div>
          </fieldset>}
          <div className="dialog-actions header-filters__actions">
            <Button type="button" variant="danger" className="dialog-action dialog-action--danger" onClick={clear}>{t("Clear filters")}</Button>
            <Button type="button" className="dialog-action dialog-action--normal" onClick={apply}>{t("Apply filters")}</Button>
          </div>
        </Popover.Popup>
      </Popover.Positioner>
    </Popover.Portal>
  </Popover.Root>;
}

export function inDateRange(value: string, from: string, to: string) {
  if (!from && !to) return true;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const local = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  return (!from || local >= from) && (!to || local <= to);
}
