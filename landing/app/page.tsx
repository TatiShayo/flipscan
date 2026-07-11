import Link from 'next/link';
import './page.css';

export default function Home() {
  return (
    <main className="page">
      {/* Hero */}
      <section className="hero">
        <div className="container">
          <div className="hero-content">
            <h1 className="hero-title">FlipScan</h1>
            <p className="hero-pitch">Point. Scan. Flip.</p>
            <p className="hero-subtitle">
              Instantly scan thrift items and discover their resale value across Poshmark, Depop, Mercari, and Facebook Marketplace.
            </p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="how-it-works">
        <div className="container">
          <h2 className="section-title">How it works</h2>
          <div className="steps">
            <div className="step">
              <div className="step-number">1</div>
              <h3>Point your camera</h3>
              <p>Frame the item in FlipScan's camera view.</p>
            </div>
            <div className="step">
              <div className="step-number">2</div>
              <h3>Scan or snap</h3>
              <p>Use barcode scan mode or capture a photo. FlipScan analyzes the item instantly.</p>
            </div>
            <div className="step">
              <div className="step-number">3</div>
              <h3>See the verdict</h3>
              <p>Get a profit range across all resale platforms, adjusted for condition.</p>
            </div>
          </div>
        </div>
      </section>

      {/* App badges */}
      <section className="download">
        <div className="container">
          <h2 className="section-title">Get the app</h2>
          <div className="badges">
            <a
              href="https://apps.apple.com/app/flipscan/id0000000000"
              className="badge apple-badge"
              target="_blank"
              rel="noopener noreferrer"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.05 13.5C17.1 12.24 17.9 11.1 19.25 10.67C18.52 9.61 17.18 8.83 15.7 8.83C14.11 8.83 12.83 9.77 12.83 11.09C12.83 12.41 13.85 13.4 15.42 13.4C16.86 13.4 17.07 12.55 17.05 13.5ZM14.23 6.89C15.49 5.5 16.22 3.62 15.95 1.75C14.35 2.08 12.95 3.15 12.12 4.62C10.94 6.42 10.71 8.75 11.79 10.24C13.13 10.09 14.4 8.82 14.23 6.89Z"/>
              </svg>
              App Store
            </a>
            <a
              href="https://play.google.com/store/apps/details?id=com.flipscan.app"
              className="badge play-badge"
              target="_blank"
              rel="noopener noreferrer"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 6.5C3 5.12 4.12 4 5.5 4H19C20.38 4 21.5 5.12 21.5 6.5V17.5C21.5 18.88 20.38 20 19 20H5.5C4.12 20 3 18.88 3 17.5V6.5M5 7V17H19V7H5M7 9H17V11H7V9M7 13H17V15H7V13Z"/>
              </svg>
              Google Play
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <div className="footer-content">
            <p className="footer-text">FlipScan is a mobile app for scanning thrift items to check resale value.</p>
            <div className="footer-links">
              <Link href="/privacy">Privacy Policy</Link>
              <a href="mailto:support@flipscan.app">Support</a>
            </div>
          </div>
          <div className="footer-bottom">
            <p className="footer-credit">FlipScan &copy; 2026</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
