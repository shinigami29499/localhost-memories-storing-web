---
name: mobile-profilepage
description: "Mobile profile and avatar."
---

# Mobile profile and avatar

Sources below are relative to `Frontend/apps/mobile/src/` unless marked shared, which is relative to `Frontend/src/`.

MobileProfilePage.tsx uses shared features/users/hooks/useProfileData.ts and MobileAvatarPicker.tsx. It displays user and album, image and video counts. Missing user, count and profile failures have separate states; profile errors can be retried. Avatar picker appears after profile query success.
