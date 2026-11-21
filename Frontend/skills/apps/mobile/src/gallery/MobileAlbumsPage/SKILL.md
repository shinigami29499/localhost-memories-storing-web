---
name: mobile-mobilealbumspage
description: "Mobile album list."
---

# Mobile album list

Sources below are relative to `Frontend/apps/mobile/src/` unless marked shared, which is relative to `Frontend/src/`.

Gallery opens the album list. Creating an album opens its detail page so the owner can add media. Album deletion confirms permanent deletion of files owned by the album owner.

gallery/MobileAlbumsPage.tsx uses the shared album date view and pages/albums/useAlbumsPage.ts. The date strip ends at today in the current month. The fixed carousel shows the current album in a raised frame and the next album in a flat compact row. Move Up or an upward swipe or drag advances one album. A downward gesture reverses the change. Empty dates use the shared empty state.

New album appears in the empty state. The main card's Send Horizontal link opens album detail and slides the Gallery header aside for Back. Back reverses the header motion and restores the opened album's date and position in Gallery. Owners edit or delete an album from its detail page.

Legacy Favorites URLs redirect to the album list.
