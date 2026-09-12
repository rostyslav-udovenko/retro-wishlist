import {
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type MouseEvent,
} from "react";

import type { Gift } from "../types/gift";

type ReservationDialogProps = {
  gift: Gift;
  isSubmitting: boolean;
  submitError: string | null;
  onCancel: () => void;
  onConfirm: (guestName: string) => void;
};

function normalizeGuestName(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function validateGuestName(value: string): string | null {
  const normalizedName = normalizeGuestName(value);

  if (normalizedName.length < 2) {
    return "Enter a name containing at least 2 characters.";
  }

  if (normalizedName.length > 50) {
    return "Enter a name containing no more than 50 characters.";
  }

  return null;
}

function ReservationDialog({
  gift,
  isSubmitting,
  submitError,
  onCancel,
  onConfirm,
}: ReservationDialogProps) {
  const [guestName, setGuestName] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  const titleId = useId();
  const descriptionId = useId();
  const inputId = useId();
  const inputErrorId = useId();
  const submitErrorId = useId();

  const inputRef = useRef<HTMLInputElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previouslyFocusedElement =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    inputRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isSubmitting) {
        event.preventDefault();
        onCancel();
      }

      if (event.key !== "Tab") {
        return;
      }

      const firstFocusableElement = inputRef.current;
      const lastFocusableElement = cancelButtonRef.current;

      if (!firstFocusableElement || !lastFocusableElement) {
        return;
      }

      if (event.shiftKey && document.activeElement === firstFocusableElement) {
        event.preventDefault();
        lastFocusableElement.focus();
        return;
      }

      if (!event.shiftKey && document.activeElement === lastFocusableElement) {
        event.preventDefault();
        firstFocusableElement.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocusedElement?.focus();
    };
  }, [isSubmitting, onCancel]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    const normalizedName = normalizeGuestName(guestName);
    const nextValidationError = validateGuestName(normalizedName);

    setValidationError(nextValidationError);

    if (nextValidationError) {
      inputRef.current?.focus();
      return;
    }

    onConfirm(normalizedName);
  }

  function handleBackdropClick(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget && !isSubmitting) {
      onCancel();
    }
  }

  const describedByIds = [
    descriptionId,
    validationError ? inputErrorId : null,
    submitError ? submitErrorId : null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="dialog-backdrop" onMouseDown={handleBackdropClick}>
      <section
        className="reservation-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={describedByIds}
      >
        <header className="reservation-dialog__title-bar">
          <div className="reservation-dialog__identity">
            <span aria-hidden="true">🎁</span>
            <strong>RESERVE_GIFT.EXE</strong>
          </div>

          <button
            className="retro-icon-button"
            type="button"
            aria-label="Close reservation dialog"
            disabled={isSubmitting}
            onClick={onCancel}
          >
            ×
          </button>
        </header>

        <form
          className="reservation-dialog__form"
          onSubmit={handleSubmit}
          noValidate
        >
          <div
            className={`reservation-dialog__gift reservation-dialog__gift--${gift.accent}`}
          >
            <span className="reservation-dialog__gift-icon" aria-hidden="true">
              {gift.image}
            </span>

            <div>
              <p>Selected gift</p>
              <h2 id={titleId}>{gift.name}</h2>
              <span>{gift.price}</span>
            </div>
          </div>

          <p className="reservation-dialog__description" id={descriptionId}>
            Enter your name to reserve this gift. Other visitors will only see
            that the gift has already been chosen.
          </p>

          <div className="reservation-dialog__field">
            <label htmlFor={inputId}>Your name</label>

            <input
              ref={inputRef}
              id={inputId}
              name="guestName"
              type="text"
              value={guestName}
              minLength={2}
              maxLength={50}
              autoComplete="name"
              disabled={isSubmitting}
              aria-invalid={validationError ? "true" : undefined}
              aria-describedby={validationError ? inputErrorId : undefined}
              onChange={(event) => {
                setGuestName(event.target.value);

                if (validationError) {
                  setValidationError(null);
                }
              }}
              placeholder="Enter your name"
            />

            <span className="reservation-dialog__counter">
              {guestName.length}/50
            </span>

            {validationError ? (
              <p
                className="reservation-dialog__error"
                id={inputErrorId}
                role="alert"
              >
                {validationError}
              </p>
            ) : null}
          </div>

          {submitError ? (
            <div
              className="reservation-dialog__submit-error"
              id={submitErrorId}
              role="alert"
            >
              <strong>Reservation failed</strong>
              <span>{submitError}</span>
            </div>
          ) : null}

          <div className="reservation-dialog__actions">
            <button
              className="retro-button retro-button--mint"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Reserving..." : "Confirm reservation"}
            </button>

            <button
              ref={cancelButtonRef}
              className="retro-button retro-button--secondary"
              type="button"
              disabled={isSubmitting}
              onClick={onCancel}
            >
              Cancel
            </button>
          </div>

          <p className="reservation-dialog__privacy">
            Your name is stored privately and is not shown to other visitors.
          </p>
        </form>
      </section>
    </div>
  );
}

export default ReservationDialog;
