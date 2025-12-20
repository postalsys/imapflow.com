---
sidebar_position: 1
---

# Fetching Messages Examples

Practical examples for fetching and working with email messages.

:::danger Important: Fetch Loop Restrictions
The `fetch()` method returns an async generator that holds the IMAP connection. You **cannot** run any other IMAP commands inside the fetch loop or it will deadlock. Either use `fetchAll()` or collect data first, then process.
:::

## Fetch Latest Message

```js title="Fetch the most recent message"
const { ImapFlow } = require('imapflow');

const client = new ImapFlow({
    host: 'imap.example.com',
    port: 993,
    secure: true,
    auth: {
        user: 'user@example.com',
        pass: 'password'
    }
});

async function fetchLatest() {
    await client.connect();

    let lock = await client.getMailboxLock('INBOX');
    try {
        if (client.mailbox.exists === 0) {
            console.log('No messages in mailbox');
            return;
        }

        // Fetch the most recent message
        let message = await client.fetchOne('*', {
            envelope: true,
            bodyStructure: true
        });

        console.log('Subject:', message.envelope.subject);
        console.log('From:', message.envelope.from[0].address);
        console.log('Date:', message.envelope.date);
    } finally {
        lock.release();
    }

    await client.logout();
}

fetchLatest().catch(console.error);
```

## Fetch Unread Messages

```js title="Fetch all unread messages"
async function fetchUnread() {
    await client.connect();

    let lock = await client.getMailboxLock('INBOX');
    try {
        // Search for unseen messages
        let unseenUids = await client.search({ seen: false }, { uid: true });

        console.log(`Found ${unseenUids.length} unread messages`);

        if (unseenUids.length === 0) {
            return;
        }

        // Use fetchAll to get all messages so we can process them after
        let messages = await client.fetchAll(unseenUids, {
            envelope: true,
            source: true
        }, { uid: true });

        for (let message of messages) {
            console.log('\n---');
            console.log('UID:', message.uid);
            console.log('Subject:', message.envelope.subject);
            console.log('From:', message.envelope.from[0]?.address);

            // Now we can safely mark as seen
            await client.messageFlagsAdd(message.uid, ['\\Seen'], { uid: true });
        }
    } finally {
        lock.release();
    }

    await client.logout();
}

fetchUnread().catch(console.error);
```

## Fetch Messages from Specific Sender

```js title="Search and fetch by sender"
async function fetchFromSender(senderEmail) {
    await client.connect();

    let lock = await client.getMailboxLock('INBOX');
    try {
        // Search for messages from specific sender
        let uids = await client.search({
            from: senderEmail
        }, { uid: true });

        console.log(`Found ${uids.length} messages from ${senderEmail}`);

        // Use fetchAll for safety when you might want to process further
        let messages = await client.fetchAll(uids, {
            envelope: true
        }, { uid: true });

        for (let message of messages) {
            console.log(`${message.uid}: ${message.envelope.subject}`);
        }
    } finally {
        lock.release();
    }

    await client.logout();
}

fetchFromSender('important@example.com').catch(console.error);
```

## Fetch Recent Messages with Attachments

```js title="Find messages with attachments"
async function fetchMessagesWithAttachments() {
    await client.connect();

    let lock = await client.getMailboxLock('INBOX');
    try {
        // Fetch last 50 messages using fetchAll
        let messages = await client.fetchAll('*:-50', {
            envelope: true,
            bodyStructure: true
        });

        for (let message of messages) {
            // Check if message has attachments
            let attachments = findAttachments(message.bodyStructure);

            if (attachments.length > 0) {
                console.log('\nMessage with attachments:');
                console.log('UID:', message.uid);
                console.log('Subject:', message.envelope.subject);
                console.log('From:', message.envelope.from[0]?.address);
                console.log('Attachments:');
                attachments.forEach(att => {
                    console.log(`  - ${att.filename} (${att.type})`);
                });
            }
        }
    } finally {
        lock.release();
    }

    await client.logout();
}

function findAttachments(node, path = []) {
    let attachments = [];

    if (node.disposition === 'attachment' ||
        (node.type && node.type !== 'text' && node.type !== 'multipart' && !node.disposition)) {
        attachments.push({
            part: path.length ? path.join('.') : '1',
            type: `${node.type}/${node.subtype || 'octet-stream'}`,
            size: node.size,
            filename: node.dispositionParameters?.filename ||
                     node.parameters?.name ||
                     'unnamed'
        });
    }

    if (node.childNodes) {
        node.childNodes.forEach((child, i) => {
            attachments.push(...findAttachments(child, [...path, i + 1]));
        });
    }

    return attachments;
}

fetchMessagesWithAttachments().catch(console.error);
```

## Download Attachment

```js title="Download a single attachment"
const fs = require('fs');
const path = require('path');
const { pipeline } = require('stream/promises');

async function downloadAttachment(messageUid, attachmentPart, savePath) {
    await client.connect();

    let lock = await client.getMailboxLock('INBOX');
    try {
        // Download the attachment as stream
        let { meta, content } = await client.download(
            messageUid,
            attachmentPart,
            { uid: true }
        );

        console.log('Downloading:', meta.filename || 'attachment');
        console.log('Content-Type:', meta.contentType);
        console.log('Expected size:', meta.expectedSize, 'bytes');

        // Stream to file
        await pipeline(content, fs.createWriteStream(savePath));

        console.log(`Saved to ${savePath}`);
    } finally {
        lock.release();
    }

    await client.logout();
}

// Example: Download part '2' of message UID 123
downloadAttachment('123', '2', './attachment.pdf')
    .catch(console.error);
```

## Download Multiple Attachments

```js title="Download all attachments from a message"
async function downloadAllAttachments(messageUid, outputDir) {
    await client.connect();

    let lock = await client.getMailboxLock('INBOX');
    try {
        // First get the structure
        let message = await client.fetchOne(messageUid, {
            bodyStructure: true
        }, { uid: true });

        if (!message) {
            console.log('Message not found');
            return;
        }

        // Find all attachments
        let attachments = findAttachments(message.bodyStructure);

        if (attachments.length === 0) {
            console.log('No attachments found');
            return;
        }

        console.log(`Found ${attachments.length} attachments`);

        // Download multiple parts at once
        let parts = await client.downloadMany(
            messageUid,
            attachments.map(a => a.part),
            { uid: true }
        );

        // Save each attachment
        for (let attachment of attachments) {
            let data = parts[attachment.part];
            if (data && data.content) {
                let filename = path.join(outputDir, attachment.filename);
                await fs.promises.writeFile(filename, data.content);
                console.log(`Saved: ${filename}`);
            }
        }
    } finally {
        lock.release();
    }

    await client.logout();
}

downloadAllAttachments('456', './attachments/')
    .catch(console.error);
```

## Fetch Message Body Content

```js title="Extract text and HTML content"
async function getMessageContent(messageUid) {
    await client.connect();

    let lock = await client.getMailboxLock('INBOX');
    try {
        // First, get the structure
        let message = await client.fetchOne(messageUid, {
            bodyStructure: true
        }, { uid: true });

        if (!message) {
            return null;
        }

        // Find text and HTML parts
        let textPart = findPartByType(message.bodyStructure, 'text', 'plain');
        let htmlPart = findPartByType(message.bodyStructure, 'text', 'html');

        let result = {};

        // Download text part
        if (textPart) {
            let { content } = await client.download(messageUid, textPart, { uid: true });
            let chunks = [];
            for await (let chunk of content) {
                chunks.push(chunk);
            }
            result.text = Buffer.concat(chunks).toString('utf-8');
        }

        // Download HTML part
        if (htmlPart) {
            let { content } = await client.download(messageUid, htmlPart, { uid: true });
            let chunks = [];
            for await (let chunk of content) {
                chunks.push(chunk);
            }
            result.html = Buffer.concat(chunks).toString('utf-8');
        }

        return result;
    } finally {
        lock.release();
    }
}

function findPartByType(node, type, subtype, path = '1') {
    if (node.type === type && node.subtype === subtype) {
        return path;
    }
    if (node.childNodes) {
        for (let i = 0; i < node.childNodes.length; i++) {
            let childPath = path === '1' ? `${i + 1}` : `${path}.${i + 1}`;
            let found = findPartByType(node.childNodes[i], type, subtype, childPath);
            if (found) return found;
        }
    }
    return null;
}

// Usage
getMessageContent('789')
    .then(content => {
        if (content) {
            console.log('Text:', content.text?.substring(0, 200));
            console.log('HTML:', content.html?.substring(0, 200));
        }
    })
    .catch(console.error);
```

## Fetch Messages in Date Range

```js title="Search by date range"
async function fetchByDateRange(startDate, endDate) {
    await client.connect();

    let lock = await client.getMailboxLock('INBOX');
    try {
        // Search for messages in date range
        let uids = await client.search({
            since: startDate,
            before: endDate
        }, { uid: true });

        console.log(`Found ${uids.length} messages`);

        // Use fetchAll to get all at once
        let messages = await client.fetchAll(uids, {
            envelope: true
        }, { uid: true });

        for (let message of messages) {
            console.log(
                message.envelope.date?.toISOString() || 'No date',
                '-',
                message.envelope.subject
            );
        }
    } finally {
        lock.release();
    }

    await client.logout();
}

// Fetch messages from last week
let lastWeek = new Date();
lastWeek.setDate(lastWeek.getDate() - 7);

fetchByDateRange(lastWeek, new Date())
    .catch(console.error);
```

## Batch Process Messages (Correct Pattern)

This example shows how to properly process messages in batches when you need to modify them.

```js title="Batch processing with fetchAll()"
async function batchProcessMessages(batchSize = 100) {
    await client.connect();

    let lock = await client.getMailboxLock('INBOX');
    try {
        let total = client.mailbox.exists;
        console.log(`Processing ${total} messages in batches of ${batchSize}`);

        for (let start = 1; start <= total; start += batchSize) {
            let end = Math.min(start + batchSize - 1, total);
            let range = `${start}:${end}`;

            console.log(`\nFetching messages ${start} to ${end}...`);

            // IMPORTANT: Use fetchAll to get all messages first
            let messages = await client.fetchAll(range, {
                envelope: true,
                flags: true
            });

            // Now we can safely process and modify messages
            let toMarkSeen = [];

            for (let message of messages) {
                console.log(`  ${message.uid}: ${message.envelope.subject}`);

                // Collect UIDs to mark as seen
                if (!message.flags.has('\\Seen')) {
                    toMarkSeen.push(message.uid);
                }
            }

            // Batch update flags (much more efficient than one-by-one)
            if (toMarkSeen.length > 0) {
                console.log(`  Marking ${toMarkSeen.length} messages as seen...`);
                await client.messageFlagsAdd(toMarkSeen, ['\\Seen'], { uid: true });
            }
        }
    } finally {
        lock.release();
    }

    await client.logout();
}

batchProcessMessages(50).catch(console.error);
```

## Watch for New Messages

To receive real-time notifications, you need to keep a mailbox open. The `exists` event fires when new messages arrive.

```js title="Real-time message notifications"
async function watchForNewMessages() {
    await client.connect();

    // Listen for new messages
    // Note: Event handlers are not awaited, so errors must be handled internally
    client.on('exists', (data) => {
        console.log(`New message! Total: ${data.count} (was ${data.prevCount})`);
        // The event provides count info, but you're already holding the lock
        // so you can fetch directly without acquiring a new lock
    });

    // Open mailbox - this keeps the connection alive and listening
    let lock = await client.getMailboxLock('INBOX');
    try {
        console.log('Watching for new messages... (Press Ctrl+C to stop)');
        console.log(`Current message count: ${client.mailbox.exists}`);

        // Keep watching - in a real app you'd have proper shutdown handling
        await new Promise(resolve => {
            process.on('SIGINT', resolve);
        });
    } finally {
        lock.release();
    }

    await client.logout();
}

watchForNewMessages().catch(console.error);
```

If you need to fetch the new message when it arrives, process it within the same lock context:

```js title="Fetch new messages as they arrive"
async function watchAndFetch() {
    await client.connect();

    let lock = await client.getMailboxLock('INBOX');
    try {
        let lastCount = client.mailbox.exists;
        console.log(`Watching INBOX (${lastCount} messages)...`);

        client.on('exists', async (data) => {
            // We already hold the lock, so we can fetch directly
            if (data.count > lastCount) {
                let newMessages = await client.fetchAll(
                    `${lastCount + 1}:*`,
                    { envelope: true }
                );
                for (let msg of newMessages) {
                    console.log(`New: ${msg.envelope.subject}`);
                }
                lastCount = data.count;
            }
        });

        // Wait until interrupted
        await new Promise(resolve => process.on('SIGINT', resolve));
    } finally {
        lock.release();
    }

    await client.logout();
}
```

:::warning Async Event Handlers
Node.js EventEmitter does not await async event handlers. If your handler is async, errors won't propagate to the caller. Always use try/catch inside async event handlers.
:::

## Search with Complex Criteria

```js title="Complex search queries"
async function complexSearch() {
    await client.connect();

    let lock = await client.getMailboxLock('INBOX');
    try {
        // Messages from Alice OR Bob, received in last 30 days, larger than 100KB
        let uids = await client.search({
            or: [
                { from: 'alice@example.com' },
                { from: 'bob@example.com' }
            ],
            since: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            larger: 100 * 1024
        }, { uid: true });

        console.log(`Found ${uids.length} matching messages`);

        // Unseen messages with attachments (check body for attachment markers)
        let unseenWithAttach = await client.search({
            seen: false,
            header: { 'Content-Type': 'multipart/mixed' }
        }, { uid: true });

        console.log(`Found ${unseenWithAttach.length} unseen with potential attachments`);

        // Gmail-specific raw search
        if (client.capabilities.has('X-GM-EXT-1')) {
            let gmailResults = await client.search({
                gmraw: 'has:attachment larger:1M filename:pdf'
            }, { uid: true });
            console.log(`Gmail search found ${gmailResults.length} PDFs > 1MB`);
        }
    } finally {
        lock.release();
    }

    await client.logout();
}

complexSearch().catch(console.error);
```

## Gmail Labels Example

```js title="Working with Gmail labels"
async function gmailLabelsExample() {
    const client = new ImapFlow({
        host: 'imap.gmail.com',
        port: 993,
        secure: true,
        auth: {
            user: 'your.email@gmail.com',
            accessToken: 'your-oauth2-token'  // Gmail requires OAuth2
        }
    });

    await client.connect();

    let lock = await client.getMailboxLock('[Gmail]/All Mail');
    try {
        // Fetch messages with labels
        let messages = await client.fetchAll('1:10', {
            envelope: true,
            labels: true
        });

        for (let message of messages) {
            console.log('Subject:', message.envelope.subject);
            console.log('Labels:', message.labels ? Array.from(message.labels) : 'none');
        }

        // Add a label to a message
        await client.messageLabelsAdd('12345', ['MyLabel'], { uid: true });

        // Remove a label
        await client.messageLabelsRemove('12345', ['OldLabel'], { uid: true });

        // Search using Gmail's raw syntax
        let important = await client.search({
            gmraw: 'is:important has:attachment'
        }, { uid: true });

        console.log(`Found ${important.length} important messages with attachments`);
    } finally {
        lock.release();
    }

    await client.logout();
}
```

## Complete Email Client Example

```js title="Complete email client class"
const { ImapFlow } = require('imapflow');

class SimpleEmailClient {
    constructor(config) {
        this.client = new ImapFlow(config);
        this.connected = false;
    }

    async connect() {
        await this.client.connect();
        this.connected = true;

        // Set up event listeners
        this.client.on('close', () => {
            this.connected = false;
            console.log('Connection closed');
        });

        this.client.on('error', (err) => {
            console.error('IMAP error:', err.message);
        });
    }

    async getMailboxes() {
        return await this.client.list();
    }

    async getMailboxStatus(path) {
        return await this.client.status(path, {
            messages: true,
            unseen: true,
            recent: true
        });
    }

    async getMessages(mailbox, limit = 50) {
        let lock = await this.client.getMailboxLock(mailbox);
        try {
            let total = this.client.mailbox.exists;
            if (total === 0) return [];

            let start = Math.max(1, total - limit + 1);
            return await this.client.fetchAll(`${start}:*`, {
                envelope: true,
                flags: true,
                bodyStructure: true
            });
        } finally {
            lock.release();
        }
    }

    async getMessage(mailbox, uid) {
        let lock = await this.client.getMailboxLock(mailbox);
        try {
            let message = await this.client.fetchOne(uid, {
                envelope: true,
                bodyStructure: true,
                source: true
            }, { uid: true });

            return message;
        } finally {
            lock.release();
        }
    }

    async markAsRead(mailbox, uids) {
        let lock = await this.client.getMailboxLock(mailbox);
        try {
            await this.client.messageFlagsAdd(uids, ['\\Seen'], { uid: true });
        } finally {
            lock.release();
        }
    }

    async moveToTrash(mailbox, uids) {
        let lock = await this.client.getMailboxLock(mailbox);
        try {
            // Try standard trash locations
            let trashPath = '[Gmail]/Trash'; // Gmail
            try {
                await this.client.messageMove(uids, trashPath, { uid: true });
            } catch {
                // Try other common names
                await this.client.messageMove(uids, 'Trash', { uid: true });
            }
        } finally {
            lock.release();
        }
    }

    async disconnect() {
        if (this.connected) {
            await this.client.logout();
        }
    }
}

// Usage
async function main() {
    const emailClient = new SimpleEmailClient({
        host: 'imap.example.com',
        port: 993,
        secure: true,
        auth: {
            user: 'user@example.com',
            pass: 'password'
        }
    });

    await emailClient.connect();

    // List mailboxes
    let mailboxes = await emailClient.getMailboxes();
    console.log('Mailboxes:', mailboxes.map(m => m.path));

    // Get recent messages
    let messages = await emailClient.getMessages('INBOX', 10);
    for (let msg of messages) {
        console.log(`[${msg.flags.has('\\Seen') ? ' ' : '*'}] ${msg.envelope.subject}`);
    }

    await emailClient.disconnect();
}

main().catch(console.error);
```

## See Also

- [Fetching Messages Guide](../guides/fetching-messages.md)
- [API Reference](../api/imapflow-client.md)
- [Mailbox Management Guide](../guides/mailbox-management.md)
