import { useEffect, useRef } from 'react'

/**
 * Hook that adds IntersectionObserver-based reveal animations.
 * Attaches to elements with `.scroll-reveal`, `.scroll-reveal-scale`,
 * `.scroll-reveal-left`, `.scroll-reveal-right` classes within the ref.
 */
export function useScrollReveal<T extends HTMLElement = HTMLDivElement>(
  options?: IntersectionObserverInit,
) {
  const ref = useRef<T>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const targets = el.querySelectorAll(
      '.scroll-reveal, .scroll-reveal-scale, .scroll-reveal-left, .scroll-reveal-right',
    )
    if (!targets.length) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px', ...options },
    )

    targets.forEach((t) => observer.observe(t))
    return () => observer.disconnect()
  }, [options])

  return ref
}
