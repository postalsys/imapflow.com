---
sidebar_position: 1
---

# ImapFlow Client API

Complete API reference for the ImapFlow client class.

## Constructor

### new ImapFlow(options)

Creates a new IMAP client instance.

**Parameters:**

- `options` (Object) - Configuration options
  - `host` (String) - IMAP server hostname (required)
  - `port` (Number) - Port number (default: 993 for secure, 110 for plain - note: standard IMAP plain port is 143)
  - `secure` (Boolean) - Use TLS connection (default: false)
  - `servername` (String) - Servername for SNI (for IP addresses or custom names)
  - `auth` (Object) - Authentication credentials
    - `user` (String) - Username
    - `pass` (String) - Password
    - `accessToken` (String) - OAuth2 access token (alternative to pass)
    - `loginMethod` (String) - Optional override: 'LOGIN', 'AUTH=LOGIN', or 'AUTH=PLAIN'
    - `authzid` (String) - Authorization identity for SASL PLAIN (admin impersonation)
  - `logger` (Object|Boolean) - Logger instance or false to disable
  - `tls` (Object) - Additional TLS options
  - `proxy` (String) - Proxy URL (socks://, socks4://, socks5://, http://)
  - `clientInfo` (Object) - Client identification for ID extension
  - `disableAutoIdle` (Boolean) - Disable automatic IDLE mode
  - `disableCompression` (Boolean) - Disable COMPRESS=DEFLATE
  - `disableBinary` (Boolean) - Disable BINARY extension
  - `disableAutoEnable` (Boolean) - Do not auto-enable extensions
  - `qresync` (Boolean) - Enable QRESYNC support
  - `maxIdleTime` (Number) - Restart IDLE after this many ms
  - `missingIdleCommand` (String) - Command if IDLE unsupported: 'NOOP', 'SELECT', or 'STATUS'
  - `connectionTimeout` (Number) - Connection timeout in ms (default: 90000)
  - `greetingTimeout` (Number) - Greeting timeout in ms (default: 16000)
  - `socketTimeout` (Number) - Socket inactivity timeout in ms (default: 300000)
  - `emitLogs` (Boolean) - Emit log events instead of logging
  - `logRaw` (Boolean) - Log raw socket data in base64
  - `verifyOnly` (Boolean) - Connect and disconnect immediately
  - `includeMailboxes` (Boolean) - With verifyOnly, also list mailboxes
  - `expungeHandler` (Function) - Custom EXPUNGE event handler
  - `id` (String) - Custom instance ID for logs

**Returns:** ImapFlow instance

**Example:**

```js
const client = new ImapFlow({
    host: 'imap.example.com',
    port: 993,
    secure: true,
    auth: {
        user: 'user@example.com',
        pass: 'password'
    }
});
```

## Connection Methods

### connect()

Establishes connection to the IMAP server and authenticates.

**Returns:** Promise&lt;void&gt;

**Example:**

```js
await client.connect();
console.log('Connected and authenticated');
```

### logout()

Closes the connection to the IMAP server gracefully using LOGOUT command.

**Returns:** Promise&lt;void&gt;

**Example:**

```js
await client.logout();
```

### close()

Closes the connection immediately without sending LOGOUT.

**Returns:** void

**Example:**

```js
client.close();
```

### closeAfter()

Closes the TCP connection immediately without blocking. Uses `setImmediate()` to schedule socket destruction, which allows any pending operations to complete first.

**Returns:** void

**Example:**

```js
// Non-blocking close
client.closeAfter();
```

### noop()

Sends NOOP command to keep connection alive.

**Returns:** Promise&lt;void&gt;

**Example:**

```js
await client.noop();
```

### idle()

Enters IDLE mode to wait for server notifications. Automatically called when `disableAutoIdle` is false.

**Returns:** Promise&lt;boolean&gt;

**Example:**

```js
// Manually enter IDLE
await client.idle();
```

### upgradeToSTARTTLS()

Upgrades the current connection to TLS using STARTTLS. This is typically called automatically when `secure: false` and the server supports STARTTLS.

**Returns:** Promise&lt;Boolean&gt; - Returns `true` if upgrade succeeded, `false` if already using TLS or STARTTLS not supported.

**Example:**

```js
// Manual STARTTLS upgrade (usually not needed)
const upgraded = await client.upgradeToSTARTTLS();
if (upgraded) {
    console.log('Connection upgraded to TLS');
}
```

## Mailbox Methods

### getMailboxLock(path, options)

Selects a mailbox and acquires a lock for safe operations. Recommended over `mailboxOpen()` for transactional safety.

**Parameters:**

- `path` (String|Array) - Mailbox path (e.g., 'INBOX', ['INBOX', 'Subfolder'])
- `options` (Object) - Optional settings
  - `readOnly` (Boolean) - Open in read-only mode
  - `description` (String) - Description for debugging/logging

**Returns:** Promise&lt;MailboxLockObject&gt;

- `path` (String) - Opened mailbox path
- `release()` - Function to release the lock

**Example:**

```js
let lock = await client.getMailboxLock('INBOX');
try {
    // Perform operations safely
    console.log('Messages:', client.mailbox.exists);
} finally {
    lock.release();
}
```

### mailboxOpen(path, options)

Opens a mailbox directly without locking. Use `getMailboxLock()` for safer operations.

**Parameters:**

- `path` (String|Array) - Mailbox path
- `options` (Object) - Optional settings
  - `readOnly` (Boolean) - Open in read-only mode

**Returns:** Promise&lt;MailboxObject&gt;

### mailboxClose()

Closes the currently open mailbox.

**Returns:** Promise&lt;Boolean&gt;

### list(options)

Lists available mailboxes.

**Parameters:**

- `options` (Object) - Optional settings
  - `statusQuery` (Object) - Request status for each mailbox
    - `messages` (Boolean) - Include message count
    - `recent` (Boolean) - Include recent count
    - `uidNext` (Boolean) - Include next UID
    - `uidValidity` (Boolean) - Include UIDVALIDITY
    - `unseen` (Boolean) - Include unseen count
    - `highestModseq` (Boolean) - Include highest modseq
  - `specialUseHints` (Object) - Hints for special-use folders
    - `sent` (String) - Path to Sent folder
    - `trash` (String) - Path to Trash folder
    - `junk` (String) - Path to Junk folder
    - `drafts` (String) - Path to Drafts folder

**Returns:** Promise&lt;Array&lt;ListResponse&gt;&gt;

**Example:**

```js
let mailboxes = await client.list();
for (let mailbox of mailboxes) {
    console.log(mailbox.path, mailbox.specialUse || '');
}

// With status query
let mailboxes = await client.list({
    statusQuery: { messages: true, unseen: true }
});
```

### listTree(options)

Gets mailboxes organized as a tree structure.

**Parameters:**

- `options` (Object) - Same as list()

**Returns:** Promise&lt;ListTreeResponse&gt;

**Example:**

```js
let tree = await client.listTree();

function printTree(node, indent = '') {
    if (node.path) {
        console.log(indent + node.name);
    }
    if (node.folders) {
        for (let folder of node.folders) {
            printTree(folder, indent + '  ');
        }
    }
}
printTree(tree);
```

### mailboxCreate(path)

Creates a new mailbox.

**Parameters:**

- `path` (String|Array) - Path for the new mailbox

**Returns:** Promise&lt;MailboxCreateResponse&gt;

- `path` (String) - Full mailbox path
- `mailboxId` (String) - Unique ID (if OBJECTID extension)
- `created` (Boolean) - True if created, false if already existed

**Example:**

```js
let result = await client.mailboxCreate('Projects/2024');
console.log('Created:', result.created);
```

### mailboxRename(oldPath, newPath)

Renames a mailbox.

**Parameters:**

- `oldPath` (String|Array) - Current mailbox path
- `newPath` (String|Array) - New mailbox path

**Returns:** Promise&lt;MailboxRenameResponse&gt;

**Example:**

```js
await client.mailboxRename('Old', 'New');
```

### mailboxDelete(path)

Deletes a mailbox and all its messages.

**Parameters:**

- `path` (String|Array) - Mailbox path to delete

**Returns:** Promise&lt;MailboxDeleteResponse&gt;

**Example:**

```js
await client.mailboxDelete('Temporary');
```

### mailboxSubscribe(path)

Subscribes to a mailbox.

**Parameters:**

- `path` (String|Array) - Mailbox path

**Returns:** Promise&lt;Boolean&gt;

### mailboxUnsubscribe(path)

Unsubscribes from a mailbox.

**Parameters:**

- `path` (String|Array) - Mailbox path

**Returns:** Promise&lt;Boolean&gt;

### status(path, query)

Gets mailbox status without selecting it.

**Parameters:**

- `path` (String|Array) - Mailbox path
- `query` (Object) - Status items to fetch
  - `messages` (Boolean) - Total message count
  - `recent` (Boolean) - Recent message count
  - `uidNext` (Boolean) - Next UID value
  - `uidValidity` (Boolean) - UIDVALIDITY value
  - `unseen` (Boolean) - Unseen message count
  - `highestModseq` (Boolean) - Highest modseq value

**Returns:** Promise&lt;StatusObject&gt;

**Example:**

```js
let status = await client.status('INBOX', {
    messages: true,
    unseen: true,
    highestModseq: true
});
console.log(`${status.unseen}/${status.messages} unseen`);
```

### getQuota(path)

Gets quota information for a mailbox.

**Parameters:**

- `path` (String|Array) - Mailbox path

**Returns:** Promise&lt;QuotaResponse|Boolean&gt;

**Example:**

```js
let quota = await client.getQuota('INBOX');
if (quota && quota.storage) {
    console.log(`Used: ${quota.storage.used}/${quota.storage.limit} bytes`);
}
```

## Message Fetch Methods

### fetch(range, query, options)

Fetches messages from the currently selected mailbox. Returns an async iterator.

:::danger Warning
Do not run any other IMAP commands inside the fetch loop. This will cause a deadlock. Use `fetchAll()` if you need to process messages after fetching.
:::

**Parameters:**

- `range` (String|Array|SearchObject) - Message range or search query
  - String: '1:10', '1:*', '*:-10'
  - Array: [1, 2, 3, 10]
  - SearchObject: `{ seen: false }`
- `query` (FetchQueryObject) - Fetch query options
  - `uid` (Boolean) - Include UID
  - `flags` (Boolean) - Include flags
  - `envelope` (Boolean) - Include envelope
  - `bodyStructure` (Boolean) - Include MIME structure
  - `internalDate` (Boolean) - Include internal date
  - `size` (Boolean) - Include message size
  - `source` (Boolean|Object) - Include message source
  - `headers` (Boolean|Array) - Include headers
  - `bodyParts` (Array) - Include specific body parts
  - `threadId` (Boolean) - Include thread ID
  - `labels` (Boolean) - Include Gmail labels
  - `fast` (Boolean) - Macro: flags, internalDate, size
  - `all` (Boolean) - Macro: fast + envelope
  - `full` (Boolean) - Macro: all + bodyStructure
- `options` (Object) - Additional options
  - `uid` (Boolean) - Range contains UIDs
  - `changedSince` (BigInt) - Only messages with higher modseq
  - `binary` (Boolean) - Request binary response

**Returns:** AsyncGenerator&lt;FetchMessageObject&gt;

**Example:**

```js
for await (let message of client.fetch('1:*', {
    envelope: true,
    flags: true
})) {
    console.log(message.uid, message.envelope.subject);
}
```

### fetchAll(range, query, options)

Fetches all messages and returns an array. Safer for processing but uses more memory.

**Parameters:** Same as fetch()

**Returns:** Promise&lt;Array&lt;FetchMessageObject&gt;&gt;

**Example:**

```js
let messages = await client.fetchAll('1:100', { envelope: true });
for (let message of messages) {
    await client.messageFlagsAdd(message.uid, ['\\Seen'], { uid: true });
}
```

### fetchOne(seq, query, options)

Fetches a single message.

**Parameters:**

- `seq` (String|Number) - Sequence number or UID, or '*' for latest
- `query` (FetchQueryObject) - Fetch query options
- `options` (Object) - Additional options
  - `uid` (Boolean) - seq is a UID
  - `binary` (Boolean) - Request binary response

**Returns:** Promise&lt;FetchMessageObject|Boolean&gt;

**Example:**

```js
let message = await client.fetchOne('*', {
    envelope: true,
    source: true
});
if (message) {
    console.log(message.envelope.subject);
}
```

### download(range, part, options)

Downloads a message or specific body part as a stream.

**Parameters:**

- `range` (String|Number) - Message sequence number or UID
- `part` (String) - Body part identifier (optional, omit for full message)
- `options` (Object) - Download options
  - `uid` (Boolean) - Range is a UID
  - `maxBytes` (Number) - Maximum bytes to download
  - `chunkSize` (Number) - Chunk size (default: 65536)

**Returns:** Promise&lt;DownloadObject&gt;

- `meta` (Object) - Content metadata
  - `expectedSize` (Number) - Expected size
  - `contentType` (String) - Content-Type
  - `charset` (String) - Character set
  - `disposition` (String) - Content-Disposition
  - `filename` (String) - Filename
  - `encoding` (String) - Transfer encoding
- `content` (ReadableStream) - Streamed content

**Example:**

```js
let { meta, content } = await client.download(12345, '2', { uid: true });
console.log('Downloading:', meta.filename);

const fs = require('fs');
content.pipe(fs.createWriteStream(meta.filename));
```

### downloadMany(range, parts, options)

Downloads multiple body parts as Buffers.

**Parameters:**

- `range` (String|Number) - Message sequence number or UID
- `parts` (Array) - Array of part identifiers
- `options` (Object) - Download options
  - `uid` (Boolean) - Range is a UID

**Returns:** Promise&lt;Object&gt; - Object with part IDs as keys

**Example:**

```js
let parts = await client.downloadMany(12345, ['1', '2', '3'], { uid: true });
for (let [id, data] of Object.entries(parts)) {
    console.log(`Part ${id}:`, data.meta.contentType);
}
```

## Search Methods

### search(query, options)

Searches for messages in the currently selected mailbox.

**Parameters:**

- `query` (SearchObject) - Search criteria
  - `seq` (String) - Sequence range
  - `uid` (String) - UID range
  - `answered` (Boolean) - Has \Answered flag
  - `deleted` (Boolean) - Has \Deleted flag
  - `draft` (Boolean) - Has \Draft flag
  - `flagged` (Boolean) - Has \Flagged flag
  - `seen` (Boolean) - Has \Seen flag
  - `all` (Boolean) - All messages
  - `new` (Boolean) - Recent but unseen
  - `old` (Boolean) - Not recent
  - `recent` (Boolean) - Has \Recent flag
  - `from` (String) - From address contains
  - `to` (String) - To address contains
  - `cc` (String) - Cc address contains
  - `bcc` (String) - Bcc address contains
  - `subject` (String) - Subject contains
  - `body` (String) - Body contains
  - `larger` (Number) - Size larger than bytes
  - `smaller` (Number) - Size smaller than bytes
  - `before` (Date|String) - Internal date before
  - `on` (Date|String) - Internal date on
  - `since` (Date|String) - Internal date since
  - `sentBefore` (Date|String) - Sent date before
  - `sentOn` (Date|String) - Sent date on
  - `sentSince` (Date|String) - Sent date since
  - `keyword` (String) - Has custom keyword
  - `unKeyword` (String) - Does not have keyword
  - `header` (Object) - Header field matches
  - `modseq` (BigInt) - Modified since modseq
  - `emailId` (String) - Email ID (OBJECTID extension)
  - `threadId` (String) - Thread ID (OBJECTID extension)
  - `or` (Array) - OR of search criteria
  - `not` (SearchObject) - Negation
  - `gmraw` (String) - Gmail raw search query
  - `gmailraw` (String) - Alias for gmraw
- `options` (Object) - Search options
  - `uid` (Boolean) - Return UIDs instead of sequence numbers

**Returns:** Promise&lt;Array&lt;Number&gt;&gt;

**Example:**

```js
// Simple search
let uids = await client.search({ seen: false }, { uid: true });

// Complex search
let uids = await client.search({
    or: [
        { from: 'alice@example.com' },
        { from: 'bob@example.com' }
    ],
    since: new Date('2024-01-01'),
    larger: 10000
}, { uid: true });

// Gmail raw search
let uids = await client.search({
    gmraw: 'has:attachment larger:5M'
}, { uid: true });
```

## Message Manipulation Methods

### messageDelete(range, options)

Deletes messages by marking them as deleted and expunging.

**Parameters:**

- `range` (String|Array|SearchObject) - Message range or search
- `options` (Object) - Options
  - `uid` (Boolean) - Range contains UIDs

**Returns:** Promise&lt;Boolean&gt;

**Example:**

```js
await client.messageDelete('1:10', { uid: true });
```

### messageCopy(range, destination, options)

Copies messages to another mailbox.

**Parameters:**

- `range` (String|Array|SearchObject) - Message range or search
- `destination` (String|Array) - Destination mailbox path
- `options` (Object) - Options
  - `uid` (Boolean) - Range contains UIDs

**Returns:** Promise&lt;CopyResponseObject&gt;

- `path` (String) - Destination path
- `uidValidity` (BigInt) - Destination UIDVALIDITY
- `uidMap` (Map) - Mapping of source UIDs to destination UIDs

**Example:**

```js
let result = await client.messageCopy('1:10', 'Archive', { uid: true });
console.log('Copied to UIDs:', result.uidMap);
```

### messageMove(range, destination, options)

Moves messages to another mailbox.

**Parameters:**

- `range` (String|Array|SearchObject) - Message range or search
- `destination` (String|Array) - Destination mailbox path
- `options` (Object) - Options
  - `uid` (Boolean) - Range contains UIDs

**Returns:** Promise&lt;CopyResponseObject|Boolean&gt;

**Example:**

```js
await client.messageMove('1:10', 'Spam', { uid: true });
```

### messageFlagsAdd(range, flags, options)

Adds flags to messages.

**Parameters:**

- `range` (String|Array|SearchObject) - Message range or search
- `flags` (Array|Set) - Flags to add (e.g., ['\\Seen', '\\Flagged', 'custom'])
- `options` (Object) - Options
  - `uid` (Boolean) - Range contains UIDs
  - `unchangedSince` (BigInt) - Only if modseq not changed since

**Returns:** Promise&lt;Boolean&gt;

**Example:**

```js
await client.messageFlagsAdd([100, 200, 300], ['\\Seen'], { uid: true });
```

### messageFlagsRemove(range, flags, options)

Removes flags from messages.

**Parameters:**

- `range` (String|Array|SearchObject) - Message range or search
- `flags` (Array|Set) - Flags to remove
- `options` (Object) - Options
  - `uid` (Boolean) - Range contains UIDs
  - `unchangedSince` (BigInt) - Only if modseq not changed since

**Returns:** Promise&lt;Boolean&gt;

**Example:**

```js
await client.messageFlagsRemove('1:*', ['\\Seen'], { uid: true });
```

### messageFlagsSet(range, flags, options)

Sets exact flags for messages, replacing existing flags.

**Parameters:**

- `range` (String|Array|SearchObject) - Message range or search
- `flags` (Array|Set) - Flags to set
- `options` (Object) - Options
  - `uid` (Boolean) - Range contains UIDs
  - `unchangedSince` (BigInt) - Only if modseq not changed since

**Returns:** Promise&lt;Boolean&gt;

**Example:**

```js
await client.messageFlagsSet('12345', ['\\Seen', '\\Flagged'], { uid: true });
```

### setFlagColor(range, color, options)

Sets the flag color for messages using special color flags.

**Parameters:**

- `range` (String|Array|SearchObject) - Message range
- `color` (String) - Color name: 'red', 'orange', 'yellow', 'green', 'blue', 'purple', or falsy to remove
- `options` (Object) - Options
  - `uid` (Boolean) - Range contains UIDs

**Returns:** Promise&lt;Boolean&gt;

**Example:**

```js
await client.setFlagColor('12345', 'red', { uid: true });
```

## Gmail Label Methods

These methods only work with Gmail servers.

### messageLabelsAdd(range, labels, options)

Adds Gmail labels to messages.

**Parameters:**

- `range` (String|Array) - Message range
- `labels` (Array) - Labels to add
- `options` (Object) - Options
  - `uid` (Boolean) - Range contains UIDs

**Returns:** Promise&lt;Boolean&gt;

### messageLabelsRemove(range, labels, options)

Removes Gmail labels from messages.

**Parameters:**

- `range` (String|Array) - Message range
- `labels` (Array) - Labels to remove
- `options` (Object) - Options

**Returns:** Promise&lt;Boolean&gt;

### messageLabelsSet(range, labels, options)

Sets exact Gmail labels for messages.

**Parameters:**

- `range` (String|Array) - Message range
- `labels` (Array) - Labels to set
- `options` (Object) - Options

**Returns:** Promise&lt;Boolean&gt;

## Append Methods

### append(path, content, flags, idate)

Appends a message to a mailbox.

**Parameters:**

- `path` (String|Array) - Destination mailbox
- `content` (String|Buffer|Readable) - Message content (RFC822 format)
- `flags` (Array) - Optional flags
- `idate` (Date) - Optional internal date

**Returns:** Promise&lt;AppendResponseObject | false&gt;

- `path` (String) - Mailbox path
- `uid` (Number) - UID of appended message (if UIDPLUS extension)
- `uidValidity` (BigInt) - Mailbox UIDVALIDITY
- `seq` (Number) - Sequence number

**Example:**

```js
let message = `From: sender@example.com
To: recipient@example.com
Subject: Test Message
Date: ${new Date().toUTCString()}
MIME-Version: 1.0
Content-Type: text/plain; charset=utf-8

Hello, World!`;

let result = await client.append('INBOX', message, ['\\Seen']);
console.log('Appended as UID:', result.uid);
```

## Events

### Event: 'error'

Emitted when an error occurs.

```js
client.on('error', (err) => {
    console.error('IMAP error:', err.message);
    console.error('Code:', err.code);
});
```

### Event: 'close'

Emitted when connection is closed. ImapFlow does not auto-reconnect.

```js
client.on('close', () => {
    console.log('Connection closed');
    // Implement your own reconnection logic here
});
```

### Event: 'mailboxOpen'

Emitted when a mailbox is opened.

```js
client.on('mailboxOpen', (mailbox) => {
    console.log('Opened:', mailbox.path);
    console.log('Messages:', mailbox.exists);
    console.log('UIDVALIDITY:', mailbox.uidValidity);
});
```

### Event: 'mailboxClose'

Emitted when a mailbox is closed.

```js
client.on('mailboxClose', (mailbox) => {
    console.log('Closed:', mailbox.path);
});
```

### Event: 'exists'

Emitted when message count changes in the currently open mailbox.

```js
client.on('exists', (data) => {
    console.log('Path:', data.path);
    console.log('New count:', data.count);
    console.log('Previous count:', data.prevCount);
});
```

### Event: 'expunge'

Emitted when a message is deleted from the currently open mailbox.

```js
client.on('expunge', (data) => {
    console.log('Path:', data.path);
    console.log('Sequence:', data.seq);
    // If QRESYNC enabled:
    console.log('UID:', data.uid);
});
```

### Event: 'flags'

Emitted when message flags change in the currently open mailbox.

```js
client.on('flags', (data) => {
    console.log('Path:', data.path);
    console.log('Sequence:', data.seq);
    console.log('UID:', data.uid);
    console.log('Flags:', data.flags);
    console.log('Modseq:', data.modseq);
});
```

### Event: 'response'

Emitted when a tagged response is received from the server.

```js
client.on('response', (response) => {
    console.log('Response:', response.response);
    if (response.code) {
        console.log('Code:', response.code);
    }
});
```

### Event: 'log'

Emitted when `emitLogs: true`. Contains log entries.

```js
client.on('log', (entry) => {
    console.log(`[${entry.level}] ${entry.msg}`);
});
```

## Properties

### mailbox

Currently selected mailbox information.

**Type:** MailboxObject | null

```js
let lock = await client.getMailboxLock('INBOX');
try {
    console.log('Path:', client.mailbox.path);
    console.log('Messages:', client.mailbox.exists);
    console.log('UIDVALIDITY:', client.mailbox.uidValidity);
    console.log('Next UID:', client.mailbox.uidNext);
    console.log('Flags:', client.mailbox.flags);
    console.log('Permanent Flags:', client.mailbox.permanentFlags);
    console.log('Highest Modseq:', client.mailbox.highestModseq);
    console.log('Read-only:', client.mailbox.readOnly);
} finally {
    lock.release();
}
```

### authenticated

The authenticated username, or `false` if not authenticated.

**Type:** string | boolean

### secureConnection

Whether the connection is currently encrypted.

**Type:** Boolean

### usable

Whether the connection is usable (connected and authenticated).

**Type:** Boolean

### capabilities

Set of server capabilities.

**Type:** Map&lt;string, boolean | number&gt;

### enabled

Set of enabled IMAP extensions.

**Type:** Set&lt;String&gt;

### serverInfo

Server identification (from ID extension).

**Type:** Object | null

### id

Connection instance ID.

**Type:** String

### idling

Whether currently in IDLE mode.

**Type:** Boolean

## Type Definitions

For detailed TypeScript type definitions, see the included `lib/imap-flow.d.ts` file in the package.

### FetchMessageObject

| Property | Type | Description |
|----------|------|-------------|
| seq | Number | Sequence number |
| uid | Number | Unique identifier |
| modseq | BigInt | Modification sequence |
| emailId | String | Email ID (OBJECTID) |
| threadId | String | Thread ID |
| labels | Set | Gmail labels |
| size | Number | Message size |
| flags | Set | Message flags |
| flagColor | String | Flag color |
| envelope | Object | Envelope data |
| bodyStructure | Object | MIME structure |
| internalDate | Date | Internal date |
| source | Buffer | Raw message |
| headers | Buffer | Raw headers |
| bodyParts | Map | Body parts |

### MailboxObject

| Property | Type | Description |
|----------|------|-------------|
| path | String | Mailbox path |
| delimiter | String | Path delimiter |
| flags | Set | Mailbox flags |
| specialUse | String | Special-use flag |
| permanentFlags | Set | Allowed flags |
| mailboxId | String | Mailbox ID (OBJECTID) |
| highestModseq | BigInt | Highest modseq |
| uidValidity | BigInt | UIDVALIDITY |
| uidNext | Number | Next UID |
| exists | Number | Message count |
| readOnly | Boolean | Read-only mode |

## See Also

- [Configuration Guide](../guides/configuration.md)
- [Basic Usage](../guides/basic-usage.md)
- [Fetching Messages](../guides/fetching-messages.md)
- [Examples](../examples/fetching-messages.md)
