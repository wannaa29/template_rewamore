# Andi & Sada — The Garnet Folio

## Purpose and audience
A personal Indonesian wedding invitation for Andi Ginting and Persada Sagala. Its job is to introduce the couple, preserve their Karo ceremony context, help guests find event details, and present photographs and greetings. Primary use is mobile; desktop is a full editorial composition. This is a brand/content site with a small local guestbook, not an authenticated application.

## Direction
Ceremonial stationery meets a photographic keepsake. The burgundy, black and champagne palette comes from the couple's existing Karo attire. The signature is a two-leaf opening folio followed by oversized names and a framed portrait. White space, photography and typography carry the premium impression. Avoid generic floral ornaments, particle effects, scroll hijacking and invented cultural symbols.

## Canonical tokens
Runtime ownership is `css/style.css :root`; all sections use these properties.

| Token | Value | Role |
|---|---|---|
| --garnet | #411c28 | Main ceremonial surface and actions |
| --garnet-deep | #29131c | Closing and modal dark surface |
| --garnet-soft | #643446 | Hover and italic accent |
| --paper | #f6f2ec | Main reading surface |
| --paper-deep | #eae2d8 | Portrait and gift sections |
| --ink | #34252a | Reading text |
| --muted | #76626a | Secondary text on light surfaces |
| --gold | #c4a77b | Decorative lines and accents on dark surfaces |
| --gold-light | #e1cba9 | Small text on dark surfaces |
| --line | #cdbfb4 | Light surface borders |
| --line-dark | #805869 | Dark surface borders |

Display: locally hosted Cormorant Garamond regular/italic, restrained at section headings and names. Body/utility: locally hosted DM Sans. The files supplied in the original package are retained with OFL licenses. No external font service or JavaScript animation library.

## Layout and motion
Desktop: full canvas with a maximum-width hero, asymmetric couple portraits, paired event cards, staggered gallery, two-column gift/guestbook and a closing spread. Mobile: natural single-column flow, reserved photo aspect ratios, compact floating section navigation and a separate music control. The original fixed desktop portrait/sidebar is removed.

One-time reveal timing uses opacity and translation; the cover separates over 1.15 seconds; the hero crossfades at 7-second intervals with previous/next/pause controls. Animation respects prefers-reduced-motion. Auto slideshow is suspended offscreen, in background tabs, and in save-data mode. No wheel/touch interception. Pointer-only decorative parallax was intentionally omitted to keep portraits stable and the experience light.

## Behavior ownership
`js/app.js` owns image loading, hero control state, audio, scroll navigation, calendar files, lightbox, video, clipboard, local guestbook and guest personalization. Native dialog elements own modal semantics. Native select popups deliberately follow device conventions for attendance and guest count.

The local guestbook explicitly says data is not sent to the couple. Existing localStorage key is retained. Deletion requires a native dialog confirmation; validation is inline with focus on the first invalid field. Names and messages use textContent, never HTML. The application does not ask for payment, execute transfers or submit guest data externally.

## Source constraints
Preserve original names, parent names, Instagram, YouTube and Maps URLs, account numbers, event dates and local-only status. Event dates are September 2026; expired countdown displays thanks, not negative time. Image detail is limited by original source dimensions (typically 719–760 px wide); no invented resolution or photo replacement.

## Accessibility and stability
Semantic links/buttons, visible focus, native modal keyboard handling, readable contrast, no hover-only information, reduced motion, stable photo geometry, optional music with accurate state and independent error messages. Global visible scrollbar styles inherit to owned scroll regions. Form text is at least 16 px on mobile to avoid iOS input zoom.
