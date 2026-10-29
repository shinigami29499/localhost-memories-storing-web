import React from "react";
import { AnimateIcon } from "@/components/animate-ui/icons/icon";
import { Accordion as AccordionPrimitive } from "@animate-ui/react/primitives/radix-ui";
import { ChevronDown } from "@/components/animate-ui/icons/chevron-down";

export function AnimatedAccordion() {
  return (
    <AccordionPrimitive.Root type="single" collapsible className="w-full max-w-md space-y-2">
      <AccordionPrimitive.Item value="item-1" className="border border-[var(--border)] rounded-lg overflow-hidden bg-[var(--surface-card)]">
        <AccordionPrimitive.Header className="flex">
          <AnimateIcon animateOnHover animateOnTap completeOnStop asChild>
            <AccordionPrimitive.Trigger className="flex flex-1 items-center justify-between p-4 font-medium text-[var(--text-strong)] transition-colors hover:bg-[var(--surface-hover)]">
              What is Animate UI?
              <ChevronDown className="h-4 w-4 text-[var(--text-muted)] transition-transform duration-200" />
            </AccordionPrimitive.Trigger>
          </AnimateIcon>
        </AccordionPrimitive.Header>
        <AccordionPrimitive.Content className="overflow-hidden text-sm text-[var(--text-muted)] transition-all data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
          <div className="p-4 pt-0">
            Animate UI animates the underlying primitives that Radix UI and shadcn/ui components are built on, leaving your structure, styles, and API completely untouched.
          </div>
        </AccordionPrimitive.Content>
      </AccordionPrimitive.Item>

      <AccordionPrimitive.Item value="item-2" className="border border-[var(--border)] rounded-lg overflow-hidden bg-[var(--surface-card)]">
        <AccordionPrimitive.Header className="flex">
          <AnimateIcon animateOnHover animateOnTap completeOnStop asChild>
            <AccordionPrimitive.Trigger className="flex flex-1 items-center justify-between p-4 font-medium text-[var(--text-strong)] transition-colors hover:bg-[var(--surface-hover)]">
              How does it work?
              <ChevronDown className="h-4 w-4 text-[var(--text-muted)] transition-transform duration-200" />
            </AccordionPrimitive.Trigger>
          </AnimateIcon>
        </AccordionPrimitive.Header>
        <AccordionPrimitive.Content className="overflow-hidden text-sm text-[var(--text-muted)] transition-all data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
          <div className="p-4 pt-0">
            Instead of rewriting components, you simply swap the primitive imports to use `@animate-ui/react/primitives/radix-ui`.
          </div>
        </AccordionPrimitive.Content>
      </AccordionPrimitive.Item>
    </AccordionPrimitive.Root>
  );
}
