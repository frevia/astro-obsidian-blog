import {
  loadPagefind,
  type PagefindInstance,
  type PagefindResultData,
} from "./pagefind-loader";

type SearchDialogState = {
  activationId: number;
  activeDialog?: HTMLDialogElement | null;
  bound: boolean;
  restoreFocus?: HTMLElement | null;
};

type SearchDialogWindow = Window & {
  __searchDialogState?: SearchDialogState;
};

type RuntimeWindow = Window & typeof globalThis;

type SearchDialogDependencies = {
  loadPagefind?: (bundlePath: string) => Promise<PagefindInstance>;
  window?: RuntimeWindow;
};

type SearchInputBinding = {
  invalidate: () => void;
};

const searchInputBindings = new WeakMap<HTMLInputElement, SearchInputBinding>();

function getState(runtimeWindow: RuntimeWindow): SearchDialogState {
  const searchWindow = runtimeWindow as SearchDialogWindow;
  return (searchWindow.__searchDialogState ??= {
    activationId: 0,
    bound: false,
  });
}

function getPagefindBundlePath(dialog: HTMLDialogElement): string {
  return dialog.dataset.pagefindPath || `${import.meta.env.BASE_URL}pagefind/`;
}

function getSearchInput(
  dialog: HTMLDialogElement,
  runtimeWindow: RuntimeWindow
) {
  const input = dialog.querySelector("#global-search-input");
  return input instanceof runtimeWindow.HTMLInputElement ? input : null;
}

function focusSearchInput(
  dialog: HTMLDialogElement,
  runtimeWindow: RuntimeWindow
) {
  const input = getSearchInput(dialog, runtimeWindow);
  if (!input) return;

  runtimeWindow.requestAnimationFrame(() => {
    if (dialog.open && dialog.isConnected) input.focus();
  });
}

export function restoreSearchDialogFocus(element: HTMLElement | null) {
  if (!element?.isConnected) return false;
  element.focus();
  return true;
}

function renderResults(
  dialog: HTMLDialogElement,
  results: PagefindResultData[],
  runtimeWindow: RuntimeWindow
) {
  const container = dialog.querySelector("#global-search-results");
  if (!(container instanceof runtimeWindow.HTMLElement)) return;

  const ownerDocument = dialog.ownerDocument;
  if (results.length === 0) {
    const empty = ownerDocument.createElement("p");
    empty.className = "global-search-empty";
    empty.textContent = dialog.dataset.noResults || "No results found";
    container.replaceChildren(empty);
    return;
  }

  container.replaceChildren(
    ...results.map(result => {
      const link = ownerDocument.createElement("a");
      link.className = "global-search-result";
      link.href = result.url;
      link.setAttribute("role", "option");

      const title = ownerDocument.createElement("strong");
      title.textContent = result.meta?.title || result.url;
      link.appendChild(title);

      if (result.excerpt) {
        const excerpt = ownerDocument.createElement("span");
        excerpt.className = "global-search-excerpt";
        excerpt.innerHTML = result.excerpt;
        link.appendChild(excerpt);
      }
      return link;
    })
  );
}

function bindSearchInput(
  dialog: HTMLDialogElement,
  runtimeWindow: RuntimeWindow,
  loadPagefindBundle: (bundlePath: string) => Promise<PagefindInstance>
) {
  const input = getSearchInput(dialog, runtimeWindow);
  if (!input) return null;

  const existingBinding = searchInputBindings.get(input);
  if (existingBinding) return existingBinding;

  let requestId = 0;
  let timer: number | undefined;

  const invalidate = () => {
    requestId += 1;
    if (timer !== undefined) runtimeWindow.clearTimeout(timer);
    timer = undefined;
  };

  input.addEventListener("input", () => {
    invalidate();
    const currentRequest = requestId;
    const query = input.value.trim();
    if (!query) {
      renderResults(dialog, [], runtimeWindow);
      return;
    }

    timer = runtimeWindow.setTimeout(async () => {
      timer = undefined;
      try {
        const pagefind = await loadPagefindBundle(
          getPagefindBundlePath(dialog)
        );
        const response = await pagefind.search(query);
        const data = await Promise.all(
          response.results.slice(0, 8).map(result => result.data())
        );
        if (
          currentRequest === requestId &&
          input.value.trim() === query &&
          dialog.open &&
          dialog.isConnected
        ) {
          renderResults(dialog, data, runtimeWindow);
        }
      } catch {
        if (
          currentRequest === requestId &&
          input.value.trim() === query &&
          dialog.open &&
          dialog.isConnected
        ) {
          renderResults(dialog, [], runtimeWindow);
        }
      }
    }, 120);
  });

  const binding = { invalidate };
  searchInputBindings.set(input, binding);
  input.dataset.bound = "true";
  return binding;
}

function invalidateSearchInput(
  dialog: HTMLDialogElement,
  runtimeWindow: RuntimeWindow
) {
  const input = getSearchInput(dialog, runtimeWindow);
  if (input) searchInputBindings.get(input)?.invalidate();
}

export function setupSearchDialog(
  documentRoot: Document = document,
  dependencies: SearchDialogDependencies = {}
) {
  const runtimeWindow =
    dependencies.window ?? documentRoot.defaultView ?? window;
  const loadPagefindBundle = dependencies.loadPagefind ?? loadPagefind;
  const state = getState(runtimeWindow);
  if (state.bound) return;
  state.bound = true;

  const getDialog = () => {
    const dialog = documentRoot.querySelector("#global-search-dialog");
    return dialog instanceof runtimeWindow.HTMLDialogElement ? dialog : null;
  };

  const deactivate = (
    dialog: HTMLDialogElement,
    shouldRestoreFocus: boolean
  ) => {
    if (state.activeDialog && state.activeDialog !== dialog) return;

    const restoreTarget = state.restoreFocus ?? null;
    state.activationId += 1;
    state.activeDialog = null;
    state.restoreFocus = null;
    invalidateSearchInput(dialog, runtimeWindow);
    documentRoot.documentElement.classList.remove("search-dialog-open");
    if (dialog.open) dialog.close();
    if (shouldRestoreFocus) restoreSearchDialogFocus(restoreTarget);
  };

  const close = (shouldRestoreFocus = true) => {
    const dialog = state.activeDialog ?? getDialog();
    if (dialog) {
      deactivate(dialog, shouldRestoreFocus);
      return;
    }

    state.activationId += 1;
    state.restoreFocus = null;
    documentRoot.documentElement.classList.remove("search-dialog-open");
  };

  const bindDialogLifecycle = (dialog: HTMLDialogElement) => {
    if (dialog.dataset.lifecycleBound === "true") return;
    dialog.dataset.lifecycleBound = "true";

    dialog.addEventListener("cancel", event => {
      if (state.activeDialog !== dialog) return;
      event.preventDefault();
      deactivate(dialog, true);
    });
    dialog.addEventListener("close", () => {
      if (state.activeDialog === dialog) deactivate(dialog, true);
    });
    dialog.addEventListener("click", event => {
      if (event.target === dialog && state.activeDialog === dialog) {
        deactivate(dialog, true);
      }
    });
  };

  const open = (trigger?: HTMLElement | null) => {
    const dialog = getDialog();
    if (!dialog || typeof dialog.showModal !== "function") return false;

    if (state.activeDialog === dialog && dialog.open) {
      focusSearchInput(dialog, runtimeWindow);
      return true;
    }
    if (state.activeDialog && state.activeDialog !== dialog) {
      deactivate(state.activeDialog, false);
    }

    const activeElement = documentRoot.activeElement;
    const restoreTarget = trigger?.isConnected
      ? trigger
      : activeElement instanceof runtimeWindow.HTMLElement
        ? activeElement
        : null;

    try {
      if (!dialog.open) dialog.showModal();
    } catch {
      return false;
    }

    const activationId = ++state.activationId;
    state.activeDialog = dialog;
    state.restoreFocus = restoreTarget;
    documentRoot.documentElement.classList.add("search-dialog-open");
    bindDialogLifecycle(dialog);
    bindSearchInput(dialog, runtimeWindow, loadPagefindBundle);
    focusSearchInput(dialog, runtimeWindow);

    void loadPagefindBundle(getPagefindBundlePath(dialog)).catch(() => {
      if (
        activationId !== state.activationId ||
        state.activeDialog !== dialog ||
        !dialog.open ||
        !dialog.isConnected
      ) {
        return;
      }

      const fallback = dialog.dataset.fallbackHref;
      deactivate(dialog, !fallback);
      if (fallback) runtimeWindow.location.assign(fallback);
    });
    return true;
  };

  const onKeydown = (event: KeyboardEvent) => {
    const isShortcut =
      !event.defaultPrevented &&
      !event.altKey &&
      (event.metaKey || event.ctrlKey) &&
      event.key.toLowerCase() === "k";
    if (!isShortcut) return;

    const activeElement = documentRoot.activeElement;
    const trigger =
      activeElement instanceof runtimeWindow.HTMLElement ? activeElement : null;
    if (open(trigger)) event.preventDefault();
  };

  const onDocumentClick = (event: MouseEvent) => {
    const target = event.target;
    if (!(target instanceof runtimeWindow.Element)) return;

    if (target.closest("[data-search-dialog-close]")) {
      event.preventDefault();
      close();
      return;
    }

    const trigger = target.closest(
      "[data-search-trigger], #header-search-trigger, #header-search-trigger-mobile"
    );
    if (!(trigger instanceof runtimeWindow.HTMLElement)) return;
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    if (open(trigger)) event.preventDefault();
  };

  const onPageExit = () => close(false);

  documentRoot.addEventListener("keydown", onKeydown);
  // Capture before Astro's ClientRouter handles the trigger's fallback link.
  documentRoot.addEventListener("click", onDocumentClick, { capture: true });
  documentRoot.addEventListener("astro:before-swap", onPageExit);
  runtimeWindow.addEventListener("pageswap", onPageExit);
  runtimeWindow.addEventListener("pagehide", onPageExit);
}
