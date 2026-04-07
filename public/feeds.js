import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

function createFeedCardHTML(item, fallbackOgImageGlobal) {
  const defaultImageClass =
    "w-12 h-12 object-cover rounded-md shrink-0 transition-opacity duration-300";

  let imgSrc = item.avatar || "";
  if ((!imgSrc || imgSrc.trim() === "") && fallbackOgImageGlobal) {
    imgSrc = fallbackOgImageGlobal;
  }

  const onerrorHandler = fallbackOgImageGlobal
    ? `this.onerror=null; this.src='${fallbackOgImageGlobal}';`
    : "";

  const blogName =
    typeof item.blog_name === "string" ? item.blog_name.trim() : "";
  const latestPostTitle =
    typeof item.title === "string" ? item.title.trim() : "";
  const publishedDate =
    typeof item.published === "string" ? item.published.trim() : "";
  const postLink = item.link || "";

  return `
    <li class="p-4 rounded-lg border border-border/60 hover:shadow-sm transition-shadow">
      <div class="flex items-center gap-4">
        ${
          imgSrc
            ? `
            <img
              src="${imgSrc}"
              alt="${blogName}"
              class="${defaultImageClass}"
              loading="lazy"
              onerror="${onerrorHandler}"
            />
          `
            : `
            <div class="${defaultImageClass} bg-muted/30 flex items-center justify-center">
              <span class="text-sm text-muted-foreground">${blogName.charAt(0)}</span>
            </div>
          `
        }
        <div class="flex-1 min-w-0">
          <h3 class="font-medium text-foreground hover:text-accent transition-colors">
            <a href="${postLink}" target="_blank" rel="noopener noreferrer" class="hover:underline">${blogName}</a>
          </h3>
          ${
            latestPostTitle
              ? `
            <div class="flex items-center gap-2 flex-wrap">
              <a href="${postLink}" target="_blank" rel="noopener noreferrer" class="text-sm text-accent hover:underline flex-1">
                ${latestPostTitle}
              </a>
              ${publishedDate ? `<p class="text-xs text-muted-foreground whitespace-nowrap">${publishedDate}</p>` : ""}
            </div>
          `
              : ""
          }
        </div>
      </div>
    </li>
  `;
}

export async function initFeeds(
  fallbackOgImageGlobal,
  initialItemCount,
  itemsPerPage,
  dataSourceUrl
) {
  // 使用传入的数据源 URL，如果没有则使用默认本地数据
  const localDataSourceUrl = dataSourceUrl || "/data/feeds/feeds.json";
  const feedsListElement = document.getElementById("feeds-list");
  const loadMoreTrigger = document.getElementById("load-more-trigger");
  const loadingContainer = document.getElementById("feeds-loading");
  const errorContainer = document.getElementById("feeds-error");
  const noContentContainer = document.getElementById("feeds-no-content");

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
  let currentIndex = 0; // Start with 0 as initial items will also be loaded by loadMoreItems
  let observer;

  async function fetchFeeds() {
    try {
      // 从本地加载数据
      const response = await fetch(localDataSourceUrl);

      if (!response.ok) {
        throw new Error(`本地数据加载失败: ${response.status}`);
      }

      const data = await response.json();
      // 按日期倒序排序（最新的文章排在前面）
      allFeeds = (data.items || []).sort((a, b) => {
        // 处理空日期的情况
        if (!a.published || a.published === "未知") return 1;
        if (!b.published || b.published === "未知") return -1;

        // 解析日期字符串为日期对象
        const dateA = new Date(a.published);
        const dateB = new Date(b.published);

        // 处理无效日期的情况
        if (isNaN(dateA.getTime())) return 1;
        if (isNaN(dateB.getTime())) return -1;

        // 按日期倒序排序
        return dateB.getTime() - dateA.getTime();
      });
      loadingContainer.classList.add("hidden");

      if (allFeeds.length === 0) {
        noContentContainer.classList.remove("hidden");
        if (loadMoreTrigger) loadMoreTrigger.style.display = "none";
        return;
      }

      // Initial load of items
      loadMoreItems(initialItemCount);

      // Setup Intersection Observer if there are more items than initially shown
      if (loadMoreTrigger && allFeeds.length > initialItemCount) {
        loadMoreTrigger.style.display = "block"; // Show trigger if more items exist
        observer = new IntersectionObserver(
          entries => {
            if (entries[0].isIntersecting) {
              loadMoreItems(itemsPerPage);
            }
          },
          { threshold: 0.1 }
        );
        observer.observe(loadMoreTrigger);
      } else if (loadMoreTrigger) {
        loadMoreTrigger.style.display = "none";
      }
    } catch (e) {
      console.error("Failed to fetch feeds:", e);
      loadingContainer.classList.add("hidden");
      errorContainer.classList.remove("hidden");
      if (loadMoreTrigger) loadMoreTrigger.style.display = "none";
    }
  }

  function loadMoreItems(count) {
    if (!feedsListElement) {
      return;
    }
    const itemsToLoad = allFeeds.slice(currentIndex, currentIndex + count);

    if (itemsToLoad.length === 0) {
      if (loadMoreTrigger) loadMoreTrigger.style.display = "none";
      if (observer) {
        observer.disconnect();
      }
      // If it's the initial load and no items, noContentContainer would have been shown by fetchFeeds
      return;
    }

    let newItemsHTML = "";
    itemsToLoad.forEach(item => {
      newItemsHTML += createFeedCardHTML(item, fallbackOgImageGlobal);
    });
    feedsListElement.insertAdjacentHTML("beforeend", newItemsHTML);
    currentIndex += itemsToLoad.length;

    if (currentIndex >= allFeeds.length) {
      if (loadMoreTrigger) loadMoreTrigger.style.display = "none";
      if (observer) {
        observer.disconnect();
      }
    }
  }

  await fetchFeeds();
}
