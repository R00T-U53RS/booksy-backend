import {
  assertHistoryQueriesMatchPersistedSyncLogs,
  assertOtherUserCannotSeeProfileHistory,
} from '../../assertions/bookmark-sync-history-and-access';

import { registerBookmarkSyncIntegrationLifecycle } from './integration-lifecycle';

describe('Bookmark sync — history service (integration)', () => {
  const harness = registerBookmarkSyncIntegrationLifecycle();

  it('profile, bookmark, batch, and sync-batch queries match persisted sync logs', async () => {
    await assertHistoryQueriesMatchPersistedSyncLogs(harness.getCtx());
  });

  it('another user cannot read primary user change logs or batch by id', async () => {
    await assertOtherUserCannotSeeProfileHistory(harness.getCtx());
  });
});
