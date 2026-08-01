import { useRef, useCallback, useEffect, useState } from 'react';

interface SlidingIndicatorOptions {
  /** 0-based index of the active tab */
  activeIndex: number;
  /** Orientation of the tab strip */
  orientation?: 'horizontal' | 'vertical';
}

interface SlidingIndicatorResult {
  /** Ref to attach to the tab strip container */
  containerRef: React.RefObject<HTMLDivElement | null>;
  /** Callback ref setter — attach each tab button with `ref={tabRef(i)}` */
  tabRef: (index: number) => (el: HTMLElement | null) => void;
  /** Inline styles for the sliding indicator element */
  indicatorStyle: React.CSSProperties;
  /** Force re-measure (call after layout shifts) */
  measure: () => void;
}

export function useSlidingIndicator({
  activeIndex,
  orientation = 'horizontal',
}: SlidingIndicatorOptions): SlidingIndicatorResult {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const tabElementsRef = useRef<Map<number, HTMLElement>>(new Map());
  const [indicatorStyle, setIndicatorStyle] = useState<React.CSSProperties>({
    position: 'absolute',
    pointerEvents: 'none',
    transition: 'none',
  });
  const observerRef = useRef<ResizeObserver | null>(null);
  const hasMeasuredRef = useRef(false);

  const tabRef = useCallback(
    (index: number) => (el: HTMLElement | null) => {
      if (el) {
        tabElementsRef.current.set(index, el);
      } else {
        tabElementsRef.current.delete(index);
      }
    },
    []
  );

  const measure = useCallback(() => {
    const container = containerRef.current;
    const activeEl = tabElementsRef.current.get(activeIndex);
    if (!container || !activeEl) return;

    const containerRect = container.getBoundingClientRect();
    const elRect = activeEl.getBoundingClientRect();

    // Check if the active tab is actually inside this container
    const isInside =
      elRect.top >= containerRect.top - 10 &&
      elRect.top <= containerRect.bottom + 10;

    // If the tab is a sidebar item, the active element might be outside the sidebar container
    // In that case, fallback to offsetLeft/offsetTop relative to container
    let left: number;
    let top: number;
    let width: number;
    let height: number;

    if (orientation === 'vertical') {
      // For vertical tabs, measure within the container
      left = 0;
      width = containerRect.width;
      top = elRect.top - containerRect.top;
      // If top is negative or beyond container, use fallback
      if (top < 0 || top > containerRect.height) {
        top = activeEl.offsetTop;
        height = activeEl.offsetHeight;
      } else {
        height = elRect.height;
      }
    } else {
      if (!isInside || elRect.left < containerRect.left) {
        // Fallback: use offsetLeft/offsetWidth relative to container
        left = activeEl.offsetLeft;
        width = activeEl.offsetWidth;
      } else {
        left = elRect.left - containerRect.left;
        width = elRect.width;
      }
      top = elRect.top - containerRect.top;
      height = elRect.height;
    }

    if (!hasMeasuredRef.current) {
      // First paint: position without animation
      const baseStyle: React.CSSProperties = {
        position: 'absolute',
        pointerEvents: 'none',
        transition: 'none',
      };
      if (orientation === 'horizontal') {
        baseStyle.left = 0;
        baseStyle.transform = `translateX(${left}px)`;
        baseStyle.width = width;
      } else {
        baseStyle.top = 0;
        baseStyle.transform = `translateY(${top}px)`;
        baseStyle.height = height;
      }
      setIndicatorStyle(baseStyle);
      // Enable transitions after the first frame
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          hasMeasuredRef.current = true;
          setIndicatorStyle((prev) => ({
            ...prev,
            transition: `transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), width 0.3s cubic-bezier(0.16, 1, 0.3, 1), height 0.3s cubic-bezier(0.16, 1, 0.3, 1)`,
          }));
        });
      });
    } else {
      const nextStyle: React.CSSProperties = {
        position: 'absolute',
        pointerEvents: 'none',
        transition: `transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), width 0.3s cubic-bezier(0.16, 1, 0.3, 1), height 0.3s cubic-bezier(0.16, 1, 0.3, 1)`,
      };
      if (orientation === 'horizontal') {
        nextStyle.left = 0;
        nextStyle.transform = `translateX(${left}px)`;
        nextStyle.width = width;
      } else {
        nextStyle.top = 0;
        nextStyle.transform = `translateY(${top}px)`;
        nextStyle.height = height;
      }
      setIndicatorStyle(nextStyle);
    }
  }, [activeIndex, orientation]);

  // Re-measure when activeIndex changes
  useEffect(() => {
    measure();
  }, [measure]);

  // Set up ResizeObserver on the container
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    observerRef.current = new ResizeObserver(() => {
      measure();
    });
    observerRef.current.observe(container);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
    };
  }, [measure]);

  return { containerRef, tabRef, indicatorStyle, measure };
}