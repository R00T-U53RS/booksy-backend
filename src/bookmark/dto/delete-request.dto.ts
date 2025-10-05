import { IsNotEmpty, IsString } from 'class-validator';

export class DeleteBookmarkRequestDto {
  @IsString()
  @IsNotEmpty()
  id: string;
}
