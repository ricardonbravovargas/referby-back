import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  UseGuards,
  ForbiddenException,
  UnauthorizedException,
  Query,
  Req,
  UseInterceptors,
  UploadedFiles,
  Logger,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ProductoService } from './producto.service';
import {
  CreateProductoDto,
  UpdateProductoDto,
} from '../dtos/create-producto.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';
import { UserRole } from '../auth/roles.enum';
import { Express } from 'express';

@Controller('productos')
export class ProductoController {
  private readonly logger = new Logger(ProductoController.name);

  constructor(private readonly productoService: ProductoService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FilesInterceptor('imagenes', 5)) // Permitir hasta 5 imágenes
  async create(
    @Req() req: any,
    @UploadedFiles() files: Express.Multer.File[],
    @Body() dto: CreateProductoDto,
  ) {
    const userRole = (req?.user?.rol || req?.user?.role || '').toLowerCase();

    if (userRole !== UserRole.EMPRESA) {
      throw new ForbiddenException('Solo las empresas pueden crear productos');
    }

    const userId = req.user.id || req.user.sub;

    console.log('Datos recibidos:', {
      dto,
      files: files ? `${files.length} archivos` : 'sin archivos',
      fileNames: files?.map((f) => f.originalname) || [],
    });

    return this.productoService.create(dto, userId, files);
  }

  @Get()
  @UseGuards(OptionalJwtAuthGuard) // Usar el guard opcional
  async findAll(
    @Req() req: any,
    @Query('search') search?: string,
    @Query('categoria') categoria?: string,
    @Query('empresa') empresa?: string,
    @Query('minPrecio') minPrecio?: string,
    @Query('maxPrecio') maxPrecio?: string,
  ) {
    const filters = {
      search,
      categoria,
      empresa,
      minPrecio: minPrecio ? Number.parseFloat(minPrecio) : undefined,
      maxPrecio: maxPrecio ? Number.parseFloat(maxPrecio) : undefined,
    };

    // Verificar si hay un usuario logueado y si es empresa
    this.logger.debug(`Request headers: ${JSON.stringify(req.headers)}`);
    this.logger.debug(`Request user: ${JSON.stringify(req.user)}`);

    if (req.user) {
      const userId = req.user.id || req.user.sub;
      const userRole = (req.user.rol || req.user.role || '').toLowerCase();

      this.logger.debug(`Usuario autenticado: ${userId}, rol: ${userRole}`);

      // Si es una empresa, solo mostrar sus productos
      if (userRole === UserRole.EMPRESA || userRole === 'empresa') {
        if (!userId) {
          throw new UnauthorizedException('Usuario no válido');
        }
        this.logger.debug(
          `Filtrando productos para empresa con userId: ${userId}`,
        );
        return this.productoService.findByEmpresa(userId, filters);
      }
    } else {
      this.logger.debug('No hay usuario autenticado en la solicitud');
    }

    // Para otros usuarios o no logueados, mostrar todos los productos
    return this.productoService.findAll(filters);
  }

  @Get('categorias')
  getCategorias() {
    return this.productoService.getCategorias();
  }

  @Get('empresas')
  getEmpresas() {
    return this.productoService.getEmpresas();
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productoService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id')
  @UseInterceptors(FilesInterceptor('imagenes', 5)) // Permitir hasta 5 imágenes para actualización
  async update(
    @Param('id') id: string,
    @Req() req: any,
    @UploadedFiles() files: Express.Multer.File[],
    @Body() dto: UpdateProductoDto,
  ) {
    const userRole = (req.user.rol || req.user.role || '').toLowerCase();
    const userId = req.user.id || req.user.sub;

    if (userRole !== UserRole.EMPRESA && userRole !== 'empresa') {
      throw new ForbiddenException(
        'Solo las empresas pueden actualizar productos',
      );
    }

    console.log('Datos de actualización recibidos:', {
      id,
      dto,
      files: files ? `${files.length} archivos` : 'sin archivos',
      fileNames: files?.map((f) => f.originalname) || [],
    });

    return this.productoService.update(id, dto, userId, files);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: any) {
    const userRole = (req.user.rol || req.user.role || '').toLowerCase();
    const userId = req.user.id || req.user.sub;

    if (userRole !== UserRole.EMPRESA && userRole !== 'empresa') {
      throw new ForbiddenException(
        'Solo las empresas pueden eliminar productos',
      );
    }

    return this.productoService.remove(id, userId);
  }
}
