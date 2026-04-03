import type { BookmarkChangeLog } from './bookmark-change-log.entity';
import { ChangeSource, ChangeType } from './enums';

export interface BatchCounts {
  created: number;
  updated: number;
  moved: number;
  deleted: number;
}

export interface HistoryBatchAggregate {
  syncBatchId: string;
  createdAt: Date;
  counts: BatchCounts;
  totalChanges: number;
  source: ChangeSource;
  entries: BookmarkChangeLog[];
}

const CHANGE_SOURCE_TIE_ORDER: ChangeSource[] = [
  ChangeSource.SYNC,
  ChangeSource.MANUAL_UPDATE,
  ChangeSource.API,
];

export function resolveBatchSource(sources: ChangeSource[]): ChangeSource {
  if (sources.length === 0) {
    return ChangeSource.MANUAL_UPDATE;
  }
  const freq = new Map<ChangeSource, number>();
  for (const s of sources) {
    freq.set(s, (freq.get(s) ?? 0) + 1);
  }
  const entries = Array.from(freq.entries());
  let bestCount = -1;
  const tied: ChangeSource[] = [];
  for (const [s, c] of entries) {
    if (c > bestCount) {
      bestCount = c;
      tied.length = 0;
      tied.push(s);
    } else if (c === bestCount) {
      tied.push(s);
    }
  }
  if (tied.length === 1) {
    const first = tied[0];
    return first ?? ChangeSource.MANUAL_UPDATE;
  }
  tied.sort(
    (a, b) =>
      CHANGE_SOURCE_TIE_ORDER.indexOf(a) - CHANGE_SOURCE_TIE_ORDER.indexOf(b),
  );
  const winner = tied[0];
  return winner ?? ChangeSource.MANUAL_UPDATE;
}

function emptyBatchCounts(): BatchCounts {
  return {
    created: 0,
    updated: 0,
    moved: 0,
    deleted: 0,
  };
}

function incrementBatchCount(
  counts: BatchCounts,
  changeType: ChangeType,
): void {
  if (changeType === ChangeType.CREATED) {
    counts.created++;
  } else if (changeType === ChangeType.UPDATED) {
    counts.updated++;
  } else if (changeType === ChangeType.MOVED) {
    counts.moved++;
  } else if (changeType === ChangeType.DELETED) {
    counts.deleted++;
  }
}

export function buildBatchAggregates(
  syncBatchIds: string[],
  rows: BookmarkChangeLog[],
): HistoryBatchAggregate[] {
  const byId = new Map<string, BookmarkChangeLog[]>();
  for (const id of syncBatchIds) {
    byId.set(id, []);
  }
  for (const row of rows) {
    const bid = row.syncBatchId;
    if (bid && byId.has(bid)) {
      const list = byId.get(bid);
      if (list) {
        list.push(row);
      }
    }
  }

  return syncBatchIds.map(syncBatchId => {
    const batchEntries = byId.get(syncBatchId) ?? [];
    const counts = emptyBatchCounts();
    let maxTime = 0;
    for (const e of batchEntries) {
      incrementBatchCount(counts, e.changeType);
      const t = e.createdAt.getTime();
      if (t > maxTime) {
        maxTime = t;
      }
    }
    const source = resolveBatchSource(batchEntries.map(e => e.source));
    return {
      syncBatchId,
      createdAt: new Date(maxTime),
      counts,
      totalChanges: batchEntries.length,
      source,
      entries: batchEntries,
    };
  });
}
