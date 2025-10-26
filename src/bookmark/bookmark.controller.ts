import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';

import { BookmarkService } from './bookmark.service';
import { Bookmark } from './entity/bookmark.entity';

@Controller('bookmarks')
export class BookmarkController {
  constructor(private readonly bookmarkService: BookmarkService) {}

  @Get('set/:setId')
  async getAllInSet(@Param('setId') setId: string) {
    const bookmarks = await this.bookmarkService.findAllBookmarksInSet(setId);
    return this.bookmarkService.buildTree(bookmarks);
  }

  @Get('set/:setId/flat')
  getAllInSetFlat(@Param('setId') setId: string) {
    return this.bookmarkService.findAllBookmarksInSet(setId);
  }

  @Get('set/:setId/roots')
  getRootBookmarks(@Param('setId') setId: string) {
    return this.bookmarkService.findRootBookmarks(setId);
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
