import { z } from 'zod';

/** HTML forms submit empty strings for untouched optional fields. */
const optionalText = <T extends z.ZodType>(schema: T) =>
  z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
    schema.optional(),
  );

export const ENQUIRY_LIMITS = {
  nameMax: 100,
  messageMax: 1000,
} as const;

export const EnquiryInputSchema = z.object({
  productId: z.string().trim().min(1),
  name: z
    .string()
    .trim()
    .min(1, 'Please enter your name')
    .max(ENQUIRY_LIMITS.nameMax, `Name must be ${ENQUIRY_LIMITS.nameMax} characters or fewer`),
  email: z.string().trim().pipe(z.email('Please enter a valid email address')),
  phone: optionalText(
    z
      .string()
      .trim()
      .regex(/^\+?[0-9 ()-]{6,20}$/, 'Please enter a valid phone number'),
  ),
  message: optionalText(
    z
      .string()
      .trim()
      .max(
        ENQUIRY_LIMITS.messageMax,
        `Message must be ${ENQUIRY_LIMITS.messageMax} characters or fewer`,
      ),
  ),
  /**
   * Honeypot: hidden from people, filled by naive bots. Accepted by the schema
   * so bots get a normal-looking response; the API silently drops such enquiries.
   */
  website: optionalText(z.string().max(200)),
});
export type EnquiryInput = z.infer<typeof EnquiryInputSchema>;

export const EnquiryResponseSchema = z.object({
  enquiryId: z.string(),
});
export type EnquiryResponse = z.infer<typeof EnquiryResponseSchema>;
