import { SwapService } from './swap.service';
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class SwapExpiryCron {
  private readonly logger = new Logger(SwapExpiryCron.name);

  constructor(private readonly swapService: SwapService) {}

  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  @Cron('0 0 * * *')
  handleExpiry(): void {
    this.logger.log('Running swap expiry job...');
    void this.swapService
      .expireStaleRequests()
      .then(() => {
        this.logger.log('Swap expiry job completed');
      })
      .catch((err: unknown) => {
        this.logger.error('Swap expiry job failed', err);
      });
  }
}
