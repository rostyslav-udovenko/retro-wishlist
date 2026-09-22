import type { ReactNode } from "react";

type AppDesktopProps = {
  children: ReactNode;
};

type RetroWindowProps = {
  children: ReactNode;
  className?: string;
  labelledBy: string;
};

type WindowTitleBarProps = {
  icon: ReactNode;
  title?: string;
};

type WindowFooterProps = {
  primaryText?: string;
  secondaryText?: string;
};

export function AppDesktop({ children }: AppDesktopProps) {
  return (
    <main className="desktop">
      <div className="desktop__decoration desktop__decoration--circle" />
      <div className="desktop__decoration desktop__decoration--triangle" />
      {children}
    </main>
  );
}

export function RetroWindow({
  children,
  className,
  labelledBy,
}: RetroWindowProps) {
  const windowClassName = className
    ? `wishlist-window ${className}`
    : "wishlist-window";

  return (
    <section className={windowClassName} aria-labelledby={labelledBy}>
      {children}
    </section>
  );
}

export function WindowTitleBar({
  icon,
  title = "WISHLIST.EXE",
}: WindowTitleBarProps) {
  return (
    <header className="title-bar">
      <div className="title-bar__identity">
        <span className="title-bar__icon" aria-hidden="true">
          {icon}
        </span>
        <span>{title}</span>
      </div>
      <div className="window-controls" aria-hidden="true">
        <span className="window-control window-control--minimize" />
        <span className="window-control window-control--maximize" />
        <span className="window-control window-control--close" />
      </div>
    </header>
  );
}

export function WindowFooter({
  primaryText = "Made with ♥ and too many colors",
  secondaryText = "Rostyslav Udovenko © 2026",
}: WindowFooterProps) {
  return (
    <footer className="window-footer">
      <span>{primaryText}</span>
      <span>{secondaryText}</span>
    </footer>
  );
}
