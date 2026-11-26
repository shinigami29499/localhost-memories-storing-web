---
name: use-photo-picker
description: "Select media or upload preview drafts."
---

The web and mobile photo pickers use existing library media or preview drafts. File selection on the Previews tab creates a draft through `previewService`. The pickers measure native multipart transfer events through the shared upload system, expose Cancel, and retain the selected file for retry or restart. The response confirms the draft and selects it. Closing the picker aborts any outstanding request and releases unused confirmed drafts.

Selected-image and preview-list queries forward cancellation signals to their requests.

Scrolling near the end requests the next page at most once per 100 ms. The trailing check uses the latest source and scroll position, and unmount cancels it. Loading and failed pages do not trigger duplicate pagination.
