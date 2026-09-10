import { useEffect, useId, useRef, type MouseEvent } from "react";

type AboutDialogProps = {
  onClose: () => void;
};

const repositoryUrl = "https://github.com/rostyslav-udovenko/retro-wishlist";
const feedbackUrl = `${repositoryUrl}/issues/new`;

function AboutDialog({ onClose }: AboutDialogProps) {
  const titleId = useId();
  const descriptionId = useId();

  const dialogRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previouslyFocusedElement =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const dialog = dialogRef.current;

      if (!dialog) {
        return;
      }

      const focusableElements = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );

      const firstFocusableElement = focusableElements[0];
      const lastFocusableElement =
        focusableElements[focusableElements.length - 1];

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
      document.body.style.overflow = previousOverflow;
      previouslyFocusedElement?.focus();
    };
  }, [onClose]);

  function handleBackdropClick(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) {
      onClose();
    }
  }

  return (
    <div className="dialog-backdrop" onMouseDown={handleBackdropClick}>
      <section
        ref={dialogRef}
        className="about-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
      >
        <header className="about-dialog__title-bar">
          <div className="about-dialog__identity">
            <span aria-hidden="true">🎁</span>
            <strong>ABOUT.EXE</strong>
          </div>

          <button
            ref={closeButtonRef}
            className="retro-icon-button"
            type="button"
            aria-label="Close About dialog"
            onClick={onClose}
          >
            ×
          </button>
        </header>

        <div className="about-dialog__content">
          <div className="about-dialog__hero">
            <span className="about-dialog__icon" aria-hidden="true">
              🎂
            </span>

            <div>
              <p className="about-dialog__eyebrow">Birthday software</p>

              <h2 id={titleId}>Retro Wishlist</h2>

              <p className="about-dialog__version">Version 1.0 in progress</p>
            </div>
          </div>

          <p className="about-dialog__description" id={descriptionId}>
            A colorful birthday wishlist for choosing gifts without duplicates,
            unnecessary coordination, or mandatory accounts.
          </p>

          <dl className="about-dialog__details">
            <div>
              <dt>Interface</dt>
              <dd>Colorful retro desktop</dd>
            </div>

            <div>
              <dt>Reservations</dt>
              <dd>Private and browser-owned</dd>
            </div>

            <div>
              <dt>Synchronization</dt>
              <dd>Supabase Realtime</dd>
            </div>

            <div>
              <dt>Developer</dt>
              <dd>Rostyslav Udovenko</dd>
            </div>
          </dl>

          <div className="about-dialog__links">
            <a
              className="retro-button"
              href={repositoryUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub repository
              <span className="visually-hidden">, opens in a new tab</span>
            </a>

            <a
              className="retro-button"
              href={feedbackUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Send feedback
              <span className="visually-hidden">, opens in a new tab</span>
            </a>
          </div>

          <footer className="about-dialog__footer">
            <span>Made with ♥ and too many colors</span>

            <button
              className="retro-button retro-button--mint"
              type="button"
              onClick={onClose}
            >
              Close
            </button>
          </footer>
        </div>
      </section>
    </div>
  );
}

export default AboutDialog;
