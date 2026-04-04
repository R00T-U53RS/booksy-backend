import { assertSyncCreatesTwoBookmarksInOneBatch } from '../../assertions/bookmark-sync-batch-grouping';
import { assertSyncReparentFolderIsDeleteAndCreateNotMoved } from '../../assertions/bookmark-sync-move-folder';
import { assertSyncMoveUrlBookmarkLogsMovedWithParentChange } from '../../assertions/bookmark-sync-move-url-bookmark';
import { assertSequentialSyncsUseDistinctBatchIds } from '../../assertions/bookmark-sync-sequential-batches';
import { assertSyncSoftDeleteProducesDeletedLog } from '../../assertions/bookmark-sync-soft-delete';
import { assertSyncUpdatesTitleAndUrlInSingleLogEntry } from '../../assertions/bookmark-sync-update-multi-field';
import { assertSyncUpdatesTitleAndLogsFieldChange } from '../../assertions/bookmark-sync-update-title';
import { assertSingleBookmarkUnderRootCreatesSyncAndLog } from '../../assertions/single-bookmark-under-root';

import { registerBookmarkSyncIntegrationLifecycle } from './integration-lifecycle';

describe('Bookmark sync — mutations (integration)', () => {
  const harness = registerBookmarkSyncIntegrationLifecycle();

  it('creates one bookmark and one change log from toolbar root fixture', async () => {
    await assertSingleBookmarkUnderRootCreatesSyncAndLog(harness.getCtx());
  });

  it('update title produces one UPDATED log with title field change, then idempotent re-sync', async () => {
    await assertSyncUpdatesTitleAndLogsFieldChange(harness.getCtx());
  });

  it('title + url change in a single UPDATED log entry, then idempotent re-sync', async () => {
    await assertSyncUpdatesTitleAndUrlInSingleLogEntry(harness.getCtx());
  });

  it('empty toolbar soft-deletes bookmark and logs DELETED, then idempotent re-sync', async () => {
    await assertSyncSoftDeleteProducesDeletedLog(harness.getCtx());
  });

  it('move URL bookmark between folders logs MOVED with parentId change, then idempotent re-sync', async () => {
    await assertSyncMoveUrlBookmarkLogsMovedWithParentChange(harness.getCtx());
  });

  it('reparent folder (root → under another folder) is delete + create, not MOVED, then idempotent re-sync', async () => {
    await assertSyncReparentFolderIsDeleteAndCreateNotMoved(harness.getCtx());
  });

  it('two bookmarks created in one request share one syncBatchId, then idempotent re-sync', async () => {
    await assertSyncCreatesTwoBookmarksInOneBatch(harness.getCtx());
  });

  it('two sequential syncs persist different syncBatchId values, then idempotent re-sync', async () => {
    await assertSequentialSyncsUseDistinctBatchIds(harness.getCtx());
  });
});
