import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import {
  Referral,
  ReferralShortCode,
  SharedCartLink,
  ReferralStatus,
} from '../entities/referral.entity';
import type {
  Commission,
  ReferralStats,
  CreateCommissionDto,
  GetCommissionsResponseDto,
} from '../dtos/commission.dto';

@Injectable()
export class ReferralsService {
  private readonly logger = new Logger('ReferralsService');

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Referral)
    private readonly referralRepository: Repository<Referral>,
    @InjectRepository(ReferralShortCode)
    private readonly shortCodeRepository: Repository<ReferralShortCode>,
    @InjectRepository(SharedCartLink)
    private readonly sharedCartRepository: Repository<SharedCartLink>,
  ) {}

  /**
   * Obtener todas las comisiones de un usuario
   */
  async getUserCommissions(userId: string): Promise<GetCommissionsResponseDto> {
    try {
      this.logger.log(`📊 Buscando comisiones para usuario: ${userId}`);

      // Buscar todas las comisiones del usuario
      const referrals = await this.referralRepository.find({
        where: { referrerId: userId },
        relations: ['referrer', 'referredUser'],
        order: { createdAt: 'DESC' },
      });

      // Convertir a formato Commission
      const commissions: Commission[] = referrals.map((referral) => ({
        id: referral.id,
        referrerId: referral.referrerId,
        referredUserId: referral.referredUserId || '',
        referredUserEmail: referral.referredUserEmail || '',
        referredUserName: referral.referredUserName,
        amount: Number(referral.amount),
        commission: Number(referral.commission),
        paymentIntentId: referral.paymentIntentId || '',
        status: referral.status as 'pending' | 'paid',
        createdAt: referral.createdAt,
      }));

      // Calcular estadísticas
      const stats = this.calculateStats(commissions);

      this.logger.log(`✅ Encontradas ${commissions.length} comisiones`);

      return {
        commissions,
        stats,
      };
    } catch (error) {
      this.logger.error('❌ Error obteniendo comisiones:', error);
      throw error;
    }
  }

  /**
   * Obtener estadísticas de un usuario
   */
  async getUserStats(userId: string): Promise<ReferralStats> {
    try {
      const referrals = await this.referralRepository.find({
        where: { referrerId: userId },
      });

      const commissions: Commission[] = referrals.map((referral) => ({
        id: referral.id,
        referrerId: referral.referrerId,
        referredUserId: referral.referredUserId || '',
        referredUserEmail: referral.referredUserEmail || '',
        referredUserName: referral.referredUserName,
        amount: Number(referral.amount),
        commission: Number(referral.commission),
        paymentIntentId: referral.paymentIntentId || '',
        status: referral.status as 'pending' | 'paid',
        createdAt: referral.createdAt,
      }));

      return this.calculateStats(commissions);
    } catch (error) {
      this.logger.error('❌ Error calculando estadísticas:', error);
      throw error;
    }
  }

  /**
   * Crear una nueva comisión (llamado desde PaymentsService)
   */
  async createCommission(data: CreateCommissionDto): Promise<Commission> {
    try {
      // Verificar que el referrer existe
      const referrer = await this.userRepository.findOne({
        where: { id: data.referrerId },
      });

      if (!referrer) {
        throw new NotFoundException(
          `Usuario referidor no encontrado: ${data.referrerId}`,
        );
      }

      // Buscar usuario referido si existe - FIX: Proper type declaration
      let referredUser: User | undefined = undefined;
      if (data.referredUserId) {
        const foundUser = await this.userRepository.findOne({
          where: { id: data.referredUserId },
        });
        referredUser = foundUser || undefined;
      }

      // Crear la comisión
      const referral = this.referralRepository.create({
        referrerId: data.referrerId,
        referrer,
        referredUserId: data.referredUserId,
        referredUser,
        referredUserEmail: data.referredUserEmail,
        referredUserName: data.referredUserName,
        amount: data.amount,
        commission: data.commission,
        paymentIntentId: data.paymentIntentId,
        status: ReferralStatus.PENDING,
      });

      const savedReferral = await this.referralRepository.save(referral);

      this.logger.log('✅ Comisión creada y guardada en BD:', {
        id: savedReferral.id,
        referrerId: savedReferral.referrerId,
        commission: savedReferral.commission,
      });

      return {
        id: savedReferral.id,
        referrerId: savedReferral.referrerId,
        referredUserId: savedReferral.referredUserId || '',
        referredUserEmail: savedReferral.referredUserEmail || '',
        referredUserName: savedReferral.referredUserName,
        amount: Number(savedReferral.amount),
        commission: Number(savedReferral.commission),
        paymentIntentId: savedReferral.paymentIntentId || '',
        status: savedReferral.status as 'pending' | 'paid',
        createdAt: savedReferral.createdAt,
      };
    } catch (error) {
      this.logger.error('❌ Error creando comisión:', error);
      throw error;
    }
  }

  /**
   * Marcar comisión como pagada
   */
  async markCommissionAsPaid(commissionId: string): Promise<Commission> {
    try {
      const referral = await this.referralRepository.findOne({
        where: { id: commissionId },
        relations: ['referrer', 'referredUser'],
      });

      if (!referral) {
        throw new NotFoundException('Comisión no encontrada');
      }

      referral.status = ReferralStatus.PAID;
      const updatedReferral = await this.referralRepository.save(referral);

      this.logger.log(`✅ Comisión ${commissionId} marcada como pagada`);

      return {
        id: updatedReferral.id,
        referrerId: updatedReferral.referrerId,
        referredUserId: updatedReferral.referredUserId || '',
        referredUserEmail: updatedReferral.referredUserEmail || '',
        referredUserName: updatedReferral.referredUserName,
        amount: Number(updatedReferral.amount),
        commission: Number(updatedReferral.commission),
        paymentIntentId: updatedReferral.paymentIntentId || '',
        status: updatedReferral.status as 'pending' | 'paid',
        createdAt: updatedReferral.createdAt,
      };
    } catch (error) {
      this.logger.error('❌ Error marcando comisión como pagada:', error);
      throw error;
    }
  }

  /**
   * Obtener o crear código corto para un usuario
   */
  async getOrCreateShortCode(userId: string): Promise<string> {
    try {
      // Buscar código existente
      let shortCodeEntity = await this.shortCodeRepository.findOne({
        where: { userId },
        relations: ['user'],
      });

      if (shortCodeEntity) {
        return shortCodeEntity.shortCode;
      }

      // Verificar que el usuario existe
      const user = await this.userRepository.findOne({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException(`Usuario no encontrado: ${userId}`);
      }

      // Generar nuevo código
      const shortCode = this.generateShortCode();

      // Crear y guardar
      shortCodeEntity = this.shortCodeRepository.create({
        shortCode,
        userId,
        user,
      });

      const saved = await this.shortCodeRepository.save(shortCodeEntity);

      this.logger.log(
        `✅ Nuevo código corto creado: ${shortCode} para ${userId}`,
      );

      return saved.shortCode;
    } catch (error) {
      this.logger.error('❌ Error obteniendo/creando código corto:', error);
      throw error;
    }
  }

  /**
   * Crear código corto específico para un usuario
   */
  async createSpecificShortCode(
    userId: string,
    shortCode: string,
  ): Promise<string> {
    try {
      // Verificar que el usuario existe
      const user = await this.userRepository.findOne({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException(`Usuario no encontrado: ${userId}`);
      }

      // Verificar que el código no existe
      const existing = await this.shortCodeRepository.findOne({
        where: { shortCode },
      });

      if (existing) {
        return existing.shortCode; // Retornar el existente
      }

      // Crear nuevo
      const shortCodeEntity = this.shortCodeRepository.create({
        shortCode,
        userId,
        user,
      });

      const saved = await this.shortCodeRepository.save(shortCodeEntity);

      this.logger.log(
        `✅ Código corto específico creado: ${shortCode} para ${userId}`,
      );

      return saved.shortCode;
    } catch (error) {
      this.logger.error('❌ Error creando código corto específico:', error);
      throw error;
    }
  }

  /**
   * Resolver código corto de referido
   */
  async resolveReferralCode(code: string): Promise<{ userId: string }> {
    try {
      const shortCodeEntity = await this.shortCodeRepository.findOne({
        where: { shortCode: code },
        relations: ['user'],
      });

      if (!shortCodeEntity) {
        throw new NotFoundException(`Código corto no encontrado: ${code}`);
      }

      return { userId: shortCodeEntity.userId };
    } catch (error) {
      this.logger.error('❌ Error resolviendo código de referido:', error);
      throw error;
    }
  }

  /**
   * Crear enlace de carrito compartido
   */
  async createSharedCartLink(
    userId: string,
    cartData: any[],
    shortCode?: string,
  ): Promise<string> {
    try {
      // Verificar que el usuario existe
      const user = await this.userRepository.findOne({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException(`Usuario no encontrado: ${userId}`);
      }

      // Generar código si no se proporciona
      const code = shortCode || this.generateShortCode();

      // Crear enlace
      const sharedCart = this.sharedCartRepository.create({
        shortCode: code,
        userId,
        user,
        cartData,
        type: 'shared-cart',
      });

      const saved = await this.sharedCartRepository.save(sharedCart);

      this.logger.log(`✅ Enlace de carrito compartido creado: ${code}`);

      return saved.shortCode;
    } catch (error) {
      this.logger.error(
        '❌ Error creando enlace de carrito compartido:',
        error,
      );
      throw error;
    }
  }

  /**
   * Resolver enlace de carrito compartido
   */
  async resolveSharedCartLink(
    code: string,
  ): Promise<{ userId: string; cartData: any[]; type: string }> {
    try {
      const sharedCart = await this.sharedCartRepository.findOne({
        where: { shortCode: code },
        relations: ['user'],
      });

      if (!sharedCart) {
        throw new NotFoundException(`Enlace de carrito no encontrado: ${code}`);
      }

      return {
        userId: sharedCart.userId,
        cartData: sharedCart.cartData,
        type: sharedCart.type,
      };
    } catch (error) {
      this.logger.error('❌ Error resolviendo enlace de carrito:', error);
      throw error;
    }
  }

  /**
   * Obtener todas las comisiones (para administición)
   */
  async getAllCommissions(): Promise<Commission[]> {
    try {
      const referrals = await this.referralRepository.find({
        relations: ['referrer', 'referredUser'],
        order: { createdAt: 'DESC' },
      });

      return referrals.map((referral) => ({
        id: referral.id,
        referrerId: referral.referrerId,
        referredUserId: referral.referredUserId || '',
        referredUserEmail: referral.referredUserEmail || '',
        referredUserName: referral.referredUserName,
        amount: Number(referral.amount),
        commission: Number(referral.commission),
        paymentIntentId: referral.paymentIntentId || '',
        status: referral.status as 'pending' | 'paid',
        createdAt: referral.createdAt,
      }));
    } catch (error) {
      this.logger.error('❌ Error obteniendo todas las comisiones:', error);
      throw error;
    }
  }

  /**
   * Calcular estadísticas basadas en comisiones
   */
  private calculateStats(commissions: Commission[]): ReferralStats {
    const totalCommissions = commissions.reduce(
      (sum, commission) => sum + commission.commission,
      0,
    );

    const totalReferrals = commissions.length;

    const pendingCommissions = commissions
      .filter((commission) => commission.status === 'pending')
      .reduce((sum, commission) => sum + commission.commission, 0);

    const paidCommissions = commissions
      .filter((commission) => commission.status === 'paid')
      .reduce((sum, commission) => sum + commission.commission, 0);

    return {
      totalCommissions,
      totalReferrals,
      pendingCommissions,
      paidCommissions,
    };
  }

  /**
   * Generar código corto aleatorio
   */
  private generateShortCode(): string {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += characters.charAt(
        Math.floor(Math.random() * characters.length),
      );
    }
    return result;
  }
}
