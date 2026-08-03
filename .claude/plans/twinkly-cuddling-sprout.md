# Swipe-to-Change-Page Gesture Implementation

## Context
The reader currently only supports page navigation via arrow buttons, segmented progress bar, and morphing page dots. There's no touch swipe gesture. Users reading on tablets/phones want to swipe the text area to turn pages — the de facto standard for ebook/reading apps. This needs to coexist with our existing drag-to-select phrase feature.

## Core Design
Use 1-finger horizontal swipe initiated from **edge zone** (left 10% / right 10% of pane width). If the touch doesn't start in the edge zone, it's treated as drag-to-select as before. If it starts in the edge zone but doesn't reach the 30% threshold, fallback to drag-to-select.

## Key State

### New ref — `swipeRef`
```ts
const swipeRef = useRef<{
  active: boolean;
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
}>({ active: false, startX: 0, startY: 0, lastX: 0, lastY: 0 });
```

### New state — `swipeProgress`
```ts
const [swipeProgress, setSwipeProgress] = useState(0);
// 0 = no swipe, 0.5 = halfway to threshold (15% of container), 1.0 = at threshold (30%)
```

## Changes by File

### 1. `ReaderPane.tsx` — Touch Handlers (native `touchstart/touchmove/touchend` in the useEffect)

**touchstart:**
- Get `paneRect` from `paneRef.current.getBoundingClientRect()`
- Compute `touchX = e.touches[0].clientX - paneRect.left` (position relative to pane)
- Edge zone = 10% of `paneRect.width` from each side
- If `touchX <= edgeZone` or `touchX >= paneRect.width - edgeZone` → set `swipeRef.active = true`
- Always initialize `touchDragRef` as before (for fallback)
- Do NOT call `updateSelectionFromCoordinates` yet (no blue highlight during swipe mode)

**touchmove:**
- If `swipeRef.active`:
  - `e.preventDefault()` to prevent scroll
  - Update `swipeRef.lastX/Y`
  - Calculate `dx = e.touches[0].clientX - swipeRef.startX`
  - Direction: dx > 0 → right (prev page LTR), dx < 0 → left (next page LTR)
  - Calculate progress: `Math.abs(dx) / (paneRect.width * 0.3)`, clamped to [0, 1]
  - `setSwipeProgress(progress)`
  - Do NOT call `updateSelectionFromCoordinates` (no blue highlight during swipe)
  - Also track `touchDragRef.currentEndTokenId` by calling `findTokenAtPoint` directly (for fallback at touchend without updating store)
- If NOT `swipeRef.active`: existing drag logic

**touchend:**
- If `swipeRef.active`:
  - Compute `dx = Math.abs(swipeRef.lastX - swipeRef.startX)`
  - Threshold = `paneRect.width * 0.3`
  - If `dx >= threshold` → page change:
    - Direction: `swipeRef.lastX > swipeRef.startX` → prev page, else → next page (LTR)
    - Clamp to [0, totalPages - 1]
    - Call `handlePageAdvance(newPage)` (which clears selection via `setPage`)
    - `setSwipeProgress(0)`, `swipeRef.active = false`
    - Call `useReaderStore.setState({ isDragging: false })` so sidebar can show normally after
    - **Return** early — don't execute drag logic
  - If `dx < threshold` → fallback to drag:
    - `swipeRef.active = false`, `setSwipeProgress(0)`
    - **Call `updateSelectionFromCoordinates(swipeRef.lastX, swipeRef.lastY)`** to compute final range
    - Fall through to existing drag-end logic (1s sidebar timeout, etc.)
- If NOT `swipeRef.active`: existing drag logic (unchanged)

### 2. `ReaderPane.tsx` — Pointer Handlers (handlePointerDown/Move/Up)

Since touch events fire AFTER pointer events on most browsers, we need to handle swipe in pointer events too for consistency. Use `e.pointerType === 'touch'` to detect touch input:

**handlePointerDown:**
- If `e.pointerType === 'touch'`:
  - Check edge zone (same logic as touchstart)
  - If edge zone → set `swipeRef.active = true`, `useReaderStore.setState({ isDragging: true })`, **return** (skip drag init)
- Otherwise: existing drag logic

**handlePointerMove:**
- If `swipeRef.current.active`:
  - Update lastX/Y
  - Calculate progress, setSwipeProgress
  - Track `touchDragRef.currentEndTokenId` via `findTokenAtPoint` (for fallback)
  - Return early
- Otherwise: existing drag logic

**handlePointerUp:**
- Before existing logic, check: if `swipeRef.current.active`:
  - Same threshold check as touchend
  - If threshold met → page change, cleanup
  - If not → fallback to drag per touchend logic
  - Always set `useReaderStore.setState({ isDragging: false })`
  - Return early

### 3. `ReaderPane.tsx` — Visual Indicator (new `SwipeIndicator` component)

Add near the return JSX, inside the pane area (below the rendered text but above the page dots):
```tsx
{swipeProgress > 0 && (
  <SwipeIndicator
    progress={swipeProgress}
    direction={/* derived from swipeRef direction */}
    currentPage={currentPage}
    totalPages={totalPages}
  />
)}
```

The indicator should be:
- `position: absolute` overlaying the text area
- Bottom-center of pane, small pill/chip design
- Shows "Page N → N+1" with arrow
- Opacity fades in quickly, stays opaque after threshold
- `pointer-events: none` so it doesn't interfere with touch

### 4. New file: `src/components/reader/SwipeIndicator.tsx`

Small stateless component rendering the pill. Accepts: `progress`, `direction`, `currentPage`, `totalPages`.

## Conflict Resolution Summary

| Scenario | Touch start zone | Handled as |
|---|---|---|
| Touch in text center (non-edge) | Anywhere >10% from edge | Drag-to-select (unchanged) |
| Touch in left edge zone, swipe right ≥30% | Left 10% | Page change (prev in LTR) |
| Touch in left edge zone, move <30% | Left 10% | Fallback → drag-to-select |
| Touch in right edge zone, swipe left ≥30% | Right 10% | Page change (next in LTR) |
| Touch in right edge zone, move <30% | Right 10% | Fallback → drag-to-select |

## Sentence View Consideration
In sentence mode (`readerMode === 'sentence'`), pages map 1-to-1 with sentences. The swipe logic works identically — `handlePageAdvance` handles both modes. The visual feedback will show "Sentence N → N+1" but that's fine for now.

## RTL Handling
Swipe direction is screen-relative, not content-relative:
- Swipe left (finger moves left) → `currentPage + 1` (next page)
- Swipe right (finger moves right) → `currentPage - 1` (prev page)
This matches the arrow buttons' behavior (the numbers advance the same way; only the arrow flips for RTL).

## Verification
1. Build: `npx tsc --noEmit` — must pass cleanly
2. Start dev server, open reader at a lesson with ≥3 pages
3. Test swipe from left 10% edge → should go to prev page
4. Test swipe from right 10% edge → should go to next page
5. Test swipe from center → should NOT trigger page change (drag-to-select)
6. Test swipe from edge but < 30% distance → should NOT change page, should fallback to drag-to-select
7. Test in RTL language → swipe direction still screen-relative
8. Test on mobile viewport → touch events only
9. Verify drag-to-select STILL works from non-edge area (regression check)
10. Verify arrow buttons still work (regression check)