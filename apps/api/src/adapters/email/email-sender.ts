/**
 * Port for outbound email. Implementations: SMTP (any provider: Mailpit
 * locally, AWS SES / SendGrid / Postmark in production) and console (logs only).
 * A native-API adapter (e.g. SES via the AWS SDK) is one new class.
 *
 * The sender address is adapter configuration, not part of the message, so
 * user input can never control `From`.
 */
export interface EmailMessage {
  to: string;
  replyTo?: { name: string; address: string };
  subject: string;
  text: string;
  html: string;
}

export interface EmailSender {
  /** Resolves once the provider has accepted the message; rejects otherwise. */
  send(message: EmailMessage): Promise<void>;
}
