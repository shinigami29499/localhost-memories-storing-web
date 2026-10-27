import { useState, type ComponentProps } from "react";
import { motion } from "motion/react";
import { motionTokens, useShouldReduceMotion, useTempoTransition } from "@animate-ui/react/utils/motion";
import { Eye } from "../animate-ui/icons/eye";
import { EyeClosed } from "../animate-ui/icons/eye-closed";
import { useLocale } from "../../context/LocaleContext";
import { Input } from "./Input";
import "./password-input.css";

export function PasswordInput(props: Omit<ComponentProps<typeof Input>, "type">) {
  const { t } = useLocale();
  const [visible, setVisible] = useState(false);
  const shouldReduceMotion = useShouldReduceMotion();
  const transition = useTempoTransition(motionTokens.transition.collapse);
  const label = t(visible ? "Hide password" : "Show password");

  return (
    <div className="password-input">
      <Input {...props} type={visible ? "text" : "password"} />
      <button
        type="button"
        className="password-input__toggle"
        aria-label={label}
        aria-controls={props.id}
        title={label}
        onClick={() => setVisible((current) => !current)}
      >
        <motion.span
          key={String(visible)}
          className="password-input__icon"
          aria-hidden="true"
          initial={shouldReduceMotion ? false : { scaleY: 0.1 }}
          animate={{ scaleY: 1 }}
          transition={shouldReduceMotion ? { duration: 0 } : transition}
        >
          {visible ? <Eye size={20} /> : <EyeClosed size={20} />}
        </motion.span>
      </button>
    </div>
  );
}
