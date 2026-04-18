import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Claim } from '../../database/entities/claim.entity';
import type { Item } from '../../database/entities/item.entity';

type TelegramSendMessageResult = {
  message_id: number;
};

type TelegramSendMessageResponse = {
  ok: boolean;
  description?: string;
  result?: TelegramSendMessageResult;
};

@Injectable()
export class TelegramAnnouncementService {
  private readonly logger = new Logger(TelegramAnnouncementService.name);
  private readonly botToken: string | null;
  private readonly channelId: string | null;
  private readonly apiPublicBaseUrl: string | null;
  private configurationWarningShown = false;

  constructor(private readonly configService: ConfigService) {
    this.botToken =
      this.configService.get<string>('TELEGRAM_BOT_TOKEN')?.trim() ?? null;
    this.channelId =
      this.configService.get<string>('TELEGRAM_CHANNEL_ID')?.trim() ?? null;
    this.apiPublicBaseUrl = this.normalizeBaseUrl(
      this.configService.get<string>('API_PUBLIC_BASE_URL')?.trim() ?? null,
    );
  }

  async announceItemAdded(item: Item): Promise<string | null> {
    const message = [
      '<b>Lost and Found Update</b>',
      '',
      'A new item has been added to the Lost and Found board.',
      '',
      `<b>Item:</b> ${this.escapeHtml(item.title)}`,
      `<b>Value tier:</b> ${this.escapeHtml(item.value_tier)}`,
      `<b>Location:</b> ${this.escapeHtml(item.location)}`,
      `<b>Item ID:</b> #${item.id}`,
      '',
      'If this item is yours, submit a claim in Campus Link.',
    ].join('\n');

    const photoUrl = this.resolvePublicPhotoUrl(item.photo_url);
    if (photoUrl) {
      const photoResult = await this.sendPhoto(photoUrl, message);
      if (photoResult) {
        return String(photoResult.message_id);
      }

      this.logger.warn(
        `Telegram sendPhoto failed for item #${item.id}. Falling back to text message.`,
      );
    }

    const result = await this.sendMessage(message);
    return result ? String(result.message_id) : null;
  }

  async announceClaimerFound(item: Item, claim: Claim): Promise<void> {
    const claimerName =
      claim.claimer.display_name.trim().length > 0
        ? claim.claimer.display_name
        : `User #${claim.claimer.id}`;

    const message = [
      '<b>Claimer Found</b>',
      '',
      'A claimer has been approved for a Lost and Found item.',
      '',
      `<b>Item:</b> ${this.escapeHtml(item.title)}`,
      `<b>Item ID:</b> #${item.id}`,
      `<b>Claimer:</b> ${this.escapeHtml(claimerName)}`,
      `<b>Status:</b> ${this.escapeHtml(item.status)}`,
      '',
      'Finder and claimer can now confirm the handoff in Campus Link.',
    ].join('\n');

    await this.sendMessage(message);
  }

  private async sendMessage(
    text: string,
  ): Promise<TelegramSendMessageResult | null> {
    if (!this.isConfigured()) {
      return null;
    }

    try {
      const response = await fetch(
        `https://api.telegram.org/bot${this.botToken}/sendMessage`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            chat_id: this.channelId,
            text: this.truncate(text, 4096),
            parse_mode: 'HTML',
            disable_web_page_preview: true,
          }),
        },
      );

      if (!response.ok) {
        const details = await response.text();
        this.logger.warn(
          `Telegram sendMessage failed with HTTP ${response.status}: ${details}`,
        );
        return null;
      }

      const payload = (await response.json()) as TelegramSendMessageResponse;

      if (!payload.ok || !payload.result) {
        this.logger.warn(
          `Telegram API rejected message: ${payload.description ?? 'Unknown error'}`,
        );
        return null;
      }

      return payload.result;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown network error';
      this.logger.warn(`Telegram sendMessage error: ${message}`);
      return null;
    }
  }

  private async sendPhoto(
    photoUrl: string,
    caption: string,
  ): Promise<TelegramSendMessageResult | null> {
    if (!this.isConfigured()) {
      return null;
    }

    try {
      const response = await fetch(
        `https://api.telegram.org/bot${this.botToken}/sendPhoto`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            chat_id: this.channelId,
            photo: photoUrl,
            caption: this.truncate(caption, 1024),
            parse_mode: 'HTML',
          }),
        },
      );

      if (!response.ok) {
        const details = await response.text();
        this.logger.warn(
          `Telegram sendPhoto failed with HTTP ${response.status}: ${details}`,
        );
        return null;
      }

      const payload = (await response.json()) as TelegramSendMessageResponse;

      if (!payload.ok || !payload.result) {
        this.logger.warn(
          `Telegram API rejected photo: ${payload.description ?? 'Unknown error'}`,
        );
        return null;
      }

      return payload.result;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown network error';
      this.logger.warn(`Telegram sendPhoto error: ${message}`);
      return null;
    }
  }

  private isConfigured(): boolean {
    if (this.botToken && this.channelId) {
      return true;
    }

    if (!this.configurationWarningShown) {
      this.configurationWarningShown = true;
      this.logger.warn(
        'Telegram is not configured. Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHANNEL_ID to enable announcements.',
      );
    }

    return false;
  }

  private resolvePublicPhotoUrl(
    photoUrl: string | null | undefined,
  ): string | null {
    const raw = photoUrl?.trim();
    if (!raw) {
      return null;
    }

    if (raw.startsWith('http://') || raw.startsWith('https://')) {
      return raw;
    }

    if (!this.apiPublicBaseUrl) {
      this.logger.warn(
        'API_PUBLIC_BASE_URL is not set, so relative item photos cannot be sent to Telegram.',
      );
      return null;
    }

    if (raw.startsWith('/')) {
      return `${this.apiPublicBaseUrl}${raw}`;
    }

    return `${this.apiPublicBaseUrl}/${raw}`;
  }

  private normalizeBaseUrl(value: string | null): string | null {
    if (!value) {
      return null;
    }

    return value.replace(/\/+$/, '');
  }

  private escapeHtml(value: string): string {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  private truncate(value: string, maxLength: number): string {
    if (value.length <= maxLength) {
      return value;
    }

    return `${value.slice(0, maxLength - 3)}...`;
  }
}
