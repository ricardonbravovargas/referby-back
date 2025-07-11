import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductoVendedor } from '../entities/Producto-Vendedor.entiity';
import { CreateProductoVendedorDto } from '../dtos/create-producto-vendedor.dto';
import { UpdateProductoVendedorDto } from '../dtos/update-producto-vendedor.dto';
import { Producto } from '../entities/producto.entitiy';
import { Vendedor } from '../entities/vendedor.entiity';

@Injectable()
export class ProductoVendedorService {
  constructor(
    @InjectRepository(ProductoVendedor)
    private readonly repo: Repository<ProductoVendedor>,
    @InjectRepository(Producto)
    private readonly productoRepo: Repository<Producto>,
    @InjectRepository(Vendedor)
    private readonly vendedorRepo: Repository<Vendedor>,
  ) {}

  async create(dto: CreateProductoVendedorDto) {
    const producto = await this.productoRepo.findOneBy({ id: dto.productoId });
    const vendedor = await this.vendedorRepo.findOneBy({ id: dto.vendedorId });

    if (!producto || !vendedor) {
      throw new NotFoundException('Producto o Vendedor no encontrado');
    }

    const relacion = this.repo.create({ producto, vendedor, comision: dto.comision });
    return this.repo.save(relacion);
  }

  findAll() {
    return this.repo.find();
  }

  findOne(id: string) {
    return this.repo.findOneBy({ id });
  }

  async update(id: string, dto: UpdateProductoVendedorDto) {
    const entity = await this.repo.findOneBy({ id });
    if (!entity) throw new NotFoundException('Relación no encontrada');

    if (dto.comision !== undefined) entity.comision = dto.comision;
    return this.repo.save(entity);
  }

  async remove(id: string) {
    const entity = await this.repo.findOneBy({ id });
    if (!entity) throw new NotFoundException('Relación no encontrada');

    return this.repo.remove(entity);
  }
}
