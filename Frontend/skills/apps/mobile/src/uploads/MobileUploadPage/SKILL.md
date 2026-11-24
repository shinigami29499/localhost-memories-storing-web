---
name: mobile-mobileuploadpage
description: "Mobile upload management."
---

# Mobile upload management

Sources below are relative to `Frontend/apps/mobile/src/` unless marked shared, which is relative to `Frontend/src/`.

uploads/MobileUploadPage.tsx and MobileUploadBatchCard.tsx use shared pages/uploads/useUploadManagement.ts. Users start uploads from album detail. This page links to Albums and manages upload history. History is paginated and date-filtered through the URL. Admins request all uploads; others request their own. Batch controls expose pause and record removal; unread status can be marked read. Changes invalidate upload queries.

Upload history shows card placeholders during initial data loading. Pagination and mutation feedback remain local to their controls.

Date changes update the URL immediately. The filtered request waits for 300 ms of settled input and obsolete requests are aborted.
