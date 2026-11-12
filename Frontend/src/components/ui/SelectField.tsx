import { useId } from "react";
import { Select } from "@animate-ui/react/primitives/base-ui/select";
import { ChevronDownIcon } from "../animate-ui/icons/chevron-down";
import "./select-field.css";

type SelectOption = { value: string; label: string };

interface Props {
  label: string;
  value: string;
  options: SelectOption[];
  disabled?: boolean;
  onChange: (value: string) => void;
}

export function SelectField({ label, value, options, disabled, onChange }: Props) {
  const id = useId();
  const labelId = `${id}-label`;
  return (
    <div className="select-field">
      <span id={labelId} className="select-field__label">{label}</span>
      <Select.Root items={options} value={value} onValueChange={(next) => {
        if (next !== null) onChange(next);
      }}>
        <Select.Trigger id={id} aria-labelledby={labelId} className="select-field__trigger" disabled={disabled}>
          <Select.Value />
          <ChevronDownIcon size={18} className="select-field__icon" animateOnView={false} aria-hidden="true" />
        </Select.Trigger>
        <Select.Portal>
          <Select.Positioner className="select-field__positioner" side="bottom" align="start" sideOffset={4} alignItemWithTrigger={false}>
            <Select.Popup className="select-field__popup">
              <Select.List className="select-field__list">
                {options.map((option) => (
                  <Select.Item key={option.value} value={option.value} className="select-field__item">
                    <Select.ItemText>{option.label}</Select.ItemText>
                  </Select.Item>
                ))}
              </Select.List>
            </Select.Popup>
          </Select.Positioner>
        </Select.Portal>
      </Select.Root>
    </div>
  );
}
