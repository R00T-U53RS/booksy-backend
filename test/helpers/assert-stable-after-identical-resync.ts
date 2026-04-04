import type { SyncBookmarkItemDto } from '../../src/bookmark/dto/sync-request.dto';
import type { Bookmark } from '../../src/bookmark/entity/bookmark.entity';

import { getBookmarkIntegrationRepos } from './bookmark-integration-repos';
import { loadSyncFixtureFile } from './load-sync-fixture';
import type { BookmarkIntegrationContext } from './setup-bookmark-integration';

const EMPTY_STATS = { updated: 0, created: 0, deleted: 0 } as const;

type StableBookmarkFields = Pick<
  Bookmark,
  | 'id'
  | 'title'
  | 'url'
  | 'position'
  | 'parentId'
  | 'type'
  | 'deleted'
  | 'dateGroupModified'
>;

function snapshotStableBookmarkFields(
  bookmark: Bookmark,
): StableBookmarkFields {
  return {
    id: bookmark.id,
    title: bookmark.title,
    url: bookmark.url,
    position: bookmark.position,
    parentId: bookmark.parentId,
    type: bookmark.type,
    deleted: bookmark.deleted,
    dateGroupModified: bookmark.dateGroupModified,
  };
}

/**
 * After the DB reflects a successful sync, reload the same fixture tree (fresh DTOs),
 * sync again, and assert the server reports no work and no new history rows.
 * Also asserts persisted bookmarks (including soft-deleted) are unchanged field-for-field.
 *
 * Use this at the end of mutating scenarios to guard against spurious updates on idempotent payloads.
 */
export async function assertStableStateAfterIdenticalResync(
  ctx: BookmarkIntegrationContext,
  getPayload: () => SyncBookmarkItemDto[],
): Promise<void> {
  const { bookmarks: bookmarkRepo, changeLogs: changeLogRepo } =
    getBookmarkIntegrationRepos(ctx);

  const bookmarksBefore = await bookmarkRepo.find({
    where: { profile: { id: ctx.profile.id }, user: { id: ctx.user.id } },
    order: { id: 'ASC' },
  });
  const logCountBefore = await changeLogRepo.count({
    where: { profileId: ctx.profile.id, userId: ctx.user.id },
  });

  const stats = await ctx.bookmarkService.sync(
    ctx.profile.id,
    ctx.user,
    getPayload(),
  );

  expect(stats).toEqual(EMPTY_STATS);

  const logCountAfter = await changeLogRepo.count({
    where: { profileId: ctx.profile.id, userId: ctx.user.id },
  });
  expect(logCountAfter).toBe(logCountBefore);

  const bookmarksAfter = await bookmarkRepo.find({
    where: { profile: { id: ctx.profile.id }, user: { id: ctx.user.id } },
    order: { id: 'ASC' },
  });

  expect(bookmarksAfter.map(b => b.id)).toEqual(bookmarksBefore.map(b => b.id));

  const beforeById = new Map(
    bookmarksBefore.map(b => [b.id, snapshotStableBookmarkFields(b)]),
  );

  for (const b of bookmarksAfter) {
    const prev = beforeById.get(b.id);
    expect(prev).toBeDefined();
    expect(snapshotStableBookmarkFields(b)).toEqual(prev);
  }
}

/** Convenience: reload tree from disk so validators never mutate the caller’s cached DTO. */
export function assertStableStateAfterIdenticalResyncFromFixture(
  ctx: BookmarkIntegrationContext,
  fixtureRelativePath: string,
): Promise<void> {
  return assertStableStateAfterIdenticalResync(ctx, () =>
    loadSyncFixtureFile(fixtureRelativePath),
  );
}
