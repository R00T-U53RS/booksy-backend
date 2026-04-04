import { ChangeType } from '../../src/bookmark/change-tracker/enums';
import { assertStableStateAfterIdenticalResyncFromFixture } from '../helpers/assert-stable-after-identical-resync';
import { getBookmarkIntegrationRepos } from '../helpers/bookmark-integration-repos';
import { loadSyncFixtureFile } from '../helpers/load-sync-fixture';
import type { BookmarkIntegrationContext } from '../helpers/setup-bookmark-integration';

const TWO_AT_ONCE = 'two-bookmarks-under-root.json';

/**
 * One sync that creates two bookmarks must assign the same syncBatchId to every new log row.
 */
export async function assertSyncCreatesTwoBookmarksInOneBatch(
  ctx: BookmarkIntegrationContext,
): Promise<void> {
  const stats = await ctx.bookmarkService.sync(
    ctx.profile.id,
    ctx.user,
    loadSyncFixtureFile(TWO_AT_ONCE),
  );
  expect(stats).toEqual({ created: 2, updated: 0, deleted: 0 });

  const { changeLogs: changeLogRepo } = getBookmarkIntegrationRepos(ctx);
  const logs = await changeLogRepo.find({
    where: { profileId: ctx.profile.id, userId: ctx.user.id },
    order: { createdAt: 'ASC' },
  });

  expect(logs).toHaveLength(2);
  expect(logs.every(l => l.changeType === ChangeType.CREATED)).toBe(true);
  expect(logs[0].syncBatchId).toBe(logs[1].syncBatchId);
  expect(logs[0].syncBatchId).toEqual(expect.any(String));

  await assertStableStateAfterIdenticalResyncFromFixture(ctx, TWO_AT_ONCE);
}
