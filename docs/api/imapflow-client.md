---
sidebar_position: 1
---

# ImapFlow Client API

<div style={{textAlign: 'center'}}>
  <img src="/img/cleaning.png" alt="ImapFlow API reference" width="200" />
</div>

Complete API reference for the ImapFlow client class.

## Constructor

### new ImapFlow(options)

Creates a new IMAP client instance.

**Parameters:**

- `options` (ImapFlowOptions) - Configuration options
  - `host` (String) - IMAP server hostname (defaults to `localhost`)
  - `port` (Number) - Port number (defaults to 993 if `secure: true`, otherwise 143)
  - `secure` (Boolean) - If `true`, establishes the connection directly over TLS. If `false` (default), uses plain TCP and may upgrade via STARTTLS unless `doSTARTTLS: false` is set. Setting `port: 993` without `secure` implies `secure: true`.
  - `doSTARTTLS` (Boolean) - STARTTLS ([RFC 2595](https://www.rfc-editor.org/rfc/rfc2595.html)) policy for a connection not opened with `secure: true`. `true` requires the upgrade (connecting fails if the server does not offer STARTTLS), `false` keeps the connection in cleartext. If not set, the connection upgrades when the server offers STARTTLS and otherwise continues in cleartext with a warning logged. Setting both `doSTARTTLS: true` and `secure: true` is rejected as a misconfiguration.
  - `servername` (String) - Servername for SNI (for IP addresses or custom names)
  - `auth` (Object) - Authentication credentials
    - `user` (String) - Username
    - `pass` (String) - Password
    - `accessToken` (String) - OAuth2 access token (alternative to pass)
    - `loginMethod` (String) - Optional override: 'LOGIN', 'AUTH=LOGIN', or 'AUTH=PLAIN'
    - `authzid` (String) - Authorization identity for SASL PLAIN (admin impersonation)
  - `logger` (Object|Boolean) - Logger object with `debug`, `info`, `warn` and `error` methods (`trace` and `fatal` are used when present), for example a pino or bunyan instance. Set to `false` to disable logging, omit to use the built-in pino logger
  - `tls` (Object) - Additional TLS options passed to Node.js `tls.connect()`
  - `proxy` (String) - Proxy URL. Supports HTTP CONNECT (`http:`, `https:`) and SOCKS (`socks:`, `socks4:`, `socks4a:`, `socks5:`) proxies. IPv6 proxy endpoints use URL form, e.g. `socks5://[2001:db8::1]:1080`
  - `transport` (Object) - Opens the connection through this transport instead of Node.js `net` and `tls`, see [Transport Functions](#transport-functions) and [Custom Transport](../guides/configuration.md#custom-transport). Can not be combined with `proxy`
  - `clientInfo` (Object) - Client identification sent with the ID command ([RFC 2971](https://www.rfc-editor.org/rfc/rfc2971.html)): `name`, `version`, `os`, `vendor`, `support-url`, `date` and any other field
  - `disableAutoIdle` (Boolean) - Do not start IDLE ([RFC 2177](https://www.rfc-editor.org/rfc/rfc2177.html)) automatically when the connection is inactive
  - `autoIdleDelay` (Number|String) - How long in ms the connection has to be inactive before IDLE starts automatically (default: 15000). Capped below `socketTimeout`. Use `disableAutoIdle` to turn auto-IDLE off rather than a very large delay
  - `disableCompression` (Boolean) - Do not use COMPRESS=DEFLATE ([RFC 4978](https://www.rfc-editor.org/rfc/rfc4978.html)) even if the server supports it
  - `disableBinary` (Boolean) - Ignore the BINARY extension ([RFC 3516](https://www.rfc-editor.org/rfc/rfc3516.html)) for FETCH and APPEND
  - `disableAutoEnable` (Boolean) - Do not ENABLE ([RFC 5161](https://www.rfc-editor.org/rfc/rfc5161.html)) supported extensions automatically
  - `disableIMAP4rev2` (Boolean) - Do not enable IMAP4rev2 ([RFC 9051](https://www.rfc-editor.org/rfc/rfc9051.html)) mode even if the server advertises it, and do not treat the advertisement as support for anything IMAP4rev2 implies
  - `qresync` (Boolean) - Use QRESYNC ([RFC 7162](https://www.rfc-editor.org/rfc/rfc7162.html)) instead of CONDSTORE. EXPUNGE notifications then include the UID
  - `maxIdleTime` (Number) - If set, break and restart IDLE every `maxIdleTime` ms
  - `missingIdleCommand` (String) - Command to run if IDLE is not supported: `'NOOP'` (default), `'SELECT'` or `'STATUS'`
  - `connectionTimeout` (Number) - Time budget in ms for a usable transport, covering DNS, proxy negotiation and the TCP/TLS handshake (default: 90000). Expiry rejects with code `CONNECT_TIMEOUT`
  - `greetingTimeout` (Number) - How long in ms to wait for the server greeting (default: 16000)
  - `socketTimeout` (Number) - Socket inactivity timeout in ms (default: 300000)
  - `maxLineLength` (Number) - Maximum length in bytes of a single response line (default: 1 GB, `Infinity` disables). Exceeding it fails the connection with code `LineTooLarge`
  - `maxLiteralSize` (Number) - Maximum size in bytes of a single IMAP literal (default: 1 GB, `Infinity` disables). Exceeding it fails the connection with code `LiteralTooLarge`
  - `maxResponseSize` (Number) - Maximum total size in bytes of one assembled response (default: 2 GB, `Infinity` disables). Keep it above `maxLiteralSize`. Exceeding it fails the connection with code `ResponseTooLarge`
  - `maxLockHoldTime` (Number|Boolean) - Log a warning when a mailbox lock has been held longer than this many ms, to catch forgotten `release()` calls (default: 30 minutes). Set to `0` or `false` to disable
  - `idHashAlgorithm` (String) - Hash algorithm for the fallback message `id` derived from the mailbox path, UIDVALIDITY and UID when the server provides no email ID (default: `'md5'`). Hosts running OpenSSL in FIPS mode need another one, e.g. `'sha256'`
  - `emitLogs` (Boolean) - Also emit every log entry as a `log` event
  - `logRaw` (Boolean) - Log data read from and written to the socket, encoded in base64. Client frames carrying credentials are replaced with a placeholder
  - `verifyOnly` (Boolean) - Log out automatically after successful authentication
  - `includeMailboxes` (Boolean) - With `verifyOnly`, also list mailboxes
  - `expungeHandler` (Function) - Called with the expunge payload for every expunged message instead of emitting the `expunge` event. May return a Promise
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

Establishes connection to the IMAP server and authenticates. Rejects if connecting or authenticating fails. An instance can only connect once, calling `connect()` again rejects with code `InstanceReused`, so create a new `ImapFlow` object to reconnect.

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

Schedules `close()` to run via `setImmediate()`, returning immediately so the caller can complete its current synchronous flow before the socket is torn down. Useful inside error handlers where calling `close()` directly would interfere with the rest of the function.

**Returns:** void

**Example:**

```js
// Non-blocking close
client.closeAfter();
```

### stats(reset)

Returns byte counters for the current connection.

**Parameters:**

- `reset` (Boolean) - If `true`, the counters are reset to zero after reading.

**Returns:** `{ sent: number, received: number }`

**Example:**

```js
let { sent, received } = client.stats();
console.log(`Sent ${sent} bytes, received ${received} bytes`);
```

### unbind()

Detaches the underlying sockets from the IMAP pipeline and returns the read and write sockets. After calling this, ImapFlow no longer interacts with the connection.

Call it while the connection is not idling. An IDLE in progress is not broken first, so the server still expects `DONE`.

**Returns:** `{ readSocket, writeSocket, socket }` - `readSocket` is the read stream (the inflated stream if compression is active), `writeSocket` the write stream, and `socket` the raw underlying socket (a `net.Socket` or `tls.TLSSocket` on Node.js, or the stream a custom transport returned; TypeScript types it as a `Duplex` stream)

### noop()

Sends NOOP command to keep connection alive.

**Returns:** Promise&lt;void&gt;

**Example:**

```js
await client.noop();
```

### idle()

Enters IDLE mode ([RFC 2177](https://www.rfc-editor.org/rfc/rfc2177.html)) to wait for server notifications about the currently opened mailbox. Only needed when `disableAutoIdle` is `true`, otherwise IDLE starts automatically on inactivity. A manual `idle()` call does not resolve until IDLE is finished, which happens when some other command is issued.

**Returns:** Promise&lt;boolean|undefined&gt; - `false` if IDLE failed, `undefined` otherwise

**Example:**

```js
// Manually enter IDLE
await client.idle();
```

### upgradeToSTARTTLS()

Upgrades the current connection to TLS using STARTTLS. This is typically called automatically when `secure: false` and the server supports STARTTLS.

**Returns:** Promise&lt;Boolean&gt; - `true` if the connection is now protected by TLS (direct TLS or STARTTLS), `false` otherwise. Rejects if STARTTLS is required (`doSTARTTLS: true`) but not possible.

**Example:**

```js
// Manual STARTTLS upgrade (usually not needed)
const upgraded = await client.upgradeToSTARTTLS();
if (upgraded) {
    console.log('Connection is protected by TLS');
}
```

## Mailbox Methods

### getMailboxLock(path, options)

Opens a mailbox if it is not already open and acquires a lock. The next `getMailboxLock()` call is queued until the previous lock is released. Recommended over `mailboxOpen()` for transactional safety.

**Parameters:**

- `path` (String|Array) - Mailbox path (e.g., 'INBOX', ['INBOX', 'Subfolder'])
- `options` (Object) - Optional settings
  - `readOnly` (Boolean) - Open in read-only mode
  - `description` (String) - Description for debugging/logging
  - `acquireTimeout` (Number) - How long in ms to wait for the lock. If it is not granted in time, the promise rejects with an error whose `code` is `LockTimeout`. Defaults to no timeout
  - `maxLockHoldTime` (Number|Boolean) - Per-lock override of the constructor option of the same name. `0` or `false` disables the long-hold warning for this lock
  - `changedSince` (BigInt|Number|String) - QRESYNC, see `mailboxOpen()`. Only applied when the lock actually selects the mailbox, not when it is already open
  - `uidValidity` (BigInt|Number|String) - QRESYNC, see `mailboxOpen()`

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
  - `readOnly` (Boolean) - Open in read-only mode (uses IMAP `EXAMINE` instead of `SELECT`)
  - `description` (String) - Optional description used in lock-tracking trace logs
  - `changedSince` (BigInt|Number|String) - HIGHESTMODSEQ from an earlier session. With `uidValidity` and QRESYNC ([RFC 7162](https://www.rfc-editor.org/rfc/rfc7162.html)) enabled (`qresync: true`), changes since then are reported as `flags` and `expunge` events
  - `uidValidity` (BigInt|Number|String) - UIDVALIDITY known from the previous session, required with `changedSince`

**Returns:** Promise&lt;[MailboxObject](#mailboxobject)&gt;. Rejects if the mailbox does not exist or can not be opened.

### mailboxClose()

Closes the currently open mailbox.

**Returns:** Promise&lt;Boolean&gt; - Whether the operation succeeded

### list(options)

Lists available mailboxes.

**Parameters:**

- `options` (Object) - Optional settings
  - `statusQuery` (Object) - Request status for each mailbox
    - `messages` (Boolean) - Include message count
    - `recent` (Boolean) - Include recent count (always 0 on IMAP4rev2 sessions)
    - `uidNext` (Boolean) - Include next UID
    - `uidValidity` (Boolean) - Include UIDVALIDITY
    - `unseen` (Boolean) - Include unseen count
    - `highestModseq` (Boolean) - Include highest modseq
    - `size` (Boolean) - Include total mailbox size in octets (requires STATUS=SIZE or IMAP4rev2)
    - `deleted` (Boolean) - Include count of messages with the \Deleted flag (requires IMAP4rev2)
  - `specialUseHints` (Object) - Hints for special-use folders
    - `sent` (String) - Path to Sent folder
    - `trash` (String) - Path to Trash folder
    - `junk` (String) - Path to Junk folder
    - `drafts` (String) - Path to Drafts folder
    - `archive` (String) - Path to Archive folder
  - `listOnly` (Boolean) - Only run LIST, without LSUB, subscription lookups or status queries

**Returns:** Promise&lt;Array&lt;[ListResponse](#listresponse)&gt;&gt;

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

The root node has `root: true` and only a `folders` array. Other nodes carry `path`, `name`, `delimiter`, `flags`, `specialUse`, `listed`, `subscribed`, `disabled` (`true` if the mailbox can not be selected) and `folders`. If `statusQuery` was used, each node also carries a `status` property with the corresponding StatusObject.

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

Creates a new mailbox and subscribes to it. Rejects if the mailbox can not be created.

**Parameters:**

- `path` (String|Array) - Path for the new mailbox. Unicode is allowed. An array is joined with the server's delimiter, and the namespace prefix is added automatically if required

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

Renames a mailbox. Rejects if the mailbox does not exist or can not be renamed.

**Parameters:**

- `path` (String|Array) - Current mailbox path
- `newPath` (String|Array) - New mailbox path

**Returns:** Promise&lt;MailboxRenameResponse&gt;

- `path` (String) - Full path of the renamed mailbox
- `newPath` (String) - New full mailbox path

**Example:**

```js
await client.mailboxRename('Old', 'New');
```

### mailboxDelete(path)

Deletes a mailbox and all its messages. Rejects if the mailbox does not exist or can not be deleted.

**Parameters:**

- `path` (String|Array) - Mailbox path to delete

**Returns:** Promise&lt;MailboxDeleteResponse&gt;

- `path` (String) - Full path of the deleted mailbox

**Example:**

```js
await client.mailboxDelete('Temporary');
```

### mailboxSubscribe(path)

Subscribes to a mailbox.

**Parameters:**

- `path` (String|Array) - Mailbox path

**Returns:** Promise&lt;Boolean&gt; - `true` if the operation succeeded

### mailboxUnsubscribe(path)

Unsubscribes from a mailbox.

**Parameters:**

- `path` (String|Array) - Mailbox path

**Returns:** Promise&lt;Boolean&gt; - `true` if the operation succeeded

### status(path, query)

Gets mailbox status without selecting it. Only the requested values are returned.

**Parameters:**

- `path` (String|Array) - Mailbox path (e.g., 'INBOX', ['INBOX', 'Subfolder'])
- `query` (Object) - Status items to fetch
  - `messages` (Boolean) - Total message count
  - `recent` (Boolean) - Recent message count (always 0 on IMAP4rev2 sessions - the \Recent flag was removed in [RFC 9051](https://www.rfc-editor.org/rfc/rfc9051.html))
  - `uidNext` (Boolean) - Next UID value
  - `uidValidity` (Boolean) - UIDVALIDITY value
  - `unseen` (Boolean) - Unseen message count
  - `highestModseq` (Boolean) - Highest modseq value
  - `size` (Boolean) - Total mailbox size in octets (requires [STATUS=SIZE (RFC 8438)](https://www.rfc-editor.org/rfc/rfc8438.html) or IMAP4rev2)
  - `deleted` (Boolean) - Count of messages with the \Deleted flag (requires IMAP4rev2)

**Returns:** Promise&lt;StatusObject|false&gt; - an object with `path` plus the requested values, or `false` if the server rejected the request

**Example:**

```js
let status = await client.status('INBOX', {
    messages: true,
    unseen: true,
    highestModseq: true,
    size: true
});
console.log(`${status.unseen}/${status.messages} unseen`);
if (typeof status.size === 'number') {
    console.log(`Mailbox size: ${status.size} bytes`);
}
```

### getQuota(path)

Gets quota information ([RFC 9208](https://www.rfc-editor.org/rfc/rfc9208.html)) for a mailbox. Defaults to `INBOX` if no path is provided.

**Parameters:**

- `path` (String|Array) - Optional mailbox path (defaults to `'INBOX'`), e.g. 'INBOX' or ['INBOX', 'Subfolder']

**Returns:** Promise&lt;[QuotaResponse](#quotaresponse)|false&gt; - `false` if the server does not support the QUOTA extension or the path does not exist

**Example:**

```js
let quota = await client.getQuota('INBOX');
if (quota && quota.storage) {
    console.log(`Used: ${quota.storage.usage}/${quota.storage.limit} bytes (${quota.storage.status})`);
}
```

## Message Fetch Methods

### fetch(range, query, options)

Fetches messages from the currently selected mailbox. Returns an async iterator.

:::danger Warning
Do not run any other IMAP commands inside the fetch loop. This will cause a deadlock. Use `fetchAll()` if you need to process messages after fetching.
:::

**Parameters:**

- `range` (String|Number|Array|SearchObject) - Message range or search query
  - String: '1:10', '1:*', '1,5,10:20'
  - Array: [1, 2, 3, 10]
  - SearchObject: `{ seen: false }`
- `query` (FetchQueryObject) - Fetch query options
  - `uid` (Boolean) - Include UID
  - `flags` (Boolean) - Include flags
  - `envelope` (Boolean) - Include envelope
  - `bodyStructure` (Boolean) - Include MIME structure
  - `internalDate` (Boolean) - Include internal date
  - `size` (Boolean) - Include message size
  - `source` (Boolean|Object) - Include message source. Pass `{ start, maxLength }` to fetch only a byte range
  - `headers` (Boolean|Array) - Include all headers, or only the listed header keys
  - `bodyParts` (Array) - Include specific body parts. Each entry is a part identifier string or `{ key, start, maxLength }`
  - `threadId` (Boolean) - Include thread ID (requires OBJECTID ([RFC 8474](https://www.rfc-editor.org/rfc/rfc8474.html)) or `X-GM-EXT-1`)
  - `labels` (Boolean) - Include Gmail labels (requires `X-GM-EXT-1`)
  - `emailId` (Boolean) - Accepted but has no effect, the email ID is always requested when the server supports OBJECTID or `X-GM-EXT-1`
  - `fast` (Boolean) - Macro: flags, internalDate, size
  - `all` (Boolean) - Macro: fast + envelope
  - `full` (Boolean) - Macro: all + bodyStructure
- `options` (Object) - Additional options
  - `uid` (Boolean) - Range contains UIDs
  - `changedSince` (BigInt|Number) - Only messages with a higher modseq (CONDSTORE, [RFC 7162](https://www.rfc-editor.org/rfc/rfc7162.html))
  - `binary` (Boolean) - Request body parts via FETCH BINARY, so the server decodes the content-transfer-encoding (requires the [BINARY extension (RFC 3516)](https://www.rfc-editor.org/rfc/rfc3516.html) or IMAP4rev2). Parts that arrived decoded are listed in the `binaryParts` set of the response

**Returns:** AsyncGenerator&lt;[FetchMessageObject](#fetchmessageobject)&gt;

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

Fetches all messages before resolving and returns an array. Safe to run other commands while processing the result, but every message is kept in memory, so avoid large ranges like `1:*` on big mailboxes.

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

- `seq` (String|Number) - Sequence number or UID, or '*' for the last message in the mailbox
- `query` (FetchQueryObject) - Fetch query options
- `options` (Object) - Additional options
  - `uid` (Boolean) - seq is a UID (ignored for `'*'`)
  - `changedSince` (BigInt|Number) - Only return the message if its modseq is higher
  - `binary` (Boolean) - Request binary response

**Returns:** Promise&lt;FetchMessageObject|false|undefined&gt; - `false` if the message was not found, `undefined` if no mailbox is selected

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

Downloads a full RFC 822 message or a specific body part as a stream. Body parts are decoded, so the stream yields the binary file, and text content is converted to UTF-8.

**Parameters:**

- `range` (String|Number) - Message sequence number or UID, or '*' for the last message
- `part` (String) - Body part identifier (optional, omit for full message)
- `options` (Object) - Download options
  - `uid` (Boolean) - Range is a UID
  - `maxBytes` (Number) - Maximum bytes to download
  - `chunkSize` (Number) - Chunk size (default: 65536)
  - `binary` (Boolean) - Request the content with FETCH BINARY when the server supports it (BINARY or IMAP4rev2), so the server removes the transfer encoding

**Returns:** Promise&lt;DownloadObject&gt;. Resolves with an empty object (no `meta` or `content`) when no mailbox is selected or the message or part was not found, so check `content` before using it.

- `meta` (Object) - Content metadata
  - `expectedSize` (Number) - Size of the whole message (RFC822.SIZE), not of the requested part
  - `contentType` (String) - Content-Type
  - `charset` (String) - Character set
  - `disposition` (String|false) - Content-Disposition
  - `filename` (String) - Filename
  - `encoding` (String) - Transfer encoding
  - `flowed` (Boolean) - Content uses format=flowed
  - `delSp` (Boolean) - Flowed text uses delsp=yes
- `content` (Readable) - Streamed content

**Example:**

```js
const fs = require('fs');
const { pipeline } = require('stream/promises');

let { meta, content } = await client.download(12345, '2', { uid: true });
if (content) {
    console.log('Downloading:', meta.filename);
    // pipeline() rejects when the download fails, a plain .pipe() would not report it
    await pipeline(content, fs.createWriteStream(meta.filename || 'attachment.bin'));
}
```

### downloadMany(range, parts, options)

Downloads multiple body parts of one message as Buffers, in a single FETCH.

**Parameters:**

- `range` (String|Number) - Message sequence number or UID
- `parts` (Array) - Array of part identifiers
- `options` (Object) - Download options
  - `uid` (Boolean) - Range is a UID
  - `maxBytes` (Number) - Maximum bytes to download per part
  - `binary` (Boolean) - Request the parts with FETCH BINARY when the server supports it

**Returns:** Promise&lt;Object&gt; - Object with part IDs as keys. Each value has `meta` (same fields as in `download()`) and `content` (Buffer, or `null` if the part had no content)

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
  - `seq` (String|Number) - Sequence range
  - `uid` (String|Number) - UID range
  - `answered` (Boolean) - Has (`true`) or does not have (`false`) the \Answered flag
  - `deleted` (Boolean) - Has or does not have the \Deleted flag
  - `draft` (Boolean) - Has or does not have the \Draft flag
  - `flagged` (Boolean) - Has or does not have the \Flagged flag
  - `seen` (Boolean) - Has or does not have the \Seen flag
  - `all` (Boolean) - All messages
  - `new` (Boolean) - Recent but unseen (not available on IMAP4rev2 sessions)
  - `old` (Boolean) - Not recent (not available on IMAP4rev2 sessions)
  - `recent` (Boolean) - Has \Recent flag (not available on IMAP4rev2 sessions)
  - `from` (String) - From address contains
  - `to` (String) - To address contains
  - `cc` (String) - Cc address contains
  - `bcc` (String) - Bcc address contains
  - `subject` (String) - Subject contains
  - `body` (String) - Body contains
  - `text` (String) - Headers or body contain
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
  - `header` (Object) - Header matches: `{ 'X-Mailer': 'Foo' }` for a partial value match, `true` to match messages that have the header
  - `modseq` (BigInt|Number) - Modseq higher than value (CONDSTORE)
  - `emailId` (String) - Email ID (OBJECTID or `X-GM-EXT-1`)
  - `threadId` (String) - Thread ID (OBJECTID or `X-GM-EXT-1`)
  - `or` (Array) - Array of 2 or more SearchObjects, at least one must match
  - `not` (SearchObject) - Negation
  - `gmraw` (String) - Gmail raw search query
  - `gmailraw` (String) - Alias for gmraw
  - `labels` (Object) - Gmail label filter, compiled into an `X-GM-RAW` query: `{ has: ['Work'], not: ['Spam'] }`. `has` matches messages carrying all listed labels, `not` excludes messages carrying any of them
- `options` (Object) - Search options
  - `uid` (Boolean) - Return UIDs instead of sequence numbers
  - `returnOptions` (Array) - Request ESEARCH ([RFC 4731](https://www.rfc-editor.org/rfc/rfc4731.html)) result. Each entry is one of `'MIN'`, `'MAX'`, `'COUNT'`, `'ALL'`, or `{ partial: '1:100' }` ([RFC 9394](https://www.rfc-editor.org/rfc/rfc9394.html)). When provided, returns an `ESearchResult` instead of a plain array (the client falls back to deriving `min`/`max`/`count`/`all` if the server lacks ESEARCH).

**Returns:** Promise&lt;Number[] | ESearchResult | false | undefined&gt; - `undefined` if no mailbox is selected

`ESearchResult` has the fields `count`, `min`, `max`, `all` (compact sequence-set string such as `"1,5:10,20"`), `partial` (`{ range, messages }`) and `modseq`, each present only when requested or reported.

:::note IMAP4rev2 and the \Recent flag
[IMAP4rev2 (RFC 9051)](https://www.rfc-editor.org/rfc/rfc9051.html) removed the `\Recent` flag together with the `NEW`, `OLD`, and `RECENT` search keys. When the session runs in IMAP4rev2 mode (which ImapFlow enables automatically on supporting servers), searching with `new`, `old`, or `recent` rejects with an error whose `code` is `MissingServerExtension`. Set `disableIMAP4rev2: true` in the constructor options if you need these keys against a server that still supports IMAP4rev1.
:::

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

// ESEARCH: get only the count and highest matching UID
let result = await client.search({ seen: false }, {
    uid: true,
    returnOptions: ['COUNT', 'MAX']
});
console.log(result.count, result.max);
```

## Message Manipulation Methods

### messageDelete(range, options)

Deletes messages by marking them as deleted and expunging. The result does not say which messages were deleted, listen to the `expunge` event for that.

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

**Returns:** Promise&lt;CopyResponseObject|false&gt;

- `path` (String) - Source mailbox path
- `destination` (String) - Destination mailbox path
- `uidValidity` (BigInt) - Destination UIDVALIDITY (if UIDPLUS, [RFC 4315](https://www.rfc-editor.org/rfc/rfc4315.html))
- `uidMap` (Map) - Mapping of source UIDs to destination UIDs (if UIDPLUS)

**Example:**

```js
let result = await client.messageCopy('1:10', 'Archive', { uid: true });
console.log('Copied to UIDs:', result.uidMap);
```

### messageMove(range, destination, options)

Moves messages to another mailbox. Uses MOVE ([RFC 6851](https://www.rfc-editor.org/rfc/rfc6851.html)) when available, otherwise falls back to COPY, flagging as \Deleted and EXPUNGE.

**Parameters:**

- `range` (String|Array|SearchObject) - Message range or search
- `destination` (String|Array) - Destination mailbox path
- `options` (Object) - Options
  - `uid` (Boolean) - Range contains UIDs

**Returns:** Promise&lt;CopyResponseObject|false&gt; - same shape as `messageCopy()`

**Example:**

```js
await client.messageMove('1:10', 'Spam', { uid: true });
```

### messageFlagsAdd(range, flags, options)

Adds flags to messages.

**Parameters:**

- `range` (String|Array|SearchObject) - Message range or search
- `flags` (String[]) - Flags to add (e.g., `['\\Seen', '\\Flagged', 'custom']`)
- `options` (Object) - Options
  - `uid` (Boolean) - Range contains UIDs
  - `unchangedSince` (BigInt|Number) - Only update messages whose modseq is lower or equal (CONDSTORE)
  - `useLabels` (Boolean) - If `true`, modify Gmail labels instead of flags (requires `X-GM-EXT-1`)
  - `silent` (Boolean) - If `true`, do not emit a `flags` event for this update

**Returns:** Promise&lt;Boolean&gt;

**Example:**

```js
await client.messageFlagsAdd([100, 200, 300], ['\\Seen'], { uid: true });
```

### messageFlagsRemove(range, flags, options)

Removes flags from messages.

**Parameters:**

- `range` (String|Array|SearchObject) - Message range or search
- `flags` (String[]) - Flags to remove
- `options` (Object) - Options
  - `uid` (Boolean) - Range contains UIDs
  - `unchangedSince` (BigInt|Number) - Only update messages whose modseq is lower or equal (CONDSTORE)
  - `useLabels` (Boolean) - If `true`, remove Gmail labels instead of flags
  - `silent` (Boolean) - If `true`, do not emit a `flags` event for this update

**Returns:** Promise&lt;Boolean&gt;

**Example:**

```js
await client.messageFlagsRemove('1:*', ['\\Seen'], { uid: true });
```

### messageFlagsSet(range, flags, options)

Sets exact flags for messages, replacing existing flags.

**Parameters:**

- `range` (String|Array|SearchObject) - Message range or search
- `flags` (String[]) - Flags to set. Flags the mailbox does not permit are ignored. An empty array clears every flag, but a non-empty array with nothing usable in it is refused rather than clearing the message
- `options` (Object) - Options
  - `uid` (Boolean) - Range contains UIDs
  - `unchangedSince` (BigInt|Number) - Only update messages whose modseq is lower or equal (CONDSTORE)
  - `useLabels` (Boolean) - If `true`, replace Gmail labels instead of flags
  - `silent` (Boolean) - If `true`, do not emit a `flags` event for this update

**Returns:** Promise&lt;Boolean&gt;

**Example:**

```js
await client.messageFlagsSet('12345', ['\\Seen', '\\Flagged'], { uid: true });
```

### setFlagColor(range, color, options)

Sets a colored flag on messages, using the `\Flagged` flag plus the `$MailFlagBit0` to `$MailFlagBit2` keywords that clients like Apple Mail read.

**Parameters:**

- `range` (String|Array|SearchObject) - Message range
- `color` (String) - Color name (case-insensitive): `'red'`, `'orange'`, `'yellow'`, `'green'`, `'blue'`, `'purple'`, `'grey'`, or a falsy value to remove the flag and color. An unknown name resolves to `false` without changes
- `options` (Object) - Options
  - `uid` (Boolean) - Range contains UIDs
  - `unchangedSince` (BigInt|Number) - Only update messages whose modseq is lower or equal (CONDSTORE)

**Returns:** Promise&lt;Boolean&gt;

**Example:**

```js
await client.setFlagColor('12345', 'red', { uid: true });
```

## Gmail Labels

Gmail labels are managed via the regular flag methods (`messageFlagsAdd`, `messageFlagsRemove`, `messageFlagsSet`) by passing `useLabels: true` in the options. There are no dedicated label methods. This requires the server to support the `X-GM-EXT-1` extension.

**Example:**

```js
// Add a Gmail label
await client.messageFlagsAdd('12345', ['MyLabel'], { uid: true, useLabels: true });

// Remove a Gmail label
await client.messageFlagsRemove('12345', ['OldLabel'], { uid: true, useLabels: true });

// Replace all labels for a message
await client.messageFlagsSet('12345', ['Inbox', 'Important'], { uid: true, useLabels: true });
```

## Append Methods

### append(path, content, flags, idate)

Appends a message to a mailbox.

**Parameters:**

- `path` (String|Array) - Destination mailbox
- `content` (String|Buffer|Uint8Array) - Message content (RFC 822 format)
- `flags` (Array) - Optional flags. Flags the destination does not accept are dropped with a warning logged
- `idate` (Date|String) - Optional internal date

**Returns:** Promise&lt;AppendResponseObject | false&gt;

- `destination` (String) - Full path of the mailbox the message was uploaded to
- `uid` (Number) - UID of appended message (if UIDPLUS extension)
- `uidValidity` (BigInt) - Mailbox UIDVALIDITY (if UIDPLUS extension)
- `seq` (Number) - Sequence number, if the destination is the currently selected mailbox

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

Emitted when an error occurs. In most cases an error event also means that the connection is closed and pending operations reject.

```js
client.on('error', (err) => {
    console.error('IMAP error:', err.message);
    console.error('Code:', err.code);
});
```

### Event: 'close'

Emitted when connection is closed. ImapFlow does not auto-reconnect, create a new client instance to connect again.

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

Emitted when a selected mailbox is closed, either explicitly (by `mailboxClose()` or by selecting a different mailbox) or because the connection went away while the mailbox was still selected. In the latter case it fires before the `close` event.

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

Emitted once for every message deleted from the currently open mailbox. Not emitted when the `expungeHandler` option is set, the handler receives the same payload instead.

```js
client.on('expunge', (data) => {
    console.log('Path:', data.path);
    console.log('Sequence:', data.seq);
    // If QRESYNC enabled or the server sent VANISHED:
    console.log('UID:', data.uid);
    console.log('Vanished:', data.vanished); // true for a VANISHED response
    console.log('Earlier:', data.earlier); // true for VANISHED (EARLIER)
});
```

### Event: 'flags'

Emitted when message flags change in the currently open mailbox. Not all servers report flag changes. The payload also has `flagColor` if the message is flagged with a color.

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

Emitted when a tagged response is received from the server. `response` is the status (`OK`, `NO` or `BAD`) and `code` the response code, if any.

```js
client.on('response', (response) => {
    console.log('Response:', response.response);
    if (response.code) {
        console.log('Code:', response.code);
    }
});
```

### Event: 'log'

Emitted when `emitLogs: true`. Each entry has `level`, `t` (timestamp), `cid` (connection ID), `lo` (log order number) and the logged fields such as `msg`.

```js
client.on('log', (entry) => {
    console.log(`[${entry.level}] ${entry.msg}`);
});
```

### Event: 'alert'

Emitted when the server sends a response with the ALERT response code ([RFC 9051 section 7.1](https://www.rfc-editor.org/rfc/rfc9051.html#section-7.1)), text meant to be shown to the user, such as a planned shutdown or an account problem. `response` is the status that carried it (`OK`, `NO`, `BAD`, `BYE` or `PREAUTH`) and `tag` the command tag, missing for untagged responses.

```js
client.on('alert', (alert) => {
    console.log(`Server alert (${alert.response}): ${alert.message}`);
});
```

## Automatic Cleanup

On runtimes that define `Symbol.asyncDispose` (Node.js 20.4 and newer), the client can be declared with `await using`. When the scope ends, the client logs out and closes the connection, even if the scope exits with a throw. Disposal never throws.

```js title="await using"
{
    await using client = new ImapFlow({ host: 'imap.example.com', port: 993, secure: true, auth });
    await client.connect();
    // ...
} // client.logout() runs here
```

## Properties

### mailbox

Currently selected mailbox information, or `false` if no mailbox is open.

**Type:** [MailboxObject](#mailboxobject) | false

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

`true` once the connection is authenticated (by LOGIN, AUTHENTICATE or a PREAUTH greeting), `false` before that. The user name is in `options.auth.user`.

**Type:** boolean

### secureConnection

Whether the connection is currently encrypted.

**Type:** Boolean

### usable

Whether the connection is usable (connected and authenticated).

**Type:** Boolean

### capabilities

Map of capabilities reported by the server. Keys are capability names, values are `true` for toggleable capabilities (e.g. `UIDPLUS`) or a number for capabilities with a value (e.g. `APPENDLIMIT`).

**Type:** Map&lt;string, boolean | number&gt;

### enabled

Set of IMAP extensions that have been activated for this connection (via the `ENABLE` command, [RFC 5161](https://www.rfc-editor.org/rfc/rfc5161.html)), usually `CONDSTORE` and `UTF8=ACCEPT` if the server supports them. The set contains `IMAP4REV2` when the session runs in IMAP4rev2 mode.

**Type:** Set&lt;string&gt;

### host

Hostname the client is connecting to.

**Type:** String

### port

Port number the client is connecting to.

**Type:** Number

### servername

Server name used for SNI, or `false` when connecting to an IP literal.

**Type:** String | false

### serverInfo

Server identification from the ID command ([RFC 2971](https://www.rfc-editor.org/rfc/rfc2971.html)). Available after a successful `connect()`, `null` if the server provided none.

**Type:** Object | null

### clientInfo

Client identification sent with the ID command.

**Type:** Object

### id

Connection instance ID, used in logs.

**Type:** String

### idling

Whether currently in IDLE mode.

**Type:** Boolean

### state

Current connection state, one of the values in `states`.

**Type:** Number

### states

Connection state constants: `NOT_AUTHENTICATED` (1), `AUTHENTICATED` (2), `SELECTED` (3) and `LOGOUT` (4).

**Type:** Object

```js
if (client.state === client.states.SELECTED) {
    console.log('A mailbox is selected');
}
```

### isClosed

`true` once `close()` has run.

**Type:** Boolean

### greeting

Human readable text of the server greeting.

**Type:** String | undefined

### byeReason

Reason text of the server's BYE response, if the server closed the session.

**Type:** String | undefined

### tls

Negotiated TLS session details (`name`, `standardName`, `version` from `tls.TLSSocket#getCipher()` plus `authorized`), or `false` for a cleartext connection.

**Type:** Object | false | undefined

### namespace

The personal namespace from the NAMESPACE command ([RFC 2342](https://www.rfc-editor.org/rfc/rfc2342.html)): `{ prefix, delimiter }`.

**Type:** Object | undefined

### namespaces

Every namespace the server reported, grouped as `personal`, `other` and `shared`. `other` and `shared` are `false` when the server reported none.

**Type:** Object | undefined

### options

The options the client was created with.

**Type:** ImapFlowOptions

### log

The connection logger. Every level (`trace`, `debug`, `info`, `warn`, `error`, `fatal`) is callable regardless of what the configured logger supports.

**Type:** Object

### ImapFlow.version

Static property with the ImapFlow module version.

**Type:** String

## Transport Functions

The package exports two functions that build a value for the `transport` option (ImapFlow 2.5.0 or newer). See [Custom Transport](../guides/configuration.md#custom-transport) for the details and for writing a transport by hand.

### createSocketsTransport(connect)

Builds a transport from the `connect()` function of the `cloudflare:sockets` API, for [celld](../getting-started/installation.md#celld) and Cloudflare Workers.

**Parameters:**

- `connect` (Function) - The `connect` export of `cloudflare:sockets`

**Returns:** A transport object. TLS options the runtime can not honor (`tls.rejectUnauthorized: false`, `tls.ca`, client certificates, a `servername` that differs from `host`) make `connect()` reject with the error code `UnsupportedTransportOption`.

```js title="celld or Workers"
import { connect } from 'cloudflare:sockets';
import { ImapFlow, createSocketsTransport } from 'imapflow';

const client = new ImapFlow({ host: 'imap.example.com', port: 993, secure: true, auth, transport: createSocketsTransport(connect) });
```

### createStreamsTransport(api)

Builds a transport over any socket API whose connection opens with a promise of a `ReadableStream` and a `WritableStream` of bytes.

**Parameters:**

- `api` (Object)
  - `open` (Function) - Called with `{ host, port, servername, tls, secure }`. Returns `{ opened, close }`, where `opened` resolves with `{ readable, writable }` once the connection (and the TLS handshake, for `secure`) is up, optionally with `remoteAddress`, `remotePort`, `localAddress`, `localPort` and `tls` (`{ authorized, name, version }`, reported as `client.tls`). May throw to refuse the connection
  - `upgrade` (Function) - Optional. Called with the connection and the TLS options after the server accepted STARTTLS, returns the TLS connection. Without it ImapFlow does not try STARTTLS

**Returns:** A transport object

## Type Definitions

The package ships TypeScript declarations for both the ES module and the CommonJS build, generated from the source. The option, result and event types are exported from the package root, so a program can import them directly. Only the documented methods and properties are visible to TypeScript, the internals of the client are stripped from the declarations.

```typescript title="Importing types"
import type { ImapFlowOptions, FetchMessageObject, MailboxObject, SearchObject, ImapFlowError } from 'imapflow';
import { AuthenticationFailure } from 'imapflow';
```

Errors the client rejects with are plain `Error` objects that carry extra properties describing the failure, typed as `ImapFlowError`: `code` (for example `NoConnection`, `ETIMEOUT` or `LockTimeout`), `responseStatus` (`NO` or `BAD`), `responseText`, `serverResponseCode` (for example `AUTHENTICATIONFAILED`), `command` and `path`. A failed login rejects with an `AuthenticationFailure` instance, an `Error` subclass with `authenticationFailed` set to `true` and the server's response text in `response`.

The package also exports `ImapFlowErrorCode`, an object of every `code` value the library sets, so codes can be matched without string literals. Parser failures use `ParserError` followed by a number and are not listed individually. Errors from the socket, TLS or DNS layer keep Node's own code (`ECONNREFUSED`, `ENOTFOUND` and so on).

```js title="Matching error codes"
const { ImapFlow, ImapFlowErrorCode } = require('imapflow');

try {
    await client.getMailboxLock('INBOX', { acquireTimeout: 5000 });
} catch (err) {
    if (err.code === ImapFlowErrorCode.LockTimeout) {
        console.log('Mailbox lock was not granted in time');
    }
}
```

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
| internalDate | Date\|String | Internal date |
| source | Buffer | Raw message |
| headers | Buffer | Raw headers |
| bodyParts | Map | Body parts, keyed by the requested part identifier |
| binaryParts | Set | Part identifiers from `bodyParts` that arrived via FETCH BINARY, i.e. with the content-transfer-encoding already decoded by the server |
| id | String | Account-unique ID for this email, the email ID or a hash of path, UIDVALIDITY and UID (see `idHashAlgorithm`) |

### MailboxObject

| Property | Type | Description |
|----------|------|-------------|
| path | String | Mailbox path |
| delimiter | String | Path delimiter |
| flags | Set | Mailbox flags |
| specialUse | String | Special-use flag |
| listed | Boolean | Mailbox was found in the LIST output |
| subscribed | Boolean | Mailbox is subscribed |
| permanentFlags | Set | Allowed flags. If missing or it includes `\*`, any flag can be used |
| mailboxId | String | Mailbox ID (OBJECTID) |
| highestModseq | BigInt | Highest modseq (CONDSTORE) |
| noModseq | Boolean | Server does not store mod-sequences for this mailbox |
| uidValidity | BigInt | UIDVALIDITY |
| uidNext | Number | Next UID |
| exists | Number | Message count |
| unseen | Number | Sequence number of the first unseen message, if the server reported `[UNSEEN]`. Not a count, use `status()` for that |
| appendlimit | Number | Largest message size the server accepts for APPEND into this mailbox ([RFC 7889](https://www.rfc-editor.org/rfc/rfc7889.html)) |
| readOnly | Boolean | Read-only mode |

### ListResponse

| Property | Type | Description |
|----------|------|-------------|
| path | String | Mailbox path (unicode) |
| pathAsListed | String | Mailbox path as listed in the LIST/LSUB response |
| name | String | Last part of the path |
| delimiter | String | Path delimiter |
| parent | String[] | Parent folder names |
| parentPath | String | Parent path as a string |
| flags | Set | Mailbox flags |
| specialUse | String | Special-use flag ([RFC 6154](https://www.rfc-editor.org/rfc/rfc6154.html)), if any |
| specialUseSource | String | How `specialUse` was determined: `user` (from `specialUseHints`), `extension` (reported by the server) or `name` (matched against known folder names) |
| listed | Boolean | Mailbox was found in the LIST output |
| subscribed | Boolean | Mailbox is subscribed. Servers that report no subscription state treat every mailbox as subscribed |
| status | StatusObject | Status values, if `statusQuery` was used |

### QuotaResponse

| Property | Type | Description |
|----------|------|-------------|
| path | String | Mailbox path the quota applies to |
| quotaRoot | String | Quota root the server reported for the mailbox, if any |
| storage | Object | The STORAGE resource, if the server reports one: `usage` and `limit` in bytes, `status` as the usage in percent of the limit, e.g. `"50%"` |
| message | Object | The MESSAGE resource, if the server reports one: `usage` and `limit` as message counts, `status` as above |

Any other resource the server reports is added under its lowercased name with the same `usage`, `limit` and `status` fields, for example `mailbox` for the MAILBOX resource of RFC 9208. `usage` or `limit` is left out when the server did not send a usable number for it, and `status` is only set once a limit above zero is known.

## See Also

- [Configuration Guide](../guides/configuration.md)
- [Basic Usage](../guides/basic-usage.md)
- [Fetching Messages](../guides/fetching-messages.md)
- [Examples](../examples/fetching-messages.md)
