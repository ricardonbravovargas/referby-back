import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReferralsService } from './referrals.service';
import { ReferralsController } from './referrals.controller';
import { ShortLinksController } from './short-links.controller';
import { User } from '../entities/user.entity';
import {
  Referral,
  ReferralShortCode,
  SharedCartLink,
} from '../entities/referral.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Referral,
      ReferralShortCode,
      SharedCartLink,
    ]),
  ],
  controllers: [ReferralsController, ShortLinksController],
  providers: [ReferralsService],
  exports: [ReferralsService],
})
export class ReferralsModule {}
