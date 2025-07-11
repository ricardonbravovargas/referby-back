import { Injectable, NotFoundException } from '@nestjs/common';
import { Repository, MoreThan } from 'typeorm';
import { User } from '../entities/user.entity';
import { Empresa } from '../entities/empresa.entitiy';
import { Producto } from '../entities/producto.entitiy';
import { Vendedor } from '../entities/vendedor.entiity';
import { Orden } from '../entities/orden.entiity';
import { ProductoVendedor } from '../entities/Producto-Vendedor.entiity';
import { Referral } from '../entities/referral.entity';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class EmpresaAnalyticsService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Empresa)
    private readonly empresaRepo: Repository<Empresa>,
    @InjectRepository(Producto)
    private readonly productoRepo: Repository<Producto>,
    @InjectRepository(Vendedor)
    private readonly vendedorRepo: Repository<Vendedor>,
    @InjectRepository(Orden)
    private readonly ordenRepo: Repository<Orden>,
    @InjectRepository(ProductoVendedor)
    private readonly productoVendedorRepo: Repository<ProductoVendedor>,
    @InjectRepository(Referral)
    private readonly referralRepo: Repository<Referral>,
  ) {}

  async getEmpresaStats(userId: string) {
    try {
      console.log('Getting empresa stats for user:', userId);

      // Buscar el usuario con su empresa
      const user = await this.userRepo.findOne({
        where: { id: userId },
        relations: ['empresa'],
      });

      console.log('User found:', user);

      if (!user) {
        throw new NotFoundException('Usuario no encontrado');
      }

      if (!user.empresa) {
        throw new NotFoundException('El usuario no tiene una empresa asociada');
      }

      const empresaId = user.empresa.id;
      console.log('Empresa ID:', empresaId);

      // Obtener estadísticas básicas
      const totalProductos = await this.productoRepo.count({
        where: { empresa: { id: empresaId } },
      });

      // Corregir la sintaxis para TypeORM (no MongoDB)
      const productosActivos = await this.productoRepo.count({
        where: {
          empresa: { id: empresaId },
          inventario: MoreThan(0),
        },
      });

      const vendedoresAsociados = await this.vendedorRepo.count({
        where: { empresa: { id: empresaId } },
      });

      // Obtener ventas totales (órdenes que contienen productos de esta empresa)
      const ventasQuery = await this.ordenRepo
        .createQueryBuilder('orden')
        .innerJoin('orden.productos', 'producto')
        .where('producto.empresaId = :empresaId', { empresaId })
        .getCount();

      // Ventas de este mes
      const ventasEsteMesQuery = await this.ordenRepo
        .createQueryBuilder('orden')
        .innerJoin('orden.productos', 'producto')
        .where('producto.empresaId = :empresaId', { empresaId })
        .andWhere(
          'EXTRACT(MONTH FROM orden.fecha) = EXTRACT(MONTH FROM CURRENT_DATE)',
        )
        .andWhere(
          'EXTRACT(YEAR FROM orden.fecha) = EXTRACT(YEAR FROM CURRENT_DATE)',
        )
        .getCount();

      // Calcular ingresos estimados
      const ingresosQuery = await this.productoRepo
        .createQueryBuilder('producto')
        .innerJoin('producto.ordenes', 'orden')
        .select('SUM(producto.precio)', 'total')
        .where('producto.empresaId = :empresaId', { empresaId })
        .getRawOne();

      const ingresosEsteMesQuery = await this.productoRepo
        .createQueryBuilder('producto')
        .innerJoin('producto.ordenes', 'orden')
        .select('SUM(producto.precio)', 'total')
        .where('producto.empresaId = :empresaId', { empresaId })
        .andWhere(
          'EXTRACT(MONTH FROM orden.fecha) = EXTRACT(MONTH FROM CURRENT_DATE)',
        )
        .andWhere(
          'EXTRACT(YEAR FROM orden.fecha) = EXTRACT(YEAR FROM CURRENT_DATE)',
        )
        .getRawOne();

      // Comisiones pagadas (a través de referrals de vendedores de esta empresa)
      const comisionesQuery = await this.referralRepo
        .createQueryBuilder('referral')
        .innerJoin('referral.referrer', 'referrer')
        .innerJoin('referrer.vendedores', 'vendedor')
        .select('SUM(referral.commission)', 'total')
        .where('vendedor.empresaId = :empresaId', { empresaId })
        .andWhere('referral.status = :status', { status: 'paid' })
        .getRawOne();

      const result = {
        totalProductos: totalProductos || 0,
        productosActivos: productosActivos || 0,
        ventasTotales: ventasQuery || 0,
        ingresosTotales: Number.parseFloat(ingresosQuery?.total || '0') || 0,
        comisionesPagadas:
          Number.parseFloat(comisionesQuery?.total || '0') || 0,
        vendedoresAsociados: vendedoresAsociados || 0,
        ventasEsteMes: ventasEsteMesQuery || 0,
        ingresosEsteMes:
          Number.parseFloat(ingresosEsteMesQuery?.total || '0') || 0,
      };

      console.log('Empresa stats result:', result);
      return result;
    } catch (error) {
      console.error('Error en getEmpresaStats:', error);
      throw error;
    }
  }

  async getProductosStats(userId: string) {
    try {
      const user = await this.userRepo.findOne({
        where: { id: userId },
        relations: ['empresa'],
      });

      if (!user || !user.empresa) {
        throw new NotFoundException('Empresa no encontrada para el usuario');
      }

      const empresaId = user.empresa.id;

      // Obtener productos con estadísticas
      const productos = await this.productoRepo
        .createQueryBuilder('producto')
        .leftJoin('producto.ordenes', 'orden')
        .leftJoin('producto.productoVendedores', 'pv')
        .select([
          'producto.id',
          'producto.nombre',
          'producto.precio',
          'producto.categoria',
          'producto.imagen',
          'producto.inventario',
        ])
        .addSelect('COUNT(DISTINCT orden.id)', 'totalVentas')
        .addSelect('SUM(pv.comision)', 'comisionesPagadas')
        .addSelect('MAX(orden.fecha)', 'ultimaVenta')
        .where('producto.empresaId = :empresaId', { empresaId })
        .groupBy('producto.id')
        .orderBy('COUNT(DISTINCT orden.id)', 'DESC')
        .getRawAndEntities();

      return productos.entities.map((producto, index) => {
        const raw = productos.raw[index];
        return {
          id: producto.id,
          nombre: producto.nombre,
          precio: Number.parseFloat(producto.precio.toString()),
          categoria: producto.categoria || 'Sin categoría',
          imagen: producto.imagen,
          inventario: producto.inventario,
          totalVentas: Number.parseInt(raw.totalVentas || '0') || 0,
          ingresosTotales:
            Number.parseFloat(producto.precio.toString()) *
            (Number.parseInt(raw.totalVentas || '0') || 0),
          comisionesPagadas:
            Number.parseFloat(raw.comisionesPagadas || '0') || 0,
          ultimaVenta: raw.ultimaVenta,
        };
      });
    } catch (error) {
      console.error('Error en getProductosStats:', error);
      throw error;
    }
  }

  async getVentasRecientes(userId: string, limit = 20, offset = 0) {
    try {
      const user = await this.userRepo.findOne({
        where: { id: userId },
        relations: ['empresa'],
      });

      if (!user || !user.empresa) {
        throw new NotFoundException('Empresa no encontrada para el usuario');
      }

      const empresaId = user.empresa.id;

      // Obtener órdenes recientes con productos de la empresa
      const ordenes = await this.ordenRepo
        .createQueryBuilder('orden')
        .innerJoinAndSelect('orden.productos', 'producto')
        .leftJoinAndSelect('orden.vendedor', 'vendedor')
        .leftJoinAndSelect('vendedor.user', 'vendedorUser')
        .where('producto.empresaId = :empresaId', { empresaId })
        .orderBy('orden.fecha', 'DESC')
        .limit(limit)
        .offset(offset)
        .getMany();

      return ordenes.flatMap((orden) => {
        return orden.productos
          .filter((producto) => producto.empresa?.id === empresaId)
          .map((producto) => ({
            id: `${orden.id}-${producto.id}`,
            producto: {
              id: producto.id,
              nombre: producto.nombre,
              precio: Number.parseFloat(producto.precio.toString()),
            },
            cantidad: 1, // Por ahora asumimos 1
            total: Number.parseFloat(producto.precio.toString()),
            fecha: orden.fecha,
            cliente: null, // No hay relación directa con cliente
            vendedor: orden.vendedor
              ? {
                  nombre: orden.vendedor.nombre,
                  email: orden.vendedor.user?.email,
                }
              : null,
            comision: 0, // Se puede calcular después
          }));
      });
    } catch (error) {
      console.error('Error en getVentasRecientes:', error);
      throw error;
    }
  }

  async getVendedoresStats(userId: string) {
    try {
      console.log('Getting vendedores stats for user:', userId);

      const user = await this.userRepo.findOne({
        where: { id: userId },
        relations: ['empresa'],
      });

      if (!user || !user.empresa) {
        throw new NotFoundException('Empresa no encontrada para el usuario');
      }

      const empresaId = user.empresa.id;
      console.log('Getting vendedores for empresa:', empresaId);

      // Obtener vendedores con estadísticas
      const vendedores = await this.vendedorRepo
        .createQueryBuilder('vendedor')
        .leftJoinAndSelect('vendedor.user', 'user')
        .leftJoin('vendedor.ordenes', 'orden')
        .leftJoin('vendedor.productoVendedores', 'pv')
        .leftJoin('pv.producto', 'producto')
        .select([
          'vendedor.id',
          'vendedor.nombre',
          'user.email',
          'user.lastLogin',
        ])
        .addSelect('COUNT(DISTINCT orden.id)', 'totalVentas')
        .addSelect('COUNT(DISTINCT producto.id)', 'productosVendidos')
        .addSelect('SUM(pv.comision)', 'comisionesTotales')
        .where('vendedor.empresaId = :empresaId', { empresaId })
        .groupBy('vendedor.id, user.id')
        .getRawAndEntities();

      console.log('Vendedores found:', vendedores.entities.length);

      return vendedores.entities.map((vendedor, index) => {
        const raw = vendedores.raw[index];
        return {
          id: vendedor.id,
          nombre: vendedor.nombre,
          email: vendedor.user?.email,
          totalVentas: Number.parseInt(raw.totalVentas || '0') || 0,
          comisionesTotales:
            Number.parseFloat(raw.comisionesTotales || '0') || 0,
          productosVendidos: Number.parseInt(raw.productosVendidos || '0') || 0,
          ultimaActividad: vendedor.user?.lastLogin,
        };
      });
    } catch (error) {
      console.error('Error en getVendedoresStats:', error);
      throw error;
    }
  }

  async getResumenMensual(userId: string, year: number, month: number) {
    try {
      const user = await this.userRepo.findOne({
        where: { id: userId },
        relations: ['empresa'],
      });

      if (!user || !user.empresa) {
        throw new NotFoundException('Empresa no encontrada para el usuario');
      }

      const empresaId = user.empresa.id;

      // Obtener resumen mensual
      const ventasDelMes = await this.ordenRepo
        .createQueryBuilder('orden')
        .innerJoin('orden.productos', 'producto')
        .select('COUNT(orden.id)', 'totalVentas')
        .where('producto.empresaId = :empresaId', { empresaId })
        .andWhere('EXTRACT(YEAR FROM orden.fecha) = :year', { year })
        .andWhere('EXTRACT(MONTH FROM orden.fecha) = :month', { month })
        .getRawOne();

      const ingresosDelMes = await this.productoRepo
        .createQueryBuilder('producto')
        .innerJoin('producto.ordenes', 'orden')
        .select('SUM(producto.precio)', 'total')
        .addSelect('AVG(producto.precio)', 'promedio')
        .where('producto.empresaId = :empresaId', { empresaId })
        .andWhere('EXTRACT(YEAR FROM orden.fecha) = :year', { year })
        .andWhere('EXTRACT(MONTH FROM orden.fecha) = :month', { month })
        .getRawOne();

      return {
        year,
        month,
        totalVentas: Number.parseInt(ventasDelMes?.totalVentas || '0') || 0,
        ingresosTotales: Number.parseFloat(ingresosDelMes?.total || '0') || 0,
        ventaPromedio: Number.parseFloat(ingresosDelMes?.promedio || '0') || 0,
      };
    } catch (error) {
      console.error('Error en getResumenMensual:', error);
      throw error; // Corregido: era "th<code>ow error;"
    }
  }
}
