import { randomUUID } from 'node:crypto';
import type { Logger } from 'pino';
import type { EnquiryInput, EnquiryResponse } from '@catalogue/shared';
import type { EmailSender } from '../adapters/email/email-sender';
import type { CatalogueService } from '../catalogue/catalogue.service';
import { AppError } from '../errors';
import { buildEnquiryEmail } from './enquiry-email';

export class EnquiryService {
  constructor(
    private readonly catalogue: CatalogueService,
    private readonly email: EmailSender,
    private readonly salesInbox: string,
    private readonly logger: Logger,
    private readonly newId: () => string = randomUUID,
  ) {}

  async submit(enquiry: EnquiryInput): Promise<EnquiryResponse> {
    const enquiryId = this.newId();

    // Honeypot filled in: respond like a success so bots learn nothing, but send nothing.
    if (enquiry.website) {
      this.logger.warn({ enquiryId }, 'Enquiry dropped by spam honeypot');
      return { enquiryId };
    }

    // Re-resolve the product server-side: never trust product details sent by the client.
    const product = await this.catalogue.getProduct(enquiry.productId);

    try {
      await this.email.send(
        buildEnquiryEmail({ enquiryId, enquiry, product, salesInbox: this.salesInbox }),
      );
    } catch (err) {
      this.logger.error({ err, enquiryId }, 'Failed to deliver enquiry email');
      throw new AppError(
        502,
        'EMAIL_DELIVERY_FAILED',
        'We could not send your enquiry right now. Please try again shortly.',
        undefined,
        { cause: err },
      );
    }

    // Log ids only: customer contact details are personal data and stay out of logs.
    this.logger.info({ enquiryId, productId: product.id }, 'Enquiry sent to sales inbox');
    return { enquiryId };
  }
}
