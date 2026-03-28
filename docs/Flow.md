# Sample Frontend Data - Bookmark Sync Flow

## 📦 Input Data Structure

This is the raw bookmark tree structure sent from the frontend (browser extension) to the backend sync endpoint.

```json
[
  {
    "id": "0",
    "title": "",
    "parentId": "0",
    "index": 0,
    "dateAdded": 1769088245687,
    "syncing": false,
    "children": [
      {
        "id": "1",
        "title": "Bookmarks bar",
        "parentId": "0",
        "index": 0,
        "dateAdded": 1769088245687,
        "dateGroupModified": 1769089072553,
        "folderType": "bookmarks-bar",
        "syncing": false,
        "children": [
          {
            "id": "7",
            "title": "Folder1",
            "parentId": "1",
            "index": 0,
            "dateAdded": 1769089053930,
            "dateGroupModified": 1769089074681,
            "syncing": false,
            "children": [
              {
                "id": "8",
                "title": "Folder1 - Google Search",
                "url": "https://www.google.com/search?q=Folder1&oq=Folder1&...",
                "parentId": "7",
                "index": 0,
                "dateAdded": 1769089072553,
                "syncing": false
              }
            ]
          },
          {
            "id": "5",
            "title": "https://www.google.com/search?q=reare&oq=reare&...",
            "url": "https://www.google.com/sorry/index?continue=...",
            "parentId": "1",
            "index": 1,
            "dateAdded": 1769088264574,
            "syncing": false
          }
        ]
      },
      {
        "id": "2",
        "title": "Other bookmarks",
        "parentId": "0",
        "index": 1,
        "dateAdded": 1769088245687,
        "dateGroupModified": 1769089084642,
        "folderType": "other",
        "syncing": false,
        "children": [
          {
            "id": "9",
            "title": "Folder1 - Google Search",
            "url": "https://www.google.com/search?q=Folder1&oq=Folder1&...",
            "parentId": "2",
            "index": 0,
            "dateAdded": 1769089084642,
            "syncing": false
          },
          {
            "id": "6",
            "title": "https://www.google.com/search?q=rewrewe&oq=rewrewe&...",
            "url": "https://www.google.com/sorry/index?continue=...",
            "parentId": "2",
            "index": 1,
            "dateAdded": 1769088271701,
            "syncing": false
          }
        ]
      }
    ]
  }
]
```

## 📊 Data Breakdown

### Root Level (id: "0")

- Empty title, special root bookmark
- Contains 2 children: "Bookmarks bar" (id: "1") and "Other bookmarks" (id: "2")

### "Bookmarks bar" (id: "1", parentId: "0")

- **Type:** Folder (has children, no URL)
- Contains 2 items:
  1. **Folder1** (id: "7") - Folder with 1 bookmark inside
  2. **Bookmark** (id: "5") - Direct bookmark

### "Folder1" (id: "7", parentId: "1")

- **Type:** Folder (has children)
- Contains 1 bookmark: "Folder1 - Google Search" (id: "8")

### "Other bookmarks" (id: "2", parentId: "0")

- **Type:** Folder (has children, no URL)
- Contains 2 bookmarks:
  1. "Folder1 - Google Search" (id: "9")
  2. Another bookmark (id: "6")

---

## 🔄 Step-by-Step Sync Process with This Data

### Step 1: `BookmarkSyncValidator.validateSyncData()`

**What it does:**

- Checks if the input is an array (not null/undefined)
- ✅ **Result:** Passes - data is a valid array

### Step 2: `BookmarkTreeFlattener.flattenSyncTree()`

**What it does:**
Recursively processes the tree and groups items by `parentId`.

**Processing order:**

1. **Root (id: "0")** → Skipped (special ID)
   - Processes children: "1" and "2"
2. **"Bookmarks bar" (id: "1")** → Added to group `parentId: "0"`
   - Processes children: "7" and "5"
3. **"Folder1" (id: "7")** → Added to group `parentId: "1"`
   - Processes child: "8"
4. **Bookmark (id: "8")** → Added to group `parentId: "7"`
5. **Bookmark (id: "5")** → Added to group `parentId: "1"`
6. **"Other bookmarks" (id: "2")** → Added to group `parentId: "0"`
   - Processes children: "9" and "6"
7. **Bookmark (id: "9")** → Added to group `parentId: "2"`
8. **Bookmark (id: "6")** → Added to group `parentId: "2"`

**Output (grouped by parentId):**

```
parentId = "" (root):
  - id: "1" (Bookmarks bar, index: 0)
  - id: "2" (Other bookmarks, index: 1)

parentId = "1" (Bookmarks bar):
  - id: "7" (Folder1, index: 0)
  - id: "5" (bookmark, index: 1)

parentId = "7" (Folder1):
  - id: "8" (Folder1 - Google Search, index: 0)

parentId = "2" (Other bookmarks):
  - id: "9" (Folder1 - Google Search, index: 0)
  - id: "6" (bookmark, index: 1)
```

**Also during flattening:**

- Each item is validated (`validateAndSanitizeSyncItem()`)
- Title trimmed and limited to 255 chars
- URL validated if present
- Index validated (must be >= 0)

### Step 3: `BookmarkSyncValidator.validateParentReferences()`

**What it does:**
Checks that all `parentId` references point to valid folders/bookmarks.

**Referenced parentIds:**

- `"0"` → Special (skipped)
- `"1"` → "Bookmarks bar" folder (exists in sync data)
- `"2"` → "Other bookmarks" folder (exists in sync data)
- `"7"` → "Folder1" folder (exists in sync data)

**Validation:**

- Collects all folder IDs from sync data: `["1", "2", "7"]`
- Checks if referenced parents exist
- ✅ **Result:** All parents exist - validation passes

### Step 4: `BookmarkChangeAnalyzer.categorizeChanges()`

**What it does:**
Compares sync data with existing database bookmarks to find what changed.

**For each parent group:**

#### Root level (parentId: ""):

- Checks position 0: Is there an existing bookmark at position 0?
  - If yes and changed → **modified**
  - If no → **added** (id: "1")
- Checks position 1: Is there an existing bookmark at position 1?
  - If yes and changed → **modified**
  - If no → **added** (id: "2")

#### "Bookmarks bar" (parentId: "1"):

- Position 0: Check if existing bookmark at position 0
  - If matches id "7" and changed → **modified**
  - If different → **modified** (different bookmark)
  - If none → **added**
- Position 1: Check if existing bookmark at position 1
  - If matches id "5" and changed → **modified**
  - If none → **added**

#### "Folder1" (parentId: "7"):

- Position 0: Check if existing bookmark at position 0
  - If matches id "8" and changed → **modified**
  - If none → **added**

#### "Other bookmarks" (parentId: "2"):

- Position 0: Check if existing bookmark at position 0
  - If matches id "9" and changed → **modified**
  - If none → **added**
- Position 1: Check if existing bookmark at position 1
  - If matches id "6" and changed → **modified**
  - If none → **added**

**Also tracks:**

- `positionsPresentInSync`: Map of which positions exist in sync data
  - `""` → `Set([0, 1])`
  - `"1"` → `Set([0, 1])`
  - `"7"` → `Set([0])`
  - `"2"` → `Set([0, 1])`

**Find deleted items:**

- For each existing bookmark in database:
  - If its position is NOT in `positionsPresentInSync` for its parent → **deleted**

**Output:**

- `modified`: Array of bookmarks that exist and changed
- `added`: Array of new bookmarks
- `deleted`: Array of bookmarks not in sync data

### Step 5: `BookmarkChangeAnalyzer.detectMoves()`

**What it does:**
Finds bookmarks that were "deleted" at one position but "added" at another (they moved).

**Process:**

1. For each item in `deleted`:
   - If it's a folder → Skip (folders can't move)
   - If it's a bookmark → Look in `added` for matching title + URL
2. If match found:
   - It's a **move**, not delete+add
   - Remove from both `deleted` and `added`
   - Add to `moved`

**Example scenario:**

- If "Folder1 - Google Search" (id: "8") was deleted from position 0 in parent "1"
- But "Folder1 - Google Search" (id: "9") was added at position 0 in parent "2"
- These might be the same bookmark that moved between folders!

**Output:**

- `moved`: Bookmarks that moved (same content, different position/parent)
- `remainingDeleted`: Truly deleted bookmarks
- `remainingAdded`: Truly new bookmarks

### Step 6: `BookmarkSyncProcessor.processChangesInTransaction()`

**What it does:**
Applies all changes to the database in a single transaction.

**Order of operations:**

1. **Update modified bookmarks:**
   - Batch update all bookmarks in `modified` array
   - Updates: title, URL, position, parentId, type, dateGroupModified

2. **Update moved bookmarks:**
   - Batch update all bookmarks in `moved` array
   - Changes their position and parentId

3. **Insert new bookmarks:**
   - Batch insert all bookmarks in `remainingAdded` array
   - Creates new database records

4. **Soft delete removed bookmarks:**
   - Batch update all bookmarks in `remainingDeleted` array
   - Sets `deleted = true` (not actually removed)

**Transaction ensures:**

- All changes succeed together, or none at all
- Database stays consistent

---

## 🎯 Key Insights from This Example

1. **Tree Structure:** Frontend sends nested tree, backend flattens it
2. **Position-Based Matching:** Uses `index` (position) to match, not IDs
3. **Folder Detection:** Items with `children` or no `url` are folders
4. **Special IDs:** IDs "0", "1", "2" are browser root folders (skipped)
5. **Move Detection:** Prevents false deletions when bookmarks move

---

## 📝 Summary

This sync process:

1. ✅ Validates the data structure
2. ✅ Flattens the tree into parent groups
3. ✅ Validates parent references
4. ✅ Compares with existing data to find changes
5. ✅ Detects moves vs. true deletions
6. ✅ Applies all changes atomically

The result: Database matches the frontend bookmark structure!
