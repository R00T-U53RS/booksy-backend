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

  /**
   * Track a bookmark update with field-level changes
   */
  trackUpdate(options: TrackUpdateOptions): Promise<BookmarkChangeLog | null> {
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

    // Skip if no actual changes detected
    if (fieldChanges.length === 0) {
      return Promise.resolve(null);
    }

    const changeLog = this.changeLogRepository.create({
      bookmarkId: bookmark.id,
      changeType: ChangeType.UPDATED,
      source,
      fieldChanges,
      oldValues: this.valueUtils.sanitizeValues(oldValues),
      newValues: this.valueUtils.sanitizeValues(newValues),
      userId,
      profileId,
      syncBatchId,
    });

    return this.changeLogRepository.save(changeLog);
  }

  /**
   * Track a bookmark creation
   */
  trackCreation(options: TrackCreationOptions): Promise<BookmarkChangeLog> {
    const { bookmark, source, userId, profileId, syncBatchId } = options;

    const newValues = this.fieldDiff.extractTrackedFields(bookmark);
    const fieldChanges = this.fieldDiff.buildCreationFieldChanges(newValues);

    const changeLog = this.changeLogRepository.create({
      bookmarkId: bookmark.id,
      changeType: ChangeType.CREATED,
      source,
      fieldChanges,
      oldValues: undefined,
      newValues: this.valueUtils.sanitizeValues(newValues),
      userId,
      profileId,
      syncBatchId,
    });

    return this.changeLogRepository.save(changeLog);
  }

  /**
   * Track a bookmark deletion
   */
  trackDeletion(options: TrackDeletionOptions): Promise<BookmarkChangeLog> {
    const { bookmark, source, userId, profileId, syncBatchId } = options;

    const oldValues = this.fieldDiff.extractTrackedFields(bookmark);
    const fieldChanges = this.fieldDiff.buildDeletionFieldChanges(oldValues);

    const changeLog = this.changeLogRepository.create({
      bookmarkId: bookmark.id,
      changeType: ChangeType.DELETED,
      source,
      fieldChanges,
      oldValues: this.valueUtils.sanitizeValues(oldValues),
      newValues: undefined,
      userId,
      profileId,
      syncBatchId,
    });

    return this.changeLogRepository.save(changeLog);
  }

  /**
   * Track a bookmark move (position/parent change)
   */
  trackMove(options: TrackMoveOptions): Promise<BookmarkChangeLog> {
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

    const changeLog = this.changeLogRepository.create({
      bookmarkId: bookmark.id,
      changeType: ChangeType.MOVED,
      source,
      fieldChanges,
      oldValues: this.valueUtils.sanitizeValues(oldValues),
      newValues: this.valueUtils.sanitizeValues(newValues),
      userId,
      profileId,
      syncBatchId,
    });

    return this.changeLogRepository.save(changeLog);
  }

  /**
   * Track a bookmark update with field-level changes (using provided repository)
   */
  trackUpdateWithRepo(
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
      return Promise.resolve(null);
    }

    const changeLog = changeLogRepo.create({
      bookmarkId: bookmark.id,
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
  trackCreationWithRepo(
    changeLogRepo: Repository<BookmarkChangeLog>,
    options: TrackCreationOptions,
  ): Promise<BookmarkChangeLog> {
    const { bookmark, source, userId, profileId, syncBatchId } = options;

    const newValues = this.fieldDiff.extractTrackedFields(bookmark);
    const fieldChanges = this.fieldDiff.buildCreationFieldChanges(newValues);

    const changeLog = changeLogRepo.create({
      bookmarkId: bookmark.id,
      changeType: ChangeType.CREATED,
      source,
      fieldChanges,
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
  trackDeletionWithRepo(
    changeLogRepo: Repository<BookmarkChangeLog>,
    options: TrackDeletionOptions,
  ): Promise<BookmarkChangeLog> {
    const { bookmark, source, userId, profileId, syncBatchId } = options;

    const oldValues = this.fieldDiff.extractTrackedFields(bookmark);
    const fieldChanges = this.fieldDiff.buildDeletionFieldChanges(oldValues);

    const changeLog = changeLogRepo.create({
      bookmarkId: bookmark.id,
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
  trackMoveWithRepo(
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

    const changeLog = changeLogRepo.create({
      bookmarkId: bookmark.id,
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
