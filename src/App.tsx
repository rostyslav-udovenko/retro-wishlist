import GiftCard from "./components/GiftCard";
import { gifts } from "./data/gifts";

import "./App.css";

function App() {
  const availableCount = gifts.filter((gift) => !gift.isReserved).length;

  return (
    <main className="desktop">
      <div className="desktop__decoration desktop__decoration--circle" />
      <div className="desktop__decoration desktop__decoration--triangle" />

      <section className="wishlist-window" aria-labelledby="wishlist-title">
        <header className="title-bar">
          <div className="title-bar__identity">
            <span className="title-bar__icon" aria-hidden="true">
              🎁
            </span>
            <span>WISHLIST.EXE</span>
          </div>

          <div className="window-controls" aria-hidden="true">
            <span className="window-control window-control--minimize" />
            <span className="window-control window-control--maximize" />
            <span className="window-control window-control--close" />
          </div>
        </header>

        <nav className="menu-bar" aria-label="Application menu">
          <span>File</span>
          <span>Gifts</span>
          <span>Help</span>

          <span className="menu-bar__status">ONLINE</span>
        </nav>

        <div className="wishlist-window__body">
          <section className="hero">
            <div className="hero__copy">
              <p className="hero__eyebrow">Birthday protocol activated</p>

              <h1 id="wishlist-title">
                Rostyslav&apos;s
                <span>birthday wishlist!</span>
              </h1>

              <p className="hero__description">
                Pick something you like, reserve it, and keep the surprise
                wonderfully mysterious.
              </p>

              <div className="hero__tags" aria-label="Wishlist features">
                <span>No duplicates</span>
                <span>No account needed</span>
                <span>Maximum surprise</span>
              </div>
            </div>

            <div className="hero__art" aria-hidden="true">
              <div className="wow-burst">WOW!</div>

              <div className="gift-box">
                <div className="gift-box__bow gift-box__bow--left" />
                <div className="gift-box__bow gift-box__bow--right" />
                <div className="gift-box__lid" />
                <div className="gift-box__body">
                  <span />
                </div>
              </div>
            </div>
          </section>

          <section className="system-panel" aria-label="Wishlist status">
            <div className="system-panel__heading">
              <span className="system-panel__light" />
              <strong>System status</strong>
            </div>

            <dl className="statistics">
              <div>
                <dt>Total gifts</dt>
                <dd>{gifts.length}</dd>
              </div>

              <div>
                <dt>Available</dt>
                <dd>{availableCount}</dd>
              </div>

              <div>
                <dt>Reserved</dt>
                <dd>{gifts.length - availableCount}</dd>
              </div>
            </dl>
          </section>

          <section
            className="gift-section"
            aria-labelledby="gift-section-title"
          >
            <div className="section-heading">
              <div>
                <p>Directory: /birthday/gifts</p>
                <h2 id="gift-section-title">Choose your gift</h2>
              </div>

              <span>{gifts.length} items found</span>
            </div>

            <div className="gift-grid">
              {gifts.map((gift) => (
                <GiftCard gift={gift} key={gift.id} />
              ))}
            </div>
          </section>
        </div>

        <footer className="window-footer">
          <span>Made with ♥ and too many colors</span>
          <span>Rostyslav Udovenko © 2026</span>
        </footer>
      </section>
    </main>
  );
}

export default App;
