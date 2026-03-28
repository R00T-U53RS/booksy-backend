import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';

import { JwtGuard } from '../auth/guards/jwt.guard';
import { User } from '../users/entities/user.entity';

import { BookmarkService } from './bookmark.service';
import { BookmarkHistoryService } from './change-tracker/history.service';
import { CreateBookmarkDto } from './dto/create-request.dto';
import { GetRecentChangesDto } from './dto/history-request.dto';
import { BookmarkHistoryResponseDto } from './dto/history-response.dto';
import { SyncBookmarkItemDto } from './dto/sync-request.dto';
import { Bookmark } from './entity/bookmark.entity';

@Controller('profiles/:profileId/bookmarks')
@UseGuards(JwtGuard)
export class BookmarkController {
  constructor(
    private readonly bookmarkService: BookmarkService,
    private readonly historyService: BookmarkHistoryService,
  ) {}

  @Get()
  getAllInProfileFlat(
    @Param('profileId') profileId: string,
    @Request() request: { user: User },
  ) {
    return this.bookmarkService.findAllBookmarksInProfile(
      profileId,
      request.user.id,
    );
  }

  @Get('tree')
  async getAllInProfileTree(
    @Param('profileId') profileId: string,
    @Request() request: { user: User },
  ) {
    const bookmarks = await this.bookmarkService.findAllBookmarksInProfile(
      profileId,
      request.user.id,
    );
    return this.bookmarkService.buildTree(bookmarks);
  }

  @Get('roots')
  getRootBookmarks(
    @Param('profileId') profileId: string,
    @Request() request: { user: User },
  ) {
    return this.bookmarkService.findRootBookmarks(profileId, request.user.id);
  }

  @Post()
  create(
    @Param('profileId') profileId: string,
    @Body() createData: CreateBookmarkDto,
    @Request() request: { user: User },
  ) {
    return this.bookmarkService.create(profileId, request.user, createData);
  }

  @Post('sync')
  sync(
    @Param('profileId') profileId: string,
    @Body() bookmarks: SyncBookmarkItemDto[],
    @Request() request: { user: User },
  ) {
    return this.bookmarkService.sync(profileId, request.user, bookmarks);
  }

  @Get('history/recent')
  async getRecentChanges(
    @Param('profileId') profileId: string,
    @Query() query: GetRecentChangesDto,
    @Request() request: { user: User },
  ): Promise<BookmarkHistoryResponseDto> {
    const limit = query.limit ?? 50;
    const { changes, total } = await this.historyService.getRecentChanges(
      profileId,
      request.user.id,
      limit,
    );

    const changeLogDtos = changes.map(changeLog => ({
      id: changeLog.id,
      bookmarkId: changeLog.bookmarkId,
      bookmarkTitle: changeLog.bookmark?.title,
      changeType: changeLog.changeType,
      source: changeLog.source,
      fieldChanges: changeLog.fieldChanges,
      oldValues: changeLog.oldValues,
      newValues: changeLog.newValues,
      createdAt: changeLog.createdAt,
      syncBatchId: changeLog.syncBatchId,
    }));

    return {
      changes: changeLogDtos,
      total,
      limit,
      offset: 0,
    };
  }

  @Patch(':id')
  update(
    @Param('profileId') profileId: string,
    @Param('id') id: string,
    @Body() updateData: Partial<Bookmark>,
    @Request() request: { user: User },
  ) {
    return this.bookmarkService.update(
      profileId,
      id,
      updateData,
      request.user.id,
    );
  }
}
