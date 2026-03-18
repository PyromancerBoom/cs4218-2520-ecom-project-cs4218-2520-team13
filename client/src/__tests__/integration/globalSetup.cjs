// CJS setup file — CommonJS require() is synchronous, so each global assignment
// completes before the next require() runs. This guarantees that TextDecoder,
// ReadableStream, MessagePort, etc. are in `global` BEFORE undici loads (undici
// references these at module-evaluation time in its CJS build).

// ── 1. Text encoding (undici needs TextDecoder at load time) ─────────────────
const { TextEncoder, TextDecoder } = require('util');
if (!global.TextEncoder) global.TextEncoder = TextEncoder;
if (!global.TextDecoder) global.TextDecoder = TextDecoder;

// ── 2. Web Streams (undici references ReadableStream/WritableStream at load time)
const { ReadableStream, WritableStream, TransformStream,
        ByteLengthQueuingStrategy, CountQueuingStrategy } = require('stream/web');
if (!global.ReadableStream)            global.ReadableStream = ReadableStream;
if (!global.WritableStream)            global.WritableStream = WritableStream;
if (!global.TransformStream)           global.TransformStream = TransformStream;
if (!global.ByteLengthQueuingStrategy) global.ByteLengthQueuingStrategy = ByteLengthQueuingStrategy;
if (!global.CountQueuingStrategy)      global.CountQueuingStrategy = CountQueuingStrategy;

// ── 3. MessagePort (undici webidl references it at load time) ────────────────
const { BroadcastChannel, MessagePort, MessageChannel } = require('worker_threads');
if (!global.BroadcastChannel) global.BroadcastChannel = BroadcastChannel;
if (!global.MessagePort)      global.MessagePort = MessagePort;
if (!global.MessageChannel)   global.MessageChannel = MessageChannel;

// ── 4. Fetch API from undici (WHATWG-compliant; node-fetch v2 lacks getReader())
const { fetch, Response, Request, Headers, FormData, File } = require('undici');
if (!global.fetch)    global.fetch    = fetch;
if (!global.Response) global.Response = Response;
if (!global.Request)  global.Request  = Request;
if (!global.Headers)  global.Headers  = Headers;
if (!global.FormData) global.FormData = FormData;
if (!global.File)     global.File     = File;
