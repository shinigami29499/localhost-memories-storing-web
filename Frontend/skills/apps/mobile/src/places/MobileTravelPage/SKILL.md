---
name: mobile-mobiletravelpage
description: "Mobile travel photo map."
---

# Mobile travel photo map

Sources below are relative to `Frontend/apps/mobile/src/` unless marked shared, which is relative to `Frontend/src/`.

places/MobileTravelPage.tsx uses shared pages/locations/useTravelPageController.tsx with phone editing enabled. Users inspect located and unlocated media. Owners and admins can draft and confirm photo relocation, refreshing media and album queries. Home can be chosen or moved. Current-location uploads require location access; completion attempts to tag successful files and reports partial failures.
