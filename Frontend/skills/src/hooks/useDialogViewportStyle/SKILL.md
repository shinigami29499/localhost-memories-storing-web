---
name: use-dialog-viewport-style
description: Align dialogs to the application main area.
---

The hook measures the main area's left edge and width on mount. Window and main-area resize events update these bounds after 200 ms without further changes. Pending updates are cancelled on unmount. Without a main area, the initial width uses the window.
