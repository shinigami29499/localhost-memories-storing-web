# Frontend UI standard

Apply this to every new user-facing feature and to existing screens when they are edited. Keep the existing ShinigaCim palette, type, spacing, and shared components. This guide turns the supplied [UI Design Tips](https://www.uidesign.tips/ui-tips) into project rules; the articles are inspiration, not a replacement design system.

## Before building

Write a short design contract in the feature PR or task notes: user goal, screen intent (operate, read, experience, or persuade), primary action, content order, required states, phone and desktop layout, and dangerous actions. Reuse `src/components/ui`, `PageActionBar`, and tokens in `src/styles/global.css`. Add a shared primitive only when repeated use warrants it.

## Screen rules

### Box corners and padding

- Use a 0px outer radius and a 0px inner radius by default: `--radius` and `--radius-inner`. Derive the inner radius as half the outer radius so the outer radius always equals twice the inner radius.
- Use `--box-inset: 4px` as the default padding between outer and inner box borders, equal on every side. With a 1px outer border, the visible inset is 5px, as in the Upload media reference. Keep sibling items consistent; change padding only when content or layout requires it.
- Apply the 4px outer radius to every frontend button, text input, textarea, and select, including the shared `Input` and `PasswordInput` components and native fields. Use the 2px inner radius for controls inset in a group, including search fields, date-range fields, and password visibility buttons. Use 4px padding between a bordered group's border and its controls.
- Keep control radius rules centralized in `src/styles/overhaul.css`. Do not add component, page, inline, or utility-class radius overrides for text fields. Checkbox, radio, range, color, file, hidden, and native button input types are not text fields.

### Dialog headers

- Use the shared dialog header across the project. Keep 12px padding on every side, an 80px minimum height, an 8px gap, and a 56px square icon when present. Allow extra height for wrapped or translated content. Use the inner radius for icon boxes.
- Every dialog header must include an accessible X close button, disabled while closing is blocked. Keep title, subtitle, icon, and close-button styling consistent without per-dialog or breakpoint overrides.

### Dialog content

- Use 12px padding on all sides of every dialog content zone at every viewport size. Keep shared dialog padding centralized and remove conflicting dialog-specific or responsive overrides. Full-bleed media viewers may omit content padding when the media itself occupies the viewport.

### Dialog actions

- Use the shared `dialog-actions` layout and `dialog-action` classes for dialog buttons. Use `dialog-action--danger` for the pale red Delete action, `dialog-action--danger-confirm` for the solid red final deletion, and `dialog-action--normal` for the brown primary action.
- Use the shared `Button` component for action buttons in every frontend popup dialog. Keep button background and text colors identical in default and hover states; hover only underlines the label. Dialog action buttons have no selected state. In a two-button row with Delete and another action, give Delete 24% and the other action the remaining width. Use the same narrow column for Cancel in an inline deletion confirmation. Do not add dialog-specific button color overrides. Rating stars, switches, media viewer icons, and selectable album or image tiles are controls, not dialog action buttons; keep their functional state cues.
- When Delete turns into an inline confirmation, replace the action row with a narrow pale red Cancel button and a wide solid red final deletion button. Put the target and consequence in smaller `dialog-actions__note` text below the row. Keep focus visible and lock both buttons while the request runs.

1. **Clear hierarchy.** Give each route one identifiable page title. Put the task or content immediately after it. Use weight, size, spacing, and left alignment to distinguish title, supporting copy, and controls. Keep descriptive paragraphs at a readable width (about 60–75 characters); do not constrain media grids or data tables to that width. Use whitespace for related groups and dividers only where they clarify a boundary. [Headers](https://www.uidesign.tips/ui-tips/how-to-design-the-perfect-header), [hierarchy](https://www.uidesign.tips/ui-tips/visual-hierarchy), [quick hierarchy fixes](https://www.uidesign.tips/ui-tips/quick-ui-fixes-1), [line width](https://www.uidesign.tips/ui-tips/line-width), [section separation](https://www.uidesign.tips/ui-tips/visually-seperate-elements-1).
2. **One leading action per task area.** Use a specific verb and object, such as “Create album” or “Upload media.” Secondary links and filters must not compete with it. Action labels must explain the next step and whether it commits a change. Do not move a familiar navigation action to induce clicks. [Consistent buttons](https://www.uidesign.tips/ui-tips/hero-section-consistency), [links](https://www.uidesign.tips/ui-tips/engaging-links), [next steps](https://www.uidesign.tips/ui-tips/don-t-let-user-guess), [surprises](https://www.uidesign.tips/ui-tips/users-hate-surprises), [user trust](https://www.uidesign.tips/ui-tips/ux-vs-conversions).
3. **Make actions recognizable without hover.** Show text with primary and unfamiliar actions, especially on phones. Reserve icon-only buttons for familiar, repeated, space-constrained row controls; give them localized `aria-label` and `title`. A clickable card or tile needs a visible cue or clearly labeled action, keyboard access, and focus feedback. [Icon labels](https://www.uidesign.tips/ui-tips/support-icons-with-text), [clickable cards](https://www.uidesign.tips/ui-tips/make-cards-look-clickable-vol-2).
4. **Protect destructive actions.** Keep Delete and permanent removal visually secondary until the user chooses them. Confirm with the target name/count, the consequence, and an action-specific button label. Use a narrow pale red Cancel button for inline deletion confirmation; focus Cancel first. Distinguish recoverable trash moves from permanent deletion. Offer Undo where supported. Never use generic “Yes,” “No,” or “Confirm” for a destructive decision. [Danger emphasis](https://www.uidesign.tips/ui-tips/de-emphasize-dangerous-actions), [deletion validation](https://www.uidesign.tips/ui-tips/how-to-validate-deletion), [button copy](https://www.uidesign.tips/ui-tips/quick-ui-fixes).
5. **Explain forms.** Keep visible labels. Use placeholders for examples or format hints, not repeated labels. Show constraints and consequences before submission; put validation beside the affected field. Use an appropriate input type and a useful preset or picker when it prevents invalid values. [Inputs](https://www.uidesign.tips/ui-tips/make-inputs-self-explanatory), [surprises](https://www.uidesign.tips/ui-tips/users-hate-surprises).
6. **Use the palette with restraint.** Keep the authored colors and semantic tokens in `global.css`; use the strongest brown for leading actions and selected states, lighter surfaces for supporting controls. Distinguish danger with wording, icon, and boundary as well as color. Use `--radius` as the baseline and make nested corners visually coherent. [Brand color](https://www.uidesign.tips/ui-tips/brand-colors), [radius consistency](https://www.uidesign.tips/ui-tips/border-radius-consistency).
7. **Make long screens discoverable.** On feed or landing-like screens, expose a glimpse of the next section or a clear content cue when more content exists. Do not add decorative scroll prompts to short task screens. [Scroll cue](https://www.uidesign.tips/ui-tips/hero-section-prompt-scroll).

## Page and highlight transitions

Use these rules for new routes and changes to the Gallery, Location, or Users navigation. Page content, the highlight bar, the header, and the action bar have separate transition boundaries.

- Push page content horizontally: incoming content enters from one side while outgoing content leaves on the opposite side. The current push uses a 500 ms in-out transition. Exclude the action bar and its items; `PageActionBar` owns their separate transitions.
- When both outgoing and incoming pages have highlight bars, keep the bars in place and push only their data sections. This applies in both directions between Gallery, Location, and Users. When either page has no highlight bar, push the whole page content section as usual.
- A highlight change within a page pushes only the data section. Keep the highlight bar and action bar stationary. Route-backed filters within the same feature are highlight changes, not separate whole-page transitions.
- Keep a highlight bar visible throughout a page handoff, including while the destination loads. If selected indexes differ, move and resize the indicator from the outgoing selection to the incoming selection with the existing highlight spring. If indexes match, do not add indicator travel. Preserve the destination bar's accessible labels and keyboard behavior.
- Swap the header title and changed highlight labels with the existing `SwappingText` behavior. Start from outgoing text and animate once to destination text; never show the destination, swap back, and then animate forward. Keep the selected-color text overlay synchronized with the visible letters. Expose the destination text as the accessible name throughout the transition.
- Capture outgoing content before React changes it. The outgoing copy must show previous data, retain its layout and scroll positions, and stay inert and hidden from assistive technology. Preserve its source styling context without letting destination-specific styles affect it. Do not let headings, day groups, or media tiles jump vertically before or during the push. Remove temporary copies after completion or interruption; rapid navigation must not leave stale overlays.
- Respect both the interface-motion setting and `prefers-reduced-motion`. When motion is disabled, show the destination without optional push, indicator, or text animation.

The shared page handoff is implemented in `Frontend/src/hooks/PushTransition.tsx`; route grouping and the header title are in `Frontend/src/components/layout/AuthenticatedLayout.tsx`. Pages with a highlight bar mark the content to move with `data-push-page-content`. Highlight rendering and text handoff live in `Frontend/src/components/ui/NavigationHighlight.tsx` and `Frontend/src/components/ui/SwapLabel.tsx`. When adding a feature to this behavior, update the route grouping and highlight classification, mark its data section, and reuse these components instead of adding a separate transition.

For motion changes, use the existing frontend build and browser-driven checks when needed. Focused Playwright coverage is in `Frontend/e2e/push-transition.spec.ts`, `Frontend/e2e/highlight-page-handoff.spec.ts`, `Frontend/e2e/push-content-alignment.spec.ts`, and `Frontend/e2e/mobile-users-action-transition.spec.ts`. Check rendered positions and visible frames, not only keyframes: cover both directions, equal and different highlight indexes, loading, rapid interruptions, reduced motion, and phone and desktop widths. Include multi-day media tiles when checking Gallery alignment.

## Required states and review

- Design loading, empty, error, populated, pending, disabled, and success states where applicable. Empty states should name the next available action and link to it when useful.
- Check phone (390px), desktop (1440px), keyboard focus, long translated text, and reduced motion. Verify no horizontal overflow or hidden primary action.
- Check confirmation copy and focus return, visible input labels, action names, and the result of each click. Use the existing localized `t()` copy and shared toast/error patterns.
- Review the rendered UI and the source. Follow the frontend overview's build and test rules. Run browser-driven tests when necessary.

See [the screen audit and improvement plan](frontend-ui-audit-plan.md) for the November 2026 baseline.
