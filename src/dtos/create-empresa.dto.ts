import { IsString, IsEmail } from 'class-validator';

export class CreateEmpresaDto {
  @IsString()
  nombre: string;

  @IsEmail()
  email: string;
}