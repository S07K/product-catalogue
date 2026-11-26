import nodemailer, { type Transporter } from 'nodemailer';
import type { EmailMessage, EmailSender } from './email-sender';

export interface SmtpOptions {
  host: string;
  port: number;
  secure: boolean;
  user?: string | undefined;
  pass?: string | undefined;
  from: string;
}

export class SmtpEmailSender implements EmailSender {
  private readonly transporter: Transporter;

  constructor(
    private readonly options: SmtpOptions,
    transporter?: Transporter,
  ) {
    this.transporter =
      transporter ??
      nodemailer.createTransport({
        host: options.host,
        port: options.port,
        secure: options.secure,
        auth: options.user && options.pass ? { user: options.user, pass: options.pass } : undefined,
        connectionTimeout: 10_000,
        greetingTimeout: 10_000,
        socketTimeout: 15_000,
      });
  }

  async send(message: EmailMessage): Promise<void> {
    await this.transporter.sendMail({ from: this.options.from, ...message });
  }

  /** Opens an SMTP connection and authenticates, without sending anything. */
  async verify(): Promise<void> {
    await this.transporter.verify();
  }
}
