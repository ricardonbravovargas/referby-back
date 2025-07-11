import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { Producto } from '../entities/producto.entitiy';
import { Empresa } from '../entities/empresa.entitiy';
import { Vendedor } from '../entities/vendedor.entiity';
import { User } from '../entities/user.entity';
import {
  CreateProductoDto,
  UpdateProductoDto,
} from '../dtos/create-producto.dto';
import { ProductoVendedor } from '../entities/Producto-Vendedor.entiity';
import { CloudinaryService } from './cloudinary.service';
import { Express } from 'express';
import { InjectRepository } from '@nestjs/typeorm';

interface FilterOptions {
  search?: string;
  categoria?: string;
  empresa?: string;
  minPrecio?: number;
  maxPrecio?: number;
}

@Injectable()
export class ProductoService {
  private readonly logger = new Logger(ProductoService.name);

  constructor(
    @InjectRepository(Producto)
    private readonly productoRepo: Repository<Producto>,

    @InjectRepository(ProductoVendedor)
    private readonly productoVendedorRepo: Repository<ProductoVendedor>,

    @InjectRepository(Vendedor)
    private readonly vendedorRepo: Repository<Vendedor>,

    @InjectRepository(Empresa)
    private readonly empresaRepo: Repository<Empresa>,

    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

    private readonly cloudinaryService: CloudinaryService,
  ) {}

  // Nuevo método para obtener productos de una empresa específica
  async findByEmpresa(
    userId: string,
    filters: FilterOptions = {},
  ): Promise<Producto[]> {
    this.logger.debug(`Buscando productos para usuario: ${userId}`);

    // Primero intentar buscar por vendedor
    const vendedor = await this.vendedorRepo.findOne({
      where: { user: { id: userId } },
      relations: ['empresa'],
    });

    let empresaId: string;

    if (vendedor && vendedor.empresa) {
      empresaId = vendedor.empresa.id;
      this.logger.debug(`Encontrado vendedor con empresa: ${empresaId}`);
    } else {
      // Si no es vendedor, buscar directamente por usuario con empresa
      const user = await this.userRepo.findOne({
        where: { id: userId },
        relations: ['empresa'],
      });

      if (!user || !user.empresa) {
        this.logger.warn(`Usuario ${userId} no tiene empresa asociada`);
        throw new NotFoundException('Usuario o empresa no encontrada');
      }

      empresaId = user.empresa.id;
      this.logger.debug(`Encontrado usuario con empresa: ${empresaId}`);
    }

    const queryBuilder = this.productoRepo
      .createQueryBuilder('producto')
      .leftJoinAndSelect('producto.empresa', 'empresa')
      .leftJoinAndSelect('producto.ordenes', 'ordenes')
      .leftJoinAndSelect('producto.productoVendedores', 'productoVendedores')
      .leftJoinAndSelect('productoVendedores.vendedor', 'vendedor')
      .leftJoinAndSelect('vendedor.user', 'user')
      .where('empresa.id = :empresaId', { empresaId });

    if (filters.search) {
      queryBuilder.andWhere('(LOWER(producto.nombre) LIKE LOWER(:search))', {
        search: `%${filters.search}%`,
      });
    }

    if (filters.categoria) {
      queryBuilder.andWhere('LOWER(producto.categoria) = LOWER(:categoria)', {
        categoria: filters.categoria,
      });
    }

    if (filters.minPrecio !== undefined) {
      queryBuilder.andWhere('producto.precio >= :minPrecio', {
        minPrecio: filters.minPrecio,
      });
    }

    if (filters.maxPrecio !== undefined) {
      queryBuilder.andWhere('producto.precio <= :maxPrecio', {
        maxPrecio: filters.maxPrecio,
      });
    }

    queryBuilder.orderBy('producto.nombre', 'ASC');

    const productos = await queryBuilder.getMany();
    this.logger.debug(
      `Encontrados ${productos.length} productos para la empresa ${empresaId}`,
    );

    return productos;
  }

  async create(
    dto: CreateProductoDto,
    userId: string,
    files?: Express.Multer.File[],
  ): Promise<Producto> {
    console.log('ProductoService.create - Datos recibidos:', {
      dto,
      userId,
      files: files ? `${files.length} archivos` : 'sin archivos',
      fileNames: files?.map((f) => f.originalname) || [],
    });

    const vendedor = await this.vendedorRepo.findOne({
      where: { user: { id: userId } },
      relations: ['empresa', 'user'],
    });

    if (!vendedor) {
      throw new NotFoundException(
        `Vendedor no encontrado para el usuario ${userId}. ` +
          'Asegúrate de que el usuario tenga un perfil de vendedor asociado a una empresa.',
      );
    }

    if (!vendedor.empresa) {
      throw new NotFoundException(
        'El vendedor no tiene una empresa asociada. ' +
          'Contacta al administrador para asociar el vendedor a una empresa.',
      );
    }

    // Variables para compatibilidad con versiones anteriores
    let imagenUrl: string | undefined;
    let imagenPublicId: string | undefined;

    // Variables para múltiples imágenes
    let imagenesUrls: string[] = [];
    let imagenesPublicIds: string[] = [];

    // Subir imágenes a Cloudinary si se proporcionan
    if (files && files.length > 0) {
      try {
        console.log(`Subiendo ${files.length} imágenes a Cloudinary...`);

        // Usar el método uploadMultipleImages del CloudinaryService
        const uploadResults = await this.cloudinaryService.uploadMultipleImages(
          files,
          `productos/${vendedor.empresa.id}`,
        );

        // Guardar todas las imágenes
        if (uploadResults.length > 0) {
          // Para compatibilidad con versiones anteriores
          imagenUrl = uploadResults[0].url;
          imagenPublicId = uploadResults[0].publicId;

          // Para múltiples imágenes
          imagenesUrls = uploadResults.map((result) => result.url);
          imagenesPublicIds = uploadResults.map((result) => result.publicId);

          console.log('Imágenes subidas exitosamente:', {
            totalImages: uploadResults.length,
            firstImage: { url: imagenUrl, publicId: imagenPublicId },
            allImages: uploadResults,
          });
        }
      } catch (error) {
        console.error('Error uploading images:', error);
        // Continuar sin imagen si falla la subida
      }
    }

    const producto = this.productoRepo.create({
      nombre: dto.nombre,
      precio: dto.precio,
      empresa: vendedor.empresa,
      // Para compatibilidad con versiones anteriores
      imagen: imagenUrl,
      imagenPublicId: imagenPublicId,
      // Para múltiples imágenes
      imagenes: imagenesUrls.length > 0 ? imagenesUrls : undefined,
      imagenesPublicIds:
        imagenesPublicIds.length > 0 ? imagenesPublicIds : undefined,
      // Campos opcionales
      ...(dto.categoria && { categoria: dto.categoria }),
      ...(dto.caracteristicas && { caracteristicas: dto.caracteristicas }),
      // Nuevos campos con valores por defecto
      inventario: dto.inventario ?? 0,
      iva: dto.iva ?? 0,
      ivaIncluido: dto.ivaIncluido ?? true,
      envioDisponible: dto.envioDisponible ?? false,
      ...(dto.costoEnvio !== undefined && { costoEnvio: dto.costoEnvio }),
    });

    console.log('Creando producto:', producto);
    const savedProducto = await this.productoRepo.save(producto);

    const relacion = this.productoVendedorRepo.create({
      producto: savedProducto,
      vendedor,
      comision: 0.1,
    });

    await this.productoVendedorRepo.save(relacion);

    return savedProducto;
  }

  async findAll(filters: FilterOptions = {}): Promise<Producto[]> {
    const queryBuilder = this.productoRepo
      .createQueryBuilder('producto')
      .leftJoinAndSelect('producto.empresa', 'empresa')
      .leftJoinAndSelect('producto.ordenes', 'ordenes')
      .leftJoinAndSelect('producto.productoVendedores', 'productoVendedores')
      .leftJoinAndSelect('productoVendedores.vendedor', 'vendedor')
      .leftJoinAndSelect('vendedor.user', 'user');

    if (filters.search) {
      queryBuilder.andWhere(
        '(LOWER(producto.nombre) LIKE LOWER(:search) OR LOWER(empresa.nombre) LIKE LOWER(:search))',
        { search: `%${filters.search}%` },
      );
    }

    if (filters.categoria) {
      queryBuilder.andWhere('LOWER(producto.categoria) = LOWER(:categoria)', {
        categoria: filters.categoria,
      });
    }

    if (filters.empresa) {
      queryBuilder.andWhere('LOWER(empresa.nombre) LIKE LOWER(:empresa)', {
        empresa: `%${filters.empresa}%`,
      });
    }

    if (filters.minPrecio !== undefined) {
      queryBuilder.andWhere('producto.precio >= :minPrecio', {
        minPrecio: filters.minPrecio,
      });
    }

    if (filters.maxPrecio !== undefined) {
      queryBuilder.andWhere('producto.precio <= :maxPrecio', {
        maxPrecio: filters.maxPrecio,
      });
    }

    queryBuilder.orderBy('producto.nombre', 'ASC');

    return queryBuilder.getMany();
  }

  async getCategorias(): Promise<string[]> {
    const result = await this.productoRepo
      .createQueryBuilder('producto')
      .select('DISTINCT producto.categoria', 'categoria')
      .where('producto.categoria IS NOT NULL')
      .andWhere('producto.categoria != :empty', { empty: '' })
      .getRawMany();

    return result.map((item) => item.categoria).filter(Boolean);
  }

  async getEmpresas(): Promise<{ id: string; nombre: string }[]> {
    const result = await this.empresaRepo
      .createQueryBuilder('empresa')
      .select(['empresa.id', 'empresa.nombre'])
      .innerJoin('empresa.productos', 'producto')
      .groupBy('empresa.id, empresa.nombre')
      .orderBy('empresa.nombre', 'ASC')
      .getMany();

    return result.map((empresa) => ({
      id: empresa.id,
      nombre: empresa.nombre,
    }));
  }

  async findOne(id: string): Promise<Producto> {
    const producto = await this.productoRepo.findOne({
      where: { id },
      relations: ['empresa', 'ordenes', 'productoVendedores'],
    });

    if (!producto) {
      throw new NotFoundException('Producto no encontrado');
    }

    return producto;
  }

  async update(
    id: string,
    dto: UpdateProductoDto,
    userId?: string,
    files?: Express.Multer.File[],
  ): Promise<Producto> {
    console.log('ProductoService.update - Datos recibidos:', {
      id,
      dto,
      userId,
      files: files ? `${files.length} archivos` : 'sin archivos',
      fileNames: files?.map((f) => f.originalname) || [],
    });

    const producto = await this.findOne(id);

    if (userId) {
      // Primero intentar buscar por vendedor
      const vendedor = await this.vendedorRepo.findOne({
        where: { user: { id: userId } },
        relations: ['empresa'],
      });

      let userEmpresaId: string | undefined;

      if (vendedor && vendedor.empresa) {
        userEmpresaId = vendedor.empresa.id;
      } else {
        // Si no es vendedor, buscar directamente por usuario con empresa
        const user = await this.userRepo.findOne({
          where: { id: userId },
          relations: ['empresa'],
        });

        if (user && user.empresa) {
          userEmpresaId = user.empresa.id;
        }
      }

      if (!userEmpresaId || producto.empresa.id !== userEmpresaId) {
        throw new ForbiddenException(
          'No tienes permisos para editar este producto',
        );
      }
    }

    // Manejar nuevas imágenes si se proporcionan
    if (files && files.length > 0) {
      try {
        console.log(`Actualizando ${files.length} imágenes en Cloudinary...`);

        // Eliminar imágenes anteriores si existen
        if (
          producto.imagenesPublicIds &&
          producto.imagenesPublicIds.length > 0
        ) {
          await this.cloudinaryService.deleteMultipleImages(
            producto.imagenesPublicIds,
          );
        } else if (producto.imagenPublicId) {
          // Para compatibilidad con versiones anteriores
          await this.cloudinaryService.deleteImage(producto.imagenPublicId);
        }

        // Subir nuevas imágenes
        const uploadResults = await this.cloudinaryService.uploadMultipleImages(
          files,
          `productos/${producto.empresa.id}`,
        );

        if (uploadResults.length > 0) {
          // Para compatibilidad con versiones anteriores
          producto.imagen = uploadResults[0].url;
          producto.imagenPublicId = uploadResults[0].publicId;

          // Para múltiples imágenes
          producto.imagenes = uploadResults.map((result) => result.url);
          producto.imagenesPublicIds = uploadResults.map(
            (result) => result.publicId,
          );

          console.log('Imágenes actualizadas exitosamente:', {
            totalImages: uploadResults.length,
            firstImage: {
              url: producto.imagen,
              publicId: producto.imagenPublicId,
            },
            allImages: uploadResults,
          });
        }
      } catch (error) {
        console.error('Error updating images:', error);
        // Continuar con la actualización sin cambiar las imágenes
      }
    }

    Object.assign(producto, dto);
    console.log('Actualizando producto:', producto);
    return this.productoRepo.save(producto);
  }

  async remove(id: string, userId?: string): Promise<Producto> {
    const producto = await this.findOne(id);

    if (userId) {
      // Primero intentar buscar por vendedor
      const vendedor = await this.vendedorRepo.findOne({
        where: { user: { id: userId } },
        relations: ['empresa'],
      });

      let userEmpresaId: string | undefined;

      if (vendedor && vendedor.empresa) {
        userEmpresaId = vendedor.empresa.id;
      } else {
        // Si no es vendedor, buscar directamente por usuario con empresa
        const user = await this.userRepo.findOne({
          where: { id: userId },
          relations: ['empresa'],
        });

        if (user && user.empresa) {
          userEmpresaId = user.empresa.id;
        }
      }

      if (!userEmpresaId || producto.empresa.id !== userEmpresaId) {
        throw new ForbiddenException(
          'No tienes permisos para eliminar este producto',
        );
      }
    }

    // Eliminar imágenes de Cloudinary si existen
    if (producto.imagenesPublicIds && producto.imagenesPublicIds.length > 0) {
      try {
        await this.cloudinaryService.deleteMultipleImages(
          producto.imagenesPublicIds,
        );
      } catch (error) {
        console.error('Error deleting multiple images from Cloudinary:', error);
      }
    } else if (producto.imagenPublicId) {
      // Para compatibilidad con versiones anteriores
      try {
        await this.cloudinaryService.deleteImage(producto.imagenPublicId);
      } catch (error) {
        console.error('Error deleting image from Cloudinary:', error);
      }
    }

    await this.productoVendedorRepo.delete({ producto: { id } });

    return this.productoRepo.remove(producto);
  }

  async findByVendedor(userId: string): Promise<Producto[]> {
    const vendedor = await this.vendedorRepo.findOne({
      where: { user: { id: userId } },
      relations: ['empresa'],
    });

    if (!vendedor) {
      throw new NotFoundException('Vendedor no encontrado');
    }

    return this.productoRepo.find({
      where: { empresa: { id: vendedor.empresa.id } },
      relations: ['empresa', 'ordenes', 'productoVendedores'],
    });
  }
}
