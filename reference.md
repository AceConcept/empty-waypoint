# Waypoint Steps — Artboard slot & Luna sidebar reference

This document maps how the **center “artboard” column** and the **right-hand Luna sidebar** fit together, which files implement them, and how this app wires them up.

---

## Architecture at a glance

The UI is implemented by **`LunaSidebar`** (`luna-sidebar/LunaSidebar.jsx`), which owns the full-page layout:

1. **`.luna-root`** — Root wrapper; receives inline CSS variables (`--luna-scale`, footer height, sidebar shell width, background image URL) from `useLayoutEffect`.
2. **`.luna-canvas-row`** — Horizontal band: **`[ .luna-space-left | .artboard-slot | .luna-space-right ]`** plus an **absolutely positioned** sidebar shell on the right.
3. **`.artboard-slot`** — Fixed-width column for the scaled design canvas; flanked by flex **gutters** (`.luna-space-left` / `.luna-space-right`) that absorb extra viewport width.
4. **`.sidebar-shell`** — Collapsible rail + expandable drawer; sits above the artboard in stacking order when open (scrim dims the canvas row).

Styling lives primarily in **`luna-sidebar/LunaSidebar.css`**; scaling math and design-token pixel helpers are in **`luna-sidebar/canvasScale.js`**.

---

## Artboard slot (`.artboard-slot`)

### Role

- **Layout box** for the main “design rem” canvas column. It does **not** apply `transform: scale` itself; it defines the **on-screen width and height** that the inner `.artboard` is scaled into.
- **Width** comes from **`--luna-artboard-slot-width`** on `.luna-root` (default: `calc(var(--canvas-w) * var(--luna-scale))`, i.e. scaled design width).
- **Height** matches the scaled canvas: `calc(var(--canvas-h) * var(--luna-scale))`, same as `.luna-canvas-row`.

### DOM nesting (from `LunaSidebar.jsx`)

```
.artboard-slot
  └── .artboard                    ← design-sized surface (rem), transform: scale(--luna-scale)
        └── .luna-stage            ← optional; only if stage content provided
              └── .luna-stage-artboard
                    └── {children / stageSlot}
```

- **`.artboard`** — Fixed design dimensions (`--canvas-w` × `--canvas-h` in rem), `transform-origin: 0 0`, scaled by `--luna-scale` so it fits the slot visually.
- **`.luna-stage`** — Fills `.artboard`, scrollable; **right padding** uses **`var(--sidebar-collapsed)`** so content clears the collapsed rail.
- **`.luna-stage-artboard`** — Inner “cinema” plate (2.19∶1 by default), sized with container queries (`container-name: luna-stage` on `.luna-stage`). App flow UI in **`src/App.css`** scopes under **`.luna-stage-artboard .flow`** when you add it.

### Stage content (“slot”)

- **Prop**: `children` (preferred) or legacy **`stageContent`**. In code: `const stageSlot = children ?? stageContent`.
- If **both are omitted**, the `.artboard` renders **empty** (no `.luna-stage`).  
  **Current `src/App.tsx`** does not pass `children`, so the **center panel is empty** even though **`flowStore`** and **`FLOW_SIDEBAR_ITEMS`** exist for sidebar sync.

### Related CSS variables (see `LunaSidebar.css` `:root` and `.luna-root`)

| Variable | Purpose |
|----------|---------|
| `--canvas-w`, `--canvas-h` | Design canvas size in **rem** (160×90 rem ≈ 2560×1440 px at 16px/rem) |
| `--luna-scale` | Set in JS from viewport + `scaleMode` |
| `--luna-artboard-slot-width` | Column width for `.artboard-slot` (override on `.luna-root` for custom widths) |
| `--luna-space-left-bg`, `--luna-space-right-bg` | Gutter colors |
| `--luna-stage-bg` | `.luna-stage` background |
| `--luna-stage-artboard-*` | Aspect ratio and max size of `.luna-stage-artboard` |

### `scaleMode` (`LunaSidebar` prop)

Controls how **`--luna-scale`** is computed from **`getViewportSize()`** (prefers `visualViewport`):

| Mode | Behavior |
|------|----------|
| `canvas-contain` (default) | Fit **main canvas** height `CANVAS_H` in the viewport (`getCanvasContainScale(w, h, CANVAS_H)`). Footer scrolls below. |
| `contain` | Fit **canvas + OTF footer** in one screen (`getTotalDesignHeightPx()`). |
| `height` | Scale by viewport height (`getCanvasHeightFitScale`). |
| `width` | Scale by viewport width (`getCanvasWidthFitScale`). |

---

## Sidebar (`.sidebar-shell` and children)

### Role

- **Collapsed**: narrow **rail** only (`--sidebar-collapsed`, same as `--sidebar-rail-w` in practice for width).
- **Expanded** (class **`m2T_PB`** on shell, drawer, panel): drawer grows to **`--sidebar-expanded` minus rail**; **`--luna-sidebar-bg`** (GRAPHIC or `graphicSrc`) covers shell + drawer.

### Main regions (markup in `LunaSidebar.jsx`)

| Element | Class names | Role |
|---------|-------------|------|
| Row overlay (when expanded) | `.luna-canvas-row-scrim` | Full-row dim; click closes drawer |
| Shell | `.sidebar-shell.UxzaHe.luna-sidebar-dock` + `m2T_PB` when open | Positioned absolute right; width animates collapsed ↔ expanded |
| Host | `.sidebar-host.Bf7PXJ` | Flex row: drawer + rail |
| Drawer | `.sidebar-drawer` + `m2T_PB` | Intro + preview strip |
| Panel | `.sidebar-panel-inner.Q1PD1g` | Inner padding/scroll |
| Content | `.sidebar-panel-content` → `.sidebar-drawer-stack` | **IntroSection** + **PreviewStrip** |
| Rail | `.sidebar-rail` | Toggle button; shows **`railLabel`** (e.g. `"FLOW"` in this app) |

Legacy OTF-style class names (**`UxzaHe`**, **`Q1PD1g`**, **`Bf7PXJ`**) are kept for CSS compatibility; see comments in `LunaSidebar.css`.

### Z-order (documented in CSS)

- `.luna-canvas-row`: `z-index: 0`
- `.artboard` (inside slot): `z-index: 40`
- `.luna-canvas-row-scrim`: `z-index: 42`
- `.sidebar-shell`: `z-index: 45`

### Sidebar data: `items` prop

Each item: `{ id, label, step, title, description, swatch }`.  
**This app** defines them in **`src/flowSidebarItems.ts`**; `id` values align with **`FlowStepId`** in **`src/store/flowStore.ts`** for Zustand sync.

### Callbacks

- **`onActiveItemChange(id)`** — Fires when the preview strip or internal selection changes.
- **`onExpandedChange(open)`** — Fires when the rail toggles the drawer.

---

## File index

| File | Responsibility |
|------|----------------|
| `luna-sidebar/LunaSidebar.jsx` | Layout DOM, scale observer, stage slot, sidebar drawer/rail, `PreviewStrip`, `IntroSection` |
| `luna-sidebar/LunaSidebar.css` | All layout/visual rules: artboard slot, stage, sidebar shell, preview strip, rail |
| `luna-sidebar/canvasScale.js` | `CANVAS_W` / `CANVAS_H`, scale helpers, sidebar shell design widths in px; **must stay in sync** with `--canvas-h` / sidebar rem vars in CSS |
| `luna-sidebar/index.js` | Re-exports `LunaSidebar` and `canvasScale` helpers |
| `luna-sidebar/defaultItems.js` | Demo items (not used when app passes its own `items`) |
| `luna-sidebar/README.md` | Short integration notes for copying the bundle |
| `src/App.tsx` | Mounts `LunaSidebar` with `FLOW_SIDEBAR_ITEMS`, `activeItemId`, `onActiveItemChange`, `railLabel` |
| `src/flowSidebarItems.ts` | Sidebar card copy + ids for the flow |
| `src/store/flowStore.ts` | Zustand flow step state (`goToStepById`, etc.) |
| `src/App.css` | Styles for **`.luna-stage-artboard .flow`** (ready when center content is added) |
| `vite.config.ts` | `@assets` → `src/assets` (used for `GRAPHIC.png` in `LunaSidebar.jsx`) |

---

## Keeping design tokens consistent

- **`canvasScale.js`**: `DESIGN_REM_H` must match **`--canvas-h`** in `LunaSidebar.css`.
- **`OTF_FOOTER_DESIGN_REM`** ↔ **`--page-row-otf-footer-h`**.
- **`SIDEBAR_COLLAPSED_REM` / `SIDEBAR_EXPANDED_REM`** ↔ **`--sidebar-collapsed`** / **`--sidebar-expanded`**.

If these drift, scaling and sidebar width calculations will disagree with the CSS rem layout.

---

## Quick integration notes for the center panel

To render the flow in the artboard, pass React nodes into **`LunaSidebar`** as **`children`** (or `stageContent`), e.g. a component that reads **`useFlowStep()`** / **`useFlowStore`** and uses the same **`.flow`** markup expected by **`App.css`**. Until then, the artboard area remains visually empty while the sidebar and footer region still layout and scale.
