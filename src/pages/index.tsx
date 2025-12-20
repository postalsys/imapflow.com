import type {ReactNode} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import HomepageFeatures from '@site/src/components/HomepageFeatures';
import Heading from '@theme/Heading';

import styles from './index.module.css';

function EmailEngineBanner() {
  return (
    <section style={{
      backgroundColor: '#f8f9fa',
      padding: '2rem 0',
      borderTop: '1px solid #e9ecef',
      borderBottom: '1px solid #e9ecef',
    }}>
      <div className="container">
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '2rem',
          flexWrap: 'wrap',
        }}>
          <a href="https://emailengine.app/?utm_source=imapflow&utm_campaign=imapflow&utm_medium=homepage" target="_blank" rel="noopener noreferrer">
            <img
              src="/img/EmailEngine_logo_vert.png"
              alt="EmailEngine"
              style={{ height: '80px' }}
            />
          </a>
          <div style={{ maxWidth: '500px' }}>
            <Heading as="h3" style={{ marginBottom: '0.5rem' }}>
              Looking for a complete email gateway?
            </Heading>
            <p style={{ marginBottom: '0.5rem', color: '#666' }}>
              <a
                href="https://emailengine.app/?utm_source=imapflow&utm_campaign=imapflow&utm_medium=homepage"
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontWeight: 'bold' }}
              >
                EmailEngine
              </a> is a self-hosted email gateway that provides REST API access to IMAP and SMTP accounts, webhooks for mailbox changes, OAuth2 support, and more.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className="container">
        <Heading as="h1" className="hero__title">
          {siteConfig.title}
        </Heading>
        <p className="hero__subtitle">{siteConfig.tagline}</p>
        <div className={styles.buttons}>
          <Link
            className="button button--secondary button--lg"
            to="/docs/">
            Get Started
          </Link>
          <Link
            className="button button--secondary button--lg"
            to="/docs/getting-started/quick-start"
            style={{marginLeft: '1rem'}}>
            Quick Start
          </Link>
        </div>
      </div>
    </header>
  );
}

export default function Home(): ReactNode {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title={`${siteConfig.title} - Modern IMAP Client for Node.js`}
      description="Modern and easy-to-use IMAP client library for Node.js with async/await support">
      <HomepageHeader />
      <main>
        <HomepageFeatures />
        <EmailEngineBanner />
      </main>
    </Layout>
  );
}
