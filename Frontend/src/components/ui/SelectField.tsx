import { useId, useRef, type RefObject } from "react";
import { ScrollFade } from "@animate-ui/react/primitives/effects/scroll-fade";
import { useAnimationStore } from "../../store/animationStore";
import { Select } from "@animate-ui/react/primitives/base-ui/select";
import { Select as BaseSelect } from "@base-ui/react/select";
import { ChevronDownIcon } from "../animate-ui/icons/chevron-down";
import "./select-field.css";

type SelectOption = { value: string; label: string; indicator?: string };

function SelectIndicator({ label }: { label?: string }) {
  return label && <span className="select-field__indicator" role="img" aria-label={label} />;
}

interface Props {
  label: string;
  value: string;
  options: SelectOption[];
  disabled?: boolean;
  scrollFade?: boolean;
  disableItemAnimation?: boolean;
  centerSelectedOnOpen?: boolean;
  container?: RefObject<HTMLElement | null>;
  onChange: (value: string) => void;
}

export function SelectField({ label, value, options, disabled, container, scrollFade = false, disableItemAnimation = false, centerSelectedOnOpen = false, onChange }: Props) {
  const animationsEnabled = useAnimationStore((state) => state.enabled);
  const id = useId();
  const labelId = `${id}-label`;
  const Popup = disableItemAnimation ? BaseSelect.Popup : Select.Popup;
  const popupRef = useRef<HTMLDivElement>(null);

  const centerSelection = (open: boolean) => {
    const popup = popupRef.current;
    if (!open || !popup || popup.scrollHeight <= popup.clientHeight) return;
    const selected = popup.querySelector<HTMLElement>('[role="option"][aria-selected="true"]');
    if (!selected) return;
    const option = selected.getBoundingClientRect();
    const viewportTop = popup.getBoundingClientRect().top + popup.clientTop;
    popup.scrollTop += option.top + option.height / 2 - viewportTop - popup.clientHeight / 2;
  };

  return (
    <div className="select-field">
      <span id={labelId} className="select-field__label">{label}</span>
      <Select.Root items={options} value={value} onOpenChangeComplete={centerSelectedOnOpen ? centerSelection : undefined} onValueChange={(next) => {
        if (next !== null) onChange(next);
      }}>
        <Select.Trigger id={id} aria-labelledby={labelId} className="select-field__trigger" disabled={disabled}>
          <Select.Value />
          <SelectIndicator label={options.find((option) => option.value === value)?.indicator} />
          <ChevronDownIcon size={18} className="select-field__icon" animateOnView={false} aria-hidden="true" />
        </Select.Trigger>
        <Select.Portal container={container}>
          <Select.Positioner className="select-field__positioner" side="bottom" align="start" sideOffset={4} alignItemWithTrigger={false}>
            <Popup ref={popupRef} className="select-field__popup">
              <Select.List className="select-field__list">
                {options.map((option) => (
                  <Select.Item key={option.value} value={option.value} className="select-field__item">
                    <Select.ItemText>{option.label}</Select.ItemText>
                    <SelectIndicator label={option.indicator} />
                  </Select.Item>
                ))}
              </Select.List>
            </Popup>
          </Select.Positioner>
        </Select.Portal>
      </Select.Root>
    </div>
  );
}
