---
sidebar_position: 3
---

# Fetching Messages

<div style={{textAlign: 'center'}}>
  <img src="/img/syncing.png" alt="Fetching messages" width="200" />
</div>

This guide covers the various ways to fetch and retrieve messages using ImapFlow.

All fetch and download methods work on the currently selected mailbox, so open one first, preferably with `getMailboxLock()`. Without a selected mailbox they return nothing.

## Fetch Methods

ImapFlow provides several methods for fetching messages:

- `fetch(range, query, options)` returns an async generator that yields messages one by one (streaming)
- `fetchAll(range, query, options)` fetches every matching message and resolves with an array
- `fetchOne(seq, query, options)` fetches a single message and resolves with it, or with `false` if it was not found
- `download(range, part, options)` downloads the full message or one body part as a decoded stream
- `downloadMany(range, parts, options)` downloads several body parts of one message as Buffers

## Message Ranges

The `range` argument of `fetch()` and `fetchAll()` accepts several forms:

```js title="Range formats"
'1:*'               // every message
'1:100'             // a range
'1,5,10:20'         // a list of numbers and ranges
'*'                 // the newest message
42                  // a single number
[100, 200, 300]     // an array of numbers
{ all: true }       // every message, same as '1:*'
{ uid: '1000:*' }   // a UID range, used as UIDs even without the uid option
{ seen: false }     // any other object is a search query, see search()
```

Numbers are sequence numbers unless you pass `{ uid: true }` in the options. Some details to keep in mind:

- `'*'` is resolved to the current message count (`client.mailbox.exists`), so it always means the newest message and is always sent as a sequence number, even when `uid: true` is set.
- A search query object is run with SEARCH first and the resulting UIDs are fetched, so the result is the same as calling `search()` yourself and passing the UIDs on.
- There is no negative range syntax. To get the last N messages, compute the range from `client.mailbox.exists`, as shown in [Fetch Recent Messages](#fetch-recent-messages).
- On an empty mailbox a sequence range resolves to nothing and `fetch()` yields no messages.

`fetchOne()` and `download()` take a single sequence number or UID (or `'*'`) instead.

## Fetch Query Options

### envelope

Get message envelope information (subject, from, to, date, etc.):

```js title="Envelope data"
let message = await client.fetchOne('*', { envelope: true });

console.log('Subject:', message.envelope.subject);
console.log('From:', message.envelope.from?.[0]?.address);
console.log('To:', message.envelope.to?.map(addr => addr.address));
console.log('Date:', message.envelope.date);
console.log('Message-ID:', message.envelope.messageId);
console.log('In-Reply-To:', message.envelope.inReplyTo);
```

Address lists (`from`, `sender`, `replyTo`, `to`, `cc`, `bcc`) are arrays of `{ name, address }` objects and are left out when the header is empty. For an address group such as `undisclosed-recipients:;` the server sends a group marker, which ImapFlow keeps as an entry with the group name in `name` and an empty `address`. `date` is a `Date` object, or the raw string if the server value could not be parsed.

### flags

Get message flags and flag color:

```js title="Flags"
let message = await client.fetchOne('*', { flags: true });

console.log('Flags:', message.flags);
console.log('Is seen?', message.flags.has('\\Seen'));
console.log('Is flagged?', message.flags.has('\\Flagged'));
console.log('Flag color:', message.flagColor); // e.g., 'red', 'yellow'
```

`flagColor` is derived from the `\Flagged` flag and the `$MailFlagBit0` to `$MailFlagBit2` keywords, and is only set for flagged messages.

### bodyStructure

Get the MIME structure of the message:

```js title="Body structure"
let message = await client.fetchOne('*', { bodyStructure: true });

console.log('Structure:', message.bodyStructure);
console.log('Content-Type:', message.bodyStructure.type);
console.log('Has parts:', !!message.bodyStructure.childNodes);
```

Each node of the tree has these properties (only the ones the server reported are set):

| Property | Description |
|----------|-------------|
| `part` | Part number to use with `bodyParts`, `download()` and `downloadMany()`, e.g. `'1.2'`. The root node has no `part` |
| `type` | Full Content-Type in lowercase, e.g. `'text/plain'` or `'multipart/mixed'`. There is no separate subtype field |
| `parameters` | Content-Type parameters, e.g. `{ charset: 'utf-8' }` or `{ name: 'file.pdf' }` |
| `id` | Content-ID, angle brackets included |
| `description` | Content-Description |
| `encoding` | Transfer encoding in lowercase, e.g. `'base64'` |
| `size` | Size of the encoded part in bytes |
| `lineCount` | Line count for `text/*` and `message/rfc822` parts |
| `md5` | Content-MD5 |
| `disposition` | Content-Disposition in lowercase, e.g. `'attachment'` or `'inline'` |
| `dispositionParameters` | Content-Disposition parameters, e.g. `{ filename: 'file.pdf' }` |
| `language` | Array of Content-Language values |
| `location` | Content-Location |
| `envelope` | Envelope of an embedded `message/rfc822` part |
| `childNodes` | Child nodes of a multipart node, or the structure of an embedded `message/rfc822` message |

A message that is not multipart has a root node without `part` and without `childNodes`. Its content is still addressed as part `'1'`.

### source

Get the full RFC822 message source as a Buffer:

```js title="Full message source"
let message = await client.fetchOne('*', { source: true });

console.log('Raw message:', message.source.toString());
```

You can also request a partial source:

```js title="Partial message source"
let message = await client.fetchOne('*', {
    source: {
        start: 0,
        maxLength: 1000  // First 1000 bytes only
    }
});
```

The source is fetched with `BODY.PEEK[]`, so fetching it does not set the `\Seen` flag. To turn the source into subject, addresses, text, HTML and attachments, see [Parsing Messages](#parsing-messages).

### headers

Get message headers:

```js title="Message headers"
// Get all headers
let message = await client.fetchOne('*', { headers: true });
console.log('Headers:', message.headers.toString());

// Get specific headers only
let message = await client.fetchOne('*', {
    headers: ['From', 'To', 'Subject', 'Date', 'X-Custom-Header']
});
console.log('Headers:', message.headers.toString());
```

`message.headers` is a Buffer with the raw header lines (folded lines and encoded words are left as they are), followed by an empty line. Use a MIME parser to process the values.

### bodyParts

Fetch specific body parts as raw Buffers:

```js title="Specific body parts"
let message = await client.fetchOne('*', {
    bodyParts: ['1', '1.2', '2']  // Part numbers from bodyStructure
});

// Keys in the bodyParts Map are lowercase
console.log('Part 1:', message.bodyParts.get('1').toString());

// TEXT returns the message body without the header
let message = await client.fetchOne('*', { bodyParts: ['TEXT'] });
console.log('Body:', message.bodyParts.get('text').toString());
```

Things to know about `bodyParts`:

- The Map keys are the section names the server answered with, in lowercase. Request `'TEXT'` and read it back with `get('text')`.
- A `'HEADER'` section is not stored in `bodyParts`, it is returned in `message.headers` instead. Use the `headers` query option for headers.
- The content is returned as stored on the server, still in its transfer encoding (base64, quoted-printable) and charset. Use `download()` or `downloadMany()` when you want decoded content, or [`binary`](#binary-fetch-server-side-decoding) to let the server decode it.

Each entry can also be an object with `key`, `start` and `maxLength` to fetch a byte range of a part:

```js title="Partial body part"
let message = await client.fetchOne('*', {
    bodyParts: [{ key: '2', start: 0, maxLength: 1024 }]  // first 1KB of part 2
});
```

### Additional Query Options

```js title="Other data items"
let message = await client.fetchOne('*', {
    uid: true,           // Include UID (always included anyway)
    internalDate: true,  // Include internal date
    size: true,          // Include message size (RFC822.SIZE)
    threadId: true,      // Include thread ID (OBJECTID or Gmail only)
    labels: true         // Include Gmail labels (Gmail only)
});
```

The email ID (`emailId`) is requested automatically whenever the server supports [OBJECTID (RFC 8474)](https://www.rfc-editor.org/rfc/rfc8474.html) or the Gmail extensions, so the `emailId` query option is accepted but changes nothing. `threadId` and `labels` are silently skipped on servers without the required extension.

### Query Macros

For convenience, you can use macros:

```js title="FAST, ALL and FULL macros"
// FAST macro: flags, internalDate, size
let message = await client.fetchOne('*', { fast: true });

// ALL macro: flags, internalDate, size, envelope
let message = await client.fetchOne('*', { all: true });

// FULL macro: flags, internalDate, size, envelope, bodyStructure
let message = await client.fetchOne('*', { full: true });
```

ImapFlow expands the macros into the individual data items before sending the command, so they can be combined with other query options such as `source` or `headers`.

## Fetching Single Messages

`fetchOne()` resolves with the message object, with `false` if the message does not exist (or the mailbox is empty), and with `undefined` if no mailbox is selected.

### Fetch Latest Message

```js title="Fetch the newest message"
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

```js title="Fetch one message by UID"
let message = await client.fetchOne('12345', {
    envelope: true
}, { uid: true });  // Note: options in third parameter
```

### Fetch Specific Sequence Number

```js title="Fetch one message by sequence number"
let message = await client.fetchOne('1', {
    envelope: true
});
```

## Fetching Multiple Messages

### Using Async Iteration with fetch()

The `fetch()` method returns an async iterator for streaming message processing:

```js title="Iterate over messages"
let lock = await client.getMailboxLock('INBOX');
try {
    for await (let message of client.fetch('1:*', { envelope: true })) {
        console.log(`${message.uid}: ${message.envelope.subject}`);
    }
} finally {
    lock.release();
}
```

The next message is only processed after your loop body finishes, so slow processing slows down the fetch instead of piling messages up in memory. Breaking out of the loop early is safe, ImapFlow discards the remaining responses.

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

Work that does not talk to the server, such as parsing the message source or writing to a database, is fine inside the loop.

**Incorrect - Will Deadlock:**
```js title="Deadlock"
// DO NOT DO THIS - IT WILL DEADLOCK!
for await (let message of client.fetch('1:*', { envelope: true })) {
    // This will hang forever!
    await client.messageFlagsAdd(message.uid, ['\\Seen'], { uid: true });
}
```

**Correct - Collect First, Then Process:**
```js title="Collect first, then run commands"
// Option 1: Use fetchAll() instead
let messages = await client.fetchAll('1:*', { envelope: true });
for (let message of messages) {
    await client.messageFlagsAdd(message.uid, ['\\Seen'], { uid: true });
}

// Option 2: Collect UIDs first, then process
// (to only mark unread messages as read, messageFlagsAdd({ seen: false }, ['\\Seen']) needs no fetch)
let uidsToMark = [];
for await (let message of client.fetch('1:*', { flags: true })) {
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

```js title="fetchAll()"
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

Sequence numbers run from 1 to `client.mailbox.exists`, so the newest messages are at the end:

```js title="Fetch the last 10 messages"
let total = client.mailbox.exists;
if (total > 0) {
    let range = `${Math.max(1, total - 9)}:*`;
    for await (let message of client.fetch(range, { envelope: true })) {
        console.log(message.envelope.subject);
    }
}
```

### Fetch Specific Range

```js title="Fetch a sequence range"
// Fetch messages 1 through 100
for await (let message of client.fetch('1:100', { envelope: true })) {
    console.log(message.envelope.subject);
}
```

### Fetch by UIDs

```js title="Fetch by UID range or list"
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

### Fetch by Search Query

Pass a search object as the range to fetch the matching messages in one call:

```js title="Fetch unseen messages"
for await (let message of client.fetch({ seen: false }, { envelope: true })) {
    console.log(`UID ${message.uid}: ${message.envelope.subject}`);
}
```

### Fetch with CONDSTORE (changedSince)

If the server supports the [CONDSTORE extension (RFC 7162)](https://www.rfc-editor.org/rfc/rfc7162.html), you can fetch only messages modified since a specific modseq value:

```js title="Fetch changed messages"
let lock = await client.getMailboxLock('INBOX');
try {
    // Only fetch messages with modseq > 12345
    for await (let message of client.fetch('1:*', { flags: true }, {
        uid: true,
        changedSince: 12345n
    })) {
        console.log(`Changed: ${message.uid}, modseq: ${message.modseq}`);
    }
} finally {
    lock.release();
}
```

ImapFlow enables CONDSTORE automatically when the server supports it, and then includes `modseq` in every fetched message. Store `client.mailbox.highestModseq` after a sync and use it as `changedSince` next time. If CONDSTORE is not available (or the mailbox reports `NOMODSEQ`), `changedSince` is ignored and every message in the range is returned.

With the `qresync: true` client option on a server that supports QRESYNC, a UID fetch with `changedSince` also asks for `VANISHED`, and messages deleted since that modseq are reported as `expunge` events with `vanished: true`.

### Binary Fetch (Server-Side Decoding)

If the server supports the [BINARY extension (RFC 3516)](https://www.rfc-editor.org/rfc/rfc3516.html) or runs in [IMAP4rev2 (RFC 9051)](https://www.rfc-editor.org/rfc/rfc9051.html) mode, you can pass `binary: true` in the fetch options. Numeric body parts and the full source are then requested via `FETCH BINARY`, so the server removes the content-transfer-encoding (e.g. base64) before sending the data:

```js title="Binary fetch"
let message = await client.fetchOne('*', { bodyParts: ['1'] }, { binary: true });

// binaryParts lists which entries of bodyParts arrived already decoded
if (message.binaryParts?.has('1')) {
    console.log('Part 1 is already decoded by the server');
}
```

Parts listed in `message.binaryParts` must not be decoded again. If the server does not support binary fetching (or the `disableBinary` client option is set), ImapFlow falls back to a regular `BODY` fetch and `binaryParts` is not set for those parts. Sections such as `HEADER` and `TEXT` are always fetched with `BODY`.

## Downloading Message Parts

### Basic Download

`download()` streams a body part with the transfer encoding (base64, quoted-printable) removed. Text parts (`text/plain`, `text/html` that are not attachments) are also converted to UTF-8, and `format=flowed` text is unwrapped.

```js title="Download a body part"
// Download part '2' of the newest message as a stream
let { meta, content } = await client.download('*', '2');

if (!content) {
    console.log('Message or part not found');
} else {
    console.log('Content-Type:', meta.contentType);
    console.log('Filename:', meta.filename);

    // content is a Node.js Readable stream
    const chunks = [];
    for await (const chunk of content) {
        chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);
}
```

`download()` resolves with an empty object (no `meta`, no `content`) when no mailbox is selected or the message was not found, so check `content` before using it. The `meta` object can contain:

| Property | Description |
|----------|-------------|
| `expectedSize` | RFC822.SIZE of the whole message (not of the part), useful as an upper bound |
| `contentType` | Content-Type of the part, `'message/rfc822'` for a full message download |
| `charset` | Charset of a text part, `'utf-8'` once ImapFlow converted it |
| `disposition` | Content-Disposition, e.g. `'attachment'` or `'inline'` |
| `filename` | Decoded filename from Content-Disposition or the Content-Type `name` parameter |
| `encoding` | Transfer encoding of the part as stored on the server |
| `flowed`, `delSp` | Set for `format=flowed` text |

The filename comes from the message sender, so treat it as untrusted: it may contain path separators or control characters.

### Download Full Message

```js title="Download the full RFC822 message"
// Download entire RFC822 message (omit part parameter)
let { meta, content } = await client.download('*');

console.log('Content-Type:', meta.contentType); // 'message/rfc822'
```

The full message is streamed as raw bytes without any decoding, which makes it a good input for a MIME parser. See [Parsing Messages](#parsing-messages).

### Stream to File

```js title="Stream an attachment to a file"
const fs = require('fs');
const path = require('path');
const { pipeline } = require('stream/promises');

let { meta, content } = await client.download(messageUid, '2', { uid: true });

if (content) {
    // The filename is untrusted: strip directory parts (see safeFilename() in the
    // Parsing Messages examples for a stricter version)
    let filename = path.basename((meta.filename || 'attachment').replace(/\\/g, '/'));
    // pipeline() rejects when the download fails, a plain .pipe() would not report it
    await pipeline(content, fs.createWriteStream(path.join('./downloads', filename)));
}
```

### Download Options

```js title="download() options"
let { meta, content } = await client.download(messageUid, '2', {
    uid: true,              // messageUid is a UID, not a sequence number
    maxBytes: 1024 * 1024,  // stop after the first 1MB of decoded content
    chunkSize: 64 * 1024,   // bytes requested per FETCH (default 65536)
    binary: true            // let the server decode the part if it supports BINARY
});
```

`download()` fetches the content in chunks of `chunkSize` bytes while you read the stream, so large attachments are never held in memory as a whole. With `maxBytes` the stream simply ends after that many bytes.

### Download Multiple Parts

```js title="Download several parts at once"
// Download multiple parts at once (returns Buffers, not streams)
let parts = await client.downloadMany(messageUid, ['1', '2', '3'], { uid: true });

for (let [partId, data] of Object.entries(parts)) {
    console.log(`Part ${partId}:`);
    console.log('  Content-Type:', data.meta.contentType);
    console.log('  Filename:', data.meta.filename);
    console.log('  Size:', data.content?.length);
}
```

`downloadMany()` fetches all parts in a single command and resolves with an object keyed by part number, each entry holding `meta` and `content` (a Buffer). The content has its transfer encoding removed, but unlike `download()` text is not converted to UTF-8, so check `meta.charset`. It accepts the `uid`, `maxBytes` (applied to each part) and `binary` options. Because every part is loaded into memory, use `download()` for large attachments.

## Finding Attachments

### Get Attachment Information

```js title="List attachments from the body structure"
let message = await client.fetchOne('*', { bodyStructure: true });

// node.type holds the full Content-Type, like "text/plain" or "multipart/mixed"
function findAttachments(node) {
    let attachments = [];
    let topType = (node.type || '').split('/')[0];

    let isAttachment =
        node.disposition === 'attachment' ||
        (node.type && topType !== 'text' && topType !== 'multipart' && !node.disposition);

    if (isAttachment) {
        attachments.push({
            part: node.part || '1',
            type: node.type,
            encoding: node.encoding,
            size: node.size,
            filename: node.dispositionParameters?.filename ||
                     node.parameters?.name ||
                     'attachment'
        });
    }

    if (node.childNodes) {
        for (let child of node.childNodes) {
            attachments.push(...findAttachments(child));
        }
    }

    return attachments;
}

let attachments = findAttachments(message.bodyStructure);
console.log('Attachments:', attachments);
```

The `part` values can be passed straight to `download()` or `downloadMany()`. `size` is the encoded size, so a base64 attachment is about a third smaller once decoded.

## Parsing Messages

ImapFlow returns the message source as raw bytes. To get decoded headers, addresses, the text and HTML body and the attachments, run the source through a MIME parser such as [postal-mime](https://github.com/postalsys/postal-mime): `await PostalMime.parse(message.source)`. The [Parsing Messages examples](../examples/parsing-messages.md) cover parsing fetched and downloaded messages, saving attachments safely and more.

## Search and Fetch

Combine search with fetch to retrieve specific messages:

```js title="Search, then fetch"
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

```js title="Gmail raw search"
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
5. **Limit ranges** - Fetch the last N messages with a computed range instead of `1:*`
6. **Use CONDSTORE** - Use `changedSince` to fetch only changed messages
7. **Batch flag updates** - Update flags for multiple UIDs at once
8. **Check the size first** - Fetch `size` before fetching `source` if very large messages should be skipped

## Response Properties

Every fetched message includes `seq` and `uid`. The other properties are present when requested and reported by the server:

| Property | Type | Description |
|----------|------|-------------|
| `seq` | Number | Sequence number (always present) |
| `uid` | Number | Unique identifier (always present) |
| `id` | String | Account-unique message ID: `emailId` when available, otherwise a hash of the mailbox path, UIDVALIDITY and UID |
| `modseq` | BigInt | Modification sequence (when CONDSTORE is enabled) |
| `emailId` | String | Unique email ID (OBJECTID or Gmail, always requested when available) |
| `threadId` | String | Thread ID (OBJECTID or Gmail, when `threadId` is requested) |
| `flags` | Set | Message flags |
| `flagColor` | String | Flag color derived from flags (only for flagged messages) |
| `labels` | Set | Gmail labels (Gmail only) |
| `envelope` | Object | Parsed envelope data |
| `bodyStructure` | Object | MIME structure |
| `internalDate` | Date | Internal date (the raw string if it could not be parsed) |
| `size` | Number | Message size in bytes |
| `source` | Buffer | Raw message source |
| `headers` | Buffer | Raw header lines |
| `bodyParts` | Map | Requested body parts, keyed by lowercase section name |
| `binaryParts` | Set | Part identifiers from `bodyParts` that arrived via FETCH BINARY, already decoded by the server |

## Next Steps

- Learn about [Basic Usage](./basic-usage.md)
- Explore [Mailbox Management](./mailbox-management.md)
- See [Fetching Examples](../examples/fetching-messages.md)
- See [Parsing Examples](../examples/parsing-messages.md)
