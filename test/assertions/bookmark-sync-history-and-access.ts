import type { Repository } from 'typeorm';

import type { BookmarkChangeLog } from '../../src/bookmark/change-tracker/bookmark-change-log.entity';
import { ChangeType } from '../../src/bookmark/change-tracker/enums';
import { BookmarkHistoryService } from '../../src/bookmark/change-tracker/history.service';
import type { Bookmark } from '../../src/bookmark/entity/bookmark.entity';
import type { User } from '../../src/users/entities/user.entity';
import {
  BATCH_HISTORY_PAGE_LIMIT,
  PROFILE_HISTORY_QUERY_LIMIT,
} from '../constants/bookmark-sync-history.constants';
import {
  assertFound,
  assertNonEmptySyncBatchId,
} from '../helpers/assert-found';
import { assertStableStateAfterIdenticalResyncFromFixture } from '../helpers/assert-stable-after-identical-resync';
import { getBookmarkIntegrationRepos } from '../helpers/bookmark-integration-repos';
import { loadSyncFixtureFile } from '../helpers/load-sync-fixture';
import { seedSecondTestUser } from '../helpers/seed-second-test-user';
import type { BookmarkIntegrationContext } from '../helpers/setup-bookmark-integration';

const BASELINE = 'single-bookmark-under-root.json';
const TITLE_UPDATE = 'single-bookmark-title-updated.json';

/**
 * Exercises BookmarkHistoryService list + batch queries against rows produced only by sync.
 * Ends with an identical re-sync of the final tree so history stays stable under repetition.
 */
export async function assertHistoryQueriesMatchPersistedSyncLogs(
  ctx: BookmarkIntegrationContext,
): Promise<void> {
  await syncBaselineThenTitleUpdate(ctx);

  const { bookmarks: bookmarkRepo, changeLogs: changeLogRepo } =
    getBookmarkIntegrationRepos(ctx);
  const history = ctx.moduleRef.get(BookmarkHistoryService);

  const foundBookmark = await bookmarkRepo.findOne({
    where: {
      profile: { id: ctx.profile.id },
      user: { id: ctx.user.id },
      title: 'Example Renamed',
    },
  });
  const bookmark = assertFound(
    foundBookmark,
    'bookmark titled Example Renamed',
  );

  await expectProfileHistoryOrderingAndTotals(history, ctx);
  await expectBookmarkScopedHistory(history, bookmark, ctx.user);
  await expectBatchListingAndFirstBatchIntegrity(history, changeLogRepo, ctx);

  await assertStableStateAfterIdenticalResyncFromFixture(ctx, TITLE_UPDATE);
}

/**
 * Change logs for a profile must not be visible when querying with another user's id.
 */
export async function assertOtherUserCannotSeeProfileHistory(
  ctx: BookmarkIntegrationContext,
): Promise<void> {
  const { users: userRepository, changeLogs: changeLogRepo } =
    getBookmarkIntegrationRepos(ctx);
  const otherUser = await seedSecondTestUser(userRepository);
  const history = ctx.moduleRef.get(BookmarkHistoryService);

  await ctx.bookmarkService.sync(
    ctx.profile.id,
    ctx.user,
    loadSyncFixtureFile(BASELINE),
  );

  const { total, changes } = await history.getProfileHistory(
    ctx.profile.id,
    otherUser.id,
    { limit: PROFILE_HISTORY_QUERY_LIMIT, offset: 0 },
  );
  expect(total).toBe(0);
  expect(changes).toHaveLength(0);

  const anyLogRow = await changeLogRepo.findOne({
    where: { profileId: ctx.profile.id, userId: ctx.user.id },
  });
  const anyLog = assertFound(anyLogRow, 'primary user change log');
  const batchId = assertNonEmptySyncBatchId(anyLog.syncBatchId, 'sample log');

  const leaked = await history.getSyncBatchHistory(batchId, otherUser.id);
  expect(leaked).toHaveLength(0);

  await assertStableStateAfterIdenticalResyncFromFixture(ctx, BASELINE);
}

async function syncBaselineThenTitleUpdate(
  ctx: BookmarkIntegrationContext,
): Promise<void> {
  await ctx.bookmarkService.sync(
    ctx.profile.id,
    ctx.user,
    loadSyncFixtureFile(BASELINE),
  );
  await ctx.bookmarkService.sync(
    ctx.profile.id,
    ctx.user,
    loadSyncFixtureFile(TITLE_UPDATE),
  );
}

async function expectProfileHistoryOrderingAndTotals(
  history: BookmarkHistoryService,
  ctx: BookmarkIntegrationContext,
): Promise<void> {
  const { changes: profileChanges, total: profileTotal } =
    await history.getProfileHistory(ctx.profile.id, ctx.user.id, {
      limit: PROFILE_HISTORY_QUERY_LIMIT,
      offset: 0,
    });
  expect(profileTotal).toBe(2);
  expect(profileChanges).toHaveLength(2);
  expect(profileChanges[0].changeType).toBe(ChangeType.UPDATED);
  expect(profileChanges[1].changeType).toBe(ChangeType.CREATED);

  const { total: updatedOnlyTotal } = await history.getProfileHistory(
    ctx.profile.id,
    ctx.user.id,
    {
      limit: PROFILE_HISTORY_QUERY_LIMIT,
      offset: 0,
      changeType: ChangeType.UPDATED,
    },
  );
  expect(updatedOnlyTotal).toBe(1);
}

async function expectBookmarkScopedHistory(
  history: BookmarkHistoryService,
  bookmark: Bookmark,
  user: User,
): Promise<void> {
  const { changes: byBookmark, total: bookmarkTotal } =
    await history.getBookmarkHistory(bookmark.id, user.id, {
      limit: PROFILE_HISTORY_QUERY_LIMIT,
      offset: 0,
    });
  expect(bookmarkTotal).toBe(2);
  expect(byBookmark[0].changeType).toBe(ChangeType.UPDATED);
  expect(byBookmark[1].changeType).toBe(ChangeType.CREATED);
}

async function expectBatchListingAndFirstBatchIntegrity(
  history: BookmarkHistoryService,
  changeLogRepo: Repository<BookmarkChangeLog>,
  ctx: BookmarkIntegrationContext,
): Promise<void> {
  const { batches, total: batchPageTotal } = await history.getBatchedHistory(
    ctx.profile.id,
    ctx.user.id,
    BATCH_HISTORY_PAGE_LIMIT,
    0,
  );
  expect(batchPageTotal).toBeGreaterThanOrEqual(2);
  expect(batches.length).toBeGreaterThanOrEqual(2);
  expect(batches[0].syncBatchId).toEqual(expect.any(String));
  expect(
    batches[0].entries.some(e => e.changeType === ChangeType.UPDATED),
  ).toBe(true);

  const oldestLogRow = await changeLogRepo.findOne({
    where: { profileId: ctx.profile.id, userId: ctx.user.id },
    order: { createdAt: 'ASC' },
  });
  const oldestLog = assertFound(oldestLogRow, 'oldest change log');
  const firstBatchId = assertNonEmptySyncBatchId(
    oldestLog.syncBatchId,
    'oldest log',
  );

  const firstBatchRows = await history.getSyncBatchHistory(
    firstBatchId,
    ctx.user.id,
  );
  expect(firstBatchRows.length).toBeGreaterThanOrEqual(1);
  expect(firstBatchRows.every(r => r.syncBatchId === firstBatchId)).toBe(true);
}
