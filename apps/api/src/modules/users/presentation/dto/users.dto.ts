import { ApiProperty } from "@nestjs/swagger";
import { IsDateString, IsString, MaxLength, MinLength } from "class-validator";

export class CreateUserDto {
  @ApiProperty({ example: "Alex", description: "Nombre del usuario", minLength: 1, maxLength: 120 })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;
}

export class UserDto {
  @ApiProperty({ example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890", description: "UUID del usuario" })
  @IsString()
  id!: string;

  @ApiProperty({ example: "Alex", description: "Nombre del usuario" })
  @IsString()
  name!: string;

  @ApiProperty({ example: "2026-09-10T12:00:00.000Z", description: "Fecha de creación" })
  @IsDateString()
  createdAt!: string;

  @ApiProperty({ example: "2026-09-10T12:00:00.000Z", description: "Fecha de última actualización" })
  @IsDateString()
  updatedAt!: string;
}
