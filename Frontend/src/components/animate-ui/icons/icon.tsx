import {
  AnimateIcon as BaseAnimateIcon,
  IconWrapper as BaseIconWrapper,
  useAnimateIconContext as useBaseAnimateIconContext,
  type AnimateIconProps,
  type IconProps,
  type IconWrapperProps,
} from "@animate-ui/react/icons";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useInView, type LegacyAnimationControls } from "motion/react";
import { useShouldReduceMotion } from "@animate-ui/react/utils/motion";
import { useMediaQuery } from "@/hooks/useMediaQuery";

export { getVariants, type IconProps } from "@animate-ui/react/icons";

const ViewControlsContext = createContext<((controls: LegacyAnimationControls) => void) | null>(null);

export function useAnimateIconContext() {
  const context = useBaseAnimateIconContext();
  const register = useContext(ViewControlsContext);

  useEffect(() => {
    if (context.controls) register?.(context.controls);
  }, [context.controls, register]);

  return context;
}

type IconTriggers<T extends string> = Pick<IconProps<T>,
  "animate" | "animateOnHover" | "animateOnTap" | "animateOnView" | "animateOnViewOnce" | "completeOnStop"
>;

function useIconTriggers<T extends string>(props: IconTriggers<T>) {
  const standalone = useMediaQuery("(display-mode: standalone)");
  const hover = useMediaQuery("(hover: hover) and (pointer: fine)");
  const installed = standalone || (typeof navigator !== "undefined" && "standalone" in navigator && navigator.standalone === true);
  const enabled = props.animate !== false;

  return {
    animateOnHover: enabled && !installed && hover ? (props.animateOnHover ?? true) : false,
    animateOnTap: enabled ? (props.animateOnTap ?? true) : false,
    animateOnView: enabled && installed ? (props.animateOnView ?? true) : false,
    animateOnViewOnce: props.animateOnViewOnce ?? false,
    completeOnStop: props.completeOnStop ?? true,
  };
}

export function AnimateIcon(props: AnimateIconProps) {
  const triggers = useIconTriggers(props);
  const reduceMotion = useShouldReduceMotion();
  const [controls, setControls] = useState<LegacyAnimationControls>();
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, {
    once: triggers.animateOnViewOnce,
    margin: props.animateOnViewMargin,
  });
  const setRef = useCallback((element: HTMLSpanElement | null) => {
    ref.current = element;
    if (typeof props.ref === "function") return props.ref(element);
    if (props.ref) props.ref.current = element;
  }, [props.ref]);

  useEffect(() => {
    if (!controls || !triggers.animateOnView || props.loop || props.animate !== undefined) return;
    if (!inView || reduceMotion) {
      controls.set("initial");
      return;
    }
    // View entry must not latch Animate UI's gesture state or cut SVG keyframes short.
    controls.set("initial");
    void controls.start("animate").catch((error: unknown) => {
      console.error("Icon view animation failed:", error);
    });
    return () => controls.stop();
  }, [controls, inView, triggers.animateOnView, reduceMotion, props.loop, props.animate]);

  return (
    <ViewControlsContext value={setControls}>
      <BaseAnimateIcon
        {...props}
        {...triggers}
        ref={setRef}
        animation={typeof triggers.animateOnView === "string" ? triggers.animateOnView : props.animation}
        animateOnView={props.loop ? triggers.animateOnView : false}
      />
    </ViewControlsContext>
  );
}

export function IconWrapper<T extends string>(props: IconWrapperProps<T>) {
  const { controls } = useAnimateIconContext();
  const hasOwnTriggers = props.animate !== undefined
    || props.animateOnHover !== undefined
    || props.animateOnTap !== undefined
    || props.animateOnView !== undefined;

  if (controls && !hasOwnTriggers) return <BaseIconWrapper {...props} />;

  const {
    animate, animateOnHover, animateOnTap, animateOnView, animateOnViewMargin,
    animateOnViewOnce, animation, loop, loopDelay, initialOnAnimateEnd,
    completeOnStop, persistOnAnimateEnd, delay, speed, ...iconProps
  } = props;

  return (
    <AnimateIcon
      asChild
      {...{
        animate, animateOnHover, animateOnTap, animateOnView, animateOnViewMargin,
        animateOnViewOnce, animation, loop, loopDelay, initialOnAnimateEnd,
        completeOnStop, persistOnAnimateEnd, delay, speed,
      }}
    >
      <BaseIconWrapper {...iconProps} animation={animation} />
    </AnimateIcon>
  );
}
