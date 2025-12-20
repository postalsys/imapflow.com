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
        <div
          style="
            max-width: 260px;
            margin: 3px auto 16px auto;
            font-size: 13px;
            margin-top: 20px;
            color: #407ec9;
            background-color: hsl(0, 0%, 98%);
            box-shadow: 0 1px 4px 1px hsla(0, 0%, 0%, 0.1);
          "
        >
          <a
            href="https://emailengine.app/?utm_source=imapflow&utm_campaign=imapflow&utm_medium=sidebar"
            style="
              display: inline-block;
              color: #407ec9;
              text-decoration: none;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen-Sans, Ubuntu, Cantarell, 'Helvetica Neue', Helvetica, Arial, sans-serif;
            "
          >
            <div style="display: flex; align-items: center; gap: 5px; width: 100%; background: white" target="_blank">
              <div style="flex-basis: 50%">
                <img src="/img/EmailEngine_logo_vert.png" style="width: 130px" />
              </div>
              <div style="flex-basis: 50%">
                <div style="font-size: 13px; line-height: 1.5; text-align: left">Send and receive emails easily with Outlook and Gmail using OAuth2.</div>
              </div>
            </div>
          </a>
        </div>
      `,
      defaultStyle: false,
    },
  ],
};

export default sidebars;
