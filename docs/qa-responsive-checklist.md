# QA Responsive Checklist (Web)

## Pre-check

1. Run:

```bash
npm run qa:smoke
npm run dev
```

2. Open `http://localhost:3000`.
3. Test with Chrome DevTools device mode.

## Viewport matrix

- 375x667 (iPhone SE)
- 390x844 (iPhone 14)
- 430x932 (iPhone 14 Pro Max)
- 768x1024 (iPad portrait)
- 1024x768 (iPad landscape)
- 1366x768 (desktop small)

## Global checks (all screens)

- No horizontal scroll on body.
- Header text does not overlap or clip.
- Sidebar open/close works and does not leave partial overlays.
- Primary actions remain reachable without zooming.

## Dashboard checks

- Main content uses available width (no unnecessary narrow container).
- Cards wrap correctly without overlap.
- Sidebar + header alignment remains consistent.

## Real-time map checks

- Route info card does not cover control cluster in mobile.
- Control buttons remain fully clickable (entire button hit area).
- Options panel opens without clipping outside map card.
- Route list panel:
  - Desktop/tablet: collapsible and restorable.
  - Mobile: visible below map, never hidden.
- On refresh:
  - zoom/pan is preserved unless user explicitly recenters.
  - no visible “jump” when tracking data is unchanged.

## Theme checks

- System theme is respected by default.
- Theme toggle persists after reload.
- Login and dashboard keep consistent visual contrast.

## Regression checks

- Route selection still works.
- Recenter route / center truck / follow truck still work.
- Tracking update button still updates and shows status.

## Map debug (optional)

- Run `NEXT_PUBLIC_DEBUG_MAP=true npm run dev`.
- Open map options panel and confirm debug block appears.
- Confirm text remains readable in light/dark theme.
