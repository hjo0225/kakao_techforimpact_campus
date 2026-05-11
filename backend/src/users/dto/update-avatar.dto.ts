import { IsObject } from 'class-validator'

export class UpdateAvatarDto {
  @IsObject()
  avatarConfig!: Record<string, unknown>
}
