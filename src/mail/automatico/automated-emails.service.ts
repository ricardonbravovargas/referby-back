import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
import { UserRole } from '../../auth/roles.enum';
import { MailService } from '../mail.service';
import { InjectRepository } from '@nestjs/typeorm';

export interface EmailStats {
  totalEmailsSent: number;
  companyReminders: number;
  ambassadorReminders: number;
  celebrations: number;
  lastExecution: string;
  todaysSent: number;
  thisWeekSent: number;
  thisMonthSent: number;
}

export interface EmailHistoryEntry {
  id: string;
  type: 'company' | 'ambassador' | 'celebration' | 'manual';
  recipient: string;
  sentAt: string;
  status: 'success' | 'failed';
  adminUser?: string;
}

export interface CronJobStatus {
  name: string;
  description: string;
  schedule: string;
  lastExecution: string | null;
  nextExecution: string;
  isActive: boolean;
  totalExecutions: number;
}

@Injectable()
export class AutomatedEmailsService {
  private readonly logger = new Logger(AutomatedEmailsService.name);

  private emailCounters = {
    totalEmailsSent: 0,
    companyReminders: 0,
    ambassadorReminders: 0,
    celebrations: 0,
    lastExecution: new Date().toISOString(),
    todaysSent: 0,
    thisWeekSent: 0,
    thisMonthSent: 0,
  };

  private emailHistory: EmailHistoryEntry[] = [];
  private cronJobsStatus: Map<string, CronJobStatus> = new Map();

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private mailService: MailService,
  ) {
    this.initializeCronJobsStatus();
  }

  private initializeCronJobsStatus() {
    this.cronJobsStatus.set('daily-inactivity-check', {
      name: 'daily-inactivity-check',
      description: 'Verificación diaria de usuarios inactivos',
      schedule: '0 10 * * *',
      lastExecution: null,
      nextExecution: this.calculateNextExecution('0 10 * * *'),
      isActive: true,
      totalExecutions: 0,
    });

    this.cronJobsStatus.set('weekly-ambassador-celebration', {
      name: 'weekly-ambassador-celebration',
      description: 'Celebraciones semanales de embajadores',
      schedule: '0 9 * * 1',
      lastExecution: null,
      nextExecution: this.calculateNextExecution('0 9 * * 1'),
      isActive: true,
      totalExecutions: 0,
    });
  }

  private calculateNextExecution(cronExpression: string): string {
    const now = new Date();
    now.setHours(now.getHours() + 24);
    return now.toISOString();
  }

  private updateCronJobStatus(jobName: string) {
    const job = this.cronJobsStatus.get(jobName);
    if (job) {
      job.lastExecution = new Date().toISOString();
      job.totalExecutions += 1;
      job.nextExecution = this.calculateNextExecution(job.schedule);
    }
  }

  private addToHistory(
    type: EmailHistoryEntry['type'],
    recipient: string,
    status: 'success' | 'failed',
    adminUser?: string,
  ) {
    this.emailHistory.unshift({
      id: Date.now().toString(),
      type,
      recipient,
      sentAt: new Date().toISOString(),
      status,
      adminUser,
    });

    if (this.emailHistory.length > 100) {
      this.emailHistory = this.emailHistory.slice(0, 100);
    }
  }

  private incrementEmailCounter(
    type: 'company' | 'ambassador' | 'celebration',
  ) {
    this.emailCounters.totalEmailsSent++;
    this.emailCounters.todaysSent++;
    this.emailCounters.thisWeekSent++;
    this.emailCounters.thisMonthSent++;
    this.emailCounters.lastExecution = new Date().toISOString();

    switch (type) {
      case 'company':
        this.emailCounters.companyReminders++;
        break;
      case 'ambassador':
        this.emailCounters.ambassadorReminders++;
        break;
      case 'celebration':
        this.emailCounters.celebrations++;
        break;
    }
  }

  @Cron('0 10 * * *', {
    name: 'daily-inactivity-check',
    timeZone: 'America/Argentina/Buenos_Aires',
  })
  async handleDailyEmailCheck() {
    this.logger.log(
      '🔍 Iniciando verificación diaria de usuarios inactivos...',
    );

    try {
      this.updateCronJobStatus('daily-inactivity-check');

      const users = await this.userRepository.find({
        where: { isActive: true },
        select: ['id', 'name', 'email', 'role', 'lastLogin', 'createdAt'],
      });

      this.logger.log(`📊 Verificando ${users.length} usuarios activos`);

      let companyReminders = 0;
      let ambassadorReminders = 0;

      for (const user of users) {
        if (!user.lastLogin) continue;

        const daysSinceLogin = this.calculateDaysSince(user.lastLogin);

        if (
          user.role === UserRole.EMPRESA &&
          daysSinceLogin >= 7 &&
          daysSinceLogin % 7 === 0
        ) {
          try {
            await this.mailService.sendCompanyInactivityReminder(
              user.email,
              user.name || 'Empresa',
              daysSinceLogin,
            );
            companyReminders++;
            this.incrementEmailCounter('company');
            this.addToHistory('company', user.email, 'success');
          } catch (error) {
            this.addToHistory('company', user.email, 'failed');
            this.logger.warn(
              `⚠️ Error enviando recordatorio a empresa ${user.email}:`,
              error.message,
            );
          }
        }

        if (
          user.role === UserRole.EMBAJADOR &&
          [1, 3, 7, 14].includes(daysSinceLogin)
        ) {
          try {
            await this.mailService.sendAmbassadorInactivityReminder(
              user.email,
              user.name || 'Embajador',
              daysSinceLogin,
            );
            ambassadorReminders++;
            this.incrementEmailCounter('ambassador');
            this.addToHistory('ambassador', user.email, 'success');
          } catch (error) {
            this.addToHistory('ambassador', user.email, 'failed');
            this.logger.warn(
              `⚠️ Error enviando recordatorio a embajador ${user.email}:`,
              error.message,
            );
          }
        }
      }

      this.logger.log(
        `📧 Verificación completada: ${companyReminders} empresas, ${ambassadorReminders} embajadores`,
      );
    } catch (error) {
      this.logger.error('❌ Error en verificación diaria:', error);
    }
  }

  @Cron('0 9 * * 1', {
    name: 'weekly-ambassador-celebration',
    timeZone: 'America/Argentina/Buenos_Aires',
  })
  async handleWeeklyAmbassadorCelebration() {
    this.logger.log('🎉 Iniciando celebraciones semanales...');

    try {
      this.updateCronJobStatus('weekly-ambassador-celebration');

      const ambassadors = await this.userRepository.find({
        where: {
          role: UserRole.EMBAJADOR,
          isActive: true,
        },
        select: ['id', 'name', 'email', 'createdAt'],
      });

      this.logger.log(
        `🎯 Verificando ${ambassadors.length} embajadores para celebraciones`,
      );

      let celebrationsSent = 0;

      for (const ambassador of ambassadors) {
        const daysAsAmbassador = this.calculateDaysSince(ambassador.createdAt);
        const milestones = [7, 14, 30, 90, 180, 365];
        const isWeeklyMilestone =
          daysAsAmbassador > 0 && daysAsAmbassador % 7 === 0;
        const isMajorMilestone = milestones.includes(daysAsAmbassador);

        if (isMajorMilestone || (isWeeklyMilestone && daysAsAmbassador <= 30)) {
          try {
            const totalCommissions = 0; // TODO: Implementar consulta real
            const totalReferrals = 0; // TODO: Implementar consulta real

            await this.mailService.sendAmbassadorCelebration(
              ambassador.email,
              ambassador.name || 'Embajador',
              daysAsAmbassador,
              totalCommissions,
              totalReferrals,
            );

            celebrationsSent++;
            this.incrementEmailCounter('celebration');
            this.addToHistory('celebration', ambassador.email, 'success');
          } catch (error) {
            this.addToHistory('celebration', ambassador.email, 'failed');
            this.logger.warn(
              `⚠️ Error enviando celebración a ${ambassador.email}:`,
              error.message,
            );
          }
        }
      }

      this.logger.log(
        `🎊 Celebraciones completadas: ${celebrationsSent} emails enviados`,
      );
    } catch (error) {
      this.logger.error('❌ Error en celebraciones semanales:', error);
    }
  }

  async testAutomatedEmails(
    type: 'company' | 'ambassador' | 'celebration',
    userEmail: string,
  ): Promise<{ success: boolean; message: string; type: string }> {
    try {
      this.logger.log(
        `🧪 Enviando email de prueba tipo: ${type} a ${userEmail}`,
      );

      const realUser = await this.userRepository.findOne({
        where: { email: userEmail },
        select: ['id', 'name', 'email', 'role', 'lastLogin', 'createdAt'],
      });

      let userName = 'Usuario de Prueba';
      let daysSinceLastLogin = 7;
      let daysAsUser = 30;
      let isRealUser = false;

      if (realUser) {
        userName = realUser.name || 'Usuario';
        daysSinceLastLogin = realUser.lastLogin
          ? this.calculateDaysSince(realUser.lastLogin)
          : 0;
        daysAsUser = this.calculateDaysSince(realUser.createdAt);
        isRealUser = true;
      }

      switch (type) {
        case 'company':
          await this.mailService.sendCompanyInactivityReminder(
            userEmail,
            userName,
            daysSinceLastLogin,
          );
          break;

        case 'ambassador':
          await this.mailService.sendAmbassadorInactivityReminder(
            userEmail,
            userName,
            daysSinceLastLogin,
          );
          break;

        case 'celebration':
          const totalCommissions = isRealUser ? 0 : 150.75;
          const totalReferrals = isRealUser ? 0 : 5;

          await this.mailService.sendAmbassadorCelebration(
            userEmail,
            userName,
            daysAsUser,
            totalCommissions,
            totalReferrals,
          );
          break;

        default:
          throw new Error(`Tipo de email no válido: ${type}`);
      }

      this.addToHistory('manual', userEmail, 'success');

      return {
        success: true,
        message: `Email de prueba ${type} enviado exitosamente a ${userName}${isRealUser ? ` (datos reales)` : ' (datos de prueba)'}`,
        type: type,
      };
    } catch (error) {
      this.logger.error(`❌ Error enviando email de prueba ${type}:`, error);
      this.addToHistory('manual', userEmail, 'failed');
      throw error;
    }
  }

  async sendManualEmail(
    type: 'company' | 'ambassador' | 'celebration',
    userEmail: string,
    userName: string = 'Usuario',
    customMessage?: string,
  ): Promise<{ success: boolean; message: string; type: string }> {
    try {
      const realUser = await this.userRepository.findOne({
        where: { email: userEmail },
        select: ['id', 'name', 'email', 'role', 'lastLogin', 'createdAt'],
      });

      if (!realUser) {
        throw new Error(`Usuario con email ${userEmail} no encontrado`);
      }

      const realUserName = realUser.name || userName || 'Usuario';
      const daysSinceLastLogin = realUser.lastLogin
        ? this.calculateDaysSince(realUser.lastLogin)
        : null;
      const daysAsUser = this.calculateDaysSince(realUser.createdAt);

      switch (type) {
        case 'company':
          if (realUser.role !== UserRole.EMPRESA) {
            throw new Error(
              `El usuario ${userEmail} no es una empresa (rol: ${realUser.role})`,
            );
          }

          await this.mailService.sendCompanyInactivityReminder(
            userEmail,
            realUserName,
            daysSinceLastLogin || 0,
          );
          break;

        case 'ambassador':
          if (realUser.role !== UserRole.EMBAJADOR) {
            throw new Error(
              `El usuario ${userEmail} no es un embajador (rol: ${realUser.role})`,
            );
          }

          await this.mailService.sendAmbassadorInactivityReminder(
            userEmail,
            realUserName,
            daysSinceLastLogin || 0,
          );
          break;

        case 'celebration':
          if (realUser.role !== UserRole.EMBAJADOR) {
            throw new Error(
              `El usuario ${userEmail} no es un embajador (rol: ${realUser.role})`,
            );
          }

          const totalCommissions = 0; // TODO: Implementar consulta real
          const totalReferrals = 0; // TODO: Implementar consulta real

          await this.mailService.sendAmbassadorCelebration(
            userEmail,
            realUserName,
            daysAsUser,
            totalCommissions,
            totalReferrals,
          );
          break;

        default:
          throw new Error(`Tipo de email no válido: ${type}`);
      }

      this.addToHistory('manual', userEmail, 'success');

      return {
        success: true,
        message: `Email manual ${type} enviado exitosamente a ${realUserName}`,
        type: type,
      };
    } catch (error) {
      this.logger.error(`❌ Error enviando email manual ${type}:`, error);
      this.addToHistory('manual', userEmail, 'failed');
      throw error;
    }
  }

  async getEmailStats(): Promise<EmailStats> {
    return { ...this.emailCounters };
  }

  async getEmailHistory(): Promise<EmailHistoryEntry[]> {
    return [...this.emailHistory];
  }

  async getCronJobsStatus(): Promise<CronJobStatus[]> {
    return Array.from(this.cronJobsStatus.values());
  }

  private calculateDaysSince(date: Date | string): number {
    const targetDate = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - targetDate.getTime());
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  private resetDailyCounters() {
    this.emailCounters.todaysSent = 0;
    this.logger.log('🔄 Contadores diarios reseteados');
  }

  @Cron(CronExpression.EVERY_WEEK)
  private resetWeeklyCounters() {
    this.emailCounters.thisWeekSent = 0;
    this.logger.log('🔄 Contadores semanales reseteados');
  }

  @Cron(CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_MIDNIGHT)
  private resetMonthlyCounters() {
    this.emailCounters.thisMonthSent = 0;
    this.logger.log('🔄 Contadores mensuales reseteados');
  }
}
