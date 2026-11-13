---
name: 03-fe-06-remotion-captions
description: Transcribing, displaying and animating captions in Remotion
version: 4.0.543
---

Process captions as JSON using the `Caption` type from `@remotion/captions`:

```ts
type Caption = {
  text: string;
  startMs: number;
  endMs: number;
  timestampMs: number | null;
  confidence: number | null;
  pageBreakAfter?: boolean;
};
```

Consult the [caption docs](https://www.remotion.dev/docs/captions) for transcription, display, and SRT import workflows.
