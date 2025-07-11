// cart/cart.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cart } from '../entities/cart.entiity';
import { CartItem } from '../entities/cart-item.entity';
import { Producto } from '../entities/producto.entitiy';
import { User } from '../entities/user.entity';
import { AddToCartDto, UpdateCartItemDto } from '../dtos/cart.dto';

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(Cart)
    private readonly cartRepo: Repository<Cart>,

    @InjectRepository(CartItem)
    private readonly cartItemRepo: Repository<CartItem>,

    @InjectRepository(Producto)
    private readonly productoRepo: Repository<Producto>,

    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async getOrCreateCart(userId: string): Promise<Cart> {
    let cart = await this.cartRepo.findOne({
      where: { user: { id: userId }, status: 'active' },
      relations: ['items', 'items.producto', 'items.producto.empresa'],
    });

    if (!cart) {
      const user = await this.userRepo.findOne({ where: { id: userId } });
      if (!user) {
        throw new NotFoundException('Usuario no encontrado');
      }

      cart = this.cartRepo.create({
        user,
        items: [],
        total: 0,
      });
      cart = await this.cartRepo.save(cart);
    }

    return cart;
  }

  async addToCart(userId: string, dto: AddToCartDto): Promise<Cart> {
    const cart = await this.getOrCreateCart(userId);

    const producto = await this.productoRepo.findOne({
      where: { id: dto.productoId },
      relations: ['empresa'],
    });

    if (!producto) {
      throw new NotFoundException('Producto no encontrado');
    }

    // Verificar si el producto ya está en el carrito
    const existingItem = cart.items.find(
      (item) => item.producto.id === dto.productoId,
    );

    if (existingItem) {
      existingItem.cantidad += dto.cantidad;
      await this.cartItemRepo.save(existingItem);
    } else {
      const cartItem = this.cartItemRepo.create({
        cart,
        producto,
        cantidad: dto.cantidad,
        precio: producto.precio,
      });
      await this.cartItemRepo.save(cartItem);
    }

    // Actualizar referido si se proporciona
    if (dto.referredBy && !cart.referredBy) {
      cart.referredBy = dto.referredBy;
    }

    // Recalcular total
    await this.updateCartTotal(cart.id);

    return this.getOrCreateCart(userId);
  }

  async updateCartItem(
    userId: string,
    itemId: string,
    dto: UpdateCartItemDto,
  ): Promise<Cart> {
    const cart = await this.getOrCreateCart(userId);

    const cartItem = await this.cartItemRepo.findOne({
      where: { id: itemId, cart: { id: cart.id } },
    });

    if (!cartItem) {
      throw new NotFoundException('Item del carrito no encontrado');
    }

    if (dto.cantidad === 0) {
      await this.cartItemRepo.remove(cartItem);
    } else {
      cartItem.cantidad = dto.cantidad;
      await this.cartItemRepo.save(cartItem);
    }

    await this.updateCartTotal(cart.id);
    return this.getOrCreateCart(userId);
  }

  async removeFromCart(userId: string, itemId: string): Promise<Cart> {
    const cart = await this.getOrCreateCart(userId);

    const cartItem = await this.cartItemRepo.findOne({
      where: { id: itemId, cart: { id: cart.id } },
    });

    if (!cartItem) {
      throw new NotFoundException('Item del carrito no encontrado');
    }

    await this.cartItemRepo.remove(cartItem);
    await this.updateCartTotal(cart.id);

    return this.getOrCreateCart(userId);
  }

  async clearCart(userId: string): Promise<void> {
    const cart = await this.getOrCreateCart(userId);
    await this.cartItemRepo.delete({ cart: { id: cart.id } });
    await this.updateCartTotal(cart.id);
  }

  private async updateCartTotal(cartId: string): Promise<void> {
    const cart = await this.cartRepo.findOne({
      where: { id: cartId },
      relations: ['items'],
    });

    if (cart) {
      const total = cart.items.reduce(
        (sum, item) => sum + item.precio * item.cantidad,
        0,
      );
      cart.total = total;
      await this.cartRepo.save(cart);
    }
  }

  async getCart(userId: string): Promise<Cart> {
    return this.getOrCreateCart(userId);
  }
}
