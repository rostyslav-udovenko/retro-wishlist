import type { ReactNode } from "react";

type AppMenuBarProps = {
  children: ReactNode;
  isRefreshing: boolean;
};

function AppMenuBar({ children, isRefreshing }: AppMenuBarProps) {
  return (
    <nav className="menu-bar" aria-label="Application menu">
      {children}
      <span className="menu-bar__status">
        {isRefreshing ? "SYNCING" : "ONLINE"}
      </span>
    </nav>
  );
}

export default AppMenuBar;
