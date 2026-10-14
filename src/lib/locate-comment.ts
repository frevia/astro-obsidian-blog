/** Twikoo renders asynchronously; bound automatic paging and cancel on navigation. */
export function locateComment(
  host: HTMLElement,
  id: string,
  report: (message: string) => void
) {
  let stopped = false;
  let pages = 0;
  let previousCount = -1;
  let clickedAt = 0;
  const started = Date.now();
  report("正在定位留言…");
  const timer = window.setInterval(() => {
    if (stopped) return;
    if (Date.now() - started > 20000) {
      report(
        "暂未找到这条留言，可展开更多评论后继续查看；留言也可能已被删除。"
      );
      clearInterval(timer);
      return;
    }
    const comments = [...host.querySelectorAll<HTMLElement>(".tk-comment")];
    const target = comments.find(comment => comment.id === id);
    if (target) {
      let expandedReply = false;
      let replies = target.parentElement?.closest(".tk-replies");
      while (replies) {
        if (!replies.classList.contains("tk-replies-expand")) {
          const expand = replies.parentElement?.querySelector<HTMLElement>(
            ":scope > .tk-expand-wrap > .tk-expand"
          );
          if (expand) {
            expand.click();
            expandedReply = true;
          }
        }
        replies = replies.parentElement?.closest(".tk-replies");
      }
      // Vue applies expansion on the next tick; scroll after layout has updated.
      if (expandedReply) return;
      target
        .querySelector<HTMLElement>(
          ":scope > .tk-main > .tk-content > .tk-expand-wrap > .tk-expand"
        )
        ?.click();
      host
        .querySelectorAll("[data-comment-target]")
        .forEach(el => el.removeAttribute("data-comment-target"));
      target.setAttribute("data-comment-target", "");
      target.tabIndex = -1;
      target.focus({ preventScroll: true });
      target.scrollIntoView({ block: "start", behavior: "instant" });
      report("");
      stopped = true;
      clearInterval(timer);
      return;
    }
    if (pages >= 10) {
      report(
        "暂未找到这条留言，可展开更多评论后继续查看；留言也可能已被删除。"
      );
      clearInterval(timer);
      return;
    }
    const more = host.querySelector<HTMLElement>(
      ".tk-comments-container > .tk-expand-wrap > .tk-expand"
    );
    // Wait for the previous page to appear before requesting another.
    if (
      more &&
      comments.length !== previousCount &&
      Date.now() - clickedAt > 500
    ) {
      previousCount = comments.length;
      clickedAt = Date.now();
      pages++;
      more.click();
    }
  }, 250);
  return () => {
    stopped = true;
    clearInterval(timer);
  };
}
