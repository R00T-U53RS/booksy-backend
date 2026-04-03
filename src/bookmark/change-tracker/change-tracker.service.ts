import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { BookmarkChangeLog } from './bookmark-change-log.entity';
import { ChangeType } from './enums';
import { BookmarkFieldDiff } from './field-diff.service';
import {
  TrackCreationOptions,
  TrackDeletionOptions,
  TrackMoveOptions,
  TrackUpdateOptions,
} from './types';
import { BookmarkValueUtils } from './value-utils.service';

@Injectable()
export class BookmarkChangeTracker {
  constructor(
    @InjectRepository(BookmarkChangeLog)
    private readonly changeLogRepository: Repository<BookmarkChangeLog>,
    private readonly fieldDiff: BookmarkFieldDiff,
    private readonly valueUtils: BookmarkValueUtils,
  ) {}

  private async nextBookmarkLogVersion(
    bookmarkId: string,
    repo: Repository<BookmarkChangeLog>,
  ): Promise<number> {
    const row = await repo
      .createQueryBuilder('log')
      .select('COALESCE(MAX(log.version), 0)', 'max')
      .where('log.bookmarkId = :bookmarkId', { bookmarkId })
      .getRawOne<{ max: string }>();
    return Number(row?.max) + 1;
  }

  trackUpdate(options: TrackUpdateOptions): Promise<BookmarkChangeLog | null> {
    return this.trackUpdateWithRepo(this.changeLogRepository, options);
  }

  trackCreation(options: TrackCreationOptions): Promise<BookmarkChangeLog> {
    return this.trackCreationWithRepo(this.changeLogRepository, options);
  }

  trackDeletion(options: TrackDeletionOptions): Promise<BookmarkChangeLog> {
    return this.trackDeletionWithRepo(this.changeLogRepository, options);
  }

  trackMove(options: TrackMoveOptions): Promise<BookmarkChangeLog> {
    return this.trackMoveWithRepo(this.changeLogRepository, options);
  }

  /**
   * Track a bookmark update with field-level changes (using provided repository)
   */
  async trackUpdateWithRepo(
    changeLogRepo: Repository<BookmarkChangeLog>,
    options: TrackUpdateOptions,
  ): Promise<BookmarkChangeLog | null> {
    const {
      bookmark,
      oldValues,
      newValues,
      source,
      userId,
      profileId,
      syncBatchId,
    } = options;

    const fieldChanges = this.fieldDiff.generateFieldChanges(
      oldValues,
      newValues,
    );

    if (fieldChanges.length === 0) {
      return null;
    }

    const version = await this.nextBookmarkLogVersion(
      bookmark.id,
      changeLogRepo,
    );

    const changeLog = changeLogRepo.create({
      bookmarkId: bookmark.id,
      version,
      changeType: ChangeType.UPDATED,
      source,
      fieldChanges,
      oldValues: this.valueUtils.sanitizeValues(oldValues),
      newValues: this.valueUtils.sanitizeValues(newValues),
      userId,
      profileId,
      syncBatchId,
    });

    return changeLogRepo.save(changeLog);
  }

  /**
   * Track a bookmark creation (using provided repository)
   */
  async trackCreationWithRepo(
    changeLogRepo: Repository<BookmarkChangeLog>,
    options: TrackCreationOptions,
  ): Promise<BookmarkChangeLog> {
    const { bookmark, source, userId, profileId, syncBatchId } = options;

    const newValues = this.fieldDiff.extractTrackedFields(bookmark);
    const version = await this.nextBookmarkLogVersion(
      bookmark.id,
      changeLogRepo,
    );

    const changeLog = changeLogRepo.create({
      bookmarkId: bookmark.id,
      version,
      changeType: ChangeType.CREATED,
      source,
      fieldChanges: null,
      oldValues: undefined,
      newValues: this.valueUtils.sanitizeValues(newValues),
      userId,
      profileId,
      syncBatchId,
    });

    return changeLogRepo.save(changeLog);
  }

  /**
   * Track a bookmark deletion (using provided repository)
   */
  async trackDeletionWithRepo(
    changeLogRepo: Repository<BookmarkChangeLog>,
    options: TrackDeletionOptions,
  ): Promise<BookmarkChangeLog> {
    const { bookmark, source, userId, profileId, syncBatchId } = options;

    const oldValues = this.fieldDiff.extractTrackedFields(bookmark);
    const fieldChanges = this.fieldDiff.buildDeletionFieldChanges(oldValues);
    const version = await this.nextBookmarkLogVersion(
      bookmark.id,
      changeLogRepo,
    );

    const changeLog = changeLogRepo.create({
      bookmarkId: bookmark.id,
      version,
      changeType: ChangeType.DELETED,
      source,
      fieldChanges,
      oldValues: this.valueUtils.sanitizeValues(oldValues),
      newValues: undefined,
      userId,
      profileId,
      syncBatchId,
    });

    return changeLogRepo.save(changeLog);
  }

  /**
   * Track a bookmark move (using provided repository)
   */
  async trackMoveWithRepo(
    changeLogRepo: Repository<BookmarkChangeLog>,
    options: TrackMoveOptions,
  ): Promise<BookmarkChangeLog> {
    const {
      bookmark,
      oldPosition,
      newPosition,
      oldParentId,
      newParentId,
      source,
      userId,
      profileId,
      syncBatchId,
    } = options;

    const fieldChanges = this.fieldDiff.buildMoveFieldChanges(
      oldPosition,
      newPosition,
      oldParentId,
      newParentId,
    );
    const { oldValues, newValues } = this.fieldDiff.buildMoveValues({
      bookmark,
      oldPosition,
      newPosition,
      oldParentId,
      newParentId,
    });

    const version = await this.nextBookmarkLogVersion(
      bookmark.id,
      changeLogRepo,
    );

    const changeLog = changeLogRepo.create({
      bookmarkId: bookmark.id,
      version,
      changeType: ChangeType.MOVED,
      source,
      fieldChanges,
      oldValues: this.valueUtils.sanitizeValues(oldValues),
      newValues: this.valueUtils.sanitizeValues(newValues),
      userId,
      profileId,
      syncBatchId,
    });

    return changeLogRepo.save(changeLog);
  }
}
