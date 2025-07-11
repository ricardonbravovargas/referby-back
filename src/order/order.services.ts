import { Repository } from 'typeorm';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Producto } from '../entities/producto.entitiy';
import { Vendedor } from '../entities/vendedor.entiity';
import { Orden } from '../entities/orden.entiity';

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);

  constructor(
    @InjectRepository(Producto)
    private readonly productoRepository: Repository<Producto>,
    @InjectRepository(Vendedor)
    private readonly vendedorRepository: Repository<Vendedor>,
    @InjectRepository(Orden)
    private readonly ordenRepository: Repository<Orden>,
  ) {}

  async createOrdersFromPayment(
    paymentIntentId: string,
    userId: string,
    items: any[],
    customerInfo: any,
  ): Promise<void> {
    try {
      this.logger.log('💾 Creando órdenes desde pago...', {
        paymentIntentId,
        userId: userId || 'guest',
        itemsCount: items.length,
        customerEmail: customerInfo.email,
      });

      // Agrupar productos por empresa y vendedor
      const ventasPorVendedor = new Map();

      for (const item of items) {
        try {
          // Buscar el producto en la base de datos para obtener información completa
          const producto = await this.productoRepository.findOne({
            where: { id: item.id },
            relations: [
              'empresa',
              'productoVendedores',
              'productoVendedores.vendedor',
            ],
          });

          if (!producto) {
            this.logger.warn(`Producto no encontrado: ${item.id}`);
            continue;
          }

          // Buscar el vendedor principal para este producto
          let vendedorAsignado: Vendedor | null = null;

          if (
            producto.productoVendedores &&
            producto.productoVendedores.length > 0
          ) {
            // Si hay vendedores específicos asignados al producto, usar el primero
            vendedorAsignado = producto.productoVendedores[0].vendedor;
          } else {
            // Si no hay vendedor específico, buscar cualquier vendedor de la empresa
            const vendedorEmpresa = await this.vendedorRepository.findOne({
              where: { empresa: { id: producto.empresa.id } },
            });
            vendedorAsignado = vendedorEmpresa || null;
          }

          if (!vendedorAsignado) {
            this.logger.warn(
              `No se encontró vendedor para producto ${producto.nombre}`,
            );
            continue;
          }

          // Agrupar productos por vendedor
          const vendedorId = vendedorAsignado.id;
          if (!ventasPorVendedor.has(vendedorId)) {
            ventasPorVendedor.set(vendedorId, {
              vendedor: vendedorAsignado,
              productos: [],
            });
          }

          ventasPorVendedor.get(vendedorId).productos.push(producto);
        } catch (error) {
          this.logger.error(`Error procesando producto ${item.id}:`, error);
        }
      }

      // Crear una orden por cada vendedor
      for (const [vendedorId, venta] of ventasPorVendedor) {
        try {
          const orden = this.ordenRepository.create({
            vendedor: venta.vendedor,
            productos: venta.productos,
            fecha: new Date(),
          });

          const ordenGuardada = await this.ordenRepository.save(orden);

          this.logger.log(
            `✅ Orden creada para vendedor ${venta.vendedor.nombre}:`,
            {
              ordenId: ordenGuardada.id,
              vendedorId: vendedorId,
              productosCount: venta.productos.length,
              productos: venta.productos.map((p) => p.nombre),
            },
          );
        } catch (error) {
          this.logger.error(
            `Error creando orden para vendedor ${vendedorId}:`,
            error,
          );
        }
      }

      this.logger.log('✅ Proceso de creación de órdenes completado', {
        paymentIntentId,
        vendedoresInvolucrados: ventasPorVendedor.size,
      });
    } catch (error) {
      this.logger.error('❌ Error creando órdenes:', error);
      // No lanzar error para no afectar el flujo principal de pago
    }
  }
}
