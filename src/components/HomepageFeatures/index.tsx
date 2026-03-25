import type {ReactNode} from 'react';
import clsx from 'clsx';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

type FeatureItem = {
  title: string;
  image: string;
  description: ReactNode;
};

const FeatureList: FeatureItem[] = [
  {
    title: 'Modern Async/Await API',
    image: '/img/syncing.png',
    description: (
      <>
        Built for modern Node.js with full Promise and async/await support.
        Clean, intuitive API that makes working with IMAP simple and straightforward.
      </>
    ),
  },
  {
    title: 'Feature Rich',
    image: '/img/collecting.png',
    description: (
      <>
        Comprehensive IMAP support including message fetching, searching, mailbox
        management, and automatic handling of IMAP extensions. TypeScript definitions included.
      </>
    ),
  },
  {
    title: 'Production Ready',
    image: '/img/storing.png',
    description: (
      <>
        Battle-tested in production as the foundation for EmailEngine Email API.
        Reliable connection management, error handling, and proxy support.
      </>
    ),
  },
];

function Feature({title, image, description}: FeatureItem) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center">
        <img src={image} className={styles.featureImg} role="img" alt={title} />
      </div>
      <div className="text--center padding-horiz--md">
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures(): ReactNode {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
