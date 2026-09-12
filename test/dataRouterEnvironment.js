import { transferableAbortController } from "node:util";

// jsdom provides AbortSignal but not Request. Node's native Request rejects the
// jsdom signal; use its matching native abort classes for real router requests.
// This is not a Request/navigation mock and retains actual cancellation behavior.
const nativeController = transferableAbortController();
globalThis.AbortController = nativeController.constructor;
globalThis.AbortSignal = nativeController.signal.constructor;
