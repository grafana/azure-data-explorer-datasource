import '@testing-library/jest-dom';

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// react-select-event requires jest 28 but @grafana/toolkit does not support it yet
// so we need to redefine these to bypass the syntax error
// Object.defineProperty(window, 'setImmediate', window.setTimeout);
// Object.defineProperty(window, 'clearImmediate', window.clearTimeout);
