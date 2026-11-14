'use client'

import { useCallback, useLayoutEffect, useRef, type Dispatch, type SetStateAction } from 'react'

export function useTabScrollRestoration<T extends string>(
  activeTab: T,
  setActiveTab: Dispatch<SetStateAction<T>>,
) {
  const previousTab = useRef(activeTab)
  const scrollPositions = useRef(new Map<T, number>())
  const pendingScroll = useRef<{ tab: T; top: number } | null>(null)

  const changeTab = useCallback(
    (nextTab: T) => {
      if (nextTab === activeTab) return

      const currentTop = window.scrollY
      scrollPositions.current.set(activeTab, currentTop)
      pendingScroll.current = {
        tab: nextTab,
        top: scrollPositions.current.get(nextTab) ?? currentTop,
      }
      setActiveTab(nextTab)
    },
    [activeTab, setActiveTab],
  )

  useLayoutEffect(() => {
    if (previousTab.current === activeTab) return

    previousTab.current = activeTab
    const pending = pendingScroll.current
    pendingScroll.current = null
    if (!pending || pending.tab !== activeTab) return

    window.scrollTo(0, pending.top)
    scrollPositions.current.set(activeTab, window.scrollY)
  }, [activeTab])

  return changeTab
}
