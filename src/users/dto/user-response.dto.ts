import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class UserResponseDto {
  @Expose()
  id: number;

  @Expose()
  username: string;

  @Expose()
  email?: string;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;
}
