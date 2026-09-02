import type { MediaCardData } from "@/types/media";

/** A diary image has already been resolved and optimized during collection parsing. */
export interface DiaryImage {
  alt: string;
  src: string;
  title: string;
  original: string;
  width: number;
  height: number;
}

/** The normalized content that can appear under one diary timestamp. */
export interface TimeBlock {
  time: string;
  text?: string;
  postText?: string;
  images?: DiaryImage[];
  htmlContent?: string;
  movieData?: MediaCardData;
  tvData?: MediaCardData;
  bookData?: MediaCardData;
  musicData?: MediaCardData;
  footnoteHtml?: string;
}

export interface ParsedEntry {
  date: string;
  timeBlocks: TimeBlock[];
}

export interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  hasMore: boolean;
  itemsPerPage: number;
}
