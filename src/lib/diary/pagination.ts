export interface PaginationState {
  currentPage: number;
  totalPages: number;
  hasMore: boolean;
  itemsPerPage: number;
}

export function calcPagination(
  totalItems: number,
  itemsPerPage: number
): PaginationState {
  const safeItemsPerPage = Math.max(1, itemsPerPage);
  const totalPages = Math.max(1, Math.ceil(totalItems / safeItemsPerPage));

  return {
    currentPage: 1,
    totalPages,
    hasMore: totalPages > 1,
    itemsPerPage: safeItemsPerPage,
  };
}

export function nextPageState(
  state: PaginationState,
  nextPage: number
): PaginationState {
  return {
    ...state,
    currentPage: nextPage,
    hasMore: nextPage < state.totalPages,
  };
}
