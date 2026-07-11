'use client';

import Link from 'next/link';

export default function PrivacyPolicy() {
  return (
    <main className="policy-page">
      <div className="container">
        <div className="policy-header">
          <Link href="/">← Back to FlipScan</Link>
          <h1>Privacy Policy</h1>
          <p className="policy-date">Last updated: July 11, 2026</p>
        </div>

        <div className="policy-content">
          <section>
            <h2>Introduction</h2>
            <p>
              FlipScan ("we," "us," "our," or "Company") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application (the "App").
            </p>
          </section>

          <section>
            <h2>Information We Collect</h2>
            <h3>Camera and Photo Data</h3>
            <p>
              When you use FlipScan to scan items, we collect photos you capture. Photos are analyzed by our vision AI to identify items and estimate resale value. We retain photos for 90 days to support your scan history, then automatically delete them.
            </p>
            <h3>Device Information</h3>
            <p>
              We collect device model, OS version, and app version for analytics and error tracking purposes.
            </p>
            <h3>Usage Data</h3>
            <p>
              We track scan counts, feature usage, and error events through PostHog analytics (pseudonymous, no IP logging).
            </p>
            <h3>Payment Information</h3>
            <p>
              Subscription purchases are processed by RevenueCat and Stripe on your device. We do not handle payment card data directly.
            </p>
          </section>

          <section>
            <h2>How We Use Your Information</h2>
            <ul>
              <li>To provide scanning and resale value analysis</li>
              <li>To maintain your scan history and watchlist</li>
              <li>To process subscriptions and manage credits</li>
              <li>To improve app performance and user experience</li>
              <li>To detect and prevent fraud or abuse</li>
            </ul>
          </section>

          <section>
            <h2>Data Retention</h2>
            <table className="retention-table">
              <thead>
                <tr>
                  <th>Data Type</th>
                  <th>Retention Period</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Item photos</td>
                  <td>90 days, then automatic deletion</td>
                </tr>
                <tr>
                  <td>Scan metadata (title, price range)</td>
                  <td>Until user deletion</td>
                </tr>
                <tr>
                  <td>AI usage logs</td>
                  <td>13 months</td>
                </tr>
                <tr>
                  <td>Analytics events</td>
                  <td>12 months</td>
                </tr>
              </tbody>
            </table>
          </section>

          <section>
            <h2>Third-Party Processors</h2>
            <p>We rely on the following third-party services:</p>
            <ul>
              <li><strong>Anthropic (Claude)</strong> — Vision API for item analysis</li>
              <li><strong>eBay</strong> — Browse API for pricing comparables</li>
              <li><strong>Supabase</strong> — Database and authentication</li>
              <li><strong>RevenueCat</strong> — Subscription and purchase management</li>
              <li><strong>PostHog</strong> — Analytics</li>
              <li><strong>Sentry</strong> — Error monitoring</li>
            </ul>
          </section>

          <section>
            <h2>Your Rights</h2>
            <p>
              You can request a copy of your data or request deletion by emailing support@flipscan.app. We will comply with your request within 30 days. Deletion includes all photos, scan history, and analytics records.
            </p>
          </section>

          <section>
            <h2>Security</h2>
            <p>
              We use industry-standard encryption (TLS 1.3) for data in transit and apply least-privilege access controls on our backend. All photos are encrypted at rest in our database. However, no method of transmission over the Internet is 100% secure.
            </p>
          </section>

          <section>
            <h2>Contact Us</h2>
            <p>
              If you have questions about this Privacy Policy, please contact us at{' '}
              <a href="mailto:support@flipscan.app">support@flipscan.app</a>.
            </p>
          </section>
        </div>
      </div>

      <style jsx>{`
        .policy-page {
          background-color: var(--cream);
          padding: 2rem 0;
          min-height: 100vh;
        }

        .policy-header {
          margin-bottom: 3rem;
        }

        .policy-header a {
          font-size: 0.9rem;
          margin-bottom: 1rem;
          display: inline-block;
        }

        .policy-header h1 {
          color: var(--forest);
          margin-bottom: 0.5rem;
        }

        .policy-date {
          color: var(--gray-dark);
          font-size: 0.9rem;
        }

        .policy-content {
          max-width: 800px;
          line-height: 1.8;
        }

        .policy-content section {
          margin-bottom: 2.5rem;
        }

        .policy-content h2 {
          color: var(--forest);
          margin-bottom: 1rem;
          margin-top: 0;
        }

        .policy-content h3 {
          color: var(--ink);
          margin-bottom: 0.75rem;
          font-size: 1.1rem;
        }

        .policy-content p {
          color: var(--gray-dark);
          margin-bottom: 1rem;
        }

        .policy-content ul {
          color: var(--gray-dark);
          padding-left: 2rem;
        }

        .policy-content li {
          margin-bottom: 0.5rem;
        }

        .retention-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 1rem;
          border: 1px solid var(--border);
        }

        .retention-table th,
        .retention-table td {
          padding: 1rem;
          text-align: left;
          border-bottom: 1px solid var(--border);
        }

        .retention-table th {
          background-color: var(--gray-light);
          color: var(--forest);
          font-weight: 600;
        }

        .retention-table td {
          color: var(--gray-dark);
        }

        .retention-table tr:last-child td {
          border-bottom: none;
        }

        @media (max-width: 768px) {
          .retention-table th,
          .retention-table td {
            padding: 0.75rem;
            font-size: 0.9rem;
          }
        }
      `}</style>
    </main>
  );
}
