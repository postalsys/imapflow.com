---
sidebar_position: 2
---

# Parsing Messages Examples

ImapFlow fetches messages as raw RFC 822 source (`source: true` or `download()`). To read the decoded subject, addresses, text and HTML body and the attachments, pass that source to a MIME parser. These examples use [postal-mime](https://github.com/postalsys/postal-mime), a dependency-free parser from the same authors as ImapFlow.

```bash
npm install postal-mime
```

`PostalMime.parse(input, options)` resolves with the parsed email. The input can be a string, a Buffer (or any other `ArrayBufferView`), an `ArrayBuffer`, a `Blob` or a web `ReadableStream`. A Node.js `Readable`, like the `content` stream from `download()`, is not accepted directly, see [Parse a Downloaded Message](#parse-a-downloaded-message). The full list of options and result fields is in the [postal-mime documentation](https://postal-mime.postalsys.com/).

:::warning Parsed content is untrusted
postal-mime decodes the message but does not sanitize it. `html` is the sender's own markup, so run it through a sanitizer such as DOMPurify, or render it in a sandboxed iframe without `allow-scripts`, before showing it in a browser. `text` must be escaped before it is inserted into HTML, and attachment filenames can contain path separators and control characters.
:::

## Parse the Latest Message

Fetch the source with `fetchOne()` and parse it:

```js title="Fetch and parse the newest message"
const { ImapFlow } = require('imapflow');
const PostalMime = require('postal-mime'); // or: import PostalMime from 'postal-mime';

const client = new ImapFlow({
    host: 'imap.example.com',
    port: 993,
    secure: true,
    auth: {
        user: 'user@example.com',
        pass: 'password'
    },
    logger: false
});

async function main() {
    await client.connect();

    let lock = await client.getMailboxLock('INBOX');
    try {
        let message = await client.fetchOne('*', { uid: true, source: true });
        if (!message) {
            console.log('No messages in mailbox');
            return;
        }

        const email = await PostalMime.parse(message.source);

        console.log('UID:', message.uid);
        console.log('Subject:', email.subject);
        console.log('From:', email.from?.name, email.from?.address);
        console.log('Date:', email.date); // ISO 8601 string
        console.log('Message-ID:', email.messageId);
        console.log('Text:', email.text?.slice(0, 200));
        console.log('Attachments:', email.attachments.map(a => a.filename));
    } finally {
        lock.release();
        await client.logout();
    }
}

main().catch(console.error);
```

The remaining examples show only the part that differs. They assume a connected `client`, an acquired mailbox lock and, where `message` is used, a message fetched with `source: true` as above.

The most used properties of the parsed email:

| Property | Description |
|----------|-------------|
| `from`, `sender` | A single address object |
| `to`, `cc`, `bcc`, `replyTo` | Arrays of address objects |
| `subject` | Decoded subject |
| `messageId`, `inReplyTo`, `references` | Header values as strings |
| `date` | Send date as an ISO 8601 string, or the raw header value if it could not be parsed |
| `text`, `html` | Plain text and HTML bodies, with line endings normalized to LF |
| `attachments` | Array of attachment objects, see [Save Attachments to Disk](#save-attachments-to-disk) |
| `headers` | Array of `{ key, originalKey, value }` for every header, in order. `key` is lowercase |

If the message has only an HTML part, postal-mime generates `text` from it, and the other way around.

## Parse Messages While Iterating

Parsing does not send any IMAP commands, so it is safe to do inside a `fetch()` loop. The next message is only processed after the loop body finishes, which keeps memory use flat:

```js title="Parse the last 10 messages"
let total = client.mailbox.exists;
if (total > 0) {
    let range = `${Math.max(1, total - 9)}:*`;

    for await (let message of client.fetch(range, { uid: true, source: true })) {
        // OK: parsing is local work, not an IMAP command
        const email = await PostalMime.parse(message.source);
        console.log(`${message.uid}: ${email.subject} (${email.attachments.length} attachments)`);
    }
}
```

Do not call other client methods (flag updates, moves, more fetches) inside the loop, that deadlocks. Collect the UIDs and run those commands after the loop.

## Parse a Downloaded Message

`download()` without a part number streams the full message as raw bytes. It reads the message from the server in chunks, which is gentler on servers that limit response sizes. Collect the stream into a Buffer with `node:stream/consumers` and parse that:

```js title="Parse a download() stream"
const { buffer } = require('node:stream/consumers');

let { content } = await client.download(uid, undefined, { uid: true });
if (content) {
    const email = await PostalMime.parse(await buffer(content));
    console.log('Subject:', email.subject);
}
```

Passing `Readable.toWeb(content)` from `node:stream` works too. Either way the whole message ends up in memory, because postal-mime reads its input to the end before parsing.

## Save Attachments to Disk

Attachment content is an `ArrayBuffer` by default, which `Buffer.from()` turns into something `fs` can write. The filename comes from the sender, so strip directory parts and control characters before using it as a path:

```js title="Save every attachment of a message"
const fs = require('node:fs');
const path = require('node:path');

// Returns a filename that is safe to use inside a target directory
function safeFilename(filename, fallback) {
    let name = path
        .basename(String(filename || '').replace(/\\/g, '/'))
        // control characters and bidirectional overrides
        .replace(/[\u0000-\u001f\u007f‎‏‪-‮⁦-⁩]/g, '')
        // no hidden files, no "." or ".."
        .replace(/^\.+/, '')
        .trim()
        .slice(0, 200);
    return name || fallback;
}

const email = await PostalMime.parse(message.source);
const outputDir = './attachments';

await fs.promises.mkdir(outputDir, { recursive: true });

for (let [i, attachment] of email.attachments.entries()) {
    // The index prefix keeps two attachments with the same name apart
    let filename = `${i + 1}-${safeFilename(attachment.filename, 'attachment.bin')}`;
    let filePath = path.join(outputDir, filename);

    await fs.promises.writeFile(filePath, Buffer.from(attachment.content));
    console.log(`Saved ${attachment.mimeType} to ${filePath}`);
}
```

Each attachment object has these properties:

| Property | Description |
|----------|-------------|
| `filename` | Decoded filename, or `null` if the part did not name one |
| `mimeType` | Content-Type in lowercase, e.g. `'application/pdf'` |
| `disposition` | `'attachment'`, `'inline'` or `null` if there was no Content-Disposition header |
| `related` | `true` for parts of a `multipart/related` tree with a Content-ID, such as images embedded in the HTML |
| `contentId` | Content-ID with angle brackets, e.g. `'<logo@example.com>'` |
| `content` | The decoded bytes as an `ArrayBuffer` (a `Uint8Array` for calendar parts), or a string with `attachmentEncoding` set |
| `encoding` | `'base64'` or `'utf8'` when `content` is a string |

Inline images are included in `attachments`. Filter on `related` or `disposition` if you only want files the sender attached.

## Attachments as Base64

With `attachmentEncoding: 'base64'` the attachment content is a base64 string, which is handy when the result goes into JSON, a database or an API response. Use `'utf8'` for text attachments you want as a string.

```js title="Attachments for a JSON API"
const email = await PostalMime.parse(message.source, {
    attachmentEncoding: 'base64'
});

let attachments = email.attachments.map(attachment => ({
    filename: attachment.filename,
    mimeType: attachment.mimeType,
    contentId: attachment.contentId || null,
    inline: !!attachment.related,
    content: attachment.content // base64 string
}));

console.log(JSON.stringify(attachments, null, 2));
```

## Display HTML with Inline Images

HTML that references inline images uses `cid:` URLs. To display it, replace them with data URLs built from the matching attachments, then sanitize the result as described above:

```js title="Resolve cid: images in the HTML"
const email = await PostalMime.parse(message.source, { attachmentEncoding: 'base64' });

let html = email.html || '';
for (let attachment of email.attachments) {
    if (attachment.contentId) {
        let cid = attachment.contentId.replace(/^<|>$/g, '');
        html = html.split(`cid:${cid}`).join(`data:${attachment.mimeType};base64,${attachment.content}`);
    }
}
```

## Handling Address Groups

An address is either a mailbox `{ name, address }` or, for RFC 5322 group syntax like `Team: alice@example.com, bob@example.com;`, a group `{ name, group: [...] }` without an `address`. Check for `group` before reading `address`:

```js title="Flatten address lists"
// Returns a flat list of { name, address } objects
function flattenAddresses(list) {
    let result = [];
    for (let entry of [].concat(list || [])) {
        if (entry.group) {
            result.push(...entry.group);
        } else {
            result.push(entry);
        }
    }
    return result;
}

const email = await PostalMime.parse(message.source);

// "Team: alice@example.com, bob@example.com;, carol@example.com" becomes
// [{ name: '', address: 'alice@example.com' }, { ..., 'bob@example.com' }, { ..., 'carol@example.com' }]
let recipients = flattenAddresses([...(email.to || []), ...(email.cc || [])]);
console.log(recipients.map(r => r.address));

// from is a single object, not an array
let sender = flattenAddresses(email.from)[0];
```

An empty group such as `undisclosed-recipients:;` has an empty `group` array and adds nothing to the flattened list. The IMAP `envelope` represents the same group differently, as an entry with the group name and an empty `address`.

## Skip Large Messages

postal-mime keeps the whole message in memory while parsing it. When you process mail you do not control, let the server filter by size so oversized messages are never downloaded:

```js title="Parse only unread messages up to 10MB"
const MAX_SIZE = 10 * 1024 * 1024;

// SMALLER matches messages strictly below the given size
for await (let message of client.fetch({ seen: false, smaller: MAX_SIZE + 1 }, { uid: true, source: true })) {
    const email = await PostalMime.parse(message.source);
    console.log(`${message.uid}: ${email.subject}`);
}
```

For large messages you can still read the structure with `bodyStructure: true` and stream individual parts with `download()`, see [Finding Attachments](../guides/fetching-messages.md#finding-attachments).

postal-mime also has its own limits against hostile MIME structures (nesting depth, header size, part count). A message that exceeds one of them makes `PostalMime.parse()` reject, so catch the error if a single bad message should not stop a batch.

## Forwarded Messages

By default a `message/rfc822` part that is inline or has no Content-Disposition header is parsed inline, so its headers and text become part of `text` and `html`. Set `forceRfc822Attachments: true` to get every forwarded message as an attachment instead, and parse its content again:

```js title="Parse forwarded messages separately"
const email = await PostalMime.parse(message.source, { forceRfc822Attachments: true });

for (let attachment of email.attachments) {
    if (attachment.mimeType === 'message/rfc822') {
        const forwarded = await PostalMime.parse(attachment.content);
        console.log('Forwarded:', forwarded.subject, 'from', forwarded.from?.address);
    }
}
```

## See Also

- [Fetching Messages Guide](../guides/fetching-messages.md)
- [Fetching Messages Examples](./fetching-messages.md)
- [postal-mime documentation](https://postal-mime.postalsys.com/)
