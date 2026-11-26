---
name: file-upload-progress
description: Display shared file transfer status, metrics, and actions on web and mobile.
---

`src/features/uploads/components/FileUploadProgress.tsx` renders real transferred file bytes, total bytes, percentage, and available speed and ETA. The upload indicator takes its value from `src/features/uploads/uploadProgress.ts`. Multipart framing does not count toward file bytes. Request-body completion shows Processing until the server confirms storage. Failure and cancellation display the last measured value.

The component accepts optional cancel, retry, and dismiss actions. Failed files show Retry and cancelled files show Restart. Upload history uses `UploadHistoryRows.tsx` to connect the row to account-scoped transfer state and enforce management permissions. Preview pickers use the same row with their local draft lifecycle.

Use the shared semantic theme tokens and honor reduced motion. The browser scenario in `tests/e2e/file-upload-progress.spec.ts` exercises throttled native transfer and delayed responses against a local HTTP fixture.
