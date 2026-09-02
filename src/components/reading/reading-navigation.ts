type ReadingNavigationEntry = {
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

export interface ReadingNavigationOptions {
  scrollActiveIntoView?: boolean;
}

/**
 * Enhance the server-rendered reading navigation with active heading feedback.
 * The returned callback removes every listener installed by this invocation.
 */
export function initReadingNavigation(
  doc: Document = document,
  options: ReadingNavigationOptions = {}
) {
  const root = doc.querySelector<HTMLElement>("[data-reading-navigation]");
  if (!root) return () => {};

  const mobileSidebar = root.querySelector("[data-reading-navigation-mobile]");
  const articleHero = doc.querySelector<HTMLElement>("[data-article-hero]");
  const mobileActiveClass = "is-mobile-reading-active";
  const view = doc.defaultView;

  const updateMobileVisibility = () => {
    const header = doc.getElementById("site-header");
    const headerBottom =
      header instanceof HTMLElement
        ? header.getBoundingClientRect().bottom || header.offsetHeight
        : 0;
    const heroBottom = articleHero?.getBoundingClientRect().bottom;
    const isPastHero = !articleHero || (heroBottom ?? 0) <= headerBottom;

    root.classList.toggle(mobileActiveClass, isPastHero);
    if (
      !isPastHero &&
      mobileSidebar instanceof HTMLDetailsElement &&
      mobileSidebar.open
    ) {
      mobileSidebar.open = false;
    }
  };

  const desktopLinks = Array.from(
    root.querySelectorAll<HTMLAnchorElement>(
      "[data-reading-navigation-desktop] [data-toc-link]"
    )
  );
  const mobileLinks = Array.from(
    root.querySelectorAll<HTMLAnchorElement>(
      "[data-reading-navigation-mobile] [data-toc-link]"
    )
  );
  const links = [...desktopLinks, ...mobileLinks];
  const entries: ReadingNavigationEntry[] = links.flatMap(link => {
    const id = getHeadingId(link);
    if (!id) return [];

    const heading = doc.getElementById(id);
    const tocItem = link.closest<HTMLElement>("[data-toc-item]");
    return heading instanceof HTMLElement && tocItem
      ? [{ heading, link, tocItem }]
      : [];
  });

  // A relations-only navigation has no active heading state, but still needs
  // the single hero reveal lifecycle when it appears on an article page.
  if (!entries.length) {
    updateMobileVisibility();

    if (!articleHero) {
      return () => {
        root.classList.remove(mobileActiveClass);
        if (mobileSidebar instanceof HTMLDetailsElement) {
          mobileSidebar.open = false;
        }
      };
    }

    doc.addEventListener("scroll", updateMobileVisibility, { passive: true });
    view?.addEventListener("resize", updateMobileVisibility, {
      passive: true,
    });

    return () => {
      doc.removeEventListener("scroll", updateMobileVisibility);
      view?.removeEventListener("resize", updateMobileVisibility);
      root.classList.remove(mobileActiveClass);
      if (mobileSidebar instanceof HTMLDetailsElement) {
        mobileSidebar.open = false;
      }
    };
  }

  const headings = Array.from(
    new Map(entries.map(entry => [entry.heading.id, entry.heading])).values()
  );
  const progressLabels = Array.from(
    root.querySelectorAll<HTMLElement>("[data-toc-progress]")
  );
  const progressBars = Array.from(
    root.querySelectorAll<HTMLElement>("[data-toc-progress-bar]")
  );
  const shouldScrollActiveIntoView =
    options.scrollActiveIntoView ??
    root.dataset.scrollActiveIntoView !== "false";
  let previousActiveHeading: HTMLElement | undefined;
  let activeHeadingState: HTMLElement | undefined;

  const scrollActiveEntryIntoView = (
    activeHeading: HTMLElement,
    force = false
  ) => {
    if (!shouldScrollActiveIntoView) return;
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
    updateMobileVisibility();
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
    updateMobileVisibility();
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
    root.classList.remove(mobileActiveClass);
    if (mobileSidebar instanceof HTMLDetailsElement) {
      mobileSidebar.open = false;
    }
  };
}
