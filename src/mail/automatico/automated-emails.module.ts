import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { AutomatedEmailsService } from './automated-emails.service';
import { AutomatedEmailsController } from './automated-emails.controller';
import { User } from '../../entities/user.entity';
import { MailModule } from '../mail.module';
import { Referral } from 'src/entities/referral.entity';
import { ReferralsModule } from 'src/referrals/referrals.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Referral]),
    ScheduleModule.forRoot(),
    forwardRef(() => MailModule),
    ReferralsModule
  ],
  controllers: [AutomatedEmailsController],
  providers: [AutomatedEmailsService],
  exports: [AutomatedEmailsService],
})
export class AutomatedEmailsModule {}
