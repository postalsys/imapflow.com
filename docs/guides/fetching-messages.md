---
sidebar_position: 3
---

# Fetching Messages

This guide covers the various ways to fetch and retrieve messages using ImapFlow.

## Fetch Methods

ImapFlow provides several methods for fetching messages:

- `fetch()` - Returns an async iterator for multiple messages (streaming)
- `fetchAll()` - Fetches all messages and returns an array (non-streaming)
- `fetchOne()` - Fetches a single message and returns it directly
- `download()` - Downloads a specific message part as a stream
- `downloadMany()` - Downloads multiple message parts at once

## Fetch Query Options

### envelope

Get message envelope information (subject, from, to, date, etc.):

```js
let message = await client.fetchOne('*', { envelope: true });

console.log('Subject:', message.envelope.subject);
console.log('From:', message.envelope.from[0].address);
console.log('To:', message.envelope.to[0].address);
console.log('Date:', message.envelope.date);
console.log('Message-ID:', message.envelope.messageId);
console.log('In-Reply-To:', message.envelope.inReplyTo);
```

### flags

Get message flags and flag color:

```js
let message = await client.fetchOne('*', { flags: true });

console.log('Flags:', message.flags);
console.log('Is seen?', message.flags.has('\\Seen'));
console.log('Is flagged?', message.flags.has('\\Flagged'));
console.log('Flag color:', message.flagColor); // e.g., 'red', 'yellow'
```

### bodyStructure

Get the MIME structure of the message:

```js
let message = await client.fetchOne('*', { bodyStructure: true });

console.log('Structure:', message.bodyStructure);
console.log('Content-Type:', message.bodyStructure.type);
console.log('Has parts:', !!message.bodyStructure.childNodes);
```

### source

Get the full RFC822 message source:

```js
let message = await client.fetchOne('*', { source: true });

console.log('Raw message:', message.source.toString());
```

You can also request a partial source:

```js
let message = await client.fetchOne('*', {
    source: {
        start: 0,
        maxLength: 1000  // First 1000 bytes only
    }
});
```

### headers

Get message headers:

```js
// Get all headers
let message = await client.fetchOne('*', { headers: true });
console.log('Headers:', message.headers.toString());

// Get specific headers only
let message = await client.fetchOne('*', {
    headers: ['From', 'To', 'Subject', 'Date', 'X-Custom-Header']
});
```

### bodyParts

Fetch specific body parts:

```js
let message = await client.fetchOne('*', {
    bodyParts: ['TEXT', 'HEADER']
});

console.log('Headers:', message.bodyParts.get('HEADER').toString());
console.log('Text:', message.bodyParts.get('TEXT').toString());

// Fetch specific MIME parts
let message = await client.fetchOne('*', {
    bodyParts: ['1', '1.1', '2']  // Part numbers from bodyStructure
});
```

### Additional Query Options

```js
let message = await client.fetchOne('*', {
    uid: true,           // Include UID (always included by default)
    internalDate: true,  // Include internal date
    size: true,          // Include message size
    threadId: true,      // Include thread ID (requires server support)
    labels: true         // Include Gmail labels (Gmail only)
});
```

### Query Macros

For convenience, you can use macros:

```js
// FAST macro: flags, internalDate, size
let message = await client.fetchOne('*', { fast: true });

// ALL macro: flags, internalDate, size, envelope
let message = await client.fetchOne('*', { all: true });

// FULL macro: flags, internalDate, size, envelope, bodyStructure
let message = await client.fetchOne('*', { full: true });
```

## Fetching Single Messages

### Fetch Latest Message

```js
let lock = await client.getMailboxLock('INBOX');
try {
    // Fetch the most recent message
    let message = await client.fetchOne('*', {
        envelope: true,
        source: true
    });

    if (message) {
        console.log('Latest message:', message.envelope.subject);
    } else {
        console.log('No messages in mailbox');
    }
} finally {
    lock.release();
}
```

### Fetch by UID

```js
let message = await client.fetchOne('12345', {
    envelope: true
}, { uid: true });  // Note: options in third parameter
```

### Fetch Specific Sequence Number

```js
let message = await client.fetchOne('1', {
    envelope: true
});
```

## Fetching Multiple Messages

### Using Async Iteration with fetch()

The `fetch()` method returns an async iterator for streaming message processing:

```js
let lock = await client.getMailboxLock('INBOX');
try {
    for await (let message of client.fetch('1:*', { envelope: true })) {
        console.log(`${message.uid}: ${message.envelope.subject}`);
    }
} finally {
    lock.release();
}
```

:::danger Critical Warning: No Commands Inside Fetch Loop

**You cannot run any other IMAP commands inside the `fetch()` async generator loop.** This includes:
- Other fetch operations
- Message flag updates
- Message copy/move/delete operations
- Mailbox operations
- Any other client method calls

The async generator blocks the IMAP connection while iterating. If you try to run another command:
1. The new command waits for the fetch to complete
2. The fetch waits for its output to be processed
3. But processing is blocked waiting for your other command
4. This creates a **deadlock** that will hang indefinitely

**Incorrect - Will Deadlock:**
```js
// DO NOT DO THIS - IT WILL DEADLOCK!
for await (let message of client.fetch('1:*', { envelope: true })) {
    // This will hang forever!
    await client.messageFlagsAdd(message.uid, ['\\Seen'], { uid: true });
}
```

**Correct - Collect First, Then Process:**
```js
// Option 1: Use fetchAll() instead
let messages = await client.fetchAll('1:*', { envelope: true });
for (let message of messages) {
    await client.messageFlagsAdd(message.uid, ['\\Seen'], { uid: true });
}

// Option 2: Collect UIDs first, then process
let uidsToMark = [];
for await (let message of client.fetch('1:*', { envelope: true })) {
    if (!message.flags.has('\\Seen')) {
        uidsToMark.push(message.uid);
    }
}
// Now safe to run commands
if (uidsToMark.length > 0) {
    await client.messageFlagsAdd(uidsToMark, ['\\Seen'], { uid: true });
}
```

:::

### Using fetchAll() for Non-Streaming Fetch

When you need to process messages after fetching, use `fetchAll()`:

```js
let lock = await client.getMailboxLock('INBOX');
try {
    // fetchAll returns an array after all messages are fetched
    let messages = await client.fetchAll('1:100', { envelope: true, flags: true });

    // Now you can safely run other commands
    for (let message of messages) {
        if (!message.flags.has('\\Seen')) {
            await client.messageFlagsAdd(message.uid, ['\\Seen'], { uid: true });
        }
    }
} finally {
    lock.release();
}
```

**Warning:** Do not use `fetchAll('1:*', ...)` on large mailboxes as it loads all messages into memory.

### Fetch Recent Messages

```js
// Fetch last 10 messages using ImapFlow's special range syntax
for await (let message of client.fetch('*:-10', { envelope: true })) {
    console.log(message.envelope.subject);
}
```

### Fetch Specific Range

```js
// Fetch messages 1 through 100
for await (let message of client.fetch('1:100', { envelope: true })) {
    console.log(message.envelope.subject);
}
```

### Fetch by UIDs

```js
// Fetch specific UIDs
for await (let message of client.fetch('1000:2000', { envelope: true }, { uid: true })) {
    console.log(`UID ${message.uid}: ${message.envelope.subject}`);
}

// Fetch from an array of UIDs
let uids = [100, 200, 300, 400];
for await (let message of client.fetch(uids, { envelope: true }, { uid: true })) {
    console.log(`UID ${message.uid}: ${message.envelope.subject}`);
}
```

### Fetch with CONDSTORE (changedSince)

If the server supports the [CONDSTORE extension (RFC 7162)](https://www.rfc-editor.org/rfc/rfc7162.html), you can fetch only messages modified since a specific modseq value:

```js
let lock = await client.getMailboxLock('INBOX');
try {
    // Only fetch messages with modseq > 12345
    for await (let message of client.fetch('1:*', { envelope: true, flags: true }, {
        changedSince: 12345n
    })) {
        console.log(`Changed: ${message.uid}, modseq: ${message.modseq}`);
    }
} finally {
    lock.release();
}
```

## Downloading Message Parts

### Basic Download

```js
// Download specific part as stream
let { meta, content } = await client.download('*', '2', { uid: true });

console.log('Content-Type:', meta.contentType);
console.log('Filename:', meta.filename);
console.log('Size:', meta.expectedSize);

// content is a readable stream
const chunks = [];
for await (const chunk of content) {
    chunks.push(chunk);
}
const buffer = Buffer.concat(chunks);
```

### Download Full Message

```js
// Download entire RFC822 message (omit part parameter)
let { meta, content } = await client.download('*');

console.log('Content-Type:', meta.contentType); // 'message/rfc822'
```

### Stream to File

```js
const fs = require('fs');

let { meta, content } = await client.download(messageUid, '2', { uid: true });

const writeStream = fs.createWriteStream(meta.filename || 'attachment');
content.pipe(writeStream);

await new Promise((resolve, reject) => {
    writeStream.on('finish', resolve);
    writeStream.on('error', reject);
});
```

### Download Multiple Parts

```js
// Download multiple parts at once (returns Buffers, not streams)
let parts = await client.downloadMany(messageUid, ['1', '2', '3'], { uid: true });

for (let [partId, data] of Object.entries(parts)) {
    console.log(`Part ${partId}:`);
    console.log('  Content-Type:', data.meta.contentType);
    console.log('  Size:', data.content.length);
}
```

### Limit Download Size

```js
// Limit download to first 1MB
let { meta, content } = await client.download('*', '2', {
    uid: true,
    maxBytes: 1024 * 1024
});
```

## Finding Attachments

### Get Attachment Information

```js
let message = await client.fetchOne('*', { bodyStructure: true });

function findAttachments(node, path = []) {
    let attachments = [];

    if (node.disposition === 'attachment' ||
        (node.type && node.type !== 'text' && node.type !== 'multipart' && !node.disposition)) {
        attachments.push({
            part: path.length ? path.join('.') : '1',
            type: `${node.type}/${node.subtype || 'octet-stream'}`,
            encoding: node.encoding,
            size: node.size,
            filename: node.dispositionParameters?.filename ||
                     node.parameters?.name ||
                     'attachment'
        });
    }

    if (node.childNodes) {
        node.childNodes.forEach((child, i) => {
            attachments.push(...findAttachments(child, [...path, i + 1]));
        });
    }

    return attachments;
}

let attachments = findAttachments(message.bodyStructure);
console.log('Attachments:', attachments);
```

## Search and Fetch

Combine search with fetch to retrieve specific messages:

```js
let lock = await client.getMailboxLock('INBOX');
try {
    // Search for unseen messages from a specific sender
    let uids = await client.search({
        seen: false,
        from: 'important@example.com'
    }, { uid: true });

    console.log(`Found ${uids.length} matching messages`);

    // Fetch the found messages
    if (uids.length > 0) {
        let messages = await client.fetchAll(uids, {
            envelope: true,
            bodyStructure: true
        }, { uid: true });

        for (let message of messages) {
            console.log('Subject:', message.envelope.subject);
        }
    }
} finally {
    lock.release();
}
```

### Gmail-Specific Search

```js
// Use Gmail's raw search syntax
let uids = await client.search({
    gmraw: 'has:attachment larger:5M'
}, { uid: true });
```

## Performance Tips

1. **Fetch only what you need** - Request only the data items you need
2. **Use UIDs** - More reliable than sequence numbers across sessions
3. **Use fetchAll() carefully** - Only for reasonably sized result sets
4. **Stream large content** - Use `download()` for attachments
5. **Limit ranges** - Use specific ranges like `*:-100` instead of `1:*`
6. **Use CONDSTORE** - Use `changedSince` to fetch only changed messages
7. **Batch flag updates** - Update flags for multiple UIDs at once

## Response Properties

Every fetched message includes these properties:

| Property | Type | Description |
|----------|------|-------------|
| `seq` | Number | Sequence number (always present) |
| `uid` | Number | Unique identifier (always present) |
| `modseq` | BigInt | Modification sequence (if CONDSTORE enabled) |
| `emailId` | String | Unique email ID (if OBJECTID extension) |
| `threadId` | String | Thread ID (if OBJECTID or Gmail extension) |
| `flags` | Set | Message flags |
| `flagColor` | String | Flag color derived from flags |
| `labels` | Set | Gmail labels (Gmail only) |
| `envelope` | Object | Parsed envelope data |
| `bodyStructure` | Object | MIME structure |
| `internalDate` | Date | Internal date |
| `size` | Number | Message size in bytes |
| `source` | Buffer | Raw message source |
| `headers` | Buffer | Raw headers |
| `bodyParts` | Map | Requested body parts |

## Next Steps

- Learn about [Basic Usage](./basic-usage.md)
- Explore [Mailbox Management](./mailbox-management.md)
- See [Examples](../examples/fetching-messages.md)
