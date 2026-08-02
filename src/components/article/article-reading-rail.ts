type ReadingRailEntry = {
  heading: HTMLElement;
  link: HTMLAnchorElement;
  tocItem: HTMLElement;
};

function getHeadingId(link: HTMLAnchorElement) {
  const href = link.getAttribute("href");
  if (!href?.startsWith("#")) return null;

  let id = href.slice(1);
  try {
    id = decodeURIComponent(id);
  } catch {
    // Keep the literal id when the fragment is not URI encoded.
  }
  return id;
}

function isRenderable(element: HTMLElement) {
  return !element.hidden && element.getClientRects().length > 0;
}

export function initArticleReadingRail(doc: Document = document) {
  const desktopLinks = Array.from(
    doc.querySelectorAll<HTMLAnchorElement>("#sidebar [data-toc-link]")
  );
  const mobileLinks = Array.from(
    doc.querySelectorAll<HTMLAnchorElement>("#mobile-sidebar [data-toc-link]")
  );
  const links = [...desktopLinks, ...mobileLinks];
  const entries: ReadingRailEntry[] = links.flatMap(link => {
    const id = getHeadingId(link);
    if (!id) return [];

    const heading = doc.getElementById(id);
    const tocItem = link.closest<HTMLElement>("[data-toc-item]");
    return heading instanceof HTMLElement && tocItem
      ? [{ heading, link, tocItem }]
      : [];
  });
  if (!entries.length) return () => {};

  const headings = Array.from(
    new Map(entries.map(entry => [entry.heading.id, entry.heading])).values()
  );
  const progressLabels = Array.from(
    doc.querySelectorAll<HTMLElement>("[data-toc-progress]")
  );
  const progressBars = Array.from(
    doc.querySelectorAll<HTMLElement>("[data-toc-progress-bar]")
  );
  const currentLabels = Array.from(
    doc.querySelectorAll<HTMLElement>("[data-toc-current]")
  );
  const mobileSidebar = doc.getElementById("mobile-sidebar");
  const view = doc.defaultView;
  let previousActiveHeading: HTMLElement | undefined;
  let activeHeadingState: HTMLElement | undefined;

  const scrollActiveEntryIntoView = (
    activeHeading: HTMLElement,
    force = false
  ) => {
    if (!force && previousActiveHeading === activeHeading) return;

    let didScroll = false;
    entries
      .filter(
        entry => entry.heading === activeHeading && isRenderable(entry.tocItem)
      )
      .forEach(entry => {
        entry.link.scrollIntoView({
          block: "nearest",
          inline: "nearest",
        });
        didScroll = true;
      });

    if (didScroll) previousActiveHeading = activeHeading;
  };

  const updateActiveLink = () => {
    const header = doc.getElementById("site-header");
    const offset =
      (header instanceof HTMLElement ? header.offsetHeight : 0) + 8;
    let activeHeading = headings[0];

    for (const heading of headings) {
      if (heading.getBoundingClientRect().top > offset) break;
      activeHeading = heading;
    }

    activeHeadingState = activeHeading;
    const activeEntry = entries.find(entry => entry.heading === activeHeading);
    const activeTopLevel = activeEntry?.tocItem.dataset.tocTopLevel ?? "";
    const activeBranch = activeEntry?.tocItem.dataset.tocBranch ?? "";

    entries.forEach(entry => {
      const depth = Number(entry.tocItem.dataset.tocDepth ?? "2");
      const topLevel = entry.tocItem.dataset.tocTopLevel ?? "";
      const branch = entry.tocItem.dataset.tocBranch ?? "";
      const visible =
        depth <= 2 ||
        (depth === 3 && topLevel === activeTopLevel) ||
        (depth >= 4 && topLevel === activeTopLevel && branch === activeBranch);

      entry.tocItem.hidden = !visible;
    });

    const activeIndex = Math.max(0, headings.indexOf(activeHeading));
    progressLabels.forEach(label => {
      label.textContent = `${activeIndex + 1} / ${headings.length}`;
    });
    progressBars.forEach(bar => {
      bar.style.setProperty(
        "--toc-progress",
        `${((activeIndex + 1) / headings.length) * 100}%`
      );
    });
    currentLabels.forEach(label => {
      label.textContent = activeHeading.textContent?.trim() || "开始阅读";
    });

    links.forEach(link => {
      const isActive = entries.some(
        entry => entry.link === link && entry.heading === activeHeading
      );
      link.classList.toggle("is-active-link", isActive);
      if (isActive) {
        link.setAttribute("aria-current", "location");
      } else {
        link.removeAttribute("aria-current");
      }
    });

    scrollActiveEntryIntoView(activeHeading);
  };

  const onMobileToggle = () => {
    if (
      !(mobileSidebar instanceof HTMLDetailsElement) ||
      !mobileSidebar.open ||
      !activeHeadingState
    ) {
      return;
    }

    updateActiveLink();
    scrollActiveEntryIntoView(activeHeadingState, true);
  };

  doc.addEventListener("scroll", updateActiveLink, { passive: true });
  view?.addEventListener("resize", updateActiveLink, { passive: true });
  mobileSidebar?.addEventListener("toggle", onMobileToggle);
  updateActiveLink();

  return () => {
    doc.removeEventListener("scroll", updateActiveLink);
    view?.removeEventListener("resize", updateActiveLink);
    mobileSidebar?.removeEventListener("toggle", onMobileToggle);
  };
}
