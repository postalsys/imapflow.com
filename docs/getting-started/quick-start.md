---
sidebar_position: 2
---

# Quick Start

This guide will help you get started with ImapFlow in just a few minutes.

## Basic Connection

First, import the ImapFlow class and create a new client instance:

```js title="Create client instance"
const { ImapFlow } = require('imapflow');

const client = new ImapFlow({
    host: 'imap.example.com',
    port: 993,
    secure: true,
    auth: {
        user: 'user@example.com',
        pass: 'your-password'
    },
    logger: false  // Set to console to see debug output
});
```

## Connecting to the Server

Use async/await to connect to the IMAP server:

```js title="Connect to server"
async function main() {
    // Wait until client connects and authorizes
    await client.connect();
    console.log('Connected to IMAP server');
}

main().catch(err => {
    console.error('Connection error:', err);
});
```

## Listing Mailboxes

List all available mailboxes:

```js title="List mailboxes"
// Get the mailbox tree
let tree = await client.listTree();
console.log(tree);

// Or list all mailboxes as a flat array
let list = await client.list();
for (let mailbox of list) {
    console.log(mailbox.path, mailbox.specialUse || '');
}
```

## Selecting a Mailbox

Before you can read or manipulate messages, you need to select a mailbox and acquire a lock:

```js title="Select and lock mailbox"
// Select and lock the INBOX
let lock = await client.getMailboxLock('INBOX');
try {
    console.log('Mailbox is locked');
    console.log('Messages in INBOX:', client.mailbox.exists);

    // Your mailbox operations go here

} finally {
    // Always release the lock
    lock.release();
}
```

## Reading Messages

Fetch the latest message:

```js title="Fetch latest message"
let lock = await client.getMailboxLock('INBOX');
try {
    // Check if mailbox has messages
    if (client.mailbox.exists === 0) {
        console.log('No messages in mailbox');
        return;
    }

    // Fetch the most recent message using '*' for the last message
    let message = await client.fetchOne('*', {
        envelope: true,
        bodyStructure: true
    });

    console.log('Subject:', message.envelope.subject);
    console.log('From:', message.envelope.from[0]?.address);
    console.log('Date:', message.envelope.date);
} finally {
    lock.release();
}
```

## Iterating Over Messages

Use async iteration to process multiple messages:

```js title="Iterate over messages"
let lock = await client.getMailboxLock('INBOX');
try {
    // Fetch all messages (use only for small mailboxes)
    for await (let message of client.fetch('1:*', { envelope: true })) {
        console.log(`${message.uid}: ${message.envelope.subject}`);
    }
} finally {
    lock.release();
}
```

:::warning Important
Do not run any other IMAP commands inside the `fetch()` loop or it will deadlock. Use `fetchAll()` if you need to process messages after fetching.
:::

## Closing the Connection

Always close the connection when done:

```js title="Close connection"
// Log out and close connection
await client.logout();
console.log('Disconnected');
```

## Complete Example

Here is a complete working example:

```js title="Complete example"
const { ImapFlow } = require('imapflow');

const client = new ImapFlow({
    host: 'imap.example.com',
    port: 993,
    secure: true,
    auth: {
        user: 'user@example.com',
        pass: 'your-password'
    }
});

async function main() {
    // Connect
    await client.connect();
    console.log('Connected');

    // List mailboxes
    let mailboxes = await client.list();
    console.log('Mailboxes:', mailboxes.map(m => m.path).join(', '));

    // Select INBOX
    let lock = await client.getMailboxLock('INBOX');
    try {
        console.log(`INBOX has ${client.mailbox.exists} messages`);

        if (client.mailbox.exists > 0) {
            // Fetch latest 10 messages (or all if less than 10)
            let messages = await client.fetchAll('*:-10', {
                envelope: true,
                flags: true
            });

            for (let message of messages) {
                const seen = message.flags.has('\\Seen') ? '' : '[UNREAD] ';
                console.log(`${seen}${message.uid}: ${message.envelope.subject}`);
            }
        }
    } finally {
        lock.release();
    }

    // Logout
    await client.logout();
    console.log('Disconnected');
}

main().catch(console.error);
```

## Common Provider Settings

### Gmail

```js title="Gmail configuration"
const client = new ImapFlow({
    host: 'imap.gmail.com',
    port: 993,
    secure: true,
    auth: {
        user: 'your.email@gmail.com',
        accessToken: 'your-oauth2-token'  // Gmail requires OAuth2
    }
});
```

### Outlook/Office 365

```js title="Outlook configuration"
const client = new ImapFlow({
    host: 'outlook.office365.com',
    port: 993,
    secure: true,
    auth: {
        user: 'your.email@outlook.com',
        accessToken: 'your-oauth2-token'  // OAuth2 recommended
    }
});
```

### Yahoo Mail

```js title="Yahoo Mail configuration"
const client = new ImapFlow({
    host: 'imap.mail.yahoo.com',
    port: 993,
    secure: true,
    auth: {
        user: 'your.email@yahoo.com',
        pass: 'your-app-password'  // Use app password, not regular password
    }
});
```

## What's Next?

- Learn about [Configuration Options](../guides/configuration.md)
- Understand [Basic Usage](../guides/basic-usage.md)
- Explore [Message Fetching](../guides/fetching-messages.md)
- See more [Examples](../examples/fetching-messages.md)
