# Shared Code Conventions

Stack-specific naming and implementation conventions belong in the overview skills:

- [Backend conventions](../.agents/skills/be-a-overview/SKILL.md#backend-conventions)
- [Frontend conventions](../.agents/skills/fe-a-overview/SKILL.md#frontend-conventions)

## General

- Use descriptive names and consistent domain terminology.
- Keep comments limited to necessary concrete facts or non-obvious constraints.
- Avoid redundant narration, speculation, conversational notes, change history, decorative headings, and commented-out code.

Apply these shared conventions alongside the relevant stack overview. When a rule applies to only one stack, keep it in that stack's overview rather than duplicating it here.

## Frontend icon motion

- Use local icons from `Frontend/src/components/animate-ui/icons`.
- Icon components inherit the `Icon animations` setting through the shared `IconWrapper`. Do not bypass it with raw motion on an icon; use `animate={false}` only for intentionally static icons such as loading indicators.
- Wrap interactive controls containing icons in the shared `AnimateIcon` component with hover and tap triggers. This applies both motion preferences and respects touch, standalone, and reduced-motion behavior.
- When adding icon motion, verify it follows `Icon animations` and `Page and click animations`. Gate custom effects, such as a favorite confirmation burst, with `iconsEnabled`; use `animate={false}` for intentionally static icons.
