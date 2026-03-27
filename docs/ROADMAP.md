# Booksy Backend — Roadmap

Clear list of **what’s done** and **what’s left** so you always know what to do next.

---

## ✅ Done

### Auth & users

- [x] JWT auth (register, login, `GET /auth/me`)
- [x] User entity, password hashing (bcrypt)
- [x] Guards and protected routes

### Profiles

- [x] Profile CRUD (create, list, get one, update, delete)
- [x] Profile belongs to user; isolation enforced

### Bookmarks — core

- [x] Bookmark entity (title, url, type, parentId, position, profile, user, etc.)
- [x] CRUD: create, update, list (flat + tree + roots)
- [x] Soft delete (sync sets `deleted`; no hard delete)

### Bookmarks — sync

- [x] Sync pipeline: validate → flatten tree → categorize changes → detect moves → apply in transaction
- [x] Services: Validator, TreeFlattener, ChangeAnalyzer, Processor, Orchestrator
- [x] Handles: created, updated, moved, deleted (soft)
- [x] Position-based matching and move detection
- [x] Sync batch ID generated per sync; returned in response (if you expose it)

### Change tracking

- [x] `BookmarkChangeLog` entity (bookmark, changeType, source, fieldChanges, oldValues, newValues, user, profile, syncBatchId)
- [x] Enums: ChangeType, ChangeSource
- [x] `BookmarkChangeTracker` + `FieldDiffService` + `ValueUtilsService`
- [x] Sync integration: every sync create/update/move/delete is logged with field-level diffs
- [x] Manual integration: create and update in `BookmarkService` call the tracker

### History (backend only)

- [x] `BookmarkHistoryService`: `getRecentChanges`, `getProfileHistory`, `getBookmarkHistory`, `getSyncBatchHistory`
- [x] DTOs: `GetBookmarkHistoryDto`, `GetProfileHistoryDto`, `GetRecentChangesDto`, `BookmarkHistoryResponseDto`
- [x] **One endpoint exposed:** `GET /profiles/:profileId/bookmarks/history/recent`

### Docs

- [x] README, PROJECT*OVERVIEW, BOOKMARK_SYNC_EXPLANATION, Flow.md, CHANGE_TRACKING*\* guides

---

## 🔲 Left to do

### High priority — finish history API

The integration guide and plan assume these exist; the service already implements them. Only “recent” is wired in the controller.

- [ ] **Profile history** — `GET /profiles/:profileId/bookmarks/history`
  - Query: `limit`, `offset`, `changeType`, `startDate`, `endDate`
  - Call `historyService.getProfileHistory()`, return `BookmarkHistoryResponseDto`

- [ ] **Bookmark history** — `GET /profiles/:profileId/bookmarks/:bookmarkId/history`
  - Same query params
  - Call `historyService.getBookmarkHistory()`, return same response shape

- [ ] **Sync-batch history** — `GET /profiles/:profileId/bookmarks/history/sync-batch/:syncBatchId`
  - Call `historyService.getSyncBatchHistory()`, return array (or wrap in `{ changes: [...] }`)

Route order matters in Nest: define more specific routes (e.g. `history/recent`, `history/sync-batch/:id`) before the generic `history` and `:bookmarkId` so they don’t get captured by params.

---

### Medium priority — polish & correctness

- [ ] **Fix type import** (CODE_REVIEW_FINAL)
  - In sync helper: `Bookmark` is used as a value, so use a normal import, not `import { type Bookmark }`.

- [ ] **Database migrations**
  - If you use migrations (not only `DB_SYNC`), add one that creates `bookmark_change_logs` and indexes from CHANGE_TRACKING_PLAN.md.

- [ ] **Manual delete tracking** (only when you add delete API)
  - If you add a “delete bookmark” endpoint, call `changeTracker.trackDeletion()` there with `ChangeSource.MANUAL_UPDATE`.

---

### Lower priority — robustness & scale

- [ ] **Sync race condition** (CODE_REVIEW_FINAL)
  - Consider profile-level locking or `SELECT FOR UPDATE` if two syncs for the same profile can run at once.

- [ ] **URL validation**
  - Optionally allow `chrome://` or other schemes if the extension sends them.

- [ ] **Rate limiting / size limits**
  - Rate limit sync (and maybe auth); cap bookmarks per sync, max depth, title/URL length (see CODE_REVIEW_FINAL).

---

### Optional — testing & future

- [ ] **Tests**
  - Unit: field-diff, change tracker, history service.
  - Integration: sync flow, history endpoints.

- [ ] **Future enhancements** (CHANGE_TRACKING_PLAN)
  - Rollback, sync-batch summaries, notifications, export history, analytics — only if you need them.

---

## 🎯 Suggested order (so you’re not confused)

1. **This week:** Add the three history endpoints (profile history, bookmark history, sync-batch history). That finishes the “change history API” promised in the docs.
2. **Quick win:** Fix the `type Bookmark` import in the sync helper.
3. **When you’re ready:** Add migrations if you’re moving off `DB_SYNC`; add manual delete tracking when you add a delete bookmark API.
4. **Later:** Race condition, rate limits, tests, and optional features as needed.

---

## Quick reference

| I want to…                 | Do this                                                          |
| -------------------------- | ---------------------------------------------------------------- |
| See what’s implemented     | “Done” section above                                             |
| Know what to do next       | “Suggested order”                                                |
| Expose full history in API | Implement the 3 “High priority” endpoints                        |
| Fix known code issues      | “Medium priority” (import + optional migrations/delete tracking) |
| Harden for production      | “Lower priority” + “Optional”                                    |

You can tick the checkboxes in “Left to do” as you complete items and keep this file as your single source of truth.
