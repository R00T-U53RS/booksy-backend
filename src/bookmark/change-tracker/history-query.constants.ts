export const MAX_HISTORY_LIST_LIMIT = 100;
export const MIN_HISTORY_LIST_LIMIT = 1;

export const MAX_BATCH_PAGE_SIZE = 100;
export const MIN_BATCH_PAGE_SIZE = 1;

export function clampHistoryListLimit(limit: number): number {
  return Math.min(
    MAX_HISTORY_LIST_LIMIT,
    Math.max(MIN_HISTORY_LIST_LIMIT, limit),
  );
}
