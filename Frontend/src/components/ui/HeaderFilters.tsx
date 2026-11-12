import { Popover, PopoverContent } from "./Popover";
import { useState } from "react";
import { XIcon } from "../animate-ui/icons/x";
import { useLocale } from "../../context/LocaleContext";
import { Button } from "./Button";
import { DatePicker } from "./DatePicker";
import { SelectField } from "./SelectField";
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
    <PopoverContent className="header-filters__popup" side="bottom" align="end" sideOffset={8}>
      <header className="header-filters__header">
        <Popover.Title className="header-filters__title">{t("Filters")}</Popover.Title>
        <Popover.Close className="header-filters__close" aria-label={t("Close")} title={t("Close")}>
          <XIcon size={20} aria-hidden="true" />
        </Popover.Close>
      </header>
      <div className="header-filters__content">
        {selects.map((select, index) => <SelectField
          key={select.label}
          label={t(select.label)}
          value={draftSelects[index] ?? ""}
          options={[{ value: "", label: t("All") }, ...select.options]}
          onChange={(next) => {
            setDraftSelects((values) => values.map((value, itemIndex) => itemIndex === index ? next : value));
          }}
        />)}
        {date && <fieldset className="header-filters__range">
          <legend>{t(date.label)}</legend>
          <div className="header-filters__range-box">
            <div className="header-filters__date"><span>{t("From")}</span><DatePicker label={t("From")} value={draftFrom} max={draftTo || undefined} onChange={setDraftFrom} /></div>
            <span aria-hidden="true">–</span>
            <div className="header-filters__date"><span>{t("To")}</span><DatePicker label={t("To")} value={draftTo} min={draftFrom || undefined} onChange={setDraftTo} /></div>
          </div>
        </fieldset>}
        <div className="dialog-actions header-filters__actions">
          <Button type="button" variant="danger" className="dialog-action dialog-action--danger" onClick={clear}>{t("Clear filters")}</Button>
          <Button type="button" className="dialog-action dialog-action--normal" onClick={apply}>{t("Apply filters")}</Button>
        </div>
      </div>
    </PopoverContent>
  </Popover.Root>;
}

export function inDateRange(value: string, from: string, to: string) {
  if (!from && !to) return true;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const local = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  return (!from || local >= from) && (!to || local <= to);
}
