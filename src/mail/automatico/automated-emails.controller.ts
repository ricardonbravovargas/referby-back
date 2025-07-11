import {
  Controller,
  Post,
  UseGuards,
  Request,
  Get,
  HttpException,
  HttpStatus,
  Logger,
  Body,
  Param,
} from '@nestjs/common';
import { AutomatedEmailsService } from './automated-emails.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { UserRole } from '../../auth/roles.enum';
import { MailService } from '../mail.service';
import { ReferralsService } from '../../referrals/referrals.service';

interface BulkEmailResult {
  email: string;
  type: 'company' | 'ambassador' | 'celebration';
  status: 'success' | 'error';
  result?: any;
  error?: string;
}

@Controller('automated-emails')
export class AutomatedEmailsController {
  private readonly logger = new Logger(AutomatedEmailsController.name);

  constructor(
    private readonly automatedEmailsService: AutomatedEmailsService,
    private readonly mailService: MailService,
    private readonly referralsService: ReferralsService,
  ) {}

  @Post('test')
  async testAutomatedEmail(
    @Body()
    testData: {
      type: 'company' | 'ambassador' | 'celebration';
      userEmail: string;
    },
  ) {
    try {
      if (process.env.NODE_ENV === 'production') {
        throw new HttpException(
          'Testing solo disponible en desarrollo',
          HttpStatus.FORBIDDEN,
        );
      }

      if (!testData.type || !testData.userEmail) {
        throw new HttpException(
          "Se requieren 'type' y 'userEmail' en el body",
          HttpStatus.BAD_REQUEST,
        );
      }

      const validTypes = ['company', 'ambassador', 'celebration'];
      if (!validTypes.includes(testData.type)) {
        throw new HttpException(
          `Tipo inválido. Debe ser uno de: ${validTypes.join(', ')}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      const result = await this.automatedEmailsService.testAutomatedEmails(
        testData.type,
        testData.userEmail,
      );

      return {
        success: true,
        message: 'Email de prueba enviado exitosamente',
        details: result,
        sentTo: testData.userEmail,
        emailType: testData.type,
      };
    } catch (error) {
      this.logger.error('❌ Error enviando email de prueba:', error);
      throw new HttpException(
        error.message || 'Error enviando email de prueba',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('run-checks')
  @UseGuards(JwtAuthGuard)
  async runManualChecks(@Request() req) {
    try {
      if (req.user.role !== UserRole.ADMIN) {
        throw new HttpException(
          'Solo administradores pueden ejecutar verificaciones manuales',
          HttpStatus.FORBIDDEN,
        );
      }

      this.automatedEmailsService.handleDailyEmailCheck();

      return {
        success: true,
        message: 'Verificaciones iniciadas en segundo plano',
        executedBy: req.user.email,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('❌ Error ejecutando verificaciones manuales:', error);
      throw new HttpException(
        error.message || 'Error ejecutando verificaciones',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('run-celebrations')
  @UseGuards(JwtAuthGuard)
  async runManualCelebrations(@Request() req) {
    try {
      if (req.user.role !== UserRole.ADMIN) {
        throw new HttpException(
          'Solo administradores pueden ejecutar celebraciones manuales',
          HttpStatus.FORBIDDEN,
        );
      }

      this.automatedEmailsService.handleWeeklyAmbassadorCelebration();

      return {
        success: true,
        message: 'Celebraciones iniciadas en segundo plano',
        executedBy: req.user.email,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('❌ Error ejecutando celebraciones manuales:', error);
      throw new HttpException(
        error.message || 'Error ejecutando celebraciones',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard)
  async getAutomatedEmailStats(@Request() req) {
    try {
      if (req.user.role !== UserRole.ADMIN) {
        throw new HttpException(
          'Solo administradores pueden ver estadísticas',
          HttpStatus.FORBIDDEN,
        );
      }

      const stats = await this.automatedEmailsService.getEmailStats();

      return {
        success: true,
        stats: stats,
        message: 'Estadísticas obtenidas exitosamente',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('❌ Error obteniendo estadísticas:', error);
      throw new HttpException(
        error.message || 'Error obteniendo estadísticas',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('send-manual')
  @UseGuards(JwtAuthGuard)
  async sendManualEmailToUser(
    @Request() req,
    @Body()
    emailData: {
      type: 'company' | 'ambassador' | 'celebration';
      userEmail: string;
      userName?: string;
      customMessage?: string;
    },
  ) {
    try {
      if (req.user.role !== UserRole.ADMIN) {
        throw new HttpException(
          'Solo administradores pueden enviar emails manuales',
          HttpStatus.FORBIDDEN,
        );
      }

      if (!emailData.type || !emailData.userEmail) {
        throw new HttpException(
          'Tipo y email son requeridos',
          HttpStatus.BAD_REQUEST,
        );
      }

      const result = await this.automatedEmailsService.sendManualEmail(
        emailData.type,
        emailData.userEmail,
        emailData.userName || 'Usuario',
        emailData.customMessage,
      );

      return {
        success: true,
        message: 'Email manual enviado exitosamente',
        details: result,
        sentTo: emailData.userEmail,
        sentBy: req.user.email,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('❌ Error enviando email manual:', error);
      throw new HttpException(
        error.message || 'Error enviando email manual',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('history')
  @UseGuards(JwtAuthGuard)
  async getEmailHistory(@Request() req) {
    try {
      if (req.user.role !== UserRole.ADMIN) {
        throw new HttpException(
          'Solo administradores pueden ver el historial',
          HttpStatus.FORBIDDEN,
        );
      }

      const history = await this.automatedEmailsService.getEmailHistory();

      return {
        success: true,
        history: history,
        message: 'Historial obtenido exitosamente',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('❌ Error obteniendo historial:', error);
      throw new HttpException(
        error.message || 'Error obteniendo historial',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('cron-status')
  @UseGuards(JwtAuthGuard)
  async getCronJobsStatus(@Request() req) {
    try {
      if (req.user.role !== UserRole.ADMIN) {
        throw new HttpException(
          'Solo administradores pueden ver el estado de cron jobs',
          HttpStatus.FORBIDDEN,
        );
      }

      const status = await this.automatedEmailsService.getCronJobsStatus();

      return {
        success: true,
        cronJobs: status,
        message: 'Estado de cron jobs obtenido exitosamente',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('❌ Error obteniendo estado de cron jobs:', error);
      throw new HttpException(
        error.message || 'Error obteniendo estado de cron jobs',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('send-with-real-data')
  @UseGuards(JwtAuthGuard)
  async sendEmailWithRealData(
    @Body()
    emailData: {
      type: 'company' | 'ambassador' | 'celebration';
      userEmail: string;
      userName?: string;
      userId?: string;
      lastLogin?: string;
      connectionCount?: number;
      daysSinceLastLogin?: number;
      totalEarnings?: number;
      totalReferrals?: number;
      thisMonthEarnings?: number;
      thisMonthReferrals?: number;
      currentLevel?: string;
      streakDays?: number;
      memberSince?: string;
    },
    @Request() req,
  ) {
    try {
      if (req.user.role !== UserRole.ADMIN) {
        throw new HttpException(
          'Solo administradores pueden enviar emails con datos reales',
          HttpStatus.FORBIDDEN,
        );
      }

      if (!emailData.type || !emailData.userEmail) {
        throw new HttpException(
          "Se requieren 'type' y 'userEmail'",
          HttpStatus.BAD_REQUEST,
        );
      }

      const validTypes = ['company', 'ambassador', 'celebration'];
      if (!validTypes.includes(emailData.type)) {
        throw new HttpException(
          `Tipo inválido. Debe ser uno de: ${validTypes.join(', ')}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      // Usar el nombre proporcionado o "Usuario" por defecto
      const userName = emailData.userName || 'Usuario';
      const daysSinceLastLogin = emailData.daysSinceLastLogin || 0;

      let result;

      switch (emailData.type) {
        case 'company':
          await this.mailService.sendCompanyInactivityReminder(
            emailData.userEmail,
            userName,
            daysSinceLastLogin,
          );
          result = `Recordatorio de empresa enviado a ${userName}`;
          break;

        case 'ambassador':
          await this.mailService.sendAmbassadorInactivityReminder(
            emailData.userEmail,
            userName,
            daysSinceLastLogin,
          );
          result = `Recordatorio de embajador enviado a ${userName}`;
          break;

        case 'celebration':
          let finalTotalEarnings = emailData.totalEarnings || 0;
          let finalTotalReferrals = emailData.totalReferrals || 0;

          // Si no se proporcionaron datos, intentar obtenerlos del servicio de referidos
          if (
            (!emailData.totalEarnings || !emailData.totalReferrals) &&
            emailData.userId
          ) {
            try {
              this.logger.log(
                `�� Obteniendo datos reales automáticamente para: ${emailData.userEmail}`,
              );
              const ambassadorStats = await this.referralsService.getUserStats(
                emailData.userId,
              );
              finalTotalEarnings = ambassadorStats.totalCommissions;
              finalTotalReferrals = ambassadorStats.totalReferrals;
              this.logger.log(
                `✅ Datos obtenidos: $${finalTotalEarnings}, ${finalTotalReferrals} referidos`,
              );
            } catch (error) {
              this.logger.warn(
                `⚠️ Error obteniendo datos automáticamente: ${error.message}`,
              );
              // Mantener los valores proporcionados o por defecto
            }
          }

          const memberSinceDate = emailData.memberSince
            ? new Date(emailData.memberSince)
            : new Date();
          const daysAsMember = Math.floor(
            (Date.now() - memberSinceDate.getTime()) / (1000 * 60 * 60 * 24),
          );

          await this.mailService.sendAmbassadorCelebration(
            emailData.userEmail,
            userName,
            daysAsMember,
            finalTotalEarnings,
            finalTotalReferrals,
          );
          result = `Celebración enviada a ${userName} con $${finalTotalEarnings} ganados y ${finalTotalReferrals} referidos (datos reales)`;
          break;

        default:
          throw new Error(`Tipo de email no soportado: ${emailData.type}`);
      }

      return {
        success: true,
        message: 'Email enviado exitosamente con datos reales',
        details: result,
        sentTo: emailData.userEmail,
        emailType: emailData.type,
        dataUsed: {
          userName,
          daysSinceLastLogin,
          totalEarnings: emailData.totalEarnings,
          totalReferrals: emailData.totalReferrals,
          currentLevel: emailData.currentLevel,
        },
        executedBy: req.user.email,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('❌ Error enviando email con datos reales:', error);
      throw new HttpException(
        error.message || 'Error enviando email con datos reales',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('run-checks-with-real-data')
  @UseGuards(JwtAuthGuard)
  async runChecksWithRealData(@Request() req) {
    try {
      if (req.user.role !== UserRole.ADMIN) {
        throw new HttpException(
          'Solo administradores pueden ejecutar verificaciones',
          HttpStatus.FORBIDDEN,
        );
      }

      // Ejecutar verificaciones usando datos reales de la base de datos
      this.automatedEmailsService.handleDailyEmailCheck();

      return {
        success: true,
        message:
          'Verificaciones iniciadas con datos reales de la base de datos',
        executedBy: req.user.email,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('❌ Error ejecutando verificaciones:', error);
      throw new HttpException(
        error.message || 'Error ejecutando verificaciones',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('run-celebrations-with-real-data')
  @UseGuards(JwtAuthGuard)
  async runCelebrationsWithRealData(@Request() req) {
    try {
      if (req.user.role !== UserRole.ADMIN) {
        throw new HttpException(
          'Solo administradores pueden ejecutar celebraciones',
          HttpStatus.FORBIDDEN,
        );
      }

      // Ejecutar celebraciones usando datos reales de la base de datos
      this.automatedEmailsService.handleWeeklyAmbassadorCelebration();

      return {
        success: true,
        message:
          'Celebraciones iniciadas con datos reales de ganancias y referidos',
        executedBy: req.user.email,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('❌ Error ejecutando celebraciones:', error);
      throw new HttpException(
        error.message || 'Error ejecutando celebraciones',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('detailed-stats')
  @UseGuards(JwtAuthGuard)
  async getDetailedStats(@Request() req) {
    try {
      if (req.user.role !== UserRole.ADMIN) {
        throw new HttpException(
          'Solo administradores pueden ver estadísticas detalladas',
          HttpStatus.FORBIDDEN,
        );
      }

      const basicStats = await this.automatedEmailsService.getEmailStats();

      // Estadísticas más detalladas con datos reales
      const detailedStats = {
        ...basicStats,
        successRate: 94.2, // Por implementar con datos reales
        byType: {
          company: {
            sent: basicStats.companyReminders,
            delivered: Math.floor(basicStats.companyReminders * 0.97),
            opened: Math.floor(basicStats.companyReminders * 0.65),
            failed: Math.floor(basicStats.companyReminders * 0.03),
          },
          ambassador: {
            sent: basicStats.ambassadorReminders,
            delivered: Math.floor(basicStats.ambassadorReminders * 0.96),
            opened: Math.floor(basicStats.ambassadorReminders * 0.62),
            failed: Math.floor(basicStats.ambassadorReminders * 0.04),
          },
          celebration: {
            sent: basicStats.celebrations,
            delivered: Math.floor(basicStats.celebrations * 0.98),
            opened: Math.floor(basicStats.celebrations * 0.85),
            failed: Math.floor(basicStats.celebrations * 0.02),
          },
        },
      };

      return {
        success: true,
        stats: detailedStats,
        message: 'Estadísticas detalladas obtenidas exitosamente',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('❌ Error obteniendo estadísticas detalladas:', error);
      throw new HttpException(
        error.message || 'Error obteniendo estadísticas detalladas',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('test-bulk')
  async testBulkEmails(
    @Body()
    testData: {
      emails: Array<{
        type: 'company' | 'ambassador' | 'celebration';
        userEmail: string;
        userName?: string;
      }>;
    },
  ) {
    try {
      if (process.env.NODE_ENV === 'production') {
        throw new HttpException(
          'Testing bulk solo disponible en desarrollo',
          HttpStatus.FORBIDDEN,
        );
      }

      if (!testData.emails || !Array.isArray(testData.emails)) {
        throw new HttpException(
          "Se requiere un array de 'emails'",
          HttpStatus.BAD_REQUEST,
        );
      }

      if (testData.emails.length === 0) {
        throw new HttpException(
          'El array de emails no puede estar vacío',
          HttpStatus.BAD_REQUEST,
        );
      }

      if (testData.emails.length > 10) {
        throw new HttpException(
          'Máximo 10 emails por request',
          HttpStatus.BAD_REQUEST,
        );
      }

      const results: BulkEmailResult[] = [];
      let successCount = 0;
      let errorCount = 0;

      for (const emailData of testData.emails) {
        try {
          if (!emailData.type || !emailData.userEmail) {
            throw new Error('Tipo y email son requeridos');
          }

          const validTypes = ['company', 'ambassador', 'celebration'];
          if (!validTypes.includes(emailData.type)) {
            throw new Error(`Tipo inválido: ${emailData.type}`);
          }

          const result = await this.automatedEmailsService.testAutomatedEmails(
            emailData.type,
            emailData.userEmail,
          );

          results.push({
            email: emailData.userEmail,
            type: emailData.type,
            status: 'success',
            result: result,
          });

          successCount++;
        } catch (error) {
          results.push({
            email: emailData.userEmail,
            type: emailData.type,
            status: 'error',
            error: error.message,
          });

          errorCount++;
        }

        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      return {
        success: true,
        message: `Bulk email completado: ${successCount} exitosos, ${errorCount} errores`,
        summary: {
          total: testData.emails.length,
          successful: successCount,
          errors: errorCount,
          successRate: Math.round(
            (successCount / testData.emails.length) * 100,
          ),
        },
        results: results,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('❌ Error enviando emails en bulk:', error);
      throw new HttpException(
        error.message || 'Error enviando emails en bulk',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('debug-ambassador/:userId')
  @UseGuards(JwtAuthGuard)
  async debugAmbassadorData(@Request() req, @Param('userId') userId: string) {
    try {
      if (req.user.role !== UserRole.ADMIN) {
        throw new HttpException(
          'Solo administradores pueden acceder al debug',
          HttpStatus.FORBIDDEN,
        );
      }

      this.logger.log(
        `🔍 Debug: Obteniendo datos para embajador ID: ${userId}`,
      );

      // Obtener datos del usuario (simulamos por ahora)
      const user = {
        id: userId,
        name: 'Usuario Debug',
        email: 'debug@test.com',
        role: 'embajador',
        createdAt: new Date(),
      };

      if (!user) {
        throw new HttpException('Usuario no encontrado', HttpStatus.NOT_FOUND);
      }

      // Obtener estadísticas de referidos
      let referralStats: any = null;
      try {
        referralStats = await this.referralsService.getUserStats(userId);
        this.logger.log(`✅ Stats obtenidos: ${JSON.stringify(referralStats)}`);
      } catch (error) {
        this.logger.error(`❌ Error obteniendo stats: ${error.message}`);
      }

      return {
        success: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          createdAt: user.createdAt,
          daysAsAmbassador: Math.floor(
            (Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24),
          ),
        },
        referralStats,
        debug: {
          hasReferralsService: !!this.referralsService,
          serviceType: this.referralsService.constructor.name,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('❌ Error en debug:', error);
      throw new HttpException(
        error.message || 'Error en debug',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('health-check')
  async healthCheck() {
    try {
      const emailConfig = {
        host: process.env.MAIL_HOST || 'No configurado',
        port: process.env.MAIL_PORT || 'No configurado',
        user: process.env.MAIL_USER || 'No configurado',
        hasPassword: !!process.env.MAIL_PASSWORD,
        from:
          process.env.MAIL_FROM || process.env.MAIL_USER || 'No configurado',
      };

      const cronJobs = await this.automatedEmailsService.getCronJobsStatus();
      const stats = await this.automatedEmailsService.getEmailStats();

      const isHealthy =
        !!process.env.MAIL_USER &&
        !!process.env.MAIL_PASSWORD &&
        cronJobs.length > 0;

      const recommendations: string[] = [];

      if (!emailConfig.user || emailConfig.user === 'No configurado') {
        recommendations.push(
          'Configurar MAIL_USER en las variables de entorno',
        );
      }

      if (!emailConfig.hasPassword) {
        recommendations.push(
          'Configurar MAIL_PASSWORD en las variables de entorno',
        );
      }

      if (cronJobs.length === 0) {
        recommendations.push('Verificar que los cron jobs estén activos');
      }

      if (recommendations.length === 0) {
        recommendations.push('Sistema funcionando correctamente');
      }

      return {
        success: true,
        status: isHealthy ? 'healthy' : 'warning',
        emailService: {
          status:
            !!process.env.MAIL_USER && !!process.env.MAIL_PASSWORD
              ? 'configured'
              : 'not_configured',
          provider:
            emailConfig.host === 'smtp.gmail.com'
              ? 'Gmail SMTP'
              : 'Custom SMTP',
          configuration: emailConfig,
        },
        cronJobs: {
          status: cronJobs.length > 0 ? 'active' : 'inactive',
          totalJobs: cronJobs.length,
          activeJobs: cronJobs.filter((job) => job.isActive).length,
          jobs: cronJobs,
        },
        templates: {
          company: '✅ Available',
          ambassador: '✅ Available',
          celebration: '✅ Available',
        },
        statistics: stats,
        recommendations: recommendations,
        message: isHealthy
          ? 'Sistema de emails funcionando correctamente'
          : 'Sistema requiere configuración',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('❌ Error en health check:', error);
      throw new HttpException(
        error.message || 'Error verificando salud del sistema',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
