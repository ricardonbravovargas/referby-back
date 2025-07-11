import { Injectable, Logger } from "@nestjs/common";
import * as nodemailer from "nodemailer";

interface MailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

interface CompanyOrderDetails {
  customerName: string;
  customerEmail: string;
  customerAddress: string;
  customerCity: string;
  customerPhone?: string;
  products: any[];
  totalAmount: number;
  orderId: string;
}

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(MailService.name);

  constructor() {
    this.logger.log("🔧 Inicializando MailService...");

    if (!process.env.MAIL_USER || !process.env.MAIL_PASSWORD) {
      this.logger.error(
        "❌ MAIL_USER o MAIL_PASSWORD no están definidos en las variables de entorno",
      );
      return;
    }

    try {
      this.transporter = nodemailer.createTransport({
        service: "gmail",
        host: "smtp.gmail.com",
        port: 587,
        secure: false,
        auth: {
          user: process.env.MAIL_USER,
          pass: process.env.MAIL_PASSWORD,
        },
        tls: {
          rejectUnauthorized: false,
        },
      });

      this.logger.log("✅ Transporter de Gmail configurado");
      this.verifyConnection();
    } catch (error) {
      this.logger.error("❌ Error configurando transporter:", error);
    }
  }

  private async verifyConnection(): Promise<void> {
    try {
      this.logger.log("🔍 Verificando conexión con Gmail...");
      await this.transporter.verify();
      this.logger.log("✅ Conexión con Gmail establecida correctamente");
    } catch (error) {
      this.logger.error("❌ Error conectando con Gmail:", error);
    }
  }

  async sendMail(options: MailOptions): Promise<void> {
    try {
      if (!this.transporter) {
        throw new Error("Transporter no está configurado");
      }

      const mailOptions = {
        from: `"MercadoPro" <${process.env.MAIL_FROM || process.env.MAIL_USER}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      };

      const info = await this.transporter.sendMail(mailOptions);

      this.logger.log("✅ Email enviado exitosamente", {
        messageId: info.messageId,
        to: options.to,
      });
    } catch (error) {
      this.logger.error("❌ Error enviando email:", error);
      throw error;
    }
  }

  async sendTestEmail(to: string): Promise<void> {
    await this.sendMail({
      to,
      subject: "Prueba de correo - Sistema de Referidos",
      html: this.getTestEmailTemplate(),
      text: "Email de prueba - Si recibes esto, la configuración funciona correctamente.",
    });
  }

  async sendCompanyOrderNotification(
    companyEmail: string,
    companyName: string,
    orderDetails: CompanyOrderDetails,
  ): Promise<void> {
    await this.sendMail({
      to: companyEmail,
      subject: `🛒 Nueva compra de tus productos - Pedido #${orderDetails.orderId}`,
      html: this.getCompanyOrderTemplate(companyName, orderDetails),
      text: this.getCompanyOrderTextTemplate(orderDetails),
    });

    this.logger.log(
      `✅ Email de notificación enviado a empresa: ${companyEmail}`,
    );
  }

  async sendCompanyInactivityReminder(
    companyEmail: string,
    companyName: string,
    daysSinceLastLogin: number,
  ): Promise<void> {
    await this.sendMail({
      to: companyEmail,
      subject: "⏰ Te extrañamos - Vuelve a tu panel de empresa",
      html: this.getCompanyInactivityTemplate(companyName, daysSinceLastLogin),
      text: this.getCompanyInactivityTextTemplate(
        companyName,
        daysSinceLastLogin,
      ),
    });

    this.logger.log(
      `✅ Email de recordatorio enviado a empresa: ${companyEmail}`,
    );
  }

  async sendAmbassadorInactivityReminder(
    ambassadorEmail: string,
    ambassadorName: string,
    daysSinceLastLogin: number,
  ): Promise<void> {
    await this.sendMail({
      to: ambassadorEmail,
      subject: "🎯 ¡No pierdas tus comisiones! Vuelve a generar referidos",
      html: this.getAmbassadorInactivityTemplate(
        ambassadorName,
        daysSinceLastLogin,
      ),
      text: this.getAmbassadorInactivityTextTemplate(
        ambassadorName,
        daysSinceLastLogin,
      ),
    });

    this.logger.log(
      `✅ Email de recordatorio enviado a embajador: ${ambassadorEmail}`,
    );
  }

  async sendAmbassadorCelebration(
    ambassadorEmail: string,
    ambassadorName: string,
    daysAsAmbassador: number,
    totalCommissions = 0,
    totalReferrals = 0,
  ): Promise<void> {
    const milestone = this.getAmbassadorMilestone(daysAsAmbassador);

    await this.sendMail({
      to: ambassadorEmail,
      subject: `${milestone.emoji} ¡Felicidades! ${milestone.milestone} como embajador`,
      html: this.getAmbassadorCelebrationTemplate(
        ambassadorName,
        daysAsAmbassador,
        totalCommissions,
        totalReferrals,
        milestone,
      ),
      text: this.getAmbassadorCelebrationTextTemplate(
        ambassadorName,
        daysAsAmbassador,
        totalCommissions,
        totalReferrals,
        milestone,
      ),
    });

    this.logger.log(
      `✅ Email de celebración enviado a embajador: ${ambassadorEmail} (${daysAsAmbassador} días)`,
    );
  }

  // Templates HTML
  private getTestEmailTemplate(): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center;">
          <h1 style="color: #28a745; margin: 0;">✅ Email de prueba exitoso!</h1>
          <p style="margin: 10px 0;">Si recibes este email, la configuración está funcionando correctamente.</p>
          <p style="color: #6c757d; font-size: 14px;">Fecha: ${new Date().toLocaleString("es-ES")}</p>
        </div>
      </div>
    `;
  }

  private getCompanyOrderTemplate(
    companyName: string,
    orderDetails: CompanyOrderDetails,
  ): string {
    return `
      <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
        <div style="background: #e8f5e8; padding: 20px; border-radius: 8px; text-align: center; margin-bottom: 20px;">
          <h2 style="color: #28a745; margin: 0;">🛒 Nueva Compra Recibida</h2>
        </div>

        <div style="background: white; padding: 20px; border: 1px solid #dee2e6; border-radius: 8px;">
          <h3 style="color: #495057;">Hola ${companyName},</h3>
          <p>¡Excelentes noticias! Has recibido una nueva venta.</p>

          <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <h4 style="color: #495057; margin-top: 0;">📋 Detalles del Cliente:</h4>
            <p><strong>👤 Nombre:</strong> ${orderDetails.customerName}</p>
            <p><strong>📧 Email:</strong> ${orderDetails.customerEmail}</p>
            <p><strong>📍 Dirección:</strong> ${orderDetails.customerAddress}</p>
            <p><strong>🏙️ Ciudad:</strong> ${orderDetails.customerCity}</p>
            ${orderDetails.customerPhone ? `<p><strong>📞 Teléfono:</strong> ${orderDetails.customerPhone}</p>` : ""}
          </div>

          <div style="background: #e3f2fd; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <h4 style="color: #1565c0; margin-top: 0;">🛍️ Productos Vendidos:</h4>
            <ul>
              ${orderDetails.products
                .map(
                  (product) =>
                    `<li><strong>${product.name}</strong> - Cantidad: ${product.quantity} - $${product.price.toFixed(2)}</li>`,
                )
                .join("")}
            </ul>
          </div>

          <div style="background: #fff3cd; padding: 15px; border-radius: 5px; text-align: center;">
            <h3 style="color: #856404;">💰 Total de la Venta: $${orderDetails.totalAmount.toFixed(2)}</h3>
          </div>

          <div style="background: #d4edda; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <h4 style="color: #155724;">📦 Próximos pasos:</h4>
            <ul style="color: #155724;">
              <li>Prepara el producto para envío</li>
              <li>Contacta al cliente si necesitas más detalles</li>
              <li>Actualiza el estado del pedido en tu panel</li>
            </ul>
          </div>

          <p style="text-align: center; margin: 20px 0;">
            <a href="${process.env.FRONTEND_URL || "http://localhost:5173"}/login"
               style="background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">
              🚀 Ir a mi Panel
            </a>
          </p>
        </div>
      </div>
    `;
  }

  private getCompanyInactivityTemplate(
    companyName: string,
    daysSinceLastLogin: number,
  ): string {
    return `
      <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
        <div style="background: #fff3cd; padding: 20px; border-radius: 8px; text-align: center;">
          <h2 style="color: #856404;">⏰ Te extrañamos, ${companyName}!</h2>
        </div>

        <div style="background: white; padding: 20px; border: 1px solid #dee2e6; border-radius: 8px; margin-top: 20px;">
          <p>Hemos notado que no has visitado tu panel de empresa en <strong>${daysSinceLastLogin} días</strong>.</p>

          <div style="background: #e3f2fd; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <h4 style="color: #1565c0;">📊 En tu panel puedes:</h4>
            <ul>
              <li>Ver las estadísticas de tus productos</li>
              <li>Gestionar tu inventario</li>
              <li>Revisar las ventas recientes</li>
              <li>Actualizar información de productos</li>
              <li>Configurar promociones especiales</li>
            </ul>
          </div>

          <div style="text-align: center; margin: 25px 0;">
            <a href="${process.env.FRONTEND_URL || "http://localhost:5173"}/login"
               style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">
              🚀 Acceder a mi Panel
            </a>
          </div>

          <div style="background: #d4edda; padding: 15px; border-radius: 5px;">
            <p style="margin: 0; color: #155724;">
              <strong>💡 Tip:</strong> Los empresarios activos venden hasta 3x más que los inactivos.
            </p>
          </div>
        </div>
      </div>
    `;
  }

  private getAmbassadorInactivityTemplate(
    ambassadorName: string,
    daysSinceLastLogin: number,
  ): string {
    return `
      <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
        <div style="background: #ffeaa7; padding: 20px; border-radius: 8px; text-align: center;">
          <h2 style="color: #d63031;">🎯 ¡Hola ${ambassadorName}!</h2>
        </div>

        <div style="background: white; padding: 20px; border: 1px solid #dee2e6; border-radius: 8px; margin-top: 20px;">
          <p><strong>¡No te olvides de tus comisiones!</strong></p>
          <p>Hace <strong>${daysSinceLastLogin} día${daysSinceLastLogin > 1 ? "s" : ""}</strong> que no revisas tu panel.</p>

          <div style="background: #fff3cd; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <h4 style="color: #856404;">💰 Puedes:</h4>
            <ul>
              <li>Compartir tu enlace de referido único</li>
              <li>Ver tus comisiones acumuladas</li>
              <li>Revisar cuántas personas has referido</li>
              <li>Descargar materiales promocionales</li>
              <li>Seguir el progreso de tus referidos</li>
            </ul>
          </div>

          <div style="text-align: center; margin: 25px 0;">
            <a href="${process.env.FRONTEND_URL || "http://localhost:5173"}/login"
               style="background: #f39c12; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">
              💎 Ver mis Comisiones
            </a>
          </div>

          <div style="background: #e8f5e8; padding: 15px; border-radius: 5px;">
            <p style="margin: 0; color: #2d5016;">
              <strong>🚀 Dato:</strong> Los embajadores activos ganan 5x más comisiones.
            </p>
          </div>
        </div>
      </div>
    `;
  }

  private getAmbassadorCelebrationTemplate(
    ambassadorName: string,
    daysAsAmbassador: number,
    totalCommissions: number,
    totalReferrals: number,
    milestone: any,
  ): string {
    return `
      <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
        <div style="background: ${milestone.color}; padding: 20px; border-radius: 8px; text-align: center;">
          <h1 style="color: white; font-size: 28px;">${milestone.emoji}</h1>
          <h2 style="color: white; margin: 10px 0;">¡Felicidades ${ambassadorName}!</h2>
        </div>

        <div style="background: white; padding: 20px; border: 1px solid #dee2e6; border-radius: 8px; margin-top: 20px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h3>${milestone.milestone}</h3>
            <p style="font-size: 18px; color: #6c757d;">${milestone.message}</p>
          </div>

          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h4 style="text-align: center;">📊 Tus Logros</h4>
            <div style="display: flex; justify-content: space-around; text-align: center;">
              <div style="padding: 10px;">
                <div style="font-size: 24px; font-weight: bold; color: #28a745;">${daysAsAmbassador}</div>
                <div style="font-size: 14px; color: #6c757d;">Días como embajador</div>
              </div>
              <div style="padding: 10px;">
                <div style="font-size: 24px; font-weight: bold; color: #007bff;">${totalReferrals}</div>
                <div style="font-size: 14px; color: #6c757d;">Personas referidas</div>
              </div>
              <div style="padding: 10px;">
                <div style="font-size: 24px; font-weight: bold; color: #f39c12;">$${totalCommissions.toFixed(2)}</div>
                <div style="font-size: 14px; color: #6c757d;">Comisiones ganadas</div>
              </div>
            </div>
          </div>

          ${this.getMotivationalMessage(daysAsAmbassador)}

          <div style="text-align: center; margin: 25px 0;">
            <a href="${process.env.FRONTEND_URL || "http://localhost:5173"}/login"
               style="background: ${milestone.color}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">
              🚀 Ver mi Panel de Embajador
            </a>
          </div>

          <div style="background: #e8f5e8; padding: 15px; border-radius: 5px; text-align: center;">
            <p style="margin: 0; color: #2d5016;">
              <strong>🎁 Sigue así y desbloquea más beneficios exclusivos!</strong>
            </p>
          </div>
        </div>
      </div>
    `;
  }

  // Templates de texto plano
  private getCompanyOrderTextTemplate(
    orderDetails: CompanyOrderDetails,
  ): string {
    return `Nueva compra recibida!

Detalles del Cliente:
- Nombre: ${orderDetails.customerName}
- Email: ${orderDetails.customerEmail}
- Dirección: ${orderDetails.customerAddress}
- Ciudad: ${orderDetails.customerCity}
${orderDetails.customerPhone ? `- Teléfono: ${orderDetails.customerPhone}` : ""}

Productos:
${orderDetails.products.map((p) => `- ${p.name} x${p.quantity} - $${p.price.toFixed(2)}`).join("\n")}

Total: $${orderDetails.totalAmount.toFixed(2)}
Pedido ID: ${orderDetails.orderId}`;
  }

  private getCompanyInactivityTextTemplate(
    companyName: string,
    daysSinceLastLogin: number,
  ): string {
    return `Hola ${companyName},

Te extrañamos! No has visitado tu panel en ${daysSinceLastLogin} días.

En tu panel puedes:
- Ver estadísticas de tus productos
- Gestionar tu inventario
- Revisar ventas recientes
- Actualizar información de productos

Accede: ${process.env.FRONTEND_URL || "http://localhost:5173"}/login`;
  }

  private getAmbassadorInactivityTextTemplate(
    ambassadorName: string,
    daysSinceLastLogin: number,
  ): string {
    return `¡Hola ${ambassadorName}!

Hace ${daysSinceLastLogin} día${daysSinceLastLogin > 1 ? "s" : ""} que no revisas tu panel.

Puedes:
- Compartir tu enlace único
- Ver tus comisiones
- Revisar tus referidos
- Descargar materiales promocionales

Accede: ${process.env.FRONTEND_URL || "http://localhost:5173"}/login`;
  }

  private getAmbassadorCelebrationTextTemplate(
    ambassadorName: string,
    daysAsAmbassador: number,
    totalCommissions: number,
    totalReferrals: number,
    milestone: any,
  ): string {
    return `¡Felicidades ${ambassadorName}!

${milestone.milestone}
${milestone.message}

Tus logros:
- ${daysAsAmbassador} días como embajador
- ${totalReferrals} personas referidas
- $${totalCommissions.toFixed(2)} en comisiones

¡Sigue así y desbloquea más beneficios!

Accede: ${process.env.FRONTEND_URL || "http://localhost:5173"}/login`;
  }

  // Funciones auxiliares
  private getAmbassadorMilestone(days: number): {
    milestone: string;
    message: string;
    emoji: string;
    color: string;
  } {
    if (days >= 365) {
      const years = Math.floor(days / 365);
      return {
        milestone: `${years} año${years > 1 ? "s" : ""} como embajador`,
        message: "¡Eres una leyenda! Tu dedicación es inspiradora.",
        emoji: "👑",
        color: "#6f42c1",
      };
    } else if (days >= 180) {
      return {
        milestone: "6 meses como embajador",
        message: "¡Medio año de éxitos! Eres un embajador experimentado.",
        emoji: "🏆",
        color: "#fd7e14",
      };
    } else if (days >= 90) {
      return {
        milestone: "3 meses como embajador",
        message: "¡Un trimestre completo! Ya dominas el arte de referir.",
        emoji: "🥇",
        color: "#20c997",
      };
    } else if (days >= 30) {
      return {
        milestone: "1 mes como embajador",
        message: "¡Tu primer mes completado! El momentum está creciendo.",
        emoji: "🎖️",
        color: "#0dcaf0",
      };
    } else if (days >= 14) {
      return {
        milestone: "2 semanas como embajador",
        message: "¡Dos semanas de constancia! Vas por buen camino.",
        emoji: "⭐",
        color: "#198754",
      };
    } else if (days >= 7) {
      return {
        milestone: "1 semana como embajador",
        message: "¡Tu primera semana completada! Un gran comienzo.",
        emoji: "🌟",
        color: "#0d6efd",
      };
    } else {
      return {
        milestone: `${days} día${days > 1 ? "s" : ""} como embajador`,
        message: "¡Bienvenido al equipo! Cada día cuenta.",
        emoji: "🚀",
        color: "#dc3545",
      };
    }
  }

  private getMotivationalMessage(days: number): string {
    if (days >= 365) {
      return `
        <div style="background: #f8d7da; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <h4 style="color: #721c24;">👑 Embajador Legendario</h4>
          <p style="margin: 0; color: #721c24;">
            Eres parte del selecto grupo de embajadores con más de un año de experiencia.
            ¡Tu expertise es invaluable!
          </p>
        </div>
      `;
    } else if (days >= 90) {
      return `
        <div style="background: #d1ecf1; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <h4 style="color: #0c5460;">🏆 Embajador Experto</h4>
          <p style="margin: 0; color: #0c5460;">
            Con tu experiencia, ya conoces todos los secretos para maximizar comisiones.
            ¡Sigue siendo un ejemplo!
          </p>
        </div>
      `;
    } else if (days >= 30) {
      return `
        <div style="background: #d4edda; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <h4 style="color: #155724;">🎖️ Embajador Establecido</h4>
          <p style="margin: 0; color: #155724;">
            Ya tienes el ritmo perfecto. Ahora es momento de escalar.
            ¡El próximo nivel te espera!
          </p>
        </div>
      `;
    } else if (days >= 7) {
      return `
        <div style="background: #fff3cd; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <h4 style="color: #856404;">⭐ Embajador en Crecimiento</h4>
          <p style="margin: 0; color: #856404;">
            ¡Excelente progreso! Cada semana mejoras.
            Mantén la constancia y verás resultados increíbles.
          </p>
        </div>
      `;
    } else {
      return `
        <div style="background: #cce5ff; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <h4 style="color: #004085;">🚀 Nuevo Embajador</h4>
          <p style="margin: 0; color: #004085;">
            ¡Bienvenido al equipo! Estos primeros días son cruciales.
            Aprende, experimenta y no tengas miedo de hacer preguntas.
          </p>
        </div>
      `;
    }
  }
}
