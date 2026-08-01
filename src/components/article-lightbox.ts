export type ArticleLightboxLabels = {
  open: string;
};

type ArticleLightboxElements = {
  root: HTMLElement;
  article: HTMLElement;
  image: HTMLImageElement;
  caption: HTMLElement;
  closeButton: HTMLButtonElement;
  prevButton: HTMLButtonElement;
  nextButton: HTMLButtonElement;
  zoomInButton: HTMLButtonElement;
  zoomOutButton: HTMLButtonElement;
};

type TriggerState = {
  image: HTMLImageElement;
  role: string | null;
  tabIndex: string | null;
  hasPopup: string | null;
  label: string | null;
  hadZoomCursor: boolean;
};

const FOCUSABLE_SELECTOR = [
  'a[href]:not([tabindex="-1"])',
  'button:not([disabled]):not([hidden]):not([tabindex="-1"])',
  'input:not([disabled]):not([type="hidden"]):not([tabindex="-1"])',
  'select:not([disabled]):not([tabindex="-1"])',
  'textarea:not([disabled]):not([tabindex="-1"])',
  '[tabindex]:not([tabindex="-1"]):not([hidden])',
].join(",");

export function isEligibleArticleImage(image: HTMLImageElement) {
  return !image.closest("a") && Boolean(image.currentSrc || image.src);
}

export function getNextLightboxIndex(
  currentIndex: number,
  offset: number,
  imageCount: number
) {
  if (imageCount <= 0) return 0;
  return (currentIndex + offset + imageCount) % imageCount;
}

export function clampLightboxScale(scale: number) {
  return Math.min(3, Math.max(1, scale));
}

export function formatLightboxTriggerLabel(openLabel: string, alt: string) {
  const trimmedAlt = alt.trim();
  return trimmedAlt ? `${openLabel}: ${trimmedAlt}` : openLabel;
}

export function lockBodyScroll(body: HTMLElement) {
  const previousOverflow = body.style.overflow;
  body.style.overflow = "hidden";

  return () => {
    body.style.overflow = previousOverflow;
  };
}

export function restoreLightboxFocus(element: HTMLElement | null) {
  if (!element?.isConnected) return false;
  element.focus();
  return true;
}

export function trapLightboxFocus(
  root: HTMLElement,
  event: KeyboardEvent,
  activeElement: Element | null = document.activeElement
) {
  if (event.key !== "Tab") return false;

  const focusableElements = Array.from(
    root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
  );
  if (focusableElements.length === 0) {
    event.preventDefault();
    root.focus();
    return true;
  }

  const first = focusableElements[0];
  const last = focusableElements.at(-1)!;
  const focusIsOutside = !activeElement || !root.contains(activeElement);

  if (event.shiftKey && (focusIsOutside || activeElement === first)) {
    event.preventDefault();
    last.focus();
    return true;
  }

  if (!event.shiftKey && (focusIsOutside || activeElement === last)) {
    event.preventDefault();
    first.focus();
    return true;
  }

  return false;
}

function getLightboxElements(doc: Document): ArticleLightboxElements | null {
  const root = doc.getElementById("article-lightbox");
  const article = doc.getElementById("article");
  if (!(root instanceof HTMLElement) || !(article instanceof HTMLElement)) {
    return null;
  }

  const image = root.querySelector<HTMLImageElement>("[data-lightbox-image]");
  const caption = root.querySelector<HTMLElement>("[data-lightbox-caption]");
  const closeButton = root.querySelector<HTMLButtonElement>(
    "[data-lightbox-close]"
  );
  const prevButton = root.querySelector<HTMLButtonElement>(
    "[data-lightbox-prev]"
  );
  const nextButton = root.querySelector<HTMLButtonElement>(
    "[data-lightbox-next]"
  );
  const zoomInButton = root.querySelector<HTMLButtonElement>(
    "[data-lightbox-zoom-in]"
  );
  const zoomOutButton = root.querySelector<HTMLButtonElement>(
    "[data-lightbox-zoom-out]"
  );

  if (
    !image ||
    !caption ||
    !closeButton ||
    !prevButton ||
    !nextButton ||
    !zoomInButton ||
    !zoomOutButton
  ) {
    return null;
  }

  return {
    root,
    article,
    image,
    caption,
    closeButton,
    prevButton,
    nextButton,
    zoomInButton,
    zoomOutButton,
  };
}

function restoreAttribute(
  element: HTMLElement,
  name: string,
  previousValue: string | null
) {
  if (previousValue === null) {
    element.removeAttribute(name);
  } else {
    element.setAttribute(name, previousValue);
  }
}

export function initArticleLightbox(
  labels: ArticleLightboxLabels,
  doc: Document = document
) {
  const elements = getLightboxElements(doc);
  if (!elements) return () => {};

  const {
    root,
    article,
    image,
    caption,
    closeButton,
    prevButton,
    nextButton,
    zoomInButton,
    zoomOutButton,
  } = elements;
  const eligibleImages = Array.from(article.querySelectorAll("img")).filter(
    isEligibleArticleImage
  );
  if (eligibleImages.length === 0) return () => {};

  const triggerStates: TriggerState[] = eligibleImages.map(trigger => ({
    image: trigger,
    role: trigger.getAttribute("role"),
    tabIndex: trigger.getAttribute("tabindex"),
    hasPopup: trigger.getAttribute("aria-haspopup"),
    label: trigger.getAttribute("aria-label"),
    hadZoomCursor: trigger.classList.contains("cursor-zoom-in"),
  }));

  for (const trigger of eligibleImages) {
    trigger.classList.add("cursor-zoom-in");
    trigger.setAttribute("role", "button");
    trigger.setAttribute("tabindex", "0");
    trigger.setAttribute("aria-haspopup", "dialog");
    trigger.setAttribute(
      "aria-label",
      formatLightboxTriggerLabel(
        labels.open,
        trigger.alt || trigger.title || ""
      )
    );
  }

  let activeIndex = 0;
  let scale = 1;
  let lastFocusedElement: HTMLElement | null = null;
  let unlockBodyScroll: (() => void) | null = null;
  let cleanedUp = false;

  const updateControls = () => {
    const hasMultipleImages = eligibleImages.length > 1;
    prevButton.hidden = !hasMultipleImages;
    nextButton.hidden = !hasMultipleImages;
    prevButton.classList.toggle("hidden", !hasMultipleImages);
    nextButton.classList.toggle("hidden", !hasMultipleImages);
  };

  const renderImage = () => {
    const trigger = eligibleImages[activeIndex];
    if (!trigger) return;

    image.src = trigger.currentSrc || trigger.src;
    image.alt = "";
    image.style.transform = `scale(${scale})`;
    caption.textContent = trigger.alt || trigger.title || "";
    updateControls();
  };

  const open = (index: number) => {
    activeIndex = index;
    scale = 1;
    lastFocusedElement =
      doc.activeElement instanceof HTMLElement ? doc.activeElement : null;
    unlockBodyScroll ??= lockBodyScroll(doc.body);
    renderImage();
    root.hidden = false;
    root.classList.remove("hidden");
    root.classList.add("flex");
    root.setAttribute("aria-hidden", "false");
    closeButton.focus();
  };

  const close = () => {
    if (root.hidden) return;

    root.hidden = true;
    root.classList.add("hidden");
    root.classList.remove("flex");
    root.setAttribute("aria-hidden", "true");
    unlockBodyScroll?.();
    unlockBodyScroll = null;
    restoreLightboxFocus(lastFocusedElement);
    lastFocusedElement = null;
  };

  const move = (offset: number) => {
    activeIndex = getNextLightboxIndex(
      activeIndex,
      offset,
      eligibleImages.length
    );
    scale = 1;
    renderImage();
  };

  const zoom = (offset: number) => {
    scale = clampLightboxScale(scale + offset);
    image.style.transform = `scale(${scale})`;
  };

  const findTrigger = (target: EventTarget | null) => {
    if (!(target instanceof Element)) return null;
    const trigger = target.closest("img");
    if (!(trigger instanceof HTMLImageElement)) return null;
    return eligibleImages.includes(trigger) ? trigger : null;
  };

  const activateTrigger = (trigger: HTMLImageElement) => {
    const index = eligibleImages.indexOf(trigger);
    if (index >= 0) open(index);
  };

  const onArticleClick = (event: MouseEvent) => {
    const trigger = findTrigger(event.target);
    if (!trigger) return;
    event.preventDefault();
    activateTrigger(trigger);
  };

  const onArticleKeydown = (event: KeyboardEvent) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const trigger = findTrigger(event.target);
    if (!trigger) return;
    event.preventDefault();
    activateTrigger(trigger);
  };

  const onDocumentKeydown = (event: KeyboardEvent) => {
    if (root.hidden) return;

    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }
    if (event.key === "Tab") {
      trapLightboxFocus(root, event, doc.activeElement);
      return;
    }
    if (event.key === "ArrowLeft") move(-1);
    if (event.key === "ArrowRight") move(1);
    if (event.key === "+" || event.key === "=") zoom(0.25);
    if (event.key === "-") zoom(-0.25);
  };

  const onRootClick = (event: MouseEvent) => {
    if (event.target === root) close();
  };
  const onPrevClick = () => move(-1);
  const onNextClick = () => move(1);
  const onZoomInClick = () => zoom(0.25);
  const onZoomOutClick = () => zoom(-0.25);

  article.addEventListener("click", onArticleClick);
  article.addEventListener("keydown", onArticleKeydown);
  doc.addEventListener("keydown", onDocumentKeydown);
  root.addEventListener("click", onRootClick);
  closeButton.addEventListener("click", close);
  prevButton.addEventListener("click", onPrevClick);
  nextButton.addEventListener("click", onNextClick);
  zoomInButton.addEventListener("click", onZoomInClick);
  zoomOutButton.addEventListener("click", onZoomOutClick);

  return () => {
    if (cleanedUp) return;
    cleanedUp = true;
    close();
    article.removeEventListener("click", onArticleClick);
    article.removeEventListener("keydown", onArticleKeydown);
    doc.removeEventListener("keydown", onDocumentKeydown);
    root.removeEventListener("click", onRootClick);
    closeButton.removeEventListener("click", close);
    prevButton.removeEventListener("click", onPrevClick);
    nextButton.removeEventListener("click", onNextClick);
    zoomInButton.removeEventListener("click", onZoomInClick);
    zoomOutButton.removeEventListener("click", onZoomOutClick);
    unlockBodyScroll?.();
    unlockBodyScroll = null;

    for (const state of triggerStates) {
      restoreAttribute(state.image, "role", state.role);
      restoreAttribute(state.image, "tabindex", state.tabIndex);
      restoreAttribute(state.image, "aria-haspopup", state.hasPopup);
      restoreAttribute(state.image, "aria-label", state.label);
      if (!state.hadZoomCursor) {
        state.image.classList.remove("cursor-zoom-in");
      }
    }
  };
}
