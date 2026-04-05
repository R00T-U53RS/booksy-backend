import {
  ChangeSource,
  ChangeType,
} from '../../src/bookmark/change-tracker/enums';
import { assertFound } from '../helpers/assert-found';
import { assertStableStateAfterIdenticalResyncFromFixture } from '../helpers/assert-stable-after-identical-resync';
import { getBookmarkIntegrationRepos } from '../helpers/bookmark-integration-repos';
import { loadSyncFixtureFile } from '../helpers/load-sync-fixture';
import type { BookmarkIntegrationContext } from '../helpers/setup-bookmark-integration';

const FIXTURE = 'single-bookmark-under-root.json';

/** Expectations for fixture `test/fixtures/single-bookmark-under-root.json`. */
export async function assertSingleBookmarkUnderRootCreatesSyncAndLog(
  ctx: BookmarkIntegrationContext,
): Promise<void> {
  const payload = loadSyncFixtureFile(FIXTURE);

  const stats = await ctx.bookmarkService.sync(
    ctx.profile.id,
    ctx.user,
    payload,
  );

  expect(stats).toEqual({ created: 1, updated: 0, deleted: 0 });

  const { bookmarks: bookmarkRepo, changeLogs: changeLogRepo } =
    getBookmarkIntegrationRepos(ctx);

  const bookmarks = await bookmarkRepo.find({
    where: { profile: { id: ctx.profile.id }, user: { id: ctx.user.id } },
    order: { id: 'ASC' },
  });
  expect(bookmarks).toHaveLength(1);
  const bookmark = assertFound(bookmarks[0], 'bookmark after first sync');
  expect(bookmark.title).toBe('Example');
  expect(bookmark.url).toBe('https://example.com/');

  const logs = await changeLogRepo.find({
    where: { profileId: ctx.profile.id, userId: ctx.user.id },
    order: { version: 'ASC' },
  });
  expect(logs).toHaveLength(1);
  expect(logs[0].changeType).toBe(ChangeType.CREATED);
  expect(logs[0].version).toBe(1);
  expect(logs[0].source).toBe(ChangeSource.SYNC);
  expect(logs[0].bookmarkId).toBe(bookmark.id);
  expect(logs[0].syncBatchId).toEqual(expect.any(String));
  expect(logs[0].oldValues).toBeFalsy();
  expect(logs[0].newValues).toBeTruthy();

  await assertStableStateAfterIdenticalResyncFromFixture(ctx, FIXTURE);
}
