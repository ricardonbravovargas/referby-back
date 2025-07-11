import {
  IsEmail,
  IsNotEmpty,
  MinLength,
  Matches,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { UserRole } from '../auth/roles.enum';

export class CreateUserDto {
  @IsNotEmpty()
  name: string;

  @IsEmail({}, { message: 'Correo electrónico no válido' })
  email: string;

  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @Matches(/(?=.*[A-Z])/, {
    message: 'La contraseña debe contener al menos una letra mayúscula',
  })
  @Matches(/(?=.*[a-z])/, {
    message: 'La contraseña debe contener al menos una letra minúscula',
  })
  @Matches(/(?=.*[0-9])/, {
    message: 'La contraseña debe contener al menos un número',
  })
  @Matches(/(?=.*[!@#$%^&*])/, {
    message:
      'La contraseña debe contener al menos un carácter especial (!@#$%^&*)',
  })
  password: string;

  @IsOptional()
  @IsEnum(UserRole, {
    message: 'El rol debe ser cliente, empresa o admin',
  })
  role?: UserRole;

  @IsOptional()
  @IsString()
  empresaNombre?: string;

  @IsOptional()
  @IsUUID()
  referredBy?: string;

  @IsOptional()
  @IsEmail()
  empresaEmail?: string;

  // ✅ NUEVOS CAMPOS PARA UBICACIÓN
  @IsOptional()
  @IsString()
  ciudad?: string;

  @IsOptional()
  @IsString()
  provincia?: string;

  @IsOptional()
  @IsString()
  pais?: string;

  @IsOptional()
  @IsString()
  codigoPostal?: string;

  @IsOptional()
  @IsString()
  direccion?: string;
}
