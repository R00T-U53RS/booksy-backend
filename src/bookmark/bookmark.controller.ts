import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseBoolPipe,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';

import { JwtGuard } from '../auth/guards/jwt.guard';
import { User } from '../users/entities/user.entity';

import { BookmarkService } from './bookmark.service';
import { BookmarkChangeLog } from './change-tracker/bookmark-change-log.entity';
import { clampHistoryListLimit } from './change-tracker/history-query.constants';
import { BookmarkHistoryService } from './change-tracker/history.service';
import { CreateBookmarkDto } from './dto/create-request.dto';
import { GetRecentChangesDto } from './dto/history-request.dto';
import {
  BookmarkChangeLogDto,
  BookmarkHistoryResponseDto,
  HistoryBatchesResponseDto,
} from './dto/history-response.dto';
import { SyncBookmarkItemDto } from './dto/sync-request.dto';
import { Bookmark } from './entity/bookmark.entity';

const DEFAULT_RECENT_CHANGES_LIMIT = 50;
const DEFAULT_HISTORY_BATCHES_LIMIT = 10;

@Controller('profiles/:profileId/bookmarks')
@UseGuards(JwtGuard)
export class BookmarkController {
  constructor(
    private readonly bookmarkService: BookmarkService,
    private readonly historyService: BookmarkHistoryService,
  ) {}

  @Get()
  getAllInProfileFlat(
    @Request() request: { user: User },
    @Param('profileId', ParseUUIDPipe) profileId: string,
    @Query('includeDeleted', new DefaultValuePipe(false), ParseBoolPipe)
    includeDeleted: boolean,
  ) {
    return this.bookmarkService.findAllBookmarksInProfile(
      profileId,
      request.user.id,
      includeDeleted,
    );
  }

  @Get('tree')
  async getAllInProfileTree(
    @Request() request: { user: User },
    @Param('profileId', ParseUUIDPipe) profileId: string,
    @Query('includeDeleted', new DefaultValuePipe(false), ParseBoolPipe)
    includeDeleted: boolean,
  ) {
    const bookmarks = await this.bookmarkService.findAllBookmarksInProfile(
      profileId,
      request.user.id,
      includeDeleted,
    );
    return this.bookmarkService.buildTree(bookmarks);
  }

  @Get('roots')
  getRootBookmarks(
    @Request() request: { user: User },
    @Param('profileId', ParseUUIDPipe) profileId: string,
  ) {
    return this.bookmarkService.findRootBookmarks(profileId, request.user.id);
  }

  @Post()
  create(
    @Param('profileId', ParseUUIDPipe) profileId: string,
    @Body() createData: CreateBookmarkDto,
    @Request() request: { user: User },
  ) {
    return this.bookmarkService.create(profileId, request.user, createData);
  }

  @Post('sync')
  sync(
    @Param('profileId', ParseUUIDPipe) profileId: string,
    @Body() bookmarks: SyncBookmarkItemDto[],
    @Request() request: { user: User },
  ) {
    return this.bookmarkService.sync(profileId, request.user, bookmarks);
  }

  @Get('history/recent')
  async getRecentChanges(
    @Param('profileId', ParseUUIDPipe) profileId: string,
    @Query() query: GetRecentChangesDto,
    @Request() request: { user: User },
  ): Promise<BookmarkHistoryResponseDto> {
    const limit = clampHistoryListLimit(
      query.limit ?? DEFAULT_RECENT_CHANGES_LIMIT,
    );
    const { changes, total } = await this.historyService.getProfileHistory(
      profileId,
      request.user.id,
      { limit, offset: 0 },
    );

    const changeLogDtos = changes.map(changeLog =>
      this.mapChangeLogToDto(changeLog),
    );

    return {
      changes: changeLogDtos,
      total,
      limit,
      offset: 0,
    };
  }

  @Get('history/batches')
  async getHistoryBatches(
    @Param('profileId', ParseUUIDPipe) profileId: string,
    @Query(
      'limit',
      new DefaultValuePipe(DEFAULT_HISTORY_BATCHES_LIMIT),
      ParseIntPipe,
    )
    limit: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe)
    offset: number,
    @Request() request: { user: User },
  ): Promise<HistoryBatchesResponseDto> {
    const { batches, total } = await this.historyService.getBatchedHistory(
      profileId,
      request.user.id,
      limit,
      offset,
    );

    return {
      batches: batches.map(batch => ({
        syncBatchId: batch.syncBatchId,
        createdAt: batch.createdAt,
        counts: batch.counts,
        totalChanges: batch.totalChanges,
        source: batch.source,
        entries: batch.entries.map(e => this.mapChangeLogToDto(e)),
      })),
      total,
      limit,
      offset,
    };
  }

  private mapChangeLogToDto(
    changeLog: BookmarkChangeLog,
  ): BookmarkChangeLogDto {
    return {
      id: changeLog.id,
      bookmarkId: changeLog.bookmarkId,
      bookmarkTitle: changeLog.bookmark?.title,
      version: changeLog.version,
      changeType: changeLog.changeType,
      source: changeLog.source,
      fieldChanges: changeLog.fieldChanges ?? null,
      oldValues: changeLog.oldValues,
      newValues: changeLog.newValues,
      createdAt: changeLog.createdAt,
      syncBatchId: changeLog.syncBatchId,
    };
  }

  @Patch(':id')
  update(
    @Param('profileId', ParseUUIDPipe) profileId: string,
    @Param('id', ParseUUIDPipe) id: string,
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
