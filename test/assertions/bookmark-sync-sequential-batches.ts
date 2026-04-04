import { assertStableStateAfterIdenticalResyncFromFixture } from '../helpers/assert-stable-after-identical-resync';
import { getBookmarkIntegrationRepos } from '../helpers/bookmark-integration-repos';
import { loadSyncFixtureFile } from '../helpers/load-sync-fixture';
import type { BookmarkIntegrationContext } from '../helpers/setup-bookmark-integration';

const ONE = 'single-bookmark-under-root.json';
const TWO = 'two-bookmarks-under-root.json';

/**
 * Two separate successful syncs must persist different syncBatchId values on their new rows.
 */
export async function assertSequentialSyncsUseDistinctBatchIds(
  ctx: BookmarkIntegrationContext,
): Promise<void> {
  await ctx.bookmarkService.sync(
    ctx.profile.id,
    ctx.user,
    loadSyncFixtureFile(ONE),
  );

  await ctx.bookmarkService.sync(
    ctx.profile.id,
    ctx.user,
    loadSyncFixtureFile(TWO),
  );

  const { changeLogs: changeLogRepo } = getBookmarkIntegrationRepos(ctx);
  const logs = await changeLogRepo.find({
    where: { profileId: ctx.profile.id, userId: ctx.user.id },
    order: { createdAt: 'ASC' },
  });

  expect(logs.length).toBeGreaterThanOrEqual(2);

  const nonEmptyBatchIds = logs
    .map(l => l.syncBatchId)
    .filter((id): id is string => typeof id === 'string' && id.length > 0);
  const batchIds = Array.from(new Set(nonEmptyBatchIds));

  expect(batchIds.length).toBeGreaterThanOrEqual(2);

  await assertStableStateAfterIdenticalResyncFromFixture(ctx, TWO);
}
