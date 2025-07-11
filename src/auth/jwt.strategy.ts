import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UserRole } from './roles.enum';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    const secret = configService.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error('JWT_SECRET no definido en el archivo .env');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: any) {
    // Normalizar la estructura del usuario para compatibilidad
    return {
      id: payload.sub,
      sub: payload.sub, // Incluir sub para compatibilidad
      email: payload.email,
      // Normalizar el rol: usar tanto 'rol' como 'role' para compatibilidad
      rol: payload.role || payload.rol,
      role: payload.role || payload.rol,
    };
  }
}
