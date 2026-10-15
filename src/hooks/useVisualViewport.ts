'use client';

import { useEffect, useState, useCallback, useRef } from 'react';

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

export function useVisualViewport(): VisualViewportState {
  const [state, setState] = useState<VisualViewportState>(DEFAULT_STATE);
  const previousHeightRef = useRef<number>(DEFAULT_STATE.height);
  const initialViewportHeightRef = useRef<number | null>(null);

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

    if (initialViewportHeightRef.current === null) {
      initialViewportHeightRef.current = layoutViewportHeight;
    }

    const baselineHeight = initialViewportHeightRef.current;
    const heightDiff = baselineHeight - currentHeight;
    const isKeyboardOpen = heightDiff > 150;
    const keyboardHeight = isKeyboardOpen ? heightDiff : 0;

    setState({
      width: vp.width,
      height: vp.height,
      offsetLeft: vp.offsetLeft,
      offsetTop: vp.offsetTop,
      pageLeft: vp.pageLeft,
      pageTop: vp.pageTop,
      scale: vp.scale,
      isKeyboardOpen,
      keyboardHeight,
    });

    previousHeightRef.current = currentHeight;
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
    vp.addEventListener('scroll', updateState);

    updateState();

    return () => {
      vp.removeEventListener('resize', updateState);
      vp.removeEventListener('scroll', updateState);
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

  useEffect(() => {
    if (!isKeyboardOpen || !inputRef.current) return;

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
    }
  }, [visualViewportHeight, isKeyboardOpen, inputRef, offset, behavior]);
}

export function useViewportHeight(): number {
  const { height } = useVisualViewport();
  return height;
}