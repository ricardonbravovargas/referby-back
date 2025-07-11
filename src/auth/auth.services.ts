import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { CreateUserDto } from '../dtos/create-user.dto';
import { LoginUserDto } from '../dtos/login-user.dto';
import * as bcrypt from 'bcrypt';
import { UserRole } from './roles.enum';
import { Empresa } from '../entities/empresa.entitiy';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(Empresa)
    private readonly empresaRepository: Repository<Empresa>,
  ) {}

  /**
   * Registro de nuevo usuario con hash de contraseña
   */
  async register(dto: CreateUserDto): Promise<{
    message: string;
    user: {
      id: string;
      name: string;
      email: string;
      role: UserRole;
    };
  }> {
    // Verificar si el email ya existe
    const existingUser = await this.userRepository.findOne({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('El email ya está registrado');
    }

    // Hash de la contraseña
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(dto.password, salt);

    // Crear nueva empresa si es necesario
    let empresa: Empresa | undefined = undefined;
    if (dto.empresaNombre) {
      if (!dto.empresaEmail) {
        throw new BadRequestException('Se requiere un email para la empresa');
      }

      empresa = await this.empresaRepository.save(
        this.empresaRepository.create({
          nombre: dto.empresaNombre,
          email: dto.empresaEmail,
        }),
      );
    }

    // Crear y guardar el usuario
    const userData: Partial<User> = {
      name: dto.name,
      email: dto.email,
      password: hashedPassword,
      role: dto.role || UserRole.CLIENTE,
      isActive: true,
    };

    if (empresa) {
      userData.empresa = empresa;
    }

    const newUser = this.userRepository.create(userData);
    const savedUser = await this.userRepository.save(newUser);

    return {
      message: 'Usuario registrado exitosamente',
      user: {
        id: savedUser.id,
        name: savedUser.name,
        email: savedUser.email,
        role: savedUser.role,
      },
    };
  }

  /**
   * Login de usuario con generación de JWT y registro de lastLogin
   */
  async login(dto: LoginUserDto): Promise<{
    access_token: string;
    message: string;
    user: {
      id: string;
      name: string;
      email: string;
      role: string;
      empresa?: any;
    };
  }> {
    const user = await this.userRepository.findOne({
      where: { email: dto.email },
      relations: ['empresa'],
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);

    if (!isPasswordValid) {
      throw new BadRequestException('Credenciales inválidas');
    }

    // Actualizar último login
    user.lastLogin = new Date();
    user.isActive = true;
    await this.userRepository.save(user);

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    };
    const token = this.jwtService.sign(payload);

    return {
      access_token: token,
      message: `Usuario ${user.email} ha ingresado correctamente`,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        empresa: user.empresa,
      },
    };
  }
}
