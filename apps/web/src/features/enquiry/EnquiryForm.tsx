import { useEffect, useRef, useState, type FormEvent } from 'react';
import { EnquiryInputSchema, ENQUIRY_LIMITS, type Product } from '@catalogue/shared';
import { useSubmitEnquiry } from '../../api/hooks';
import { ApiRequestError } from '../../api/client';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { TextAreaField, TextField } from '../../components/ui/TextField';

type FieldName = 'name' | 'email' | 'phone' | 'message';
type FieldErrors = Partial<Record<FieldName, string>>;

const emptyForm = { name: '', email: '', phone: '', message: '', website: '' };

/** First message per field, from either client-side zod issues or the API's `details`. */
function toFieldErrors(details: Record<string, string[] | undefined>): FieldErrors {
  const errors: FieldErrors = {};
  for (const field of ['name', 'email', 'phone', 'message'] as const) {
    const message = details[field]?.[0];
    if (message) errors[field] = message;
  }
  return errors;
}

export function EnquiryForm({ product, onCancel }: { product: Product; onCancel: () => void }) {
  const [values, setValues] = useState(emptyForm);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const submit = useSubmitEnquiry();
  const thankYouRef = useRef<HTMLHeadingElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // After a failed submit, move focus to the first invalid field so the error is announced.
  useEffect(() => {
    formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [fieldErrors]);

  // Move focus to the confirmation so keyboard and screen-reader users know it worked.
  useEffect(() => {
    if (submit.isSuccess) thankYouRef.current?.focus();
  }, [submit.isSuccess]);

  if (submit.isSuccess) {
    return (
      <Card role="status" className="border-success bg-success-surface p-6">
        <h2 ref={thankYouRef} tabIndex={-1} className="text-lg font-semibold text-success">
          Thank you for your enquiry!
        </h2>
        <p className="mt-2 text-sm text-text">
          Our sales team will be in touch about <strong>{product.title}</strong> soon.
        </p>
        <p className="mt-2 text-xs text-text-muted">Reference: {submit.data.enquiryId}</p>
      </Card>
    );
  }

  const update = (field: keyof typeof emptyForm) => (value: string) =>
    setValues((v) => ({ ...v, [field]: value }));

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    // Same schema as the API: instant feedback here, and the server still re-validates.
    const parsed = EnquiryInputSchema.safeParse({ ...values, productId: product.id });
    if (!parsed.success) {
      const details: Record<string, string[]> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0]);
        (details[key] ??= []).push(issue.message);
      }
      setFieldErrors(toFieldErrors(details));
      return;
    }
    setFieldErrors({});
    submit.mutate(parsed.data, {
      onError: (error) => {
        if (error instanceof ApiRequestError && error.details) {
          setFieldErrors(toFieldErrors(error.details));
        }
      },
    });
  }

  const serverError =
    submit.isError && !(submit.error instanceof ApiRequestError && submit.error.details)
      ? submit.error instanceof ApiRequestError
        ? submit.error.message
        : 'Something went wrong. Please try again.'
      : null;

  return (
    <Card className="p-6">
      <form
        ref={formRef}
        noValidate
        onSubmit={onSubmit}
        aria-labelledby="enquiry-heading"
        className="flex flex-col gap-4"
      >
        <div>
          <h2 id="enquiry-heading" className="text-lg font-semibold">
            Enquire about this product
          </h2>
          <p className="text-sm text-text-muted">
            Leave your details and our sales team will contact you.
          </p>
        </div>

        <TextField
          label="Name"
          name="name"
          autoComplete="name"
          required
          autoFocus
          maxLength={ENQUIRY_LIMITS.nameMax}
          value={values.name}
          onChange={(e) => update('name')(e.target.value)}
          error={fieldErrors.name}
        />
        <TextField
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={values.email}
          onChange={(e) => update('email')(e.target.value)}
          error={fieldErrors.email}
        />
        <TextField
          label="Phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          value={values.phone}
          onChange={(e) => update('phone')(e.target.value)}
          error={fieldErrors.phone}
        />
        <TextAreaField
          label="Message"
          name="message"
          maxLength={ENQUIRY_LIMITS.messageMax}
          value={values.message}
          onChange={(e) => update('message')(e.target.value)}
          error={fieldErrors.message}
        />

        {/* Honeypot: invisible to people and assistive tech; bots that fill it are dropped server-side. */}
        <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
          <label>
            Website
            <input
              tabIndex={-1}
              autoComplete="off"
              name="website"
              value={values.website}
              onChange={(e) => update('website')(e.target.value)}
            />
          </label>
        </div>

        {serverError && (
          <p role="alert" className="rounded-control bg-danger-surface p-3 text-sm text-danger">
            {serverError}
          </p>
        )}

        <div className="flex gap-3">
          <Button type="submit" disabled={submit.isPending}>
            {submit.isPending ? 'Sending…' : 'Send enquiry'}
          </Button>
          <Button variant="secondary" onClick={onCancel} disabled={submit.isPending}>
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}
