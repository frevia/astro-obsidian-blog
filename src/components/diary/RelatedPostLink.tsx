import React from "react";
import type { RelatedPostLink as RelatedPostLinkData } from "./types";

const RelatedPostLink: React.FC<RelatedPostLinkData> = ({ href, title }) => (
  <aside className="mb-1" aria-label="关联文章">
    <a
      href={href}
      className="group/related -ml-2 inline-flex max-w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm no-underline transition-colors duration-200 hover:bg-accent/6 focus-visible:bg-accent/6 focus-visible:ring-2 focus-visible:ring-accent/35 focus-visible:ring-offset-2 focus-visible:outline-none"
    >
      <span className="shrink-0 font-medium text-accent">关联文章</span>
      <span aria-hidden="true" className="text-border">
        /
      </span>
      <span className="min-w-0 truncate font-medium text-foreground/85 transition-colors group-hover/related:text-accent">
        {title}
      </span>
      <svg
        aria-hidden="true"
        viewBox="0 0 20 20"
        fill="none"
        className="h-4 w-4 shrink-0 text-accent transition-transform duration-200 group-hover/related:translate-x-0.5"
      >
        <path
          d="M4 10h11m-4-4 4 4-4 4"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </a>
  </aside>
);

export default RelatedPostLink;
