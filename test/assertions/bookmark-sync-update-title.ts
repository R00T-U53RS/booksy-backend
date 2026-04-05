import {
  ChangeSource,
  ChangeType,
} from '../../src/bookmark/change-tracker/enums';
import { assertFound } from '../helpers/assert-found';
import { assertStableStateAfterIdenticalResyncFromFixture } from '../helpers/assert-stable-after-identical-resync';
import { getBookmarkIntegrationRepos } from '../helpers/bookmark-integration-repos';
import { loadSyncFixtureFile } from '../helpers/load-sync-fixture';
import type { BookmarkIntegrationContext } from '../helpers/setup-bookmark-integration';

const BASELINE = 'single-bookmark-under-root.json';
const UPDATED = 'single-bookmark-title-updated.json';

/**
 * Sync creates a bookmark, then a second sync changes only the title.
 * Expects one CREATED and one UPDATED log for the same server bookmark id, then no further
 * work when the same tree is synced again.
 */
export async function assertSyncUpdatesTitleAndLogsFieldChange(
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
  const bookmark = assertFound(bookmarks[0], 'bookmark after title update');
  expect(bookmark.title).toBe('Example Renamed');

  const logs = await changeLogRepo.find({
    where: { bookmarkId: bookmark.id },
    order: { version: 'ASC' },
  });

  expect(logs).toHaveLength(2);
  expect(logs[0].changeType).toBe(ChangeType.CREATED);
  expect(logs[0].version).toBe(1);
  expect(logs[1].changeType).toBe(ChangeType.UPDATED);
  expect(logs[1].version).toBe(2);
  expect(logs[1].source).toBe(ChangeSource.SYNC);
  expect(logs[1].fieldChanges).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        field: 'title',
        changeType: 'modified',
        oldValue: 'Example',
        newValue: 'Example Renamed',
      }),
    ]),
  );
  expect(logs[1].fieldChanges?.length).toBe(1);
  expect(logs[1].oldValues).toMatchObject({ title: 'Example' });
  expect(logs[1].newValues).toMatchObject({ title: 'Example Renamed' });

  await assertStableStateAfterIdenticalResyncFromFixture(ctx, UPDATED);
}
