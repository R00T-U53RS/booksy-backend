import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { User } from '../users/entities/user.entity';

import { CreateProfileDto } from './dto/create-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { Profile } from './entities/profile.entity';

@Injectable()
export class ProfileService {
  constructor(
    @InjectRepository(Profile)
    private readonly profileRepository: Repository<Profile>,
  ) {}

  async create(
    createProfileDto: CreateProfileDto,
    user: User,
  ): Promise<Profile> {
    const profile = this.profileRepository.create({
      ...createProfileDto,
      user,
    });

    const saved = await this.profileRepository.save(profile);

    return this.findOne(saved.id, user.id);
  }

  findAll(userId: string): Promise<Profile[]> {
    return this.profileRepository.find({
      where: { user: { id: userId } },
      order: { updatedAt: 'DESC' },
    });
  }

  async findOne(id: string, userId: string): Promise<Profile> {
    const profile = await this.profileRepository.findOne({
      where: { id, user: { id: userId } },
      relations: ['bookmarks'],
    });

    if (!profile) {
      throw new NotFoundException(`Profile with id ${id} not found`);
    }

    if (!profile.bookmarks) {
      profile.bookmarks = [];
    }

    return profile;
  }

  async update(
    id: string,
    updateProfileDto: UpdateProfileDto,
    userId: string,
  ): Promise<Profile> {
    const profile = await this.findOne(id, userId);

    Object.assign(profile, updateProfileDto);
    await this.profileRepository.save(profile);

    return this.findOne(id, userId);
  }

  async remove(id: string, userId: string): Promise<void> {
    const profile = await this.findOne(id, userId);
    await this.profileRepository.remove(profile);
  }
}
