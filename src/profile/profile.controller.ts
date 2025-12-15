import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';

import { JwtGuard } from '../auth/guards/jwt.guard';
import { User } from '../users/entities/user.entity';

import { CreateProfileDto } from './dto/create-profile.dto';
import { ProfileResponseDto } from './dto/profile-response.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ProfileService } from './profile.service';

@Controller('profile')
@UseGuards(JwtGuard)
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Post()
  async create(
    @Body() createProfileDto: CreateProfileDto,
    @Request() request: { user: User },
  ): Promise<ProfileResponseDto> {
    const profile = await this.profileService.create(
      createProfileDto,
      request.user,
    );
    return plainToInstance(ProfileResponseDto, profile, {
      excludeExtraneousValues: true,
    });
  }

  @Get()
  async findAll(
    @Request() request: { user: User },
  ): Promise<ProfileResponseDto[]> {
    const profiles = await this.profileService.findAll(request.user.id);
    return plainToInstance(ProfileResponseDto, profiles, {
      excludeExtraneousValues: true,
    });
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @Request() request: { user: User },
  ): Promise<ProfileResponseDto> {
    const profile = await this.profileService.findOne(id, request.user.id);
    return plainToInstance(ProfileResponseDto, profile, {
      excludeExtraneousValues: true,
    });
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateProfileDto: UpdateProfileDto,
    @Request() request: { user: User },
  ): Promise<ProfileResponseDto> {
    const profile = await this.profileService.update(
      id,
      updateProfileDto,
      request.user.id,
    );
    return plainToInstance(ProfileResponseDto, profile, {
      excludeExtraneousValues: true,
    });
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() request: { user: User }) {
    return this.profileService.remove(id, request.user.id);
  }
}
