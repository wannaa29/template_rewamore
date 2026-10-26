# Andi & Sada — Nocturne Pearl

## Purpose and audience
A personal Indonesian wedding invitation for Andi Ginting and Persada Sagala. Its job is to introduce the couple, preserve their Karo ceremony context, help guests find event details, and present photographs and greetings. Primary use is mobile; desktop is a full editorial composition. This is a brand/content site with a small local guestbook, not an authenticated application.

## Direction
Ceremonial stationery meets a cameo portrait album. Pearl surfaces dominate, framed by midnight blue and restrained silver details. The signature is an oval portrait cover, followed by centered names and an arched portrait with prose and a date at its sides. Alternate broad portrait spreads introduce the couple. The original Karo photographs keep their natural colors. White space, photography and typography carry the premium impression. Avoid generic floral ornaments, particle effects, scroll hijacking and invented cultural symbols.

## Canonical tokens
Runtime palette ownership is `css/style.css :root`. Shared components live in that file; `css/nocturne.css`, loaded second, owns this edition's composition, surface distribution and responsive overrides. Keep the two files in that order.

| Token | Value | Role |
|---|---|---|
| --midnight | #102a43 | Ceremonial dark surface and actions |
| --midnight-deep | #091b2c | Cover, film, footer and modal dark surface |
| --midnight-soft | #365971 | Hover and italic accent |
| --paper | #f3f6f7 | Pearl reading surface and cards |
| --paper-deep | #e3ebef | Portrait and gift sections |
| --ink | #1b3042 | Reading text |
| --muted | #5f7180 | Secondary text on light surfaces |
| --silver | #afc1ce | Decorative lines and accents on dark surfaces |
| --silver-light | #dae5eb | Small text on dark surfaces |
| --line | #bdcbd3 | Light surface borders |
| --line-dark | #526d81 | Dark surface borders |

Display: locally hosted Cormorant Garamond regular/italic, restrained at section headings and names. Body/utility: locally hosted DM Sans. The files supplied in the original package are retained with OFL licenses. No external font service or JavaScript animation library.

## Layout and motion
Desktop: a 44/56 cover split, centered hero names with an arched photograph, alternating couple spreads, paired event cards, centered cinema feature, a gallery beginning with two large portraits, two-column gift/guestbook and a pearl closing spread. Mobile: a midnight oval-photo cover, natural single-column reading flow, a two-column album, reserved photo aspect ratios, compact floating section navigation and a separate music control. The guestbook is a midnight stage with a pearl form.

One-time reveal timing uses opacity and translation; the cover separates vertically over 1.15 seconds; the hero crossfades at 7-second intervals with previous/next/pause controls. Animation respects prefers-reduced-motion. Auto slideshow is suspended offscreen, in background tabs, and in save-data mode. No wheel/touch interception. Portraits remain stable without decorative pointer parallax.

## Behavior ownership
`js/app.js` owns image loading, hero control state, audio, scroll navigation, calendar files, lightbox, video, clipboard, local guestbook and guest personalization. Native dialog elements own modal semantics. Native select popups deliberately follow device conventions for attendance and guest count.

The local guestbook explicitly says data is not sent to the couple. Existing localStorage key is retained. Deletion requires a native dialog confirmation; validation is inline with focus on the first invalid field. Names and messages use textContent, never HTML. The application does not ask for payment, execute transfers or submit guest data externally.

## Source constraints
Preserve original names, parent names, Instagram, YouTube and Maps URLs, account numbers, event dates and local-only status. Event dates are September 2026; expired countdown displays thanks, not negative time. Image detail is limited by original source dimensions (typically 719–760 px wide); no invented resolution or photo replacement.

## Accessibility and stability
Semantic links/buttons, visible focus, native modal keyboard handling, readable contrast, no hover-only information, reduced motion, stable photo geometry, optional music with accurate state and independent error messages. Global visible scrollbar styles inherit to owned scroll regions. Form text is at least 16 px on mobile to avoid iOS input zoom.
