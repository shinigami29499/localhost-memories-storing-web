import React from "react";
import { Accordion as AccordionPrimitive } from "@animate-ui/react/primitives/radix-ui";
import { ChevronDown } from "@/components/animate-ui/icons/chevron-down";

export function AnimatedAccordion() {
  return (
    <AccordionPrimitive.Root type="single" collapsible className="w-full max-w-md space-y-2">
      <AccordionPrimitive.Item value="item-1" className="border border-neutral-800 rounded-lg overflow-hidden bg-neutral-900/50">
        <AccordionPrimitive.Header className="flex">
          <AccordionPrimitive.Trigger className="flex flex-1 items-center justify-between p-4 font-medium text-neutral-200 transition-colors hover:bg-neutral-800/50">
            What is Animate UI?
            <ChevronDown className="h-4 w-4 text-neutral-400 transition-transform duration-200" />
          </AccordionPrimitive.Trigger>
        </AccordionPrimitive.Header>
        <AccordionPrimitive.Content className="overflow-hidden text-sm text-neutral-400 transition-all data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
          <div className="p-4 pt-0">
            Animate UI animates the underlying primitives that Radix UI and shadcn/ui components are built on, leaving your structure, styles, and API completely untouched.
          </div>
        </AccordionPrimitive.Content>
      </AccordionPrimitive.Item>

      <AccordionPrimitive.Item value="item-2" className="border border-neutral-800 rounded-lg overflow-hidden bg-neutral-900/50">
        <AccordionPrimitive.Header className="flex">
          <AccordionPrimitive.Trigger className="flex flex-1 items-center justify-between p-4 font-medium text-neutral-200 transition-colors hover:bg-neutral-800/50">
            How does it work?
            <ChevronDown className="h-4 w-4 text-neutral-400 transition-transform duration-200" />
          </AccordionPrimitive.Trigger>
        </AccordionPrimitive.Header>
        <AccordionPrimitive.Content className="overflow-hidden text-sm text-neutral-400 transition-all data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
          <div className="p-4 pt-0">
            Instead of rewriting components, you simply swap the primitive imports to use `@animate-ui/react/primitives/radix-ui`.
          </div>
        </AccordionPrimitive.Content>
      </AccordionPrimitive.Item>
    </AccordionPrimitive.Root>
  );
}
