// client/src/__tests__/integration/fetchSetup.js
// Wei Sheng, A0259272X
// Polyfill Fetch API and remaining Web globals into jsdom's window so MSW/node loads.
// Requires textEncodingSetup.js to have run first (sets TextDecoder, ReadableStream, etc.
// which undici needs at module-evaluation time before this file's code can run).
import {
  fetch as undiciFetch,
  Response,
  Request,
  Headers,
  FormData,
  File,
} from 'undici';
import { BroadcastChannel } from 'worker_threads';

const globals = {
  fetch: undiciFetch,
  Response,
  Request,
  Headers,
  FormData,
  File,
  BroadcastChannel,
};

for (const [name, value] of Object.entries(globals)) {
  if (typeof global[name] === 'undefined') {
    global[name] = value;
  }
}
