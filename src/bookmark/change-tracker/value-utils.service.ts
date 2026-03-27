import { Injectable } from '@nestjs/common';

import { Bookmark } from '../entity/bookmark.entity';

import type { BookmarkValuesSnapshot } from './types';

@Injectable()
export class BookmarkValueUtils {
  /**
   * Check if two values are equal (handles Date objects)
   */
  valuesEqual(a: unknown, b: unknown): boolean {
    if (a === b) return true;
    if (a == null || b == null) return a == b;

    if (a instanceof Date && b instanceof Date) {
      return a.getTime() === b.getTime();
    }

    return false;
  }

  /**
   * Serialize value for storage (convert Date to ISO string)
   */
  serializeValue(value: unknown): unknown {
    if (value instanceof Date) {
      return value.toISOString();
    }
    return value;
  }

  /**
   * Sanitize values for JSON storage (remove circular refs, convert Dates)
   */
  sanitizeValues(values: Partial<Bookmark>): BookmarkValuesSnapshot {
    const sanitized: BookmarkValuesSnapshot = {
      title: values.title,
      url: values.url ?? null,
      position: values.position,
      parentId: values.parentId ?? null,
      type: values.type,
      dateGroupModified: this.serializeDate(values.dateGroupModified),
      description: values.description ?? null,
      tags: values.tags ?? null,
    };

    return this.removeUndefinedFields(sanitized);
  }

  /**
   * Serialize a date value to ISO string or null
   */
  private serializeDate(
    date: Date | null | undefined,
  ): string | null | undefined {
    if (date === undefined) return undefined;
    if (date === null) return null;
    return date instanceof Date ? date.toISOString() : null;
  }

  /**
   * Remove fields that are undefined from the snapshot
   */
  private removeUndefinedFields(
    snapshot: BookmarkValuesSnapshot,
  ): BookmarkValuesSnapshot {
    const cleaned: BookmarkValuesSnapshot = {};

    if (snapshot.title !== undefined) cleaned.title = snapshot.title;
    if (snapshot.url !== undefined) cleaned.url = snapshot.url;
    if (snapshot.position !== undefined) cleaned.position = snapshot.position;
    if (snapshot.parentId !== undefined) cleaned.parentId = snapshot.parentId;
    if (snapshot.type !== undefined) cleaned.type = snapshot.type;
    if (snapshot.dateGroupModified !== undefined) {
      cleaned.dateGroupModified = snapshot.dateGroupModified;
    }
    if (snapshot.description !== undefined) {
      cleaned.description = snapshot.description;
    }
    if (snapshot.tags !== undefined) cleaned.tags = snapshot.tags;

    return cleaned;
  }
}
