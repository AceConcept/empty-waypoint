import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { LunaCanvasScaleContext } from 'waypoint-sidebar/src/luna-sidebar/index.js'
import {
  CANVAS_H,
  CANVAS_W,
  getCanvasContainScale,
  getSidebarShellDesignWidthPx,
  getViewportSize,
} from 'waypoint-sidebar/src/luna-sidebar/canvasScale.js'
import './lunaChrome.css'

/** Center slot footprint vs contain scale (~10% shorter; width scales same factor → same aspect ratio). */
const LUNA_CENTER_SLOT = 0.9

export type LunaChromeSidebarControls = {
  expanded: boolean
  onExpandedChange: (next: boolean) => void
}

type LunaChromeProps = {
  children?: ReactNode
  sidebar: (controls: LunaChromeSidebarControls) => ReactNode
}

export function LunaChrome({
  children,
  sidebar,
}: LunaChromeProps) {
  const layoutRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [expanded, setExpanded] = useState(false)

  useLayoutEffect(() => {
    const el = layoutRef.current
    if (!el) return
    const update = () => {
      const { width, height } = getViewportSize()
      if (width <= 0 || height <= 0) {
        setScale(1)
        return
      }
      setScale(getCanvasContainScale(width, height))
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    window.addEventListener('resize', update)
    const vv = window.visualViewport
    if (vv) vv.addEventListener('resize', update)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', update)
      if (vv) vv.removeEventListener('resize', update)
    }
  }, [])

  useLayoutEffect(() => {
    const layout = layoutRef.current
    if (!layout) return
    const shellW = getSidebarShellDesignWidthPx(expanded)
    const slotScale = scale * LUNA_CENTER_SLOT
    const centerW = CANVAS_W * slotScale
    const centerH = CANVAS_H * slotScale
    const rowMinH = CANVAS_H * scale
    layout.style.setProperty('--luna-scale', String(scale))
    layout.style.setProperty('--luna-design-surface-scale', String(slotScale))
    layout.style.setProperty('--luna-shell-design-w', `${shellW}px`)
    layout.style.setProperty('--luna-center-column-width', `${centerW}px`)
    layout.style.setProperty('--luna-center-column-height', `${centerH}px`)
    layout.style.setProperty('--luna-canvas-row-min-h', `${rowMinH}px`)
  }, [scale, expanded])

  return (
    <div ref={layoutRef} className="luna-root">
      <div className="luna-scale-stage">
        <div className="luna-chrome">
          <div className="luna-shell">
            <div
              className={`luna-canvas-row${expanded ? ' luna-canvas-row--drawer-open' : ''}`}
            >
              {expanded ? (
                <button
                  type="button"
                  className="luna-canvas-row-scrim"
                  aria-label="Close panel"
                  onClick={() => setExpanded(false)}
                />
              ) : null}
              <div className="luna-space-left" aria-hidden="true" />
              <div className="luna-center-column">
                <div
                  className={`luna-design-surface${expanded ? ' luna-design-surface--drawer-open' : ''}`}
                >
                  {children}
                </div>
              </div>
              <div className="luna-space-right" aria-hidden="true" />
              <LunaCanvasScaleContext.Provider value={scale}>
                {sidebar({ expanded, onExpandedChange: setExpanded })}
              </LunaCanvasScaleContext.Provider>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
