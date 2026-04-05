import { ChangeType } from '../../src/bookmark/change-tracker/enums';
import { assertFound } from '../helpers/assert-found';
import { assertStableStateAfterIdenticalResyncFromFixture } from '../helpers/assert-stable-after-identical-resync';
import { getBookmarkIntegrationRepos } from '../helpers/bookmark-integration-repos';
import { loadSyncFixtureFile } from '../helpers/load-sync-fixture';
import type { BookmarkIntegrationContext } from '../helpers/setup-bookmark-integration';

const BASELINE = 'single-bookmark-under-root.json';
const UPDATED = 'single-bookmark-title-url-updated.json';

/**
 * A single UPDATED log must aggregate every tracked field that changed (title + url here),
 * not multiple log rows.
 */
export async function assertSyncUpdatesTitleAndUrlInSingleLogEntry(
  ctx: BookmarkIntegrationContext,
): Promise<void> {
  await ctx.bookmarkService.sync(
    ctx.profile.id,
    ctx.user,
    loadSyncFixtureFile(BASELINE),
  );

  const stats = await ctx.bookmarkService.sync(
    ctx.profile.id,
    ctx.user,
    loadSyncFixtureFile(UPDATED),
  );
  expect(stats).toEqual({ created: 0, updated: 1, deleted: 0 });

  const { bookmarks: bookmarkRepo, changeLogs: changeLogRepo } =
    getBookmarkIntegrationRepos(ctx);

  const bookmarks = await bookmarkRepo.find({
    where: { profile: { id: ctx.profile.id }, user: { id: ctx.user.id } },
  });
  expect(bookmarks).toHaveLength(1);
  const bookmark = assertFound(
    bookmarks[0],
    'bookmark after multi-field update',
  );

  const logs = await changeLogRepo.find({
    where: { bookmarkId: bookmark.id },
    order: { version: 'ASC' },
  });

  expect(logs).toHaveLength(2);
  expect(logs[1].changeType).toBe(ChangeType.UPDATED);
  expect(logs[1].fieldChanges?.length).toBe(2);

  const fields = logs[1].fieldChanges?.map(c => c.field).sort();
  expect(fields).toEqual(['title', 'url']);

  await assertStableStateAfterIdenticalResyncFromFixture(ctx, UPDATED);
}
