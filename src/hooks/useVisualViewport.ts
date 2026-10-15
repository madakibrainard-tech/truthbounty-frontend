'use client';

import { useEffect, useLayoutEffect, useState, useCallback, useRef } from 'react';

interface VisualViewportState {
  width: number;
  height: number;
  offsetLeft: number;
  offsetTop: number;
  pageLeft: number;
  pageTop: number;
  scale: number;
  isKeyboardOpen: boolean;
  keyboardHeight: number;
}

const DEFAULT_STATE: VisualViewportState = {
  width: typeof window !== 'undefined' ? window.innerWidth : 0,
  height: typeof window !== 'undefined' ? window.innerHeight : 0,
  offsetLeft: 0,
  offsetTop: 0,
  pageLeft: 0,
  pageTop: 0,
  scale: 1,
  isKeyboardOpen: false,
  keyboardHeight: 0,
};

/**
 * Minimum height difference (in pixels) to consider the virtual keyboard open.
 * This threshold avoids false positives from browser chrome, orientation changes,
 * or small viewport adjustments.
 */
const KEYBOARD_HEIGHT_THRESHOLD = 150;

/**
 * Debounce time (in ms) for keyboard open/close detection to prevent flickering.
 */
const KEYBOARD_DEBOUNCE_MS = 100;

export function useVisualViewport(): VisualViewportState {
  const [state, setState] = useState<VisualViewportState>(DEFAULT_STATE);
  const initialViewportHeightRef = useRef<number | null>(null);
  const keyboardDebounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingKeyboardStateRef = useRef<{ isOpen: boolean; height: number } | null>(null);
  // Track the last committed keyboard state for debouncing
  const lastCommittedKeyboardStateRef = useRef<{ isOpen: boolean }>({ isOpen: false });
  // Track if we've done the initial measurement to avoid debouncing the first detection
  const isInitialMeasurementRef = useRef(true);

  const updateState = useCallback(() => {
    if (typeof window === 'undefined' || !window.visualViewport) {
      setState((prev) => ({
        ...prev,
        width: window.innerWidth,
        height: window.innerHeight,
      }));
      return;
    }

    const vp = window.visualViewport;
    const currentHeight = vp.height;
    const layoutViewportHeight = window.innerHeight;

    // Initialize baseline on first measurement
    if (initialViewportHeightRef.current === null) {
      initialViewportHeightRef.current = layoutViewportHeight;
    }

    const baselineHeight = initialViewportHeightRef.current;
    const heightDiff = baselineHeight - currentHeight;
    const isKeyboardOpenNow = heightDiff > KEYBOARD_HEIGHT_THRESHOLD;
    const keyboardHeight = isKeyboardOpenNow ? heightDiff : 0;

    // On the very first measurement, commit the keyboard state immediately without debouncing
    // to establish the correct baseline. Subsequent changes are debounced.
    if (isInitialMeasurementRef.current) {
      isInitialMeasurementRef.current = false;
      lastCommittedKeyboardStateRef.current.isOpen = isKeyboardOpenNow;
      setState((prev) => ({
        ...prev,
        isKeyboardOpen: isKeyboardOpenNow,
        keyboardHeight,
        width: vp.width,
        height: vp.height,
        offsetLeft: vp.offsetLeft,
        offsetTop: vp.offsetTop,
        pageLeft: vp.pageLeft,
        pageTop: vp.pageTop,
        scale: vp.scale,
      }));
      return;
    }

    // Debounce keyboard state changes to prevent flickering
    // Compare against the last committed state, not the current React state
    if (isKeyboardOpenNow !== lastCommittedKeyboardStateRef.current.isOpen) {
      if (keyboardDebounceTimerRef.current) {
        clearTimeout(keyboardDebounceTimerRef.current);
      }
      pendingKeyboardStateRef.current = { isOpen: isKeyboardOpenNow, height: keyboardHeight };
      keyboardDebounceTimerRef.current = setTimeout(() => {
        if (pendingKeyboardStateRef.current) {
          setState((prev) => ({
            ...prev,
            isKeyboardOpen: pendingKeyboardStateRef.current!.isOpen,
            keyboardHeight: pendingKeyboardStateRef.current!.height,
          }));
          lastCommittedKeyboardStateRef.current.isOpen = pendingKeyboardStateRef.current!.isOpen;
          pendingKeyboardStateRef.current = null;
        }
      }, KEYBOARD_DEBOUNCE_MS);
    } else if (pendingKeyboardStateRef.current) {
      // Same state as committed, clear pending
      if (keyboardDebounceTimerRef.current) {
        clearTimeout(keyboardDebounceTimerRef.current);
      }
      pendingKeyboardStateRef.current = null;
    }

    setState((prev) => ({
      ...prev,
      width: vp.width,
      height: vp.height,
      offsetLeft: vp.offsetLeft,
      offsetTop: vp.offsetTop,
      pageLeft: vp.pageLeft,
      pageTop: vp.pageTop,
      scale: vp.scale,
    }));
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) {
      const handleResize = () => {
        setState((prev) => ({
          ...prev,
          width: window.innerWidth,
          height: window.innerHeight,
        }));
      };
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }

    const vp = window.visualViewport;
    vp.addEventListener('resize', updateState);
    // Note: 'scroll' event on visualViewport fires on pinch-zoom and page scroll.
    // We intentionally omit it to avoid excessive re-renders. The 'resize' event
    // covers keyboard open/close and orientation changes.

    updateState();

    return () => {
      vp.removeEventListener('resize', updateState);
      if (keyboardDebounceTimerRef.current) {
        clearTimeout(keyboardDebounceTimerRef.current);
      }
    };
  }, [updateState]);

  return state;
}

export function useKeyboardAwareScroll(
  inputRef: React.RefObject<HTMLElement | null>,
  options?: {
    offset?: number;
    behavior?: ScrollBehavior;
  }
) {
  const { height: visualViewportHeight, isKeyboardOpen } = useVisualViewport();
  const { offset = 20, behavior = 'smooth' } = options || {};
  const lastScrollTimeRef = useRef<number>(0);
  const SCROLL_COOLDOWN_MS = 300;

  useEffect(() => {
    if (!isKeyboardOpen || !inputRef.current) return;

    const now = Date.now();
    // Cooldown to prevent repeated scroll jumps on rapid keyboard events
    if (now - lastScrollTimeRef.current < SCROLL_COOLDOWN_MS) return;

    const input = inputRef.current;
    const rect = input.getBoundingClientRect();
    const inputBottom = rect.bottom;
    const viewportBottom = visualViewportHeight;

    if (inputBottom > viewportBottom - offset) {
      const scrollAmount = inputBottom - viewportBottom + offset;
      window.scrollBy({
        top: scrollAmount,
        behavior,
      });
      lastScrollTimeRef.current = now;
    }
  }, [visualViewportHeight, isKeyboardOpen, inputRef, offset, behavior]);
}

export function useViewportHeight(): number {
  const { height } = useVisualViewport();
  return height;
}