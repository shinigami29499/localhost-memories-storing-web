---
name: map-bounds-hook
description: Debounced map bounds for location queries.
---

`Frontend/src/features/locations/hooks/useMapBounds.ts` accepts map bounds from movement events and updates query bounds after the configured filter debounce. Equal bounds do not restart the timer. The pending timer is cleared on subsequent movement and unmount. The initial bounds cover the world.
