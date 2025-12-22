import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
  title: 'ImapFlow',
  tagline: 'Modern and easy-to-use IMAP client library for Node.js',
  favicon: 'img/favicon.ico',

  // Enable Mermaid diagrams
  markdown: {
    mermaid: true,
  },
  themes: ['@docusaurus/theme-mermaid'],

  // Future flags, see https://docusaurus.io/docs/api/docusaurus-config#future
  future: {
    v4: true, // Improve compatibility with the upcoming Docusaurus v4
  },

  // Set the production url of your site here
  url: 'https://imapflow.com',
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: '/',

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: 'postalsys', // Usually your GitHub org/user name.
  projectName: 'imapflow', // Usually your repo name.

  onBrokenLinks: 'throw',

  // Plausible analytics
  scripts: [
    {
      src: 'https://plausible.emailengine.dev/js/script.js',
      defer: true,
      'data-domain': 'imapflow.com',
    },
  ],

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          editUrl:
            'https://github.com/postalsys/imapflow/tree/master/docs/',
        },
        blog: false, // Disable blog for this documentation site
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    // Social card for sharing
    image: 'img/imapflow-social-card.svg',
    colorMode: {
      respectPrefersColorScheme: true,
    },
    algolia: {
      appId: 'P0H02EB2AJ',
      apiKey: 'f482204f0e3ef705441e4382bb225275',
      indexName: 'ImapFlow Documentation',

      // Optional: see doc section below
      contextualSearch: true,

      // Optional: path for search page that enabled by default (`false` to disable it)
      searchPagePath: "search",

      // Optional: whether the insights feature is enabled or not on Docsearch (`false` by default)
      insights: true,
    },
    navbar: {
      title: 'ImapFlow',
      logo: {
        alt: 'ImapFlow Logo',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'tutorialSidebar',
          position: 'left',
          label: 'Documentation',
        },
        {
          href: 'https://github.com/postalsys/imapflow',
          label: 'GitHub',
          position: 'right',
        },
        {
          href: 'https://www.npmjs.com/package/imapflow',
          label: 'npm',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            {
              label: 'Getting Started',
              to: '/docs/',
            },
            {
              label: 'API Reference',
              to: '/docs/api/imapflow-client',
            },
          ],
        },
        {
          title: 'Community',
          items: [
            {
              label: 'GitHub Issues',
              href: 'https://github.com/postalsys/imapflow/issues',
            },
            {
              label: 'npm',
              href: 'https://www.npmjs.com/package/imapflow',
            },
          ],
        },
        {
          title: 'More',
          items: [
            {
              label: 'GitHub',
              href: 'https://github.com/postalsys/imapflow',
            },
            {
              label: 'EmailEngine',
              href: 'https://emailengine.app/',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Postal Systems OÜ. Licensed under MIT.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
