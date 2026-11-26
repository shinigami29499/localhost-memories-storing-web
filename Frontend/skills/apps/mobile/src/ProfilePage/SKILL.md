---
name: mobile-profilepage
description: "Mobile profile and avatar."
---

# Mobile profile and avatar

Sources below are relative to `Frontend/apps/mobile/src/` unless marked shared, which is relative to `Frontend/src/`.

MobileProfilePage.tsx uses the shared `features/users/hooks/useProfileData.ts` hook for the signed-in user and their album, image, and video counts. The account overview comes first, followed by the inline avatar editor. Counts reserve a line while loading independently. Failed counts show an unavailable value and a status message. Pending avatar tiles match the loaded grid's spacing. A profile failure offers retry.

`MobileAvatarPicker.tsx` uses the shared `features/users/hooks/useAvatarPicker.ts` hook. Each of the 100 sets shows the current avatar and seven alternatives. The shared numbered pagination provides Previous, Next, and direct page selection. The preview beside it identifies the draft across sets. The shell expands its center button into a text-only Save avatar action. The picker enables it when the selection differs from the saved avatar. The account overview reflects only the saved avatar. Saving locks the controls and updates the session and profile cache on success. A failed save keeps the draft available for retry.
