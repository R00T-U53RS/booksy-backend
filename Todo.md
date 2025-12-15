**Extension**

- When displaying the bookmarks, no hierarchy is seen
- The profile is to be chosen again and again for some reason
- The accessToken is stored in localStorage --> This is unsafe, store in cookies instead

**Backend**

- Check the fields from frontend, which should be sent or not
- Then save accordingly that way

**Sync Problems**

- When we sync, there's events but think about down time etc, when extension might not open, or not have permission
- When user imports bookmark, massive flux of changes, which one do we keep
- Think of some CRDT structure

**Future**

- Keep a delta whenever we do sync api, what changed and all that
- Have to check for malicious request, it might delete all bookmarks, so keep a copy maybe
- So id are skipped when we delete them convenient, but check by importing, do they get new ID? and if its duplicate then what
- Since the id's are unique, when I switch profiles, it will add starting from new id, that's very dubious, and confusing to keep in backend
- Check if same url can be done multiple times
- Have some limit on number of bookmarks handled
- Add time taken and other stats when switching up profiles
- Add a hash function to see if need the synced, or some way, when we send from frontend

- Test by updating folder name what happens then

**Tradeoffs**

- Won't be saving the timestamp, to update things, because we need to switch bookmarks
- Will be storing based on url, so might have duplicates

**Next Tasks**

- Update the sync more, we do not delete the other bookmarks
- Add the option to change the profile, by adding/removing bookmarks
- Add option to show a random bookmark by choosing
- Maybe use some custom solution, which will have the id prefix to check for, then depending upon that, we could update it, like as a start point
