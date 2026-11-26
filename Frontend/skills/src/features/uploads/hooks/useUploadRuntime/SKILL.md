---
name: use-upload-runtime
description: Run direct album uploads and restore browser-local history.
---

`src/features/uploads/hooks/useUploadRuntime.ts` starts the runner for an active account. The runner in `services/uploadRuntime.ts` starts up to three independent requests as soon as files are selected and writes the local cache in parallel. Stored files trigger album and media query refreshes.

`services/uploadFileStore.ts` caches per-account rows in IndexedDB. Failed or cancelled rows keep the source file for retry. Success releases the cached file data and keeps metadata. Queued rows resume after reload; a transfer interrupted mid-request is available for manual retry. The same media ID is reused so an uncertain prior response cannot create a second item in the album. Deleting a history row only updates the browser cache.
