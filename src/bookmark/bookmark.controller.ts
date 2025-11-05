import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';

import { BookmarkService } from './bookmark.service';
import { Bookmark } from './entity/bookmark.entity';

@Controller('bookmarks')
export class BookmarkController {
  constructor(private readonly bookmarkService: BookmarkService) {}

  @Get('set/:setId')
  async getAllInProfile(@Param('profileId') profileId: string) {
    const bookmarks =
      await this.bookmarkService.findAllBookmarksInProfile(profileId);
    return this.bookmarkService.buildTree(bookmarks);
  }

  @Get('profile/:profileId/flat')
  getAllInProfileFlat(@Param('profileId') profileId: string) {
    return this.bookmarkService.findAllBookmarksInProfile(profileId);
  }

  @Get('profile/:profileId/roots')
  getRootBookmarks(@Param('profileId') profileId: string) {
    return this.bookmarkService.findRootBookmarks(profileId);
  }

  @Post()
  create(@Body() createData: Partial<Bookmark>) {
    return this.bookmarkService.create(createData);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateData: Partial<Bookmark>) {
    return this.bookmarkService.update(id, updateData);
  }
}
