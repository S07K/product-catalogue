import { useEffect, useRef } from 'react';
import type { Product } from '@catalogue/shared';
import { EnquiryForm } from './EnquiryForm';

/**
 * Enquiry modal built on the native <dialog> element. `showModal()` gives us
 * focus trapping, Esc to close, an inert background and top-layer stacking
 * from the browser, with no library or hand-rolled focus trap (DECISIONS D6).
 * The browser also returns focus to the Enquire button on close.
 */
export function EnquiryDialog({
  product,
  open,
  onClose,
}: {
  product: Product;
  open: boolean;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  /** While sending, closing is blocked so the customer can't lose the result. */
  const busyRef = useRef(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      dialog.querySelector<HTMLElement>('[data-autofocus]')?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  const requestClose = () => {
    if (!busyRef.current) onClose();
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="enquiry-heading"
      // Esc fires "cancel"; route it through requestClose so React state stays the source of truth.
      onCancel={(event) => {
        event.preventDefault();
        requestClose();
      }}
      // A click on the backdrop targets the <dialog> element itself.
      onClick={(event) => {
        if (event.target === event.currentTarget) requestClose();
      }}
      className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-xl overflow-y-auto rounded-plate bg-surface p-0 text-text shadow-2xl backdrop:bg-text/50 backdrop:backdrop-blur-sm"
    >
      {/* Mounted only while open, so each opening starts with a fresh form. */}
      {open && (
        <EnquiryForm
          product={product}
          onClose={requestClose}
          onBusyChange={(busy) => {
            busyRef.current = busy;
          }}
        />
      )}
    </dialog>
  );
}
