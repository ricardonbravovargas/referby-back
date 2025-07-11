// src/vendedor/vendedor.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Vendedor } from 'src/entities/vendedor.entiity';
import { Repository } from 'typeorm';
import { CreateVendedorDto } from 'src/dtos/create-vendedor.dto';
import { UpdateVendedorDto } from 'src/dtos/update-vendedor.dto';
import { Empresa } from 'src/entities/empresa.entitiy';
import { User } from 'src/entities/user.entity';

@Injectable()
export class VendedorService {
  constructor(
    @InjectRepository(Vendedor)
    private vendedorRepo: Repository<Vendedor>,
    @InjectRepository(Empresa)
    private empresaRepo: Repository<Empresa>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async create(dto: CreateVendedorDto, userId: string): Promise<Vendedor> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['empresa'],
    });

    if (!user || !user.empresa) {
      throw new NotFoundException('Empresa no encontrada para el usuario');
    }

    const vendedor = this.vendedorRepo.create({
      nombre: dto.nombre,
      empresa: user.empresa,
      user: user, // ✅ clave para luego buscarlo
    });

    return this.vendedorRepo.save(vendedor);
  }

  findAll() {
    return this.vendedorRepo.find({ relations: ['empresa'] });
  }

  findOne(id: string) {
    return this.vendedorRepo.findOne({
      where: { id },
      relations: ['empresa'],
    });
  }

  async update(id: string, dto: UpdateVendedorDto, empresaId: string) {
    const vendedor = await this.vendedorRepo.findOneBy({ id });
    if (!vendedor) throw new NotFoundException('Vendedor no encontrado');

    const empresa = await this.empresaRepo.findOneBy({ id: empresaId });
    if (!empresa) throw new NotFoundException('Empresa no encontrada');

    vendedor.empresa = empresa;
    vendedor.nombre = dto.nombre ?? vendedor.nombre;

    return this.vendedorRepo.save(vendedor);
  }

  async remove(id: string) {
    const vendedor = await this.vendedorRepo.findOneBy({ id });
    if (!vendedor) throw new NotFoundException('Vendedor no encontrado');
    return this.vendedorRepo.remove(vendedor);
  }
}
