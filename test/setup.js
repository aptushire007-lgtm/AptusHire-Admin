import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// Unmount between tests. Without this, every render stacks into the same
// document body and a getByRole that should match one element starts matching
// several — a failure mode that shows up as a confusing "found multiple
// elements" on a test that is itself correct.
afterEach(cleanup);

// jsdom implements no layout, so it has no ResizeObserver. <ChipRow> observes
// its scroller to decide which edge fade to show; without a stub the component
// throws on mount. A no-op is the honest stub: jsdom reports every element as
// 0×0, so there is no resize to report and nothing here could pretend to
// measure one. Layout-dependent behaviour is explicitly NOT what these tests
// cover — see chip.test.jsx on why the shrink contract is asserted as a class.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver = globalThis.ResizeObserver || ResizeObserverStub;
