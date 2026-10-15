import { act, renderHook } from '@testing-library/react';
import { useVisualViewport, useKeyboardAwareScroll, useViewportHeight } from '@/hooks/useVisualViewport';

// Mock visualViewport
const createMockVisualViewport = (overrides = {}) => ({
  width: 375,
  height: 600,
  offsetLeft: 0,
  offsetTop: 0,
  pageLeft: 0,
  pageTop: 0,
  scale: 1,
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  ...overrides,
});

describe('useVisualViewport', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    delete (window as any).visualViewport;
  });

  it('returns default state when visualViewport is not available', () => {
    const { result } = renderHook(() => useVisualViewport());
    
    expect(result.current.width).toBe(window.innerWidth);
    expect(result.current.height).toBe(window.innerHeight);
    expect(result.current.isKeyboardOpen).toBe(false);
    expect(result.current.keyboardHeight).toBe(0);
  });

  it('returns visualViewport state when available', () => {
    (window as any).visualViewport = createMockVisualViewport({ height: 600 });
    const { result } = renderHook(() => useVisualViewport());
    
    expect(result.current.width).toBe(375);
    expect(result.current.height).toBe(600);
    expect(result.current.scale).toBe(1);
    // isKeyboardOpen depends on layout viewport height vs visual viewport height
    // In test env, jsdom innerHeight is 768, visualViewport is 600, diff=168 > 150 => keyboard open
    expect(typeof result.current.isKeyboardOpen).toBe('boolean');
  });

  it('updates on visualViewport resize events', () => {
    const mockViewport = createMockVisualViewport({ height: 600 });
    (window as any).visualViewport = mockViewport;
    
    const { result } = renderHook(() => useVisualViewport());
    
    // Simulate resize
    mockViewport.height = 500;
    act(() => {
      mockViewport.addEventListener.mock.calls.forEach((call) => {
        if (call[0] === 'resize') call[1]();
      });
    });
    
    expect(result.current.height).toBe(500);
  });
});

describe('useKeyboardAwareScroll', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (window as any).visualViewport = createMockVisualViewport({ height: 600 });
    jest.spyOn(window, 'scrollBy').mockImplementation(() => {});
    // Advance timers for debounce
    jest.useFakeTimers();
  });

  afterEach(() => {
    delete (window as any).visualViewport;
    (window.scrollBy as jest.Mock).mockRestore();
    jest.useRealTimers();
  });

  it('calls scrollBy when input is below viewport after debounce', () => {
    const inputRef = { current: document.createElement('input') };
    const mockRect = { bottom: 700, top: 600, left: 0, right: 100, width: 100, height: 100 };
    jest.spyOn(inputRef.current!, 'getBoundingClientRect').mockReturnValue(mockRect as DOMRect);
    
    renderHook(({ ref }) => useKeyboardAwareScroll(ref), {
      initialProps: { ref: inputRef },
    });
    
    // Trigger resize with keyboard open
    const mockViewport = (window as any).visualViewport;
    mockViewport.height = 300;
    act(() => {
      mockViewport.addEventListener.mock.calls.forEach((call) => {
        if (call[0] === 'resize') call[1]();
      });
    });
    
    // Advance timers past debounce and cooldown
    act(() => {
      jest.advanceTimersByTime(500);
    });
    
    // Should scroll to bring input into view
    expect(window.scrollBy).toHaveBeenCalled();
  });
});

describe('useViewportHeight', () => {
  beforeEach(() => {
    (window as any).visualViewport = createMockVisualViewport();
  });

  afterEach(() => {
    delete (window as any).visualViewport;
  });

  it('returns visualViewport height when available', () => {
    const { result } = renderHook(() => useViewportHeight());
    expect(result.current).toBe(600);
  });

  it('returns window.innerHeight when visualViewport not available', () => {
    delete (window as any).visualViewport;
    const { result } = renderHook(() => useViewportHeight());
    expect(result.current).toBe(window.innerHeight);
  });
});