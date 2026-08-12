import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  tutorialSidebar: [
    'intro',
    {
      type: 'category',
      label: 'Getting Started',
      collapsed: false,
      items: [
        'getting-started/installation',
        'getting-started/quick-start',
      ],
    },
    {
      type: 'category',
      label: 'Guides',
      collapsed: false,
      items: [
        'guides/basic-usage',
        'guides/configuration',
        'guides/fetching-messages',
        'guides/searching',
        'guides/mailbox-management',
      ],
    },
    {
      type: 'category',
      label: 'API Reference',
      collapsed: false,
      items: [
        'api/imapflow-client',
      ],
    },
    {
      type: 'category',
      label: 'Examples',
      collapsed: true,
      items: [
        'examples/fetching-messages',
      ],
    },
    {
      type: 'html',
      value: `
        <div style="margin: 24px 12px 12px; padding-top: 14px; border-top: 1px solid var(--ifm-toc-border-color);">
          <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: var(--ifm-color-emphasis-600); margin-bottom: 10px;">From the ImapFlow team</div>
          <a href="https://emailengine.app/?utm_source=imapflow.com&utm_medium=sidebar&utm_campaign=oss-docs" style="display: block; margin-bottom: 12px; text-decoration: none; color: var(--ifm-menu-color);">
            <span style="display: block; font-size: 14px; font-weight: 600;">EmailEngine</span>
            <span style="display: block; font-size: 12px; line-height: 1.45; color: var(--ifm-color-emphasis-700);">Self-hosted email API for Gmail, Microsoft 365, and IMAP. Built on ImapFlow.</span>
          </a>
          <a href="https://nodemailer.com/" style="display: block; margin-bottom: 12px; text-decoration: none; color: var(--ifm-menu-color);">
            <span style="display: block; font-size: 14px; font-weight: 600;">Nodemailer</span>
            <span style="display: block; font-size: 12px; line-height: 1.45; color: var(--ifm-color-emphasis-700);">The standard email sending library for Node.js</span>
          </a>
          <a href="https://ethereal.email/" style="display: block; text-decoration: none; color: var(--ifm-menu-color);">
            <span style="display: block; font-size: 14px; font-weight: 600;">Ethereal</span>
            <span style="display: block; font-size: 12px; line-height: 1.45; color: var(--ifm-color-emphasis-700);">Fake SMTP service for testing email sending</span>
          </a>
        </div>
      `,
      defaultStyle: false,
    },
  ],
};

export default sidebars;
