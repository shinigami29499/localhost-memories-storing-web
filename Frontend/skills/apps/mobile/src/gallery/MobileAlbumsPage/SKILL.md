---
name: mobile-mobilealbumspage
description: "Mobile album list."
---

# Mobile album list

Sources below are relative to `Frontend/apps/mobile/src/` unless marked shared, which is relative to `Frontend/src/`.

`/album` opens the album list. Creating an album opens `/album/{albumId}` so the owner can add media. Album deletion confirms permanent deletion of files owned by the album owner.

gallery/MobileAlbumsPage.tsx uses the shared album date view and pages/albums/useAlbumsPage.ts. The date strip ends at today in the current month and scrolls freely by touch. In the album frames, a swipe left selects the next day and a swipe right selects the previous day, including across months. The month button opens the date picker. Choose a date there, from the strip, or by swiping the album frame. Future dates are unavailable. Tapping the selected date returns to the first album for that date. The carousel shows the current album in a raised frame and the next album in a flat compact button. Tapping the next album, swiping up, or pressing Arrow Up advances one album. Swiping down or pressing Arrow Down reverses the change. Empty dates use a compact shared empty state.

The album position control stays at the right of the next-album row. It shows the current index and total for the selected date with a segmented progress ring. Activate once to reveal Move up, then activate again within two seconds to return to the first album. The arrow and count transitions respect reduced motion. The raised center plus in mobile navigation opens Add album. It uses a layered purple-to-pink gradient that responds to hover and press, and stays available for empty dates. Opening the creation dialog captures the selected calendar date and list history key in a same-URL entry. The create request stores that date for album grouping while the API stamps the actual creation time separately. Browser Back, Android Back, and Cancel close the dialog and restore focus to Add album. Navigation is blocked during submission. On success, the new album replaces the dialog entry. Back from the new album restores its selected date and carousel position. It is unavailable during initial loading or after an error without cached albums. On shorter viewports the page scrolls to preserve carousel dimensions. The center plus stays with the floating navigation while scrolling. The main card's Send Horizontal link opens album detail. Back restores the opened album's date and position in Gallery. Owners edit or delete an album from its detail page.

The page registers Add album on the shell's persistent center plus after the route cover begins fading or clears. The featured and next-album titles and usernames use SwappingText when the displayed album changes. Preview text fades with its cover. Both effects respect interface motion and reduced motion.

During the view transition with album detail, the featured title and byline can appear before the cover finishes loading. The list keeps them visible after the transition so they can move back from their detail positions without disappearing.

During initial album loading, the shared date view shows skeletons for the featured and next-album frames. Each skeleton fades away when the query settles, and populated frames fade in. Frame availability changes on date or index changes use the same fade. The next-album row keeps its space for the album position control.

Each populated frame shows an image placeholder and title and username skeletons while its cover loads. Both slots resolve independently. A missing or failed cover reveals the text and shows the no-cover treatment.

The main card has a circular heart action left of Send Horizontal. It toggles the caller's persisted album favorite and shows a single spinning arc for at least 300 ms and until the request and album-list refresh finish. The selected heart is filled with a tinted circle. Loading ends with a direct swap to the heart, without zoom. Hovering the button pulses the heart when interface and icon motion are enabled and reduced motion is not requested. The busy indicator remains visible with motion disabled.

Legacy Favorites URLs redirect to the album list.
