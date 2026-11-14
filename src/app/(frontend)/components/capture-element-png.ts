import html2canvas from 'html2canvas'

function replaceModernColors(value: string, ctx: CanvasRenderingContext2D) {
  return value.replace(/(?:oklch|lab|lch|color)\([^)]*\)/gi, (color) => {
    try {
      ctx.clearRect(0, 0, 1, 1)
      ctx.fillStyle = color
      ctx.fillRect(0, 0, 1, 1)
      const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data
      return `rgba(${r}, ${g}, ${b}, ${(a / 255).toFixed(3)})`
    } catch {
      return '#111111'
    }
  })
}

export async function downloadElementPng(element: HTMLElement, filename: string) {
  await document.fonts.ready

  const colorCanvas = document.createElement('canvas')
  colorCanvas.width = 1
  colorCanvas.height = 1
  const colorCtx = colorCanvas.getContext('2d', { willReadFrequently: true })
  if (!colorCtx) throw new Error('Canvas 2D context is unavailable.')

  // Dynamic dimensions based on the element's configured period count
  const COLS = 5 // Mon, Tue, Wed, Thu, Fri
  const timeSlots = element.querySelectorAll('.time-axis span')
  const ROWS = timeSlots.length > 0 ? timeSlots.length : 9 // Dynamically adapt to configured slots
  const TIME_COL_W = 80 // Time axis width
  const DAY_COL_W = 224 // Each weekday column width
  const HEAD_H = 44 // Day header height
  const SLOT_H = 70 // Exact height for each row
  const GRID_H = ROWS * SLOT_H
  const EXPORT_W = TIME_COL_W + COLS * DAY_COL_W // 1200px
  const EXPORT_H = HEAD_H + GRID_H

  const canvas = await html2canvas(element, {
    backgroundColor: '#ffffff',
    width: EXPORT_W,
    height: EXPORT_H,
    windowWidth: EXPORT_W + 100,
    windowHeight: EXPORT_H + 100,
    x: 0,
    y: 0,
    scrollX: 0,
    scrollY: 0,
    scale: 2,
    logging: false,
    useCORS: true,
    allowTaint: false,
    onclone: (_doc, cloned) => {
      // 1. Isolate at (0, 0) inside clean white body to avoid scroll or offset clipping
      _doc.body.innerHTML = ''
      Object.assign(_doc.body.style, {
        margin: '0',
        padding: '0',
        background: '#ffffff',
        overflow: 'hidden',
        width: `${EXPORT_W}px`,
        height: `${EXPORT_H}px`,
      })
      _doc.body.appendChild(cloned)

      // 2. Set strict pixel dimensions on outer container
      cloned.setAttribute('data-tt-capture', '')
      Object.assign(cloned.style, {
        position: 'absolute',
        top: '0',
        left: '0',
        margin: '0',
        width: `${EXPORT_W}px`,
        minWidth: `${EXPORT_W}px`,
        maxWidth: `${EXPORT_W}px`,
        height: `${EXPORT_H}px`,
        minHeight: `${EXPORT_H}px`,
        maxHeight: `${EXPORT_H}px`,
        overflow: 'hidden',
        boxSizing: 'border-box',
      })

      // 3. Convert <button> to <div> so html2canvas renders text without button clipping
      for (const btn of Array.from(cloned.querySelectorAll('button'))) {
        const div = _doc.createElement('div')
        for (const { name, value } of Array.from(btn.attributes)) {
          div.setAttribute(name, value)
        }
        div.innerHTML = btn.innerHTML
        div.style.cssText = btn.style.cssText
        btn.replaceWith(div)
      }

      // 4. Inject capture stylesheet with website-matching fonts and row divider lines
      const style = _doc.createElement('style')
      style.textContent = `
        [data-tt-capture] {
          display: grid !important;
          grid-template-columns: ${TIME_COL_W}px repeat(${COLS}, ${DAY_COL_W}px) !important;
          grid-template-rows: ${HEAD_H}px ${GRID_H}px !important;
          width: ${EXPORT_W}px !important;
          height: ${EXPORT_H}px !important;
          border: 1px solid #555555 !important;
          border-radius: 0 !important;
          background: #ffffff !important;
          box-shadow: none !important;
          overflow: hidden !important;
          box-sizing: border-box !important;
          font-family: Arial, "Helvetica Neue", Helvetica, sans-serif !important;
        }

        [data-tt-capture] * {
          box-sizing: border-box !important;
        }

        /* ─── Day headers ─── */
        [data-tt-capture] .day-head,
        [data-tt-capture] .time-head {
          background: #ffffff !important;
          border-bottom: 1px solid #555555 !important;
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          justify-content: center !important;
          gap: 2px !important;
          overflow: hidden !important;
        }
        [data-tt-capture] .day-head {
          border-left: 1px solid #555555 !important;
          color: #111111 !important;
          font-size: 13px !important;
          font-weight: 700 !important;
          text-transform: uppercase !important;
        }
        [data-tt-capture] .day-head.holiday {
          background: #fff2f1 !important;
          color: #a42d2b !important;
        }
        [data-tt-capture] .day-head span {
          font-size: 13px !important;
          font-weight: 700 !important;
          color: #111111 !important;
          line-height: 1.2 !important;
        }
        [data-tt-capture] .day-head small {
          display: none !important;
        }
        [data-tt-capture] .time-head {
          font-size: 13px !important;
          font-weight: 700 !important;
          color: #111111 !important;
          border-left: 0 !important;
        }

        /* ─── Time axis ─── */
        [data-tt-capture] .time-axis {
          width: ${TIME_COL_W}px !important;
          height: ${GRID_H}px !important;
          background: #ffffff !important;
          border-right: 0 !important;
          display: flex !important;
          flex-direction: column !important;
          overflow: hidden !important;
        }
        [data-tt-capture] .time-axis span {
          flex: 0 0 ${SLOT_H}px !important;
          height: ${SLOT_H}px !important;
          min-height: ${SLOT_H}px !important;
          max-height: ${SLOT_H}px !important;
          border-bottom: 1px solid #555555 !important;
          color: #111111 !important;
          background: #ffffff !important;
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          justify-content: center !important;
          text-align: center !important;
          font-size: 11px !important;
          line-height: 1.2 !important;
          padding: 0 4px !important;
          overflow: hidden !important;
        }
        [data-tt-capture] .time-axis span b {
          font-size: 11px !important;
          font-weight: 600 !important;
          color: #111111 !important;
        }
        [data-tt-capture] .time-axis span:last-child {
          border-bottom: 0 !important;
        }

        /* ─── Day columns & row divider lines ─── */
        [data-tt-capture] .day-col {
          position: relative !important;
          width: ${DAY_COL_W}px !important;
          height: ${GRID_H}px !important;
          border-left: 1px solid #555555 !important;
          background: #ffffff !important;
          overflow: visible !important;
        }
        [data-tt-capture] .day-col > i {
          display: block !important;
          width: 100% !important;
          height: ${SLOT_H}px !important;
          min-height: ${SLOT_H}px !important;
          max-height: ${SLOT_H}px !important;
          border-bottom: 1px solid #555555 !important;
          margin: 0 !important;
          padding: 0 !important;
        }
        [data-tt-capture] .day-col > i:last-of-type {
          border-bottom: 0 !important;
        }

        /* ─── Session cards (flat grid-cell style matching website) ─── */
        [data-tt-capture] .session,
        [data-tt-capture] .session.red,
        [data-tt-capture] .session.grey,
        [data-tt-capture] .session.dark {
          position: absolute !important;
          left: 0 !important;
          right: 0 !important;
          width: 100% !important;
          background: #ffffff !important;
          border: 0 !important;
          border-bottom: 1px solid #555555 !important;
          border-radius: 0 !important;
          margin: 0 !important;
          padding: 0 6px 7px 6px !important;
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          justify-content: center !important;
          gap: 1.5px !important;
          text-align: center !important;
          box-shadow: none !important;
          overflow: hidden !important;
          z-index: 5 !important;
        }

        [data-tt-capture] .session.is-bottom,
        [data-tt-capture] .session.red.is-bottom,
        [data-tt-capture] .session.grey.is-bottom,
        [data-tt-capture] .session.dark.is-bottom {
          border-bottom: 0 !important;
        }

        /* ─── Session text formatting matching website font and colors ─── */
        [data-tt-capture] .session b,
        [data-tt-capture] .session span,
        [data-tt-capture] .session em {
          display: block !important;
          max-width: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
          text-align: center !important;
          white-space: normal !important;
          word-break: break-word !important;
          overflow: visible !important;
        }
        [data-tt-capture] .session b {
          color: #ff3333 !important;
          font-size: 11.5px !important;
          font-weight: 600 !important;
          line-height: 1.2 !important;
        }
        [data-tt-capture] .session span {
          color: #555555 !important;
          font-size: 10.5px !important;
          font-weight: 400 !important;
          line-height: 1.15 !important;
        }
        [data-tt-capture] .session em {
          color: #111111 !important;
          font-size: 10.5px !important;
          font-weight: 700 !important;
          font-style: normal !important;
          line-height: 1.15 !important;
        }

        /* ─── Hide internal warnings/overlays in PNG ─── */
        [data-tt-capture] .session-unavailable-warning,
        [data-tt-capture] .lecturer-unavailable-block {
          display: none !important;
        }

        /* ─── Holiday overlay ─── */
        [data-tt-capture] .day-holiday {
          position: absolute !important;
          inset: 0 !important;
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          justify-content: center !important;
          gap: 4px !important;
          background: rgba(255, 242, 241, 0.94) !important;
          z-index: 4 !important;
        }
        [data-tt-capture] .day-holiday b {
          font-size: 11px !important;
          color: #8d3936 !important;
        }
        [data-tt-capture] .day-holiday span {
          font-size: 9px !important;
          color: #8d3936 !important;
        }
      `
      _doc.head.appendChild(style)

      // 5. Pin every session to exact row coordinates and handle bottom border
      for (const session of Array.from(cloned.querySelectorAll<HTMLElement>('.session'))) {
        const rawTop = session.style.top || ''
        const rawH = session.style.height || ''
        const topPct = parseFloat(rawTop) || 0
        const hPct = parseFloat(rawH) || 0

        const slotIndex = Math.min(ROWS - 1, Math.max(0, Math.round((topPct / 100) * ROWS)))
        const isBottomSession =
          session.classList.contains('is-bottom') ||
          slotIndex + Math.max(1, Math.round((hPct / 100) * ROWS)) >= ROWS
        const periods = isBottomSession
          ? ROWS - slotIndex
          : Math.max(1, Math.round((hPct / 100) * ROWS))

        const topPx = slotIndex * SLOT_H
        const hPx = periods * SLOT_H

        session.style.position = 'absolute'
        session.style.top = `${topPx}px`
        session.style.left = '0px'
        session.style.right = '0px'
        session.style.width = '100%'
        session.style.height = `${hPx}px`
        session.style.minHeight = `${hPx}px`
        session.style.maxHeight = `${hPx}px`
        session.style.boxSizing = 'border-box'
        session.style.border = '0'
        session.style.borderBottom = isBottomSession ? 'none' : '1px solid #555555'
        session.style.borderRadius = '0'
        session.style.background = '#ffffff'
        session.style.zIndex = '5'
        session.style.display = 'flex'
        session.style.flexDirection = 'column'
        session.style.alignItems = 'center'
        session.style.justifyContent = 'center'
        session.style.gap = '1.5px'
        session.style.padding = '0 6px 7px 6px'
        session.style.margin = '0'
        session.style.overflow = 'hidden'
      }

      // 6. Replace modern CSS colors (oklch, lab, etc.) that html2canvas cannot parse
      for (const el of Array.from(_doc.querySelectorAll<HTMLElement>('*'))) {
        const computed = (_doc.defaultView ?? window).getComputedStyle(el)
        for (const prop of Array.from(computed)) {
          const val = computed.getPropertyValue(prop)
          if (val && /(oklch|lab|lch|color)\(/.test(val)) {
            el.style.setProperty(prop, replaceModernColors(val, colorCtx))
          }
        }
      }
    },
  })

  // 7. Wrap canvas in a clean white border frame
  const PAD = 16 * 2 // 16px padding on scale 2
  const final = document.createElement('canvas')
  final.width = canvas.width + PAD * 2
  final.height = canvas.height + PAD * 2
  const fctx = final.getContext('2d')
  if (!fctx) throw new Error('Canvas 2D context is unavailable.')
  fctx.fillStyle = '#ffffff'
  fctx.fillRect(0, 0, final.width, final.height)
  fctx.drawImage(canvas, PAD, PAD)

  const blob = await new Promise<Blob>((resolve, reject) => {
    final.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('PNG export failed.'))),
      'image/png',
    )
  })

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.download = filename.endsWith('.png') ? filename : `${filename}.png`
  link.href = url
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}
