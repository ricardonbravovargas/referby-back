// src/analytics/analytics.service.ts - VERSIÓN CORREGIDA
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { User } from '../entities/user.entity';
import { Producto } from '../entities/producto.entitiy';
import { Empresa } from '../entities/empresa.entitiy';
import { UserRole } from '../auth/roles.enum';
import { UserAnalyticsResponse } from './analytics.types';

interface AnalyticsFilters {
  roles?: string[];
  dateStart?: Date;
  dateEnd?: Date;
}

interface ConnectionStat {
  date: string;
  connections: number;
  uniqueUsers: number;
}

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Producto)
    private readonly productoRepository: Repository<Producto>,
    @InjectRepository(Empresa)
    private readonly empresaRepository: Repository<Empresa>,
  ) {}

  async getUserAnalytics(filters: any): Promise<UserAnalyticsResponse> {
    // Construir query base
    let queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.empresa', 'empresa')
      .select([
        'user.id',
        'user.name',
        'user.email',
        'user.role',
        'user.createdAt',
        'user.lastLogin',
        'user.isActive',
        'empresa.id',
        'empresa.nombre',
      ]);

    // Filtrar por roles si se especifica
    if (filters.roles?.length > 0) {
      queryBuilder = queryBuilder.where('user.role IN (:...roles)', {
        roles: filters.roles,
      });
    }

    // Filtrar por fecha si se especifica
    if (filters.dateStart && filters.dateEnd) {
      queryBuilder = queryBuilder.andWhere(
        'user.createdAt BETWEEN :start AND :end',
        {
          start: filters.dateStart,
          end: filters.dateEnd,
        },
      );
    }

    // Obtener usuarios
    const users = await queryBuilder.getMany();

    // Obtener estadísticas por rol
    const roleStats = await this.userRepository
      .createQueryBuilder('user')
      .select('user.role', 'role')
      .addSelect('COUNT(*)', 'count')
      .groupBy('user.role')
      .getRawMany();

    // Calcular estadísticas
    const totalUsers = users.length;
    const activeUsers = users.filter((user) => user.isActive).length;

    // Usuarios nuevos este mes
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const newUsersThisMonth = users.filter(
      (user) => user.createdAt >= startOfMonth,
    ).length;

    // Conexiones recientes
    const recentConnections = users
      .filter((user) => user.lastLogin)
      .slice(0, 10)
      .map((user) => ({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          empresa: user.empresa,
          isActive: user.isActive,
          createdAt: user.createdAt,
          lastLogin: user.lastLogin,
        },
        timestamp: user.lastLogin.toISOString(),
        duration: Math.floor(Math.random() * 3600) + 300,
        device: 'Desktop',
        location: 'Madrid',
      }));

    // Estadísticas de conexión por día
    const connectionStats: ConnectionStat[] = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);

      const dailyConnections = await this.userRepository.count({
        where: {
          lastLogin: Between(date, endDate),
        },
      });

      connectionStats.push({
        date: date.toISOString().split('T')[0],
        connections: dailyConnections,
        uniqueUsers: dailyConnections,
      });
    }

    // Retornar en el formato correcto
    return {
      users, // Array de usuarios
      totalUsers,
      activeUsers,
      newUsersThisMonth,
      roleDistribution: roleStats.map((stat) => ({
        role: stat.role,
        count: parseInt(stat.count),
        percentage: Math.round((parseInt(stat.count) / totalUsers) * 100),
      })),
      connectionStats,
      topUsers: users.slice(0, 10),
      recentConnections,
      userGrowth: [],
      activityHeatmap: [],
    };
  }

  async getDashboardStats() {
    const [totalUsers, activeUsers, totalProducts, totalCompanies] =
      await Promise.all([
        this.userRepository.count(),
        this.userRepository.count({ where: { isActive: true } }),
        this.productoRepository.count(),
        this.empresaRepository.count(),
      ]);

    return {
      totalRevenue: 0,
      totalOrders: 0,
      activeUsers,
      conversionRate: 0,
      revenueGrowth: 0,
      orderGrowth: 0,
      userGrowth: 0,
      conversionGrowth: 0,
    };
  }

  async getProductAnalytics() {
    const totalProducts = await this.productoRepository.count();

    const categoryStats = await this.productoRepository
      .createQueryBuilder('producto')
      .select('producto.categoria', 'category')
      .addSelect('COUNT(*)', 'count')
      .where('producto.categoria IS NOT NULL')
      .groupBy('producto.categoria')
      .getRawMany();

    return {
      totalProducts,
      topProducts: [],
      categoryDistribution: categoryStats.map((stat) => ({
        category: stat.category,
        count: parseInt(stat.count),
        revenue: 0,
      })),
      salesTrends: [],
      inventoryAlerts: [],
      productGrowth: [],
    };
  }

  async getCompanyAnalytics() {
    const empresas = await this.empresaRepository.find({
      relations: ['productos'],
    });

    return {
      totalCompanies: empresas.length,
      topCompanies: empresas.map((empresa) => ({
        empresa,
        totalRevenue: 0,
        totalProducts: empresa.productos?.length || 0,
        totalSales: 0,
        averageRating: 0,
      })),
      companyGrowth: [],
      vendedorDistribution: [],
    };
  }
}
