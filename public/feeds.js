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

const getSiteRoot = value => {
  try {
    const url = new URL(value);
    return `${url.origin}/`;
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

export const formatCardPublishedDate = (
  value,
  siteTimezone,
  now = new Date()
) => {
  if (!value || value === "未知") return "未知日期";

  const parsed = dayjs(value);
  if (!parsed.isValid()) return value;

  const published = siteTimezone ? parsed.tz(siteTimezone) : parsed;
  const current = siteTimezone ? dayjs(now).tz(siteTimezone) : dayjs(now);
  return published.year() === current.year()
    ? published.format("MM.DD")
    : published.format("YYYY.MM.DD");
};

export const formatFeedUpdatedStatus = (value, now = new Date()) => {
  const exact = typeof value === "string" ? value.trim() : "";
  const match = exact.match(
    /^(\d{4})年(\d{1,2})月(\d{1,2})日(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/
  );

  if (!match) return { label: "等待同步", exact, stale: false };

  const [, year, month, day, hour = "0", minute = "0", second = "0"] = match;
  const updatedAt = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second)
  );
  const elapsedDays = Math.max(
    0,
    Math.floor((now.getTime() - updatedAt.getTime()) / 86_400_000)
  );

  if (elapsedDays === 0) return { label: "今日同步", exact, stale: false };
  if (elapsedDays === 1) return { label: "昨日同步", exact, stale: false };
  if (elapsedDays < 30) {
    return {
      label: `${elapsedDays} 天前同步`,
      exact,
      stale: elapsedDays > 14,
    };
  }
  if (elapsedDays < 365) {
    return {
      label: `${Math.floor(elapsedDays / 30)} 个月前同步`,
      exact,
      stale: true,
    };
  }

  return {
    label: `${Math.floor(elapsedDays / 365)} 年前同步`,
    exact,
    stale: true,
  };
};

function createFeedCardHTML(item, fallbackOgImageGlobal, siteTimezone) {
  const blogName =
    typeof item.blog_name === "string" ? item.blog_name.trim() : "未命名站点";
  const latestPostTitle =
    typeof item.title === "string" ? item.title.trim() : "";
  const publishedDate =
    typeof item.published === "string" ? item.published.trim() : "";
  const postLink = safeUrl(item.link, "#");
  const siteLink = safeUrl(item.site_link, getSiteRoot(postLink));
  const avatarUrl = safeUrl(item.avatar, safeUrl(fallbackOgImageGlobal));
  const sourceLabel = getHostLabel(postLink);
  const accessibleLabel = latestPostTitle
    ? `${blogName}：${latestPostTitle}`
    : `${blogName}：打开站点`;

  return `
    <li class="feeds-card" data-feed-item data-feed-source="${escapeHtml(blogName)}">
      <div class="feeds-card-body">
        <a
          class="feeds-card-site-link feeds-card-avatar-link"
          href="${escapeHtml(siteLink)}"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="${escapeHtml(`访问 ${blogName} 官网`)}"
        >
          <span class="feeds-card-avatar" aria-hidden="true">
            ${
              avatarUrl
                ? `<img src="${escapeHtml(avatarUrl)}" alt="" loading="lazy" />`
                : escapeHtml(blogName.charAt(0))
            }
          </span>
        </a>
        <span class="feeds-card-main">
          <span class="feeds-card-meta">
            <a
              class="feeds-card-site-link feeds-card-source"
              href="${escapeHtml(siteLink)}"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="${escapeHtml(`访问 ${blogName} 官网`)}"
            >${escapeHtml(blogName)}</a>
            <time
              class="feeds-card-date"
              datetime="${escapeHtml(publishedDate)}"
              title="${escapeHtml(`发布于 ${formatPublishedDate(publishedDate, siteTimezone)}`)}"
            >
              ${escapeHtml(formatCardPublishedDate(publishedDate, siteTimezone))}
            </time>
          </span>
          <span class="feeds-card-article-row">
            <span class="feeds-card-latest-label">最新</span>
            <a
              class="feeds-card-article-link feeds-card-title"
              href="${escapeHtml(postLink)}"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="${escapeHtml(accessibleLabel)}"
            >
              ${escapeHtml(latestPostTitle || "暂未获取到最新文章")}
            </a>
            <a
              class="feeds-card-article-link feeds-card-arrow"
              href="${escapeHtml(postLink)}"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="${escapeHtml(`阅读：${latestPostTitle || blogName}`)}"
            >↗</a>
          </span>
          <span class="feeds-card-foot">
            ${
              sourceLabel
                ? `<a class="feeds-card-site-link feeds-card-domain" href="${escapeHtml(siteLink)}" target="_blank" rel="noopener noreferrer">${escapeHtml(sourceLabel)}</a>`
                : ""
            }
          </span>
        </span>
      </div>
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
  const latestElement = document.getElementById("feeds-latest");
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
    if (countElement) countElement.textContent = `${allFeeds.length} 位邻居`;
    if (latestElement) {
      latestElement.textContent = allFeeds[0]?.published
        ? formatPublishedDate(allFeeds[0].published, siteTimezone)
        : "暂无来信";
    }
    if (updatedElement) {
      const status = formatFeedUpdatedStatus(data.updated);
      updatedElement.textContent = status.stale
        ? `同步较早 · ${status.label.replace(/同步$/, "")}`
        : status.label;
      updatedElement.title = status.exact ? `上次同步：${status.exact}` : "";
      updatedElement.classList.toggle("is-stale", status.stale);
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
      if (countElement) countElement.textContent = "0 位邻居";
      if (latestElement) latestElement.textContent = "暂无来信";
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
