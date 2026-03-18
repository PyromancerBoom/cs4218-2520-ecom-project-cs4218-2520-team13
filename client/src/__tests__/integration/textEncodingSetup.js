// client/src/__tests__/integration/textEncodingSetup.js
// LOW WEI SHENG, A0259272X
// Must run BEFORE fetchSetup.js in setupFiles.
// undici (imported by fetchSetup.js) calls `new TextDecoder()` and references
// ReadableStream/WritableStream/TransformStream at module-evaluation time — before
// any code in fetchSetup.js can run (ESM static imports are hoisted). We seed these
// globals here first so undici's module initialisation succeeds.
import { TextEncoder, TextDecoder } from 'util';
import {
  ReadableStream,
  WritableStream,
  TransformStream,
  ByteLengthQueuingStrategy,
  CountQueuingStrategy,
} from 'stream/web';

const prereqs = {
  TextEncoder,
  TextDecoder,
  ReadableStream,
  WritableStream,
  TransformStream,
  ByteLengthQueuingStrategy,
  CountQueuingStrategy,
};

for (const [name, value] of Object.entries(prereqs)) {
  if (typeof global[name] === 'undefined') {
    global[name] = value;
  }
}
