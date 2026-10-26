# Andi & Sada — design direction

## Context
Indonesian wedding invitation for Andi Ginting and Persada Sagala. Presentation-led, mobile-first content site with a local RSVP preview. Source: https://galerynikah.asia/andi-dan-sada/. Preserve sourced identities, dates, venues, photographs, and media; guest messages are not copied. The source lists pemberkatan on 4 September and adat on 25–26 September 2026; retain that distinction.

## Visual intent
An intimate photographic editorial. Burgundy is drawn from the couple's red traditional textiles; champagne recalls the gold ornament. The signature is an oversized asymmetrical name composition beside a full-height moving portrait, with a small italic ampersand. Pale rose sections alternate with burgundy event content. No generic wedding clip art, confetti, ornate gold frames, fake testimonials, or stock couples.

## Runtime tokens
Canonical tokens live in `dist/styles.css :root`; this document explains the mapping.
- `--wine: #3d1824`: principal deep burgundy, text, primary buttons.
- `--wine-light: #582936`: burgundy surface lift.
- `--paper: #f8f3f0`: pale rose page.
- `--champagne: #e4c9a5`: accent and dark-background buttons.
- `--ink: #33252a`: body text.
- `--muted: #76676b`: secondary text on pale background.
- `--line: #dfd2d0`: subtle borders.
- Display: local Cormorant Garamond with Georgia fallback, weight 400–500 and italic.
- Body and utility: local Manrope with Arial fallback.
- Large sections use clamp-based spacing; body type 14–16px; heading line height 0.96–1.08.

## Behavior
Vanilla HTML/CSS/JS. Opening is a direct user gesture that enables sound. One shared audio element; silent photo-film autoplay only in viewport. A YouTube dialog supplies the original MBS video, with a separate explicit audio choice. Carousel has arrows, pause, keyboard, swipe; motion pause and reduced-motion are respected. Native modal dialogs provide inert background and Escape; JS restores focus. Guest names are text-only, never injected as HTML. Local RSVP explicitly says it does not send to the couple. Native radio buttons, associated labels, inline errors. All storage and playback calls handle failures. Photos and fonts are local assets. No external CSS/JS libraries.

## Verification
Check opening, audio toggle, carousel controls, gallery next/previous and Escape, source video, gift copy, calendar download, RSVP validation/storage/download, responsive CSS and reduced-motion overrides. Dates must not display a negative countdown. No server/backend or fake delivery success.

## Motion edition — revised from user feedback
The initial fade-only direction was rejected as too quiet. The reference uses horizontal photo travel, zoom reveals, and a continuous image strip. Version 2 keeps the burgundy/champagne identity but gives photography the lead: a short split-curtain opening, two coordinated full-frame photo carousels, visibly entering and exiting photographs, alternating zoom/pan, a continuously moving photographic ribbon, masked typography, replayable directional scroll reveals, and photo lightbox transitions.

`dist/motion.css` owns motion presentation and new chapter/ribbon layouts. `dist/app.js` owns the shared carousel state machine. Incoming and outgoing frames remain present for an 1,800 ms transition; the next frame holds for 3,400 ms. The first automatic transition occurs after 2,600 ms. Transition variants are horizontal slide, center curtain, and depth zoom. Native pointer hover never stops the main carousels. Explicit pause, keyboard focus, offscreen state, hidden tabs, modal dialogs, and reduced motion stop automatic playback. Rapid clicks queue the latest intended destination. Motion can be explicitly re-enabled through the visible control when the OS preference reduces motion.

`data-reveal` defines rise/left/right/zoom variants. Reveals reset only after the element is fully offscreen, with focus preservation for forms. The moving ribbon has duplicate decorative content marked `aria-hidden`; reduced motion provides a static horizontally scrollable strip. A second independent source review verified the original slide direction/duration and image-carousel settings before this revision.
