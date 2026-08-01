interface MermaidEnhancerOptions {
  createThemeObserver?: ThemeObserverFactory;
  document?: Document;
  loadMermaid?: MermaidLoader;
}

interface MermaidApi {
  initialize: (options: {
    securityLevel: "strict";
    startOnLoad: false;
    theme: "dark" | "default";
  }) => void;
  render: (
    id: string,
    source: string
  ) => Promise<{
    svg: string;
    bindFunctions?: (element: Element) => void;
  }>;
}

type MermaidLoader = () => Promise<MermaidApi>;

interface ThemeObserver {
  observe: (target: Node, options: MutationObserverInit) => void;
}

type ThemeObserverFactory = (
  callback: () => Promise<void> | void
) => ThemeObserver;

let renderSequence = 0;
const lifecycleBoundDocuments = new WeakSet<Document>();
const mermaidPromises = new WeakMap<Document, Promise<MermaidApi>>();
const themeObservers = new WeakMap<Document, ThemeObserver>();

const importMermaid: MermaidLoader = async () =>
  (await import("mermaid")).default;

const createDefaultThemeObserver: ThemeObserverFactory | undefined =
  typeof MutationObserver === "undefined"
    ? undefined
    : callback =>
        new MutationObserver(() => {
          void callback();
        });

const getMermaidTheme = (runtimeDocument: Document) =>
  runtimeDocument.documentElement.getAttribute("data-theme") === "dark"
    ? "dark"
    : "default";

const initializeMermaid = (mermaid: MermaidApi, runtimeDocument: Document) => {
  mermaid.initialize({
    securityLevel: "strict",
    startOnLoad: false,
    theme: getMermaidTheme(runtimeDocument),
  });
};

const loadMermaidForDocument = async (
  runtimeDocument: Document,
  loadMermaid: MermaidLoader
) => {
  const cachedPromise = mermaidPromises.get(runtimeDocument);
  if (cachedPromise) return cachedPromise;

  const promise = Promise.resolve().then(loadMermaid);
  mermaidPromises.set(runtimeDocument, promise);

  try {
    return await promise;
  } catch (error) {
    if (mermaidPromises.get(runtimeDocument) === promise) {
      mermaidPromises.delete(runtimeDocument);
    }
    throw error;
  }
};

const isMermaidCodeBlock = (pre: HTMLPreElement) => {
  const code = pre.querySelector("code");
  if (!code) return false;

  const preLanguage = pre.getAttribute("data-language")?.toLowerCase();
  const codeLanguage = code.getAttribute("data-language")?.toLowerCase();
  if (preLanguage === "mermaid" || codeLanguage === "mermaid") return true;

  const classNames = `${pre.className} ${code.className}`.toLowerCase();
  return /\blanguage-mermaid\b/.test(classNames);
};

const findMermaidBlocks = (runtimeDocument: Document) =>
  Array.from(runtimeDocument.querySelectorAll<HTMLPreElement>("pre")).flatMap(
    pre => {
      if (!isMermaidCodeBlock(pre)) return [];
      if (pre.dataset.mermaidProcessed || pre.classList.contains("hidden")) {
        return [];
      }

      const source = pre.querySelector("code")?.textContent?.trim();
      return source ? [{ pre, source }] : [];
    }
  );

const releasePendingBlocks = (
  blocks: Array<{ pre: HTMLPreElement; source: string }>
) => {
  for (const { pre } of blocks) {
    if (pre.dataset.mermaidProcessed === "pending") {
      delete pre.dataset.mermaidProcessed;
    }
  }
};

async function renderMermaidBlocks(
  runtimeDocument: Document,
  loadMermaid: MermaidLoader
) {
  const blocks = findMermaidBlocks(runtimeDocument);
  if (blocks.length === 0) return;

  for (const { pre } of blocks) {
    pre.dataset.mermaidProcessed = "pending";
  }

  let mermaid: MermaidApi;
  try {
    mermaid = await loadMermaidForDocument(runtimeDocument, loadMermaid);
  } catch (error) {
    releasePendingBlocks(blocks);
    console.error("Failed to load mermaid:", error);
    return;
  }

  initializeMermaid(mermaid, runtimeDocument);

  for (const { pre, source } of blocks) {
    const host = runtimeDocument.createElement("div");
    host.className = "mermaid-diagram my-6 overflow-x-auto";
    host.dataset.mermaidSource = source;

    try {
      const id = `mermaid-diagram-${renderSequence++}`;
      const { svg, bindFunctions } = await mermaid.render(id, source);
      host.innerHTML = svg;
      bindFunctions?.(host);
      pre.insertAdjacentElement("afterend", host);
      pre.dataset.mermaidProcessed = "true";
      pre.classList.add("hidden");
    } catch (error) {
      delete pre.dataset.mermaidProcessed;
      console.error("Failed to render mermaid diagram:", error);
    }
  }
}

async function rerenderMermaidByTheme(
  runtimeDocument: Document,
  loadMermaid: MermaidLoader
) {
  const hosts = Array.from(
    runtimeDocument.querySelectorAll<HTMLElement>(
      ".mermaid-diagram[data-mermaid-source]"
    )
  );
  if (hosts.length === 0) return;

  let mermaid: MermaidApi;
  try {
    mermaid = await loadMermaidForDocument(runtimeDocument, loadMermaid);
  } catch (error) {
    console.error("Failed to load mermaid:", error);
    return;
  }

  initializeMermaid(mermaid, runtimeDocument);

  for (const host of hosts) {
    const source = host.dataset.mermaidSource?.trim();
    if (!source) continue;

    try {
      const id = `mermaid-diagram-${renderSequence++}`;
      const { svg, bindFunctions } = await mermaid.render(id, source);
      host.innerHTML = svg;
      bindFunctions?.(host);
    } catch (error) {
      console.error("Failed to re-render mermaid diagram:", error);
    }
  }
}

export function setupMermaidEnhancer({
  createThemeObserver = createDefaultThemeObserver,
  document: runtimeDocument = document,
  loadMermaid = importMermaid,
}: MermaidEnhancerOptions = {}) {
  if (createThemeObserver && !themeObservers.has(runtimeDocument)) {
    const observer = createThemeObserver(() =>
      rerenderMermaidByTheme(runtimeDocument, loadMermaid)
    );
    observer.observe(runtimeDocument.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    themeObservers.set(runtimeDocument, observer);
  }

  if (lifecycleBoundDocuments.has(runtimeDocument)) {
    return Promise.resolve();
  }

  const initMermaid = () => renderMermaidBlocks(runtimeDocument, loadMermaid);

  runtimeDocument.addEventListener?.("astro:page-load", initMermaid);
  lifecycleBoundDocuments.add(runtimeDocument);

  if (runtimeDocument.readyState === "loading") {
    runtimeDocument.addEventListener?.("DOMContentLoaded", initMermaid, {
      once: true,
    });
    return Promise.resolve();
  }

  return initMermaid();
}
