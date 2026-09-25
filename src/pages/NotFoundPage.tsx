import { Link } from "react-router";

import { AppDesktop } from "../components/AppShell";

function NotFoundPage() {
  return (
    <AppDesktop>
      <section className="page-state page-state--not-found">
        <span className="page-state__icon" aria-hidden="true">
          🔍
        </span>
        <p className="page-state__eyebrow">Error 404</p>
        <h1>Page not found</h1>
        <p>The requested page does not exist.</p>
        <Link
          className="retro-button retro-button--yellow page-state__button page-state__link"
          to="/"
        >
          Return home
        </Link>
      </section>
    </AppDesktop>
  );
}

export default NotFoundPage;
