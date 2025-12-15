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
export class Bookmark {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  parentId: string;

  @Column({ default: 0 })
  position: number;

  @Column({ enum: BookmarkType })
  type: BookmarkType;

  @Column()
  title: string;

  @Column({ nullable: true })
  url: string;

  @Column({ nullable: true })
  description?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  dateGroupModified: Date;

  @Column({ nullable: true })
  tags?: string;

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
