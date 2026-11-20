---
name: animated-icon-controls
description: Shared animation triggers and motion preferences for application icons.
---

# Animated icon controls

`Frontend/src/components/animate-ui/icons/icon.tsx` wraps Animate UI icons and supplies their animation controls. Hover animation runs on hover-capable fine pointers when interface motion and icon animation are enabled, including in the mobile app. Reduced motion disables hover playback. Disabled controls do not start hover animation. Explicit `animate={false}` or `animateOnHover={false}` opts out.

Tap and installed-app view triggers remain disabled at mobile widths. Explicit playback and looping remain disabled there. Changes to motion preferences stop active icon controls. `check-check.tsx` uses the shared wrapper like other mobile icons.

Validate changes with the mobile build and check hover, disabled controls, interface motion off, and reduced motion on a hover-capable device.
