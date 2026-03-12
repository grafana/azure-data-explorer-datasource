// Jest setup provided by Grafana scaffolding
import './.config/jest-setup';
import { TextEncoder, TextDecoder } from 'util';
import { ReadableStream, TransformStream, WritableStream } from 'stream/web';

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
global.ReadableStream = ReadableStream;
global.TransformStream = TransformStream;
global.WritableStream = WritableStream;

const mockIntersectionObserver = jest.fn().mockImplementation((arg) => ({
  observe: jest.fn().mockImplementation((elem) => {
    arg([{ target: elem, isIntersecting: true }]);
  }),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

global.IntersectionObserver = mockIntersectionObserver;
