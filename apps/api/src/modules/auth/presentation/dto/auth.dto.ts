import { IsNotEmpty, IsString, MaxLength } from "class-validator";

export class SignInDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  login!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  password!: string;
}

export interface SignInResponse {
  sessionId: string;
  message?: string;
}