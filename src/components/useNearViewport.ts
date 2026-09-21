import { useEffect, useState, type RefObject } from 'react'

/**
 * True while `target` is within `margin` of the `root` scroll container's
 * viewport. Used to render pages/thumbnails lazily and drop them when far away.
 */
export function useNearViewport(
  target: RefObject<Element | null>,
  root: RefObject<Element | null>,
  margin: string,
): boolean {
  const [near, setNear] = useState(false)

  useEffect(() => {
    const el = target.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => setNear(entry?.isIntersecting ?? false),
      {
        root: root.current,
        rootMargin: margin,
      },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [target, root, margin])

  return near
}
