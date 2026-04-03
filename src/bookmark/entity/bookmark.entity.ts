import { Exclude, Expose } from 'class-transformer';
import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { Profile } from '../../profile/entities/profile.entity';
import { User } from '../../users/entities/user.entity';

export enum BookmarkType {
  FOLDER = 'folder',
  BOOKMARK = 'bookmark',
}

@Entity('bookmarks')
@Exclude()
export class Bookmark {
  @Expose()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Expose()
  @Column({ nullable: true })
  parentId: string;

  @Expose()
  @Column({ default: 0 })
  position: number;

  @Expose()
  @Column({ enum: BookmarkType })
  type: BookmarkType;

  @Expose()
  @Column()
  title: string;

  @Expose()
  @Column({ nullable: true })
  url: string;

  @Expose()
  @Column({ nullable: true })
  description?: string;

  @Expose()
  @CreateDateColumn()
  createdAt: Date;

  @Expose()
  @UpdateDateColumn()
  updatedAt: Date;

  @Expose()
  @Column({ type: 'timestamp', nullable: true })
  dateGroupModified: Date;

  @Expose()
  @Column({ nullable: true })
  tags?: string;

  @Expose()
  @Column({ default: false })
  deleted: boolean;

  @ManyToOne(() => User, {
    nullable: false,
  })
  user: User;

  @ManyToOne(() => Profile, profile => profile.bookmarks, {
    nullable: false,
  })
  profile: Profile;
}
