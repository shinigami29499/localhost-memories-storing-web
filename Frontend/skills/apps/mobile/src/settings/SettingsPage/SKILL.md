---
name: mobile-settingspage
description: "Mobile settings and device permissions."
---

# Mobile settings and device permissions

Sources below are relative to `Frontend/apps/mobile/src/` unless marked shared, which is relative to `Frontend/src/`.

settings/MobileSettingsPage.tsx uses SoundEffectsSettings.tsx and shared pages/settings/useSettingsState.ts. It controls theme, sound, toasts, motion, notifications, location and camera. Turning off toasts closes existing toasts. Location and camera can be requested; revocation uses device or browser settings. Photo access is managed by the picker. Push after app closure is unavailable.
