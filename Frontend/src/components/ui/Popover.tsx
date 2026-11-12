import { Popover } from "@animate-ui/react/primitives/base-ui/popover";
import "./popover.css";

type PopoverContentProps = Popover.Popup.Props & Pick<
  Popover.Positioner.Props,
  "align" | "alignOffset" | "side" | "sideOffset"
>;

export function PopoverContent({
  align = "center",
  alignOffset = 0,
  side = "bottom",
  sideOffset = 4,
  ...props
}: PopoverContentProps) {
  return (
    <Popover.Portal>
      <Popover.Positioner
        align={align}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset}
        className="shared-popover-positioner"
      >
        <Popover.Popup {...props} />
      </Popover.Positioner>
    </Popover.Portal>
  );
}

export { Popover };
