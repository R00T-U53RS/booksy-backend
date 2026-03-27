import { Injectable } from '@nestjs/common';

import { Bookmark, BookmarkType } from '../entity/bookmark.entity';

import { FieldChange } from './enums';
import type { FieldValue } from './types';
import { BookmarkValueUtils } from './value-utils.service';

@Injectable()
export class BookmarkFieldDiff {
  private readonly trackedFields = [
    'title',
    'url',
    'position',
    'parentId',
    'type',
    'dateGroupModified',
    'description',
    'tags',
  ];

  constructor(private readonly valueUtils: BookmarkValueUtils) {}

  /**
   * Generate field-level changes between old and new values
   */
  generateFieldChanges(
    oldValues: Partial<Bookmark>,
    newValues: Partial<Bookmark>,
  ): FieldChange[] {
    const changes: FieldChange[] = [];
    const allFields = Array.from(
      new Set([...Object.keys(oldValues), ...Object.keys(newValues)]),
    );

    for (const field of allFields) {
      if (!this.trackedFields.includes(field)) {
        continue;
      }

      const oldValue = oldValues[field as keyof Bookmark];
      const newValue = newValues[field as keyof Bookmark];

      if (this.valueUtils.valuesEqual(oldValue, newValue)) {
        continue;
      }

      const changeType = this.determineChangeType(oldValue, newValue);
      changes.push({
        field,
        oldValue: this.serializeToFieldValue(oldValue),
        newValue: this.serializeToFieldValue(newValue),
        changeType,
      });
    }

    return changes;
  }

  /**
   * Build field changes for creation (all fields are added)
   */
  buildCreationFieldChanges(newValues: Partial<Bookmark>): FieldChange[] {
    const changes: FieldChange[] = [];

    for (const field of this.trackedFields) {
      const value = newValues[field as keyof Bookmark];
      if (value !== undefined) {
        changes.push({
          field,
          oldValue: null,
          newValue: this.serializeToFieldValue(value),
          changeType: 'added' as const,
        });
      }
    }

    return changes;
  }

  /**
   * Build field changes for deletion (all fields are removed)
   */
  buildDeletionFieldChanges(oldValues: Partial<Bookmark>): FieldChange[] {
    const changes: FieldChange[] = [];

    for (const field of this.trackedFields) {
      const value = oldValues[field as keyof Bookmark];
      if (value !== undefined) {
        changes.push({
          field,
          oldValue: this.serializeToFieldValue(value),
          newValue: null,
          changeType: 'removed' as const,
        });
      }
    }

    return changes;
  }

  /**
   * Build field changes for move operation
   */
  buildMoveFieldChanges(
    oldPosition: number,
    newPosition: number,
    oldParentId: string | null,
    newParentId: string | null,
  ): FieldChange[] {
    const fieldChanges: FieldChange[] = [];

    if (oldPosition !== newPosition) {
      fieldChanges.push({
        field: 'position',
        oldValue: oldPosition,
        newValue: newPosition,
        changeType: 'modified',
      });
    }

    if (oldParentId !== newParentId) {
      fieldChanges.push({
        field: 'parentId',
        oldValue: oldParentId ?? '',
        newValue: newParentId ?? '',
        changeType: 'modified',
      });
    }

    return fieldChanges;
  }

  /**
   * Build values for move operation
   */
  buildMoveValues(options: {
    bookmark: Bookmark;
    oldPosition: number;
    newPosition: number;
    oldParentId: string | null;
    newParentId: string | null;
  }): {
    oldValues: Partial<Bookmark>;
    newValues: Partial<Bookmark>;
  } {
    const { bookmark, oldPosition, newPosition, oldParentId, newParentId } =
      options;

    return {
      oldValues: {
        position: oldPosition,
        parentId: oldParentId ?? '',
      },
      newValues: {
        position: newPosition,
        parentId: newParentId ?? '',
        title: bookmark.title,
        url: bookmark.url,
        type: bookmark.type,
      },
    };
  }

  /**
   * Extract tracked fields from a bookmark entity
   */
  extractTrackedFields(bookmark: Bookmark): Partial<Bookmark> {
    return {
      title: bookmark.title,
      url: bookmark.url,
      position: bookmark.position,
      parentId: bookmark.parentId,
      type: bookmark.type,
      dateGroupModified: bookmark.dateGroupModified,
      description: bookmark.description,
      tags: bookmark.tags,
    };
  }

  private determineChangeType(
    oldValue: unknown,
    newValue: unknown,
  ): 'added' | 'modified' | 'removed' {
    if (oldValue === undefined || oldValue === null) {
      return 'added';
    }
    if (newValue === undefined || newValue === null) {
      return 'removed';
    }
    return 'modified';
  }

  /**
   * Serialize a value to FieldValue type (string | number | BookmarkType | null)
   */
  private serializeToFieldValue(value: unknown): FieldValue {
    if (value === null || value === undefined) {
      return null;
    }

    // Serialize Date to ISO string
    if (value instanceof Date) {
      return value.toISOString();
    }

    // Keep string and number as-is
    if (typeof value === 'string' || typeof value === 'number') {
      return value;
    }

    // Handle BookmarkType enum
    if (value === BookmarkType.FOLDER || value === BookmarkType.BOOKMARK) {
      return value;
    }

    // For boolean, convert to string representation
    if (typeof value === 'boolean') {
      return value ? 'true' : 'false';
    }

    // Fallback: return null for unexpected types (shouldn't happen for tracked fields)
    return null;
  }
}
