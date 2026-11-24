---
name: location-search-hook
description: Debounced location autocomplete and request lifecycle.
---

`Frontend/src/features/locations/hooks/useLocationSearch.ts` supplies autocomplete to the shared location search controller used by web and mobile. Enabled queries require three trimmed characters and wait for the configured autocomplete debounce. TanStack Query keys each term separately, forwards cancellation to the Photon request, and hides results and errors for an obsolete term. Disabling or unmounting clears the pending timer. Failed requests can be retried.
