import { Link } from "react-router";

function HomePage() {
  return (
    <main className="desktop">
      <div className="desktop__decoration desktop__decoration--circle" />
      <div className="desktop__decoration desktop__decoration--triangle" />

      <section className="page-state page-state--loading">
        <span className="page-state__icon" aria-hidden="true">
          🎁
        </span>

        <p className="page-state__eyebrow">Wishlist directory</p>

        <h1>Retro Wishlist</h1>

        <p>
          The colorful public wishlist directory is coming in the next
          milestone.
        </p>

        <Link className="page-state__button page-state__link" to="/w/rostyslav">
          Open test wishlist
        </Link>
      </section>
    </main>
  );
}

export default HomePage;
