import { afterEach, describe, expect, it, vi } from "vitest";
import { setupMermaidEnhancer } from "./mermaid-enhancer";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Mermaid enhancer", () => {
  it("does not load Mermaid when the page has no Mermaid code block", async () => {
    let onThemeChange: (() => Promise<void> | void) | undefined;
    const testDocument = {
      addEventListener: vi.fn(),
      documentElement: {},
      querySelector: vi.fn().mockReturnValue(null),
      querySelectorAll: vi.fn().mockReturnValue([]),
      readyState: "complete",
    } as unknown as Document;
    const loadMermaid = vi.fn();
    const createThemeObserver = vi.fn(
      (callback: () => Promise<void> | void) => {
        onThemeChange = callback;
        return { observe: vi.fn() };
      }
    );

    await setupMermaidEnhancer({
      createThemeObserver,
      document: testDocument,
      loadMermaid,
    });
    await onThemeChange?.();

    expect(loadMermaid).not.toHaveBeenCalled();
  });

  it("renders a detected Mermaid block with the current theme", async () => {
    const code = {
      className: "",
      getAttribute: vi.fn().mockReturnValue(null),
      textContent: "graph TD; A-->B",
    };
    const host = {
      className: "",
      dataset: {} as Record<string, string>,
      innerHTML: "",
    };
    const pre = {
      className: "",
      classList: {
        add: vi.fn(),
        contains: vi.fn().mockReturnValue(false),
      },
      dataset: {} as Record<string, string>,
      getAttribute: vi.fn((name: string) =>
        name === "data-language" ? "MERMAID" : null
      ),
      insertAdjacentElement: vi.fn(),
      querySelector: vi.fn().mockReturnValue(code),
    };
    const testDocument = {
      createElement: vi.fn().mockReturnValue(host),
      documentElement: {
        getAttribute: vi.fn().mockReturnValue("dark"),
      },
      querySelector: vi.fn().mockReturnValue(code),
      querySelectorAll: vi.fn().mockReturnValue([pre]),
    } as unknown as Document;
    const bindFunctions = vi.fn();
    const mermaid = {
      initialize: vi.fn(),
      render: vi.fn().mockResolvedValue({
        svg: '<svg data-theme="dark"></svg>',
        bindFunctions,
      }),
    };
    const loadMermaid = vi.fn().mockResolvedValue(mermaid);

    await setupMermaidEnhancer({
      document: testDocument,
      loadMermaid,
    });

    expect({
      hostHtml: host.innerHTML,
      initializedWith: mermaid.initialize.mock.calls[0]?.[0],
      insertedHost: pre.insertAdjacentElement.mock.calls[0]?.[1],
      isHidden: pre.classList.add.mock.calls[0]?.[0],
      processed: pre.dataset.mermaidProcessed,
    }).toEqual({
      hostHtml: '<svg data-theme="dark"></svg>',
      initializedWith: {
        securityLevel: "strict",
        startOnLoad: false,
        theme: "dark",
      },
      insertedHost: host,
      isHidden: "hidden",
      processed: "true",
    });
  });

  it("keeps the source block visible when Mermaid fails to load", async () => {
    const code = {
      className: "language-mermaid",
      getAttribute: vi.fn().mockReturnValue(null),
      textContent: "graph TD; A-->B",
    };
    const sourceBlock = {
      className: "",
      classList: {
        add: vi.fn(),
        contains: vi.fn().mockReturnValue(false),
      },
      dataset: {} as Record<string, string>,
      getAttribute: vi.fn().mockReturnValue(null),
      querySelector: vi.fn().mockReturnValue(code),
    };
    const testDocument = {
      querySelector: vi.fn().mockReturnValue(sourceBlock),
      querySelectorAll: vi.fn().mockReturnValue([sourceBlock]),
    } as unknown as Document;
    const loadError = new Error("chunk unavailable");
    const loadMermaid = vi.fn().mockRejectedValue(loadError);
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    await expect(
      setupMermaidEnhancer({
        document: testDocument,
        loadMermaid,
      })
    ).resolves.toBeUndefined();
    expect({
      hidden: sourceBlock.classList.add.mock.calls.length > 0,
      loggedError: consoleError.mock.calls[0],
      processed: sourceBlock.dataset.mermaidProcessed,
    }).toEqual({
      hidden: false,
      loggedError: ["Failed to load mermaid:", loadError],
      processed: undefined,
    });
  });

  it("keeps the source block visible when Mermaid fails to render", async () => {
    const code = {
      className: "language-mermaid",
      getAttribute: vi.fn().mockReturnValue(null),
      textContent: "not valid mermaid",
    };
    const sourceBlock = {
      className: "",
      classList: {
        add: vi.fn(),
        contains: vi.fn().mockReturnValue(false),
      },
      dataset: {} as Record<string, string>,
      getAttribute: vi.fn().mockReturnValue(null),
      insertAdjacentElement: vi.fn(),
      querySelector: vi.fn().mockReturnValue(code),
    };
    const testDocument = {
      createElement: vi.fn().mockReturnValue({
        className: "",
        dataset: {} as Record<string, string>,
        innerHTML: "",
      }),
      documentElement: {
        getAttribute: vi.fn().mockReturnValue("light"),
      },
      querySelectorAll: vi.fn().mockReturnValue([sourceBlock]),
    } as unknown as Document;
    const renderError = new Error("invalid diagram");
    const mermaid = {
      initialize: vi.fn(),
      render: vi.fn().mockRejectedValue(renderError),
    };
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    await setupMermaidEnhancer({
      document: testDocument,
      loadMermaid: vi.fn().mockResolvedValue(mermaid),
    });

    expect({
      hidden: sourceBlock.classList.add.mock.calls.length > 0,
      inserted: sourceBlock.insertAdjacentElement.mock.calls.length > 0,
      loggedError: consoleError.mock.calls[0],
      processed: sourceBlock.dataset.mermaidProcessed,
    }).toEqual({
      hidden: false,
      inserted: false,
      loggedError: ["Failed to render mermaid diagram:", renderError],
      processed: undefined,
    });
  });

  it("binds ClientRouter lifecycle once and renders after navigation", async () => {
    const listeners = new Map<string, Array<() => Promise<void> | void>>();
    const code = {
      className: "language-mermaid",
      getAttribute: vi.fn().mockReturnValue(null),
      textContent: "flowchart LR; A-->B",
    };
    const pre = {
      className: "",
      classList: {
        add: vi.fn(),
        contains: vi.fn().mockReturnValue(false),
      },
      dataset: {} as Record<string, string>,
      getAttribute: vi.fn().mockReturnValue(null),
      insertAdjacentElement: vi.fn(),
      querySelector: vi.fn().mockReturnValue(code),
    };
    const host = {
      className: "",
      dataset: {} as Record<string, string>,
      innerHTML: "",
    };
    const querySelector = vi.fn().mockReturnValue(null);
    const querySelectorAll = vi.fn().mockReturnValue([]);
    const testDocument = {
      addEventListener: vi.fn(
        (eventName: string, listener: () => Promise<void> | void) => {
          const eventListeners = listeners.get(eventName) ?? [];
          eventListeners.push(listener);
          listeners.set(eventName, eventListeners);
        }
      ),
      createElement: vi.fn().mockReturnValue(host),
      documentElement: {
        getAttribute: vi.fn().mockReturnValue("light"),
      },
      querySelector,
      querySelectorAll,
      readyState: "complete",
    } as unknown as Document;
    const mermaid = {
      initialize: vi.fn(),
      render: vi.fn().mockResolvedValue({ svg: "<svg></svg>" }),
    };
    const loadMermaid = vi.fn().mockResolvedValue(mermaid);

    await setupMermaidEnhancer({ document: testDocument, loadMermaid });
    await setupMermaidEnhancer({ document: testDocument, loadMermaid });

    const pageLoadListeners = listeners.get("astro:page-load") ?? [];
    expect(pageLoadListeners).toHaveLength(1);

    querySelector.mockReturnValue(code);
    querySelectorAll.mockReturnValue([pre]);
    await pageLoadListeners[0]?.();
    await pageLoadListeners[0]?.();

    expect({
      loadCount: loadMermaid.mock.calls.length,
      processed: pre.dataset.mermaidProcessed,
      renderCount: mermaid.render.mock.calls.length,
    }).toEqual({
      loadCount: 1,
      processed: "true",
      renderCount: 1,
    });
  });

  it("re-renders existing diagrams when the theme changes", async () => {
    let theme = "light";
    let onThemeChange: (() => Promise<void> | void) | undefined;
    const renderedHosts: unknown[] = [];
    const code = {
      className: "language-mermaid",
      getAttribute: vi.fn().mockReturnValue(null),
      textContent: "sequenceDiagram; Alice->>Bob: Hi",
    };
    const host = {
      className: "",
      dataset: {} as Record<string, string>,
      innerHTML: "",
    };
    const pre = {
      className: "",
      classList: {
        add: vi.fn(),
        contains: vi.fn().mockReturnValue(false),
      },
      dataset: {} as Record<string, string>,
      getAttribute: vi.fn().mockReturnValue(null),
      insertAdjacentElement: vi.fn((_position: string, element: unknown) => {
        renderedHosts.push(element);
      }),
      querySelector: vi.fn().mockReturnValue(code),
    };
    const observe = vi.fn();
    const createThemeObserver = vi.fn(
      (callback: () => Promise<void> | void) => {
        onThemeChange = callback;
        return { observe };
      }
    );
    const testDocument = {
      addEventListener: vi.fn(),
      createElement: vi.fn().mockReturnValue(host),
      documentElement: {
        getAttribute: vi.fn(() => theme),
      },
      querySelectorAll: vi.fn((selector: string) =>
        selector === "pre" ? [pre] : renderedHosts
      ),
      readyState: "complete",
    } as unknown as Document;
    const mermaid = {
      initialize: vi.fn(),
      render: vi
        .fn()
        .mockResolvedValueOnce({ svg: '<svg data-theme="light"></svg>' })
        .mockResolvedValueOnce({ svg: '<svg data-theme="dark"></svg>' }),
    };
    const loadMermaid = vi.fn().mockResolvedValue(mermaid);

    await setupMermaidEnhancer({
      createThemeObserver,
      document: testDocument,
      loadMermaid,
    });
    await setupMermaidEnhancer({
      createThemeObserver,
      document: testDocument,
      loadMermaid,
    });

    theme = "dark";
    await onThemeChange?.();

    expect({
      hostHtml: host.innerHTML,
      initializationThemes: mermaid.initialize.mock.calls.map(
        ([options]) => options.theme
      ),
      loadCount: loadMermaid.mock.calls.length,
      observerCount: createThemeObserver.mock.calls.length,
      observed: observe.mock.calls[0],
      renderCount: mermaid.render.mock.calls.length,
    }).toEqual({
      hostHtml: '<svg data-theme="dark"></svg>',
      initializationThemes: ["default", "dark"],
      loadCount: 1,
      observerCount: 1,
      observed: [
        testDocument.documentElement,
        {
          attributeFilter: ["data-theme"],
          attributes: true,
        },
      ],
      renderCount: 2,
    });
  });
});
