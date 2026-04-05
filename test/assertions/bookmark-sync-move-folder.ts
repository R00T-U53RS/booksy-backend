import type { Repository } from 'typeorm';

import type { BookmarkChangeLog } from '../../src/bookmark/change-tracker/bookmark-change-log.entity';
import { ChangeType } from '../../src/bookmark/change-tracker/enums';
import {
  type Bookmark,
  BookmarkType,
} from '../../src/bookmark/entity/bookmark.entity';
import { assertFound } from '../helpers/assert-found';
import { assertStableStateAfterIdenticalResyncFromFixture } from '../helpers/assert-stable-after-identical-resync';
import { getBookmarkIntegrationRepos } from '../helpers/bookmark-integration-repos';
import { loadSyncFixtureFile } from '../helpers/load-sync-fixture';
import type { BookmarkIntegrationContext } from '../helpers/setup-bookmark-integration';

const BEFORE = 'move-folder-before.json';
const AFTER = 'move-folder-after.json';

const CLIENT_FOLDER_B_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

/**
 * Folders are not move-detected (see BookmarkChangeAnalyzer.detectMoves). Reparenting a folder
 * is handled as remove from old parent + add under new parent: expect DELETED + CREATED, not MOVED.
 */
export async function assertSyncReparentFolderIsDeleteAndCreateNotMoved(
  ctx: BookmarkIntegrationContext,
): Promise<void> {
  await runFolderReparentSyncs(ctx);
  const { bookmarks: bookmarkRepo, changeLogs: changeLogRepo } =
    getBookmarkIntegrationRepos(ctx);
  const { aActive, oldFolderARow } = await assertFolderReparentRows(
    bookmarkRepo,
    ctx,
  );

  await expectReparentLogsNotMovedAndSameBatch(
    changeLogRepo,
    ctx,
    aActive,
    oldFolderARow,
  );

  await assertStableStateAfterIdenticalResyncFromFixture(ctx, AFTER);
}

async function runFolderReparentSyncs(
  ctx: BookmarkIntegrationContext,
): Promise<void> {
  await ctx.bookmarkService.sync(
    ctx.profile.id,
    ctx.user,
    loadSyncFixtureFile(BEFORE),
  );

  const stats = await ctx.bookmarkService.sync(
    ctx.profile.id,
    ctx.user,
    loadSyncFixtureFile(AFTER),
  );
  expect(stats).toEqual({ created: 1, deleted: 1, updated: 0 });
}

async function assertFolderReparentRows(
  bookmarkRepo: Repository<Bookmark>,
  ctx: BookmarkIntegrationContext,
): Promise<{ aActive: Bookmark; oldFolderARow: Bookmark }> {
  const baseWhere = {
    profile: { id: ctx.profile.id },
    user: { id: ctx.user.id },
  };

  const bRow = assertFound(
    await bookmarkRepo.findOne({
      where: { ...baseWhere, title: 'Folder B', type: BookmarkType.FOLDER },
    }),
    'Folder B row',
  );
  expect(bRow.parentId).toBe('0');

  const aActive = assertFound(
    await bookmarkRepo.findOne({
      where: {
        ...baseWhere,
        title: 'Folder A',
        type: BookmarkType.FOLDER,
        deleted: false,
      },
    }),
    'active Folder A under B',
  );
  expect(aActive.parentId).toBe(CLIENT_FOLDER_B_ID);

  const oldFolderARow = assertFound(
    await bookmarkRepo.findOne({
      where: {
        ...baseWhere,
        title: 'Folder A',
        type: BookmarkType.FOLDER,
        deleted: true,
      },
    }),
    'soft-deleted former root Folder A',
  );
  expect(oldFolderARow.id).not.toBe(aActive.id);

  return { aActive, oldFolderARow };
}

async function expectReparentLogsNotMovedAndSameBatch(
  changeLogRepo: Repository<BookmarkChangeLog>,
  ctx: BookmarkIntegrationContext,
  aActive: Bookmark,
  oldFolderARow: Bookmark,
): Promise<void> {
  const allLogs = await changeLogRepo.find({
    where: { profileId: ctx.profile.id, userId: ctx.user.id },
    order: { createdAt: 'ASC' },
  });
  expect(allLogs.some(l => l.changeType === ChangeType.MOVED)).toBe(false);

  const logsForReparentBatch = allLogs.filter(
    l => l.bookmarkId === aActive.id || l.bookmarkId === oldFolderARow.id,
  );
  const createdForNewA = logsForReparentBatch.filter(
    l => l.bookmarkId === aActive.id && l.changeType === ChangeType.CREATED,
  );
  const deletedForOldA = logsForReparentBatch.filter(
    l =>
      l.bookmarkId === oldFolderARow.id && l.changeType === ChangeType.DELETED,
  );
  expect(createdForNewA).toHaveLength(1);
  expect(deletedForOldA).toHaveLength(1);

  const sameBatch =
    createdForNewA[0]?.syncBatchId === deletedForOldA[0]?.syncBatchId;
  expect(sameBatch).toBe(true);
}
