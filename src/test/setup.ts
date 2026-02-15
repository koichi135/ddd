import '@testing-library/jest-dom'

/* Polyfill ResizeObserver for React Three Fiber in jsdom */
globalThis.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
