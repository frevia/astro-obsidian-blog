import { afterEach, describe, expect, it, vi } from "vitest";
import { restoreSearchDialogFocus, setupSearchDialog } from "./search-dialog";
import type { PagefindInstance, PagefindResultData } from "./pagefind-loader";

type TestListener = (event: Record<string, unknown>) => void;

class FakeClassList {
  values = new Set<string>();

  add(...tokens: string[]) {
    tokens.forEach(token => this.values.add(token));
  }

  remove(...tokens: string[]) {
    tokens.forEach(token => this.values.delete(token));
  }

  contains(token: string) {
    return this.values.has(token);
  }
}

class FakeEventTarget {
  listeners = new Map<
    string,
    Array<{ listener: TestListener; options?: unknown }>
  >();

  addEventListener(type: string, listener: TestListener, options?: unknown) {
    const listeners = this.listeners.get(type) ?? [];
    listeners.push({ listener, options });
    this.listeners.set(type, listeners);
  }

  emit(type: string, event: Record<string, unknown> = {}) {
    if (!("target" in event)) event.target = this;
    for (const { listener } of this.listeners.get(type) ?? []) listener(event);
  }
}

class FakeElement extends FakeEventTarget {
  attributes = new Map<string, string>();
  children: FakeElement[] = [];
  classList = new FakeClassList();
  className = "";
  dataset: Record<string, string> = {};
  id = "";
  innerHTML = "";
  isConnected = true;
  ownerDocument!: FakeDocument;
  parent: FakeElement | null = null;
  textContent: string | null = null;

  closest(selector: string): FakeElement | null {
    const matchesSearchTrigger =
      selector.includes("[data-search-trigger]") &&
      "searchTrigger" in this.dataset;
    const matchesHeaderTrigger =
      selector.includes("#header-search-trigger") &&
      (this.id === "header-search-trigger" ||
        this.id === "header-search-trigger-mobile");
    const matchesClose =
      selector === "[data-search-dialog-close]" &&
      "searchDialogClose" in this.dataset;
    if (matchesSearchTrigger || matchesHeaderTrigger || matchesClose) {
      return this;
    }
    return this.parent?.closest(selector) ?? null;
  }

  appendChild(child: FakeElement) {
    child.parent = this;
    this.children.push(child);
    return child;
  }

  replaceChildren(...children: FakeElement[]) {
    this.children = children;
  }

  setAttribute(name: string, value: string) {
    this.attributes.set(name, value);
  }

  getAttribute(name: string) {
    return this.attributes.get(name) ?? null;
  }

  removeAttribute(name: string) {
    this.attributes.delete(name);
  }
}

class FakeHTMLElement extends FakeElement {
  focusCalls = 0;

  focus() {
    this.focusCalls += 1;
    this.ownerDocument.activeElement = this;
  }
}

class FakeHTMLInputElement extends FakeHTMLElement {
  value = "";
}

class FakeHTMLAnchorElement extends FakeHTMLElement {
  href = "";
  clickCalls = 0;

  click() {
    this.clickCalls += 1;
  }
}

class FakeHTMLDialogElement extends FakeHTMLElement {
  open = false;
  queryResults = new Map<string, FakeElement>();
  closeCalls = 0;
  showModalCalls = 0;

  close() {
    if (!this.open) return;
    this.closeCalls += 1;
    this.open = false;
    this.emit("close");
  }

  querySelector(selector: string) {
    return this.queryResults.get(selector) ?? null;
  }

  showModal() {
    this.showModalCalls += 1;
    this.open = true;
  }
}

class FakeWindow extends FakeEventTarget {
  Element = FakeElement;
  HTMLDialogElement = FakeHTMLDialogElement;
  HTMLElement = FakeHTMLElement;
  HTMLInputElement = FakeHTMLInputElement;
  animationFrames: Array<() => void> = [];
  location = { assign: vi.fn() };

  clearTimeout(timer: number) {
    globalThis.clearTimeout(timer);
  }

  flushAnimationFrames() {
    const frames = this.animationFrames.splice(0);
    frames.forEach(frame => frame());
  }

  requestAnimationFrame(callback: () => void) {
    this.animationFrames.push(callback);
    return this.animationFrames.length;
  }

  setTimeout(callback: () => void, delay: number) {
    return globalThis.setTimeout(callback, delay) as unknown as number;
  }
}

class FakeDocument extends FakeEventTarget {
  activeElement: FakeElement | null = null;
  defaultView: FakeWindow;
  dialog: FakeHTMLDialogElement | null = null;
  documentElement: FakeHTMLElement;

  constructor(runtimeWindow: FakeWindow) {
    super();
    this.defaultView = runtimeWindow;
    this.documentElement = new FakeHTMLElement();
    this.documentElement.ownerDocument = this;
  }

  createElement(tagName: string) {
    const element =
      tagName === "a" ? new FakeHTMLAnchorElement() : new FakeHTMLElement();
    element.ownerDocument = this;
    return element;
  }

  querySelector(selector: string) {
    return selector === "#global-search-dialog" ? this.dialog : null;
  }
}

function createEvent(properties: Record<string, unknown>) {
  const event = {
    altKey: false,
    button: 0,
    ctrlKey: false,
    defaultPrevented: false,
    key: "",
    metaKey: false,
    shiftKey: false,
    ...properties,
  };
  return Object.assign(event, {
    preventDefault: vi.fn(() => {
      event.defaultPrevented = true;
    }),
  });
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
}

function createDialog(documentRoot: FakeDocument) {
  const dialog = new FakeHTMLDialogElement();
  const input = new FakeHTMLInputElement();
  const results = new FakeHTMLElement();
  dialog.ownerDocument = documentRoot;
  input.ownerDocument = documentRoot;
  results.ownerDocument = documentRoot;
  dialog.dataset.fallbackHref = "/base/search";
  dialog.dataset.noResults = "No results found";
  dialog.dataset.pagefindPath = "/base/pagefind/";
  dialog.queryResults.set("#global-search-input", input);
  dialog.queryResults.set("#global-search-results", results);
  documentRoot.dialog = dialog;
  return { dialog, input, results };
}

function createFixture(
  loadPagefind = vi
    .fn<(bundlePath: string) => Promise<PagefindInstance>>()
    .mockResolvedValue({
      search: vi.fn().mockResolvedValue({ results: [] }),
    })
) {
  const runtimeWindow = new FakeWindow();
  const documentRoot = new FakeDocument(runtimeWindow);
  const { dialog, input, results } = createDialog(documentRoot);
  const trigger = new FakeHTMLAnchorElement();
  trigger.id = "header-search-trigger";
  trigger.href = "/base/search";
  trigger.ownerDocument = documentRoot;
  documentRoot.activeElement = trigger;

  setupSearchDialog(documentRoot as unknown as Document, {
    loadPagefind,
    window: runtimeWindow as unknown as Window & typeof globalThis,
  });

  return {
    dialog,
    documentRoot,
    input,
    loadPagefind,
    results,
    runtimeWindow,
    trigger,
  };
}

async function flushPromises() {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

afterEach(() => {
  vi.useRealTimers();
});

describe("search dialog controller", () => {
  it("captures an unmodified trigger click before ClientRouter", () => {
    const fixture = createFixture();
    const click = createEvent({ target: fixture.trigger });

    fixture.documentRoot.emit("click", click);
    fixture.runtimeWindow.flushAnimationFrames();

    expect(fixture.documentRoot.listeners.get("click")?.[0]?.options).toEqual({
      capture: true,
    });
    expect(click.preventDefault).toHaveBeenCalledOnce();
    expect(fixture.dialog.showModalCalls).toBe(1);
    expect(fixture.input.focusCalls).toBe(1);
    expect(fixture.loadPagefind).toHaveBeenCalledWith("/base/pagefind/");
    expect(
      fixture.documentRoot.documentElement.classList.contains(
        "search-dialog-open"
      )
    ).toBe(true);
  });

  it("leaves modified clicks and a missing dialog to the /search link", () => {
    const modified = createFixture();
    const modifiedClick = createEvent({
      metaKey: true,
      target: modified.trigger,
    });
    modified.documentRoot.emit("click", modifiedClick);

    expect(modifiedClick.preventDefault).not.toHaveBeenCalled();
    expect(modified.dialog.showModalCalls).toBe(0);

    const missing = createFixture();
    missing.documentRoot.dialog = null;
    const fallbackClick = createEvent({ target: missing.trigger });
    missing.documentRoot.emit("click", fallbackClick);

    expect(fallbackClick.preventDefault).not.toHaveBeenCalled();
    expect(missing.loadPagefind).not.toHaveBeenCalled();
  });

  it("supports both keyboard shortcuts without losing the original focus", () => {
    const fixture = createFixture();
    const commandK = createEvent({ key: "K", metaKey: true });

    fixture.documentRoot.emit("keydown", commandK);
    fixture.runtimeWindow.flushAnimationFrames();
    expect(commandK.preventDefault).toHaveBeenCalledOnce();

    const repeatedCommandK = createEvent({ key: "k", metaKey: true });
    fixture.documentRoot.emit("keydown", repeatedCommandK);
    fixture.runtimeWindow.flushAnimationFrames();

    const cancel = createEvent({});
    fixture.dialog.emit("cancel", cancel);

    expect(cancel.preventDefault).toHaveBeenCalledOnce();
    expect(fixture.dialog.closeCalls).toBe(1);
    expect(fixture.trigger.focusCalls).toBe(1);
    expect(fixture.input.focusCalls).toBe(2);

    const controlK = createEvent({ ctrlKey: true, key: "k" });
    fixture.documentRoot.emit("keydown", controlK);
    expect(controlK.preventDefault).toHaveBeenCalledOnce();
  });

  it("invalidates a pending open before Esc or a page transition", async () => {
    const pending = deferred<PagefindInstance>();
    const loadPagefind = vi.fn(() => pending.promise);
    const fixture = createFixture(loadPagefind);
    fixture.documentRoot.emit(
      "click",
      createEvent({ target: fixture.trigger })
    );

    fixture.dialog.emit("cancel", createEvent({}));
    pending.reject(new Error("bundle unavailable"));
    await flushPromises();
    fixture.runtimeWindow.flushAnimationFrames();

    expect(fixture.runtimeWindow.location.assign).not.toHaveBeenCalled();
    expect(fixture.input.focusCalls).toBe(0);

    const nextDialog = createDialog(fixture.documentRoot).dialog;
    fixture.documentRoot.emit(
      "click",
      createEvent({ target: fixture.trigger })
    );
    fixture.documentRoot.emit("astro:before-swap");

    expect(nextDialog.closeCalls).toBe(1);
    expect(fixture.trigger.focusCalls).toBe(1);
  });

  it("uses /search only when the active Pagefind load fails", async () => {
    const pending = deferred<PagefindInstance>();
    const fixture = createFixture(vi.fn(() => pending.promise));
    fixture.documentRoot.emit(
      "click",
      createEvent({ target: fixture.trigger })
    );

    pending.reject(new Error("bundle unavailable"));
    await flushPromises();

    expect(fixture.dialog.open).toBe(false);
    expect(fixture.runtimeWindow.location.assign).toHaveBeenCalledWith(
      "/base/search"
    );
  });

  it("closes without restoring focus when a native page swap starts", () => {
    const fixture = createFixture();
    fixture.documentRoot.emit(
      "click",
      createEvent({ target: fixture.trigger })
    );

    fixture.runtimeWindow.emit("pageswap");
    fixture.runtimeWindow.emit("pagehide");

    expect(fixture.dialog.closeCalls).toBe(1);
    expect(fixture.trigger.focusCalls).toBe(0);
    expect(
      fixture.documentRoot.documentElement.classList.contains(
        "search-dialog-open"
      )
    ).toBe(false);
  });

  it("does not render an old Pagefind response after the query is cleared", async () => {
    vi.useFakeTimers();
    const oldResult = deferred<PagefindResultData>();
    const pagefind: PagefindInstance = {
      search: vi.fn().mockResolvedValue({
        results: [{ data: () => oldResult.promise }],
      }),
    };
    const fixture = createFixture(vi.fn().mockResolvedValue(pagefind));
    fixture.documentRoot.emit(
      "click",
      createEvent({ target: fixture.trigger })
    );

    fixture.input.value = "old";
    fixture.input.emit("input");
    await vi.advanceTimersByTimeAsync(120);
    expect(pagefind.search).toHaveBeenCalledWith("old");

    fixture.input.value = "";
    fixture.input.emit("input");
    oldResult.resolve({ url: "/old", meta: { title: "Old result" } });
    await flushPromises();

    expect(fixture.results.children).toHaveLength(1);
    expect(fixture.results.children[0]?.textContent).toBe("No results found");
  });

  it("supports arrow-key result navigation and Enter activation", async () => {
    vi.useFakeTimers();
    const fixture = createFixture(
      vi.fn().mockResolvedValue({
        search: vi.fn().mockResolvedValue({
          results: [
            {
              data: vi.fn().mockResolvedValue({
                url: "/first",
                meta: { title: "First result" },
              }),
            },
            {
              data: vi.fn().mockResolvedValue({
                url: "/second",
                meta: { title: "Second result" },
              }),
            },
          ],
        }),
      })
    );

    fixture.documentRoot.emit(
      "click",
      createEvent({ target: fixture.trigger })
    );
    fixture.input.value = "result";
    fixture.input.emit("input");
    await vi.advanceTimersByTimeAsync(120);
    await flushPromises();

    expect(fixture.results.children).toHaveLength(2);
    const first = fixture.results.children[0];
    const second = fixture.results.children[1];
    expect(first?.attributes.get("aria-selected")).toBe("false");

    const down = createEvent({ key: "ArrowDown" });
    fixture.input.emit("keydown", down);
    expect(down.preventDefault).toHaveBeenCalledOnce();
    expect(first?.attributes.get("aria-selected")).toBe("true");
    expect(fixture.input.attributes.get("aria-activedescendant")).toBe(
      "global-search-result-0"
    );

    const secondDown = createEvent({ key: "ArrowDown" });
    fixture.input.emit("keydown", secondDown);
    expect(second?.attributes.get("aria-selected")).toBe("true");

    const enter = createEvent({ key: "Enter" });
    fixture.input.emit("keydown", enter);
    expect(enter.preventDefault).toHaveBeenCalledOnce();
    expect((second as FakeHTMLAnchorElement).clickCalls).toBe(1);
  });

  it("skips focus restoration for disconnected triggers", () => {
    const fixture = createFixture();
    fixture.trigger.isConnected = false;

    expect(
      restoreSearchDialogFocus(fixture.trigger as unknown as HTMLElement)
    ).toBe(false);
    expect(fixture.trigger.focusCalls).toBe(0);
  });
});
