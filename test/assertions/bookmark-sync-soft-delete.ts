import {
  ChangeSource,
  ChangeType,
} from '../../src/bookmark/change-tracker/enums';
import { assertFound } from '../helpers/assert-found';
import { assertStableStateAfterIdenticalResyncFromFixture } from '../helpers/assert-stable-after-identical-resync';
import { getBookmarkIntegrationRepos } from '../helpers/bookmark-integration-repos';
import { loadSyncFixtureFile } from '../helpers/load-sync-fixture';
import type { BookmarkIntegrationContext } from '../helpers/setup-bookmark-integration';

const WITH_BOOKMARK = 'single-bookmark-under-root.json';
const EMPTY_TOOLBAR = 'toolbar-empty.json';

/**
 * Removing all user bookmarks from the sync tree soft-deletes the row and writes a DELETED change log.
 * Re-syncing the same empty toolbar must be a no-op (no duplicate DELETED noise).
 */
export async function assertSyncSoftDeleteProducesDeletedLog(
  ctx: BookmarkIntegrationContext,
): Promise<void> {
  await ctx.bookmarkService.sync(
    ctx.profile.id,
    ctx.user,
    loadSyncFixtureFile(WITH_BOOKMARK),
  );

  const stats = await ctx.bookmarkService.sync(
    ctx.profile.id,
    ctx.user,
    loadSyncFixtureFile(EMPTY_TOOLBAR),
  );
  expect(stats).toEqual({ created: 0, updated: 0, deleted: 1 });

  const { bookmarks: bookmarkRepo, changeLogs: changeLogRepo } =
    getBookmarkIntegrationRepos(ctx);

  const bookmarks = await bookmarkRepo.find({
    where: { profile: { id: ctx.profile.id }, user: { id: ctx.user.id } },
  });
  expect(bookmarks).toHaveLength(1);
  const bookmark = assertFound(bookmarks[0], 'soft-deleted bookmark row');
  expect(bookmark.deleted).toBe(true);

  const logs = await changeLogRepo.find({
    where: { bookmarkId: bookmark.id },
    order: { version: 'ASC' },
  });
  expect(logs).toHaveLength(2);
  expect(logs[1].changeType).toBe(ChangeType.DELETED);
  expect(logs[1].source).toBe(ChangeSource.SYNC);
  expect(logs[1].newValues).toBeFalsy();
  expect(logs[1].oldValues).toBeTruthy();

  await assertStableStateAfterIdenticalResyncFromFixture(ctx, EMPTY_TOOLBAR);
}
