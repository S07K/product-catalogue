import type { Logger } from 'pino';
import type { EmailMessage, EmailSender } from './email-sender';

/** Development convenience: logs the email instead of sending it. Refused in production by config. */
export class ConsoleEmailSender implements EmailSender {
  constructor(private readonly logger: Logger) {}

  async send(message: EmailMessage): Promise<void> {
    this.logger.info(
      { to: message.to, subject: message.subject },
      `Email (not sent):\n${message.text}`,
    );
  }

  async verify(): Promise<void> {
    // Nothing external to reach.
  }
}
