import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class UpdateBookmarkResponseDto {
  @Expose()
  id: string;
}
