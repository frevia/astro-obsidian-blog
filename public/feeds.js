import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

const escapeHtml = value =>
  String(value ?? "").replace(
    /[&<>'"]/g,
    character =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
        '"': "&quot;",
      })[character]
  );

const safeUrl = (value, fallback = "") => {
  const rawValue = typeof value === "string" ? value.trim() : "";
  if (!rawValue) return fallback;

  try {
    const url = new URL(rawValue, window.location.origin);
    if (url.protocol === "http:" || url.protocol === "https:") {
      return url.href;
    }
  } catch {
    // Ignore malformed feed URLs and use the fallback.
  }

  return fallback;
};

const getHostLabel = value => {
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
};

const formatPublishedDate = (value, siteTimezone) => {
  if (!value || value === "未知") return "未知日期";

  const parsed = dayjs(value);
  if (!parsed.isValid()) return value;

  return siteTimezone
    ? parsed.tz(siteTimezone).format("YYYY.MM.DD")
    : parsed.format("YYYY.MM.DD");
};

function createFeedCardHTML(item, fallbackOgImageGlobal, siteTimezone) {
  const blogName =
    typeof item.blog_name === "string" ? item.blog_name.trim() : "未命名站点";
  const latestPostTitle =
    typeof item.title === "string" ? item.title.trim() : "";
  const publishedDate =
    typeof item.published === "string" ? item.published.trim() : "";
  const postLink = safeUrl(item.link, "#");
  const avatarUrl = safeUrl(item.avatar, safeUrl(fallbackOgImageGlobal));
  const sourceLabel = getHostLabel(postLink);
  const accessibleLabel = latestPostTitle
    ? `${blogName}：${latestPostTitle}`
    : `${blogName}：打开站点`;

  return `
    <li class="feeds-card" data-feed-item data-feed-source="${escapeHtml(blogName)}">
      <a
        class="feeds-card-link"
        href="${escapeHtml(postLink)}"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="${escapeHtml(accessibleLabel)}"
      >
        <span class="feeds-card-avatar" aria-hidden="true">
          ${
            avatarUrl
              ? `<img src="${escapeHtml(avatarUrl)}" alt="" loading="lazy" />`
              : escapeHtml(blogName.charAt(0))
          }
        </span>
        <span class="feeds-card-main">
          <span class="feeds-card-meta">
            <span class="feeds-card-source">${escapeHtml(blogName)}</span>
            <time class="feeds-card-date" datetime="${escapeHtml(publishedDate)}">
              ${escapeHtml(formatPublishedDate(publishedDate, siteTimezone))}
            </time>
          </span>
          <span class="feeds-card-title">
            ${escapeHtml(latestPostTitle || "打开站点阅读最新内容")}
          </span>
        </span>
        <span class="feeds-card-arrow" aria-hidden="true">↗</span>
      </a>
      ${
        sourceLabel
          ? `<p class="feeds-card-note">${escapeHtml(sourceLabel)}</p>`
          : ""
      }
    </li>
  `;
}

export async function initFeeds(
  fallbackOgImageGlobal,
  initialItemCount,
  itemsPerPage,
  dataSourceUrl,
  siteTimezone
) {
  const localDataSourceUrl = dataSourceUrl || "/data/feeds/feeds.json";
  const feedsListElement = document.getElementById("feeds-list");
  const loadMoreTrigger = document.getElementById("load-more-trigger");
  const loadingContainer = document.getElementById("feeds-loading");
  const errorContainer = document.getElementById("feeds-error");
  const noContentContainer = document.getElementById("feeds-no-content");
  const countElement = document.getElementById("feeds-count");
  const updatedElement = document.getElementById("feeds-updated");

  if (
    !feedsListElement ||
    !loadingContainer ||
    !errorContainer ||
    !noContentContainer
  ) {
    console.error("Required DOM elements for feeds are missing.");
    return;
  }

  let allFeeds = [];
  let currentIndex = 0;
  let observer;

  const updateFeedSummary = data => {
    if (countElement) countElement.textContent = `${allFeeds.length} 条订阅`;
    if (updatedElement) {
      updatedElement.textContent = data.updated
        ? `更新于 ${data.updated}`
        : "RSS network";
    }
  };

  const loadMoreItems = count => {
    const itemsToLoad = allFeeds.slice(currentIndex, currentIndex + count);
    if (itemsToLoad.length === 0) {
      if (loadMoreTrigger) loadMoreTrigger.style.display = "none";
      observer?.disconnect();
      return;
    }

    const newItemsHTML = itemsToLoad
      .map(item =>
        createFeedCardHTML(item, fallbackOgImageGlobal, siteTimezone)
      )
      .join("");
    feedsListElement.insertAdjacentHTML("beforeend", newItemsHTML);
    currentIndex += itemsToLoad.length;

    if (currentIndex >= allFeeds.length) {
      if (loadMoreTrigger) loadMoreTrigger.style.display = "none";
      observer?.disconnect();
      document
        .getElementById("all-loaded-indicator")
        ?.classList.remove("hidden");
    }
  };

  try {
    const response = await fetch(localDataSourceUrl);
    if (!response.ok) {
      throw new Error(`本地数据加载失败: ${response.status}`);
    }

    const data = await response.json();
    allFeeds = (data.items || []).sort((a, b) => {
      if (!a.published || a.published === "未知") return 1;
      if (!b.published || b.published === "未知") return -1;

      const dateA = new Date(a.published);
      const dateB = new Date(b.published);
      if (Number.isNaN(dateA.getTime())) return 1;
      if (Number.isNaN(dateB.getTime())) return -1;
      return dateB.getTime() - dateA.getTime();
    });

    loadingContainer.classList.add("hidden");
    updateFeedSummary(data);

    if (allFeeds.length === 0) {
      if (countElement) countElement.textContent = "0 条订阅";
      noContentContainer.classList.remove("hidden");
      if (loadMoreTrigger) loadMoreTrigger.style.display = "none";
      return;
    }

    loadMoreItems(initialItemCount);

    if (loadMoreTrigger && allFeeds.length > initialItemCount) {
      loadMoreTrigger.style.display = "block";
      observer = new IntersectionObserver(
        entries => {
          if (entries[0]?.isIntersecting) loadMoreItems(itemsPerPage);
        },
        { threshold: 0.1 }
      );
      observer.observe(loadMoreTrigger);
    }
  } catch (error) {
    console.error("Failed to fetch feeds:", error);
    loadingContainer.classList.add("hidden");
    errorContainer.classList.remove("hidden");
    if (countElement) countElement.textContent = "同步失败";
    if (updatedElement) updatedElement.textContent = "请稍后再试";
    if (loadMoreTrigger) loadMoreTrigger.style.display = "none";
  }
}
