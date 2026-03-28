# Change Tracking Integration Guide

Complete guide for browser extension integration with Bookmark Change Tracking in Booksy Backend.

---

## Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Profile Management](#profile-management)
4. [Sync Workflow](#sync-workflow)
5. [Change History APIs](#change-history-apis)
6. [Tracking Changes Between Syncs](#tracking-changes-between-syncs)
7. [API Examples](#api-examples)
8. [Best Practices](#best-practices)

---

## Overview

The change tracking system automatically records all bookmark modifications during sync operations, allowing you to:

- **Track changes from first sync** - See all changes from empty account to current state
- **View changes between syncs** - Compare what changed between any two sync operations
- **Field-level tracking** - See exactly which fields changed (title, URL, position, etc.)
- **Sync batch grouping** - All changes in a sync share the same `syncBatchId`

**Automatic** - All changes are tracked automatically when you call the sync API. No additional code needed!

---

## Quick Start

### 1. Authenticate (One-Time Setup)

```http
POST /auth/login
Content-Type: application/json

{
  "username": "johndoe",
  "password": "securepassword123"
}
```

**Response:**

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user-uuid",
    "username": "johndoe"
  }
}
```

Save the `accessToken` for all subsequent requests.

### 2. Create or Get a Profile

Before syncing bookmarks, you need a profile. Profiles represent different browser profiles or bookmark collections.

#### Create a New Profile

```http
POST /profile
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "name": "Chrome Profile",
  "description": "My main browser profile"
}
```

**Response:**

```json
{
  "id": "profile-uuid",
  "name": "Chrome Profile",
  "description": "My main browser profile",
  "createdAt": "2024-01-15T10:00:00Z",
  "updatedAt": "2024-01-15T10:00:00Z"
}
```

Save the `profileId` - you'll need it for all bookmark operations.

#### Get All Profiles

```http
GET /profile
Authorization: Bearer {accessToken}
```

**Response:**

```json
[
  {
    "id": "profile-uuid-1",
    "name": "Chrome Profile",
    "description": "My main browser profile",
    "createdAt": "2024-01-15T10:00:00Z",
    "updatedAt": "2024-01-15T10:00:00Z"
  },
  {
    "id": "profile-uuid-2",
    "name": "Firefox Profile",
    "description": "Secondary browser",
    "createdAt": "2024-01-15T11:00:00Z",
    "updatedAt": "2024-01-15T11:00:00Z"
  }
]
```

#### Get a Specific Profile

```http
GET /profile/{profileId}
Authorization: Bearer {accessToken}
```

**Response:**

```json
{
  "id": "profile-uuid",
  "name": "Chrome Profile",
  "description": "My main browser profile",
  "createdAt": "2024-01-15T10:00:00Z",
  "updatedAt": "2024-01-15T10:00:00Z",
  "bookmarks": []
}
```

#### Update a Profile

```http
PATCH /profile/{profileId}
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "name": "Updated Profile Name",
  "description": "Updated description"
}
```

#### Delete a Profile

```http
DELETE /profile/{profileId}
Authorization: Bearer {accessToken}
```

**Note:** Deleting a profile will also delete all associated bookmarks and change logs (CASCADE).

### 3. First Sync (Empty Account)

When a user first connects their account, sync their bookmarks:

```http
POST /profiles/{profileId}/bookmarks/sync
Authorization: Bearer {accessToken}
Content-Type: application/json

[
  {
    "id": "bookmark-1",
    "title": "GitHub",
    "url": "https://github.com",
    "parentId": "",
    "index": 0,
    "dateAdded": 1705312200000,
    "dateGroupModified": 1705312200000
  }
]
```

**What Happens:**

- All bookmarks are created
- Change logs are created with `changeType: "CREATED"`
- All changes share the same `syncBatchId` (e.g., `"sync-batch-uuid-1"`)
- Source: `SYNC`

**Response:**

```json
{
  "updated": 0,
  "created": 1,
  "deleted": 0
}
```

### 4. Subsequent Syncs

On each sync, the system automatically:

- Detects what changed (created, updated, moved, deleted)
- Creates change logs for each modification
- Groups all changes with a new `syncBatchId`

---

## Sync Workflow

### How Sync Works

1. **Extension sends current bookmark state** → Sync API
2. **System compares** with existing bookmarks
3. **Applies changes** (create, update, move, delete)
4. **Tracks all changes** with same `syncBatchId`
5. **Returns stats** (updated, created, deleted counts)

### Change Detection

The system automatically detects:

- **New bookmarks** → `CREATED` change type
- **Modified bookmarks** → `UPDATED` change type (only changed fields)
- **Moved bookmarks** → `MOVED` change type (position/parent changed)
- **Deleted bookmarks** → `DELETED` change type

### Sync Batch ID

Each sync operation gets a unique `syncBatchId` that groups all related changes:

```json
{
  "syncBatchId": "550e8400-e29b-41d4-a716-446655440000",
  "changes": [
    { "bookmarkId": "bookmark-1", "changeType": "created" },
    { "bookmarkId": "bookmark-2", "changeType": "updated" },
    { "bookmarkId": "bookmark-3", "changeType": "moved" }
  ]
}
```

---

## Change History APIs

### 1. Get All Changes for a Profile

View all changes from first sync to now:

```http
GET /profiles/{profileId}/bookmarks/history?limit=100&offset=0
Authorization: Bearer {accessToken}
```

**Query Parameters:**

- `limit` (optional) - Number of results (default: 50, max: 100)
- `offset` (optional) - Pagination offset (default: 0)
- `changeType` (optional) - Filter by type: `created`, `updated`, `moved`, `deleted`
- `startDate` (optional) - Filter changes after this date (ISO 8601)
- `endDate` (optional) - Filter changes before this date (ISO 8601)

**Response:**

```json
{
  "changes": [
    {
      "id": "change-log-uuid-1",
      "bookmarkId": "bookmark-1",
      "bookmarkTitle": "GitHub",
      "changeType": "created",
      "source": "sync",
      "fieldChanges": [
        {
          "field": "title",
          "oldValue": null,
          "newValue": "GitHub",
          "changeType": "added"
        },
        {
          "field": "url",
          "oldValue": null,
          "newValue": "https://github.com",
          "changeType": "added"
        }
      ],
      "oldValues": null,
      "newValues": {
        "title": "GitHub",
        "url": "https://github.com",
        "position": 0,
        "parentId": "",
        "type": "bookmark"
      },
      "syncBatchId": "sync-batch-uuid-1",
      "createdAt": "2024-01-15T10:00:00Z"
    },
    {
      "id": "change-log-uuid-2",
      "bookmarkId": "bookmark-1",
      "bookmarkTitle": "GitHub - Updated",
      "changeType": "updated",
      "source": "sync",
      "fieldChanges": [
        {
          "field": "title",
          "oldValue": "GitHub",
          "newValue": "GitHub - Updated",
          "changeType": "modified"
        },
        {
          "field": "position",
          "oldValue": 0,
          "newValue": 5,
          "changeType": "modified"
        }
      ],
      "oldValues": {
        "title": "GitHub",
        "position": 0
      },
      "newValues": {
        "title": "GitHub - Updated",
        "position": 5
      },
      "syncBatchId": "sync-batch-uuid-2",
      "createdAt": "2024-01-15T11:00:00Z"
    }
  ],
  "total": 2,
  "limit": 100,
  "offset": 0
}
```

### 2. Get Changes for a Specific Bookmark

View history of a single bookmark:

```http
GET /profiles/{profileId}/bookmarks/{bookmarkId}/history?limit=50
Authorization: Bearer {accessToken}
```

**Response:** Same structure as above, but filtered to one bookmark.

### 3. Get Changes from a Specific Sync

View all changes from a particular sync operation:

```http
GET /profiles/{profileId}/bookmarks/history/sync-batch/{syncBatchId}
Authorization: Bearer {accessToken}
```

**Response:**

```json
[
  {
    "id": "change-log-uuid-1",
    "bookmarkId": "bookmark-1",
    "changeType": "created",
    "syncBatchId": "sync-batch-uuid-1",
    "fieldChanges": [...],
    "createdAt": "2024-01-15T10:00:00Z"
  },
  {
    "id": "change-log-uuid-2",
    "bookmarkId": "bookmark-2",
    "changeType": "updated",
    "syncBatchId": "sync-batch-uuid-1",
    "fieldChanges": [...],
    "createdAt": "2024-01-15T10:00:00Z"
  }
]
```

### 4. Get Recent Changes (Activity Feed)

Get the most recent changes across all bookmarks:

```http
GET /profiles/{profileId}/bookmarks/history/recent?limit=20
Authorization: Bearer {accessToken}
```

**Response:** Same structure as profile history, sorted by `createdAt` descending.

### 5. Get Changes Between Two Syncs

Compare changes between two sync operations:

```http
GET /profiles/{profileId}/bookmarks/history?startDate=2024-01-15T10:00:00Z&endDate=2024-01-15T12:00:00Z
Authorization: Bearer {accessToken}
```

Or get changes since a specific sync batch:

```http
# Get sync batch 1
GET /profiles/{profileId}/bookmarks/history/sync-batch/{syncBatchId1}

# Get sync batch 2
GET /profiles/{profileId}/bookmarks/history/sync-batch/{syncBatchId2}

# Compare the two results
```

---

## Tracking Changes Between Syncs

### Scenario: Track Changes from First Sync

**Timeline:**

1. **First Sync (Empty Account)** → Creates all bookmarks
2. **Second Sync** → User added 2 bookmarks, updated 1, deleted 1
3. **Third Sync** → User moved 3 bookmarks, updated titles

### Step-by-Step Tracking

#### After First Sync

```http
GET /profiles/{profileId}/bookmarks/history
```

**Result:** All changes show `changeType: "created"` with first `syncBatchId`.

#### After Second Sync

```http
GET /profiles/{profileId}/bookmarks/history?startDate={firstSyncDate}
```

**Result:** Shows only new changes since first sync:

- 2 `CREATED` changes (new bookmarks)
- 1 `UPDATED` change (modified bookmark)
- 1 `DELETED` change (removed bookmark)
- All share second `syncBatchId`

#### After Third Sync

```http
GET /profiles/{profileId}/bookmarks/history?startDate={secondSyncDate}
```

**Result:** Shows only changes from third sync:

- 3 `MOVED` changes (repositioned bookmarks)
- Multiple `UPDATED` changes (title changes)
- All share third `syncBatchId`

### Get All Sync Batches

To see all sync operations:

```http
GET /profiles/{profileId}/bookmarks/history?groupBy=syncBatch
Authorization: Bearer {accessToken}
```

**Response:**

```json
{
  "syncBatches": [
    {
      "syncBatchId": "sync-batch-uuid-1",
      "createdAt": "2024-01-15T10:00:00Z",
      "changeCount": 10,
      "changeTypes": {
        "created": 10,
        "updated": 0,
        "moved": 0,
        "deleted": 0
      }
    },
    {
      "syncBatchId": "sync-batch-uuid-2",
      "createdAt": "2024-01-15T11:00:00Z",
      "changeCount": 4,
      "changeTypes": {
        "created": 2,
        "updated": 1,
        "moved": 0,
        "deleted": 1
      }
    }
  ]
}
```

---

## API Examples

### Complete Extension Workflow

#### Step 1: Create or Get Profile

```bash
# Create a new profile (if needed)
curl -X POST http://localhost:3000/profile \
  -H "Authorization: Bearer {accessToken}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Chrome Profile",
    "description": "My main browser"
  }'

# Or get existing profiles
curl -X GET http://localhost:3000/profile \
  -H "Authorization: Bearer {accessToken}"

# Save the profileId from response
```

#### Step 2: Initial Sync (Empty Account)

```bash
# Sync all bookmarks
curl -X POST http://localhost:3000/profiles/{profileId}/bookmarks/sync \
  -H "Authorization: Bearer {accessToken}" \
  -H "Content-Type: application/json" \
  -d @bookmarks.json

# Response: { "updated": 0, "created": 50, "deleted": 0 }
```

#### Step 3: Get Initial State Changes

```bash
# Get all changes from first sync
curl -X GET "http://localhost:3000/profiles/{profileId}/bookmarks/history?limit=100" \
  -H "Authorization: Bearer {accessToken}"

# Shows all 50 CREATED changes with same syncBatchId
```

#### Step 4: User Makes Changes (Next Sync)

```bash
# Sync again after user made changes
curl -X POST http://localhost:3000/profiles/{profileId}/bookmarks/sync \
  -H "Authorization: Bearer {accessToken}" \
  -H "Content-Type: application/json" \
  -d @updated-bookmarks.json

# Response: { "updated": 3, "created": 2, "deleted": 1 }
```

#### Step 5: Get Changes Since Last Sync

```bash
# Get only new changes
curl -X GET "http://localhost:3000/profiles/{profileId}/bookmarks/history/recent?limit=10" \
  -H "Authorization: Bearer {accessToken}"

# Shows only the 6 changes from latest sync
```

#### Step 6: Get Specific Sync Batch

```bash
# Get all changes from a specific sync
curl -X GET "http://localhost:3000/profiles/{profileId}/bookmarks/history/sync-batch/{syncBatchId}" \
  -H "Authorization: Bearer {accessToken}"

# Shows all changes grouped by that sync
```

### JavaScript/TypeScript Example

```typescript
// Profile management functions
async function createProfile(name: string, description?: string) {
  const response = await fetch('/profile', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name, description }),
  });

  return await response.json();
}

async function getProfiles() {
  const response = await fetch('/profile', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  return await response.json();
}

async function getProfile(profileId: string) {
  const response = await fetch(`/profile/${profileId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  return await response.json();
}

// Extension sync function
async function syncBookmarks(profileId: string, bookmarks: Bookmark[]) {
  const response = await fetch(`/profiles/${profileId}/bookmarks/sync`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(bookmarks),
  });

  const stats = await response.json();
  // stats: { updated: 5, created: 3, deleted: 1 }

  return stats;
}

// Get changes since last sync
async function getRecentChanges(profileId: string, since?: Date) {
  const params = new URLSearchParams({ limit: '50' });
  if (since) {
    params.append('startDate', since.toISOString());
  }

  const response = await fetch(
    `/profiles/${profileId}/bookmarks/history?${params}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );

  const history = await response.json();
  // history: { changes: [...], total: 10, limit: 50, offset: 0 }

  return history;
}

// Get changes for a specific bookmark
async function getBookmarkHistory(profileId: string, bookmarkId: string) {
  const response = await fetch(
    `/profiles/${profileId}/bookmarks/${bookmarkId}/history`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );

  return await response.json();
}

// Usage in extension
async function initializeExtension() {
  // Get or create profile
  let profiles = await getProfiles();
  let profileId: string;

  if (profiles.length === 0) {
    // Create first profile
    const newProfile = await createProfile('Browser Profile', 'Main profile');
    profileId = newProfile.id;
  } else {
    // Use existing profile (or let user choose)
    profileId = profiles[0].id;
  }

  return profileId;
}

async function onSyncComplete(profileId: string) {
  // Sync bookmarks
  const stats = await syncBookmarks(profileId, localBookmarks);
  console.log(`Synced: ${stats.created} created, ${stats.updated} updated`);

  // Get changes from this sync
  const recentChanges = await getRecentChanges(profileId);
  console.log(`Changes tracked: ${recentChanges.total}`);

  // Show user what changed
  recentChanges.changes.forEach(change => {
    console.log(`${change.changeType}: ${change.bookmarkTitle}`);
    change.fieldChanges.forEach(field => {
      console.log(`  ${field.field}: ${field.oldValue} → ${field.newValue}`);
    });
  });
}
```

---

## Profile Management

### Understanding Profiles

Profiles represent different browser profiles or bookmark collections:

- **One user can have multiple profiles** (e.g., Chrome, Firefox, Work, Personal)
- **Each profile has its own bookmarks** - completely isolated
- **Change tracking is scoped to profiles** - each profile has its own change history
- **Profiles are user-specific** - users can only access their own profiles

### Profile Workflow

1. **Create Profile** - When user first connects their account
2. **Select Profile** - Extension should remember which profile to use
3. **Sync Bookmarks** - All syncs go to the selected profile
4. **View Changes** - Change history is scoped to the profile

### Profile API Summary

| Method   | Endpoint        | Description                        |
| -------- | --------------- | ---------------------------------- |
| `POST`   | `/profile`      | Create a new profile               |
| `GET`    | `/profile`      | Get all user's profiles            |
| `GET`    | `/profile/{id}` | Get a specific profile             |
| `PATCH`  | `/profile/{id}` | Update profile (name, description) |
| `DELETE` | `/profile/{id}` | Delete profile (and all bookmarks) |

### Profile Selection in Extension

```typescript
// Store selected profile ID
const STORAGE_KEY = 'selectedProfileId';

async function getOrSelectProfile(): Promise<string> {
  // Check if profile is stored
  const storedProfileId = localStorage.getItem(STORAGE_KEY);
  if (storedProfileId) {
    // Verify profile still exists
    try {
      await getProfile(storedProfileId);
      return storedProfileId;
    } catch (error) {
      // Profile was deleted, clear storage
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  // Get all profiles
  const profiles = await getProfiles();

  if (profiles.length === 0) {
    // Create first profile
    const newProfile = await createProfile('Browser Profile');
    localStorage.setItem(STORAGE_KEY, newProfile.id);
    return newProfile.id;
  }

  // Use first profile (or show selection UI)
  const profileId = profiles[0].id;
  localStorage.setItem(STORAGE_KEY, profileId);
  return profileId;
}
```

---

## Best Practices

### 1. Profile Management

- **Create Profile First**: Always create or select a profile before syncing
- **Store Profile ID**: Save the selected `profileId` in extension storage
- **Profile Isolation**: Each profile has separate bookmarks and change history
- **Multiple Profiles**: Support multiple profiles if user has multiple browsers

### 2. Sync Operations

- **Regular Syncs**: Sync frequently to keep change history granular
- **Batch Changes**: All changes in one sync share the same `syncBatchId`
- **Efficient Tracking**: Only actual changes are logged (no duplicates)

### 2. Querying Changes

- **Use Pagination**: Always use `limit` and `offset` for large histories
- **Filter by Date**: Use `startDate`/`endDate` to get changes between syncs
- **Sync Batch Queries**: Use `syncBatchId` to see all changes from one sync
- **Recent Changes**: Use `/history/recent` for activity feeds

### 3. Performance

- **Indexed Queries**: All queries are optimized with database indexes
- **Selective Fields**: Only tracked fields are stored (efficient JSONB)
- **Pagination**: Always paginate large result sets

### 4. Extension Integration

- **Store Sync Batch IDs**: Save `syncBatchId` from each sync to query later
- **Track Last Sync**: Store last sync timestamp to get changes since then
- **Show Changes**: Display change history to users in extension UI
- **Error Handling**: Handle sync failures gracefully (changes won't be tracked if sync fails)

---

## Change Log Structure

### Field Changes

Each change log shows exactly what changed:

```json
{
  "fieldChanges": [
    {
      "field": "title",
      "oldValue": "Old Title",
      "newValue": "New Title",
      "changeType": "modified"
    },
    {
      "field": "position",
      "oldValue": 0,
      "newValue": 5,
      "changeType": "modified"
    }
  ]
}
```

### Change Types

- **`added`** - Field was added (new bookmark)
- **`modified`** - Field value changed
- **`removed`** - Field was removed (deleted bookmark)

### Complete Change Log Example

```json
{
  "id": "change-log-uuid",
  "bookmarkId": "bookmark-uuid",
  "bookmarkTitle": "GitHub",
  "changeType": "updated",
  "source": "sync",
  "fieldChanges": [
    {
      "field": "title",
      "oldValue": "GitHub",
      "newValue": "GitHub - Code Hosting",
      "changeType": "modified"
    },
    {
      "field": "url",
      "oldValue": "https://github.com",
      "newValue": "https://github.com/new",
      "changeType": "modified"
    },
    {
      "field": "position",
      "oldValue": 0,
      "newValue": 3,
      "changeType": "modified"
    }
  ],
  "oldValues": {
    "title": "GitHub",
    "url": "https://github.com",
    "position": 0
  },
  "newValues": {
    "title": "GitHub - Code Hosting",
    "url": "https://github.com/new",
    "position": 3
  },
  "syncBatchId": "sync-batch-uuid-2",
  "createdAt": "2024-01-15T11:30:00Z"
}
```

---

## Use Cases

### 1. Show User What Changed

```typescript
// After sync, show user what changed
const changes = await getRecentChanges(profileId);
changes.changes.forEach(change => {
  if (change.changeType === 'created') {
    showNotification(`Added: ${change.bookmarkTitle}`);
  } else if (change.changeType === 'updated') {
    const titleChange = change.fieldChanges.find(f => f.field === 'title');
    if (titleChange) {
      showNotification(
        `Renamed: ${titleChange.oldValue} → ${titleChange.newValue}`,
      );
    }
  }
});
```

### 2. Track Changes Between Syncs

```typescript
// Store last sync time
let lastSyncTime = localStorage.getItem('lastSyncTime');

// After sync
await syncBookmarks(profileId, bookmarks);
const now = new Date().toISOString();

// Get changes since last sync
if (lastSyncTime) {
  const changes = await getRecentChanges(profileId, new Date(lastSyncTime));
  console.log(`Changes since last sync: ${changes.total}`);
}

// Update last sync time
localStorage.setItem('lastSyncTime', now);
```

### 3. Show Bookmark History

```typescript
// Show history for a specific bookmark
async function showBookmarkHistory(bookmarkId: string) {
  const history = await getBookmarkHistory(profileId, bookmarkId);

  history.changes.forEach(change => {
    console.log(`${change.createdAt}: ${change.changeType}`);
    change.fieldChanges.forEach(field => {
      console.log(`  ${field.field}: ${field.oldValue} → ${field.newValue}`);
    });
  });
}
```

---

## Troubleshooting

### Changes Not Showing

1. **Check Sync Success**: Changes are only tracked if sync succeeds
2. **Verify Sync Batch**: Each sync gets a new `syncBatchId`
3. **Check Date Filters**: Ensure date ranges include your sync time
4. **No-Op Changes**: Identical changes are skipped (no log created)

### Performance

1. **Use Pagination**: Always limit results with `limit` parameter
2. **Filter by Date**: Use date ranges to limit query scope
3. **Sync Batch Queries**: Query by `syncBatchId` for fastest results

---

## Summary

- **Automatic Tracking**: All sync operations automatically create change logs
- **Sync Batch Grouping**: Each sync groups changes with a unique `syncBatchId`
- **Field-Level Details**: See exactly what changed in each bookmark
- **History APIs**: Query changes by bookmark, profile, sync batch, or date range
- **Extension Ready**: Perfect for showing users what changed between syncs

**No additional code needed** - Just call the sync API and query the history APIs to see all changes!
