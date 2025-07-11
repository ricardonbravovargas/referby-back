import { forwardRef, Module } from '@nestjs/common';
import { MailService } from './mail.service';
import { AutomatedEmailsModule } from './automatico/automated-emails.module';

@Module({
  imports: [forwardRef(() => AutomatedEmailsModule)],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
