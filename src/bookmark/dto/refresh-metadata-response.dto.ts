import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class RefreshMetadataResponseDto {
  @Expose()
  id: string;

  @Expose()
  success: boolean;

  @Expose()
  message?: string;

  @Expose()
  metadata?: Record<string, unknown>;
}
