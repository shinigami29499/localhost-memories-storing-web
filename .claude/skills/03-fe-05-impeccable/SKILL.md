---
name: 03-fe-05-impeccable
description: "Use for frontend UI design work: shaping new screens, redesigning or polishing components, auditing visual quality, and improving layout, typography, color, motion, responsive behavior, accessibility, and UX copy."
---

# Frontend Design Craft

Use this skill to make deliberate, product-specific interface decisions before and during implementation. It adapts the design workflow of [Impeccable](https://github.com/pbakaus/impeccable) for this repository; it does not include or require Impeccable's CLI, scripts, or commands.

## When to Use

- Designing or replacing a page, feature, or visual system
- Polishing, critiquing, or auditing an existing interface
- Improving layout, hierarchy, typography, color, motion, copy, or responsive behavior
- Refining forms, navigation, settings, onboarding, empty states, or other interaction flows

Skip for backend-only work and frontend changes that do not affect the user experience.

## Workflow

1. **Define the surface and user goal.** Identify the specific page or component, its primary user task, important states, viewport targets, and scope. Choose the surface's intent:
   - **Persuade:** help visitors decide and act.
   - **Operate:** help users complete a task clearly and efficiently.
   - **Read:** help users understand content.
   - **Experience:** make the work itself the focus.

   Select intent per surface, not per product.

2. **Inspect before choosing a direction.** Read the target component, its parent and related styles, nearby UI patterns, existing tokens, and the relevant route or interaction. Treat existing UI as evidence, not proof that a new surface must copy it. Use supplied visual references when available; otherwise base decisions on the product's established design system.

3. **Write a brief design contract.** State the surface's job, visual direction, information hierarchy, primary action, required states, responsive behavior, and patterns to avoid. Keep an existing identity for refinements. For an explicit redesign, replace the visual direction while preserving product facts, content meaning, core behavior, and platform conventions. Ask before changing factual copy or adding claims.

4. **Implement within the project.** Follow [the frontend overview](../03-fe-01-readfirst/SKILL.md), reuse existing components and CSS tokens, and keep the change within the requested surface. Prefer purposeful hierarchy and content-led layouts over generic templates. Avoid decorative gradients, excessive rounding, oversized spacing, arbitrary shadows, and uniform card grids unless the brief and current system call for them.

5. **Cover real states and access needs.** Check loading, empty, error, success, disabled, permission, and long-content states as applicable. Preserve clear labels, keyboard access, visible focus, sufficient contrast, and meaningful feedback. Respect reduced-motion preferences and use local animated icons from `Frontend/src/components/animate-ui/icons` when appropriate.

6. **Inspect the rendered result.** When the app is already available, review the changed surface at relevant viewport sizes and themes. Batch fixes revealed by each inspection, then inspect again. Do not claim visual verification when you could not view the rendered UI. Do not start the API as a validation shortcut; startup can mutate local data and storage.

7. **Finish with focused verification.** Check the frontend overview's validation rules. Review the diff for scope, behavior preservation, accessibility, responsive layout, and consistency with the design contract. Report what changed and which checks actually ran.

## Repository-Specific Guardrails

- Use the project's CSS variables and established components instead of introducing a competing palette or design system.
- Use `var(--surface-hover)` for neutral hover and focus-highlight backgrounds; keep selected and semantic states distinct.
- Keep icon-only controls labeled, hide decorative icons from assistive technology, and preserve the existing busy-state feedback patterns.
- Keep visual refinement separate from behavior changes unless the request includes both.
- Never copy another product's branding, proprietary text, imagery, or exact screen composition.

## Finish Check

- Does the hierarchy make the user's next step obvious?
- Does the surface fit its intended mode and the product's visual language?
- Do content, controls, and states remain clear at narrow and wide sizes?
- Are keyboard, focus, contrast, labels, and reduced motion handled?
- Did implementation preserve behavior and stay within the requested scope?
- Was the rendered result inspected, or is that limitation stated clearly?

