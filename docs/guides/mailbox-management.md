---
sidebar_position: 5
---

# Mailbox Management

<div style={{textAlign: 'center'}}>
  <img src="/img/sorting.png" alt="Managing mailboxes" width="200" />
</div>

This guide covers how to work with mailboxes (folders) in ImapFlow.

## Listing Mailboxes

### List All Mailboxes

Get a flat list of all mailboxes:

```js
let mailboxes = await client.list();

for (let mailbox of mailboxes) {
    console.log('Path:', mailbox.path);              // full path, decoded to Unicode
    console.log('Name:', mailbox.name);              // last segment of the path
    console.log('Parent:', mailbox.parentPath);      // parent path ('' for top level)
    console.log('Delimiter:', mailbox.delimiter);
    console.log('Flags:', mailbox.flags);            // Set, e.g. \HasChildren, \Noselect
    console.log('Special use:', mailbox.specialUse); // e.g. '\Sent', or undefined
    console.log('Subscribed:', mailbox.subscribed);
    console.log('---');
}
```

Each entry also has `parent` (the parent path as an array of names), `pathAsListed` (the raw path from the server), `listed`, and `specialUseSource`, which tells how the special-use flag was determined: `'extension'` (reported by the server), `'name'` (guessed from a known folder name) or `'user'` (from `specialUseHints`). The list is sorted with special-use folders first (INBOX at the top).

### List Options

`list()` and `listTree()` accept the same options:

```js
let mailboxes = await client.list({
    // Request STATUS data for every selectable mailbox
    statusQuery: { messages: true, unseen: true },

    // Override special-use detection for specific paths
    specialUseHints: {
        sent: 'Sent Items',
        trash: 'Deleted Items',
        junk: 'Spam',
        drafts: 'Drafts',
        archive: 'Archive'
    }
});

for (let mailbox of mailboxes) {
    if (mailbox.status) {
        console.log(mailbox.path, mailbox.status.messages, mailbox.status.unseen);
    }
}
```

With `statusQuery`, ImapFlow uses [LIST-STATUS (RFC 5819)](https://www.rfc-editor.org/rfc/rfc5819.html) when the server supports it, so all counts arrive in a single command. Otherwise it runs a separate STATUS command for each mailbox. `\Noselect` mailboxes get no `status`, and if STATUS fails for a mailbox, its `status` contains an `error` property instead of counts.

Set `listOnly: true` to run only the LIST command, without looking up subscription state.

### Get Mailbox Tree

Get mailboxes organized as a tree structure. The returned object is a root node (`root: true`) whose `folders` array holds the top-level mailboxes, each of which can have its own `folders`:

```js
let tree = await client.listTree();

function printTree(node, depth = 0) {
    for (let folder of node.folders || []) {
        let note = folder.disabled ? ' (not selectable)' : '';
        console.log(`${'  '.repeat(depth)}${folder.name}${note}`);
        printTree(folder, depth + 1);
    }
}

printTree(tree);
```

Tree nodes have `name`, `path`, `delimiter`, `flags`, `specialUse`, `subscribed`, `listed` and `status` (when `statusQuery` was used). `disabled` is `true` for `\Noselect` mailboxes, which exist only as parents in the hierarchy. Note that `flags` is a `Set`, so `JSON.stringify()` prints it as an empty object.

### List Subscribed Mailboxes

`list()` reports the subscription state of every mailbox in the `subscribed` property, so filter on it:

```js
let mailboxes = await client.list();
let subscribedOnly = mailboxes.filter(m => m.subscribed);
```

The state comes from `LIST RETURN (SUBSCRIBED)` on servers with [LIST-EXTENDED (RFC 5258)](https://www.rfc-editor.org/rfc/rfc5258.html) or IMAP4rev2, and from LSUB otherwise. If the server reports no subscription state at all, every mailbox is treated as subscribed.

## Special Use Mailboxes

Special-use flags from [RFC 6154](https://www.rfc-editor.org/rfc/rfc6154.html) identify standard mailboxes. ImapFlow sets `specialUse` to one of `\All`, `\Archive`, `\Drafts`, `\Flagged`, `\Junk`, `\Sent` or `\Trash`, plus the non-standard `\Inbox` for INBOX. When the server does not support SPECIAL-USE (or Gmail's older XLIST), ImapFlow guesses the flag from well-known and localized folder names. Each flag is assigned to at most one mailbox:

```js
let mailboxes = await client.list();

for (let mailbox of mailboxes) {
    switch (mailbox.specialUse) {
        case '\\Inbox':
            console.log('Inbox:', mailbox.path);
            break;
        case '\\Sent':
            console.log('Sent:', mailbox.path);
            break;
        case '\\Drafts':
            console.log('Drafts:', mailbox.path);
            break;
        case '\\Trash':
            console.log('Trash:', mailbox.path);
            break;
        case '\\Junk':
            console.log('Spam:', mailbox.path);
            break;
        case '\\Archive':
            console.log('Archive:', mailbox.path);
            break;
    }
}
```

## Creating Mailboxes

### Create a New Mailbox

```js
let result = await client.mailboxCreate('Projects');
console.log('Path:', result.path);
console.log('Created:', result.created);     // false if the mailbox already existed
console.log('Mailbox ID:', result.mailboxId); // only with OBJECTID (RFC 8474)
```

`mailboxCreate()` subscribes to the new mailbox automatically. If the mailbox already exists (the server answers with the `ALREADYEXISTS` response code from [RFC 5530](https://www.rfc-editor.org/rfc/rfc5530.html)), it resolves with `created: false` instead of throwing. Any other failure throws.

Unicode names are allowed. ImapFlow encodes them as modified UTF-7 unless the server has `UTF8=ACCEPT` enabled.

### Create Nested Mailboxes

You can pass an array of path segments and ImapFlow joins them using the server's delimiter and applies any required namespace prefix:

```js
// Joined with the server's delimiter (e.g. "INBOX.Work.Projects.ImapFlow")
await client.mailboxCreate(['Work', 'Projects', 'ImapFlow']);
```

Whether intermediate parent folders are created automatically is server-specific. If your server requires explicit parents, create them in order before the leaf.

## Renaming Mailboxes

```js
let result = await client.mailboxRename('Old Name', 'New Name');
console.log('Renamed from:', result.path);
console.log('Renamed to:', result.newPath);
```

Both paths accept the array form and get the namespace prefix added when needed. If the mailbox being renamed is currently selected, ImapFlow deselects it first. A failed rename throws.

## Deleting Mailboxes

```js
let result = await client.mailboxDelete('Temporary');
console.log('Deleted:', result.path);
```

**Warning:** This will delete all messages in the mailbox!

If the mailbox is currently selected, ImapFlow deselects it first (with UNSELECT where available, so no messages are expunged as a side effect). A failed delete, for example because the mailbox does not exist, throws.

## Subscribing to Mailboxes

### Subscribe

```js
await client.mailboxSubscribe('Important');
```

### Unsubscribe

```js
await client.mailboxUnsubscribe('Old Projects');
```

Both methods resolve with `true` on success and `false` if the server rejected the command. They do not throw on a server rejection.

## Selecting Mailboxes

### Open with Lock

Always use `getMailboxLock()` to safely work with a mailbox:

```js
let lock = await client.getMailboxLock('INBOX');
try {
    console.log('Mailbox info:', client.mailbox);
    // Perform operations
} finally {
    lock.release();
}
```

`getMailboxLock()` opens the mailbox if it is not already open and queues the request until any earlier lock is released. It throws if the mailbox cannot be opened. When the mailbox does not exist, the error has `mailboxMissing: true`. See [Basic Usage](./basic-usage.md#mailbox-locks) for the lock options.

`mailboxOpen()` selects a mailbox without taking a lock and resolves with the mailbox object. It accepts the same `readOnly` option. Prefer `getMailboxLock()`, because with `mailboxOpen()` other code can switch the mailbox between your commands.

### Closing a Mailbox

```js
await client.mailboxClose();
```

This sends the IMAP `CLOSE` command, which also permanently removes messages flagged `\Deleted` in that mailbox. Releasing a lock does not close the mailbox.

### Resynchronizing with QRESYNC

If you enabled `qresync: true` in the constructor and the server supports [QRESYNC (RFC 7162)](https://www.rfc-editor.org/rfc/rfc7162.html), pass the values saved from a previous session to get the changes reported as `flags` and `expunge` events while the mailbox is being opened:

```js
let lock = await client.getMailboxLock('INBOX', {
    uidValidity: savedUidValidity,  // required with changedSince
    changedSince: savedHighestModseq
});
```

`getMailboxLock()` only applies these when it actually selects the mailbox, not when the mailbox is already open.

### Mailbox Information

When a mailbox is selected, `client.mailbox` contains:

```js
{
    path: 'INBOX',
    delimiter: '/',          // Path delimiter
    exists: 42,              // Total number of messages
    uidNext: 1000,           // Next UID that will be assigned
    uidValidity: 123456789n, // Mailbox UID validity (BigInt)
    flags: Set,              // Available flags
    permanentFlags: Set,     // Flags that can be permanently stored (\* means any keyword)
    highestModseq: 98765n,   // Highest modification sequence (if CONDSTORE)
    noModseq: false,         // True if the server does not store mod-sequences for this mailbox
    mailboxId: 'abcd-1234',  // Unique mailbox ID (if OBJECTID extension)
    specialUse: '\\Inbox',   // Special-use flag, if applicable
    subscribed: true,        // Subscription state, from the mailbox listing
    listed: true,            // True if the mailbox was found by LIST
    unseen: 17,              // Sequence number of the FIRST unseen message, if the server reported it
    appendlimit: 35882577,   // Max APPEND size in bytes, if reported (RFC 7889)
    readOnly: false          // True if opened in read-only mode
}
```

Counts of recent and unseen messages are not part of `client.mailbox`. To obtain them, call `client.status(path, { recent: true, unseen: true })`. On IMAP4rev2 sessions `recent` is always reported as `0`, because the `\Recent` flag was removed in [RFC 9051](https://www.rfc-editor.org/rfc/rfc9051.html).

### Read-Only Access

Open a mailbox in read-only mode:

```js
let lock = await client.getMailboxLock('INBOX', { readOnly: true });
try {
    // Can read but not modify messages
} finally {
    lock.release();
}
```

## Checking Mailbox Status

Get mailbox status without selecting it:

```js
let status = await client.status('INBOX', {
    messages: true,
    unseen: true,
    uidNext: true,
    uidValidity: true
});

console.log('Messages:', status.messages);
console.log('Unseen:', status.unseen);
console.log('UID Next:', status.uidNext);
```

On servers with [STATUS=SIZE (RFC 8438)](https://www.rfc-editor.org/rfc/rfc8438.html) or IMAP4rev2 you can also request the total mailbox size, and on IMAP4rev2 servers the count of messages flagged as deleted:

```js
let status = await client.status('INBOX', {
    size: true,     // requires STATUS=SIZE or IMAP4rev2
    deleted: true   // requires IMAP4rev2
});

console.log('Mailbox size (bytes):', status.size);
console.log('Messages flagged \\Deleted:', status.deleted);
```

Available status items are `messages`, `recent`, `uidNext`, `uidValidity` (a `BigInt`), `unseen`, `highestModseq` (a `BigInt`, requires [CONDSTORE (RFC 7162)](https://www.rfc-editor.org/rfc/rfc7162.html)), `size` and `deleted`. `deleted` is also available on servers that advertise `QUOTA=RES-MESSAGE` from [RFC 9208](https://www.rfc-editor.org/rfc/rfc9208.html). The result always includes `path`.

Items the current server cannot report are silently omitted from the result. If none of the requested items can be requested, or the server rejects the command, `status()` resolves with `false`. If the mailbox does not exist, it throws an error with code `NotFound`.

When you request status for the currently selected mailbox, ImapFlow also updates `client.mailbox` and emits an `exists` event if the message count changed.

## Finding Mailboxes by Name

### Case-Insensitive Search

```js
let mailboxes = await client.list();
let inbox = mailboxes.find(
    m => m.path.toLowerCase() === 'inbox'
);
```

### By Special Use

```js
let mailboxes = await client.list();
let sentBox = mailboxes.find(m => m.specialUse === '\\Sent');
let trashBox = mailboxes.find(m => m.specialUse === '\\Trash');
```

## Moving Between Mailboxes

### Move Messages

```js
// Select source mailbox
let lock = await client.getMailboxLock('INBOX');
try {
    // Move messages to another mailbox
    let result = await client.messageMove('1:10', 'Archive');
    if (result) {
        console.log('Moved to', result.destination);
        // source UID => destination UID, only with UIDPLUS (RFC 4315)
        console.log(result.uidMap);
    }
} finally {
    lock.release();
}
```

On servers without the [MOVE extension (RFC 6851)](https://www.rfc-editor.org/rfc/rfc6851.html), ImapFlow emulates it with COPY, then flags the source messages `\Deleted` and expunges them.

### Copy Messages

```js
let lock = await client.getMailboxLock('INBOX');
try {
    // Copy messages to another mailbox
    let result = await client.messageCopy('1:10', 'Backup');
    if (result) {
        console.log('Copied %s messages', result.uidMap ? result.uidMap.size : 'some');
    }
} finally {
    lock.release();
}
```

Both methods resolve with an object containing `path` (the source mailbox), `destination`, and, when the server supports [UIDPLUS (RFC 4315)](https://www.rfc-editor.org/rfc/rfc4315.html), `uidValidity` of the destination and `uidMap`, a `Map` from source UID to destination UID. They resolve with `false` if the range matched nothing or the server rejected the command. Use `{ uid: true }` as the third argument to pass UIDs instead of sequence numbers.

### Uploading Messages

`append()` stores a raw RFC 822 message in any mailbox. The mailbox does not need to be selected or locked:

```js
let result = await client.append('Drafts', rawMessage, ['\\Draft', '\\Seen'], new Date());
if (result) {
    console.log('Stored in', result.destination);
    console.log('UID:', result.uid); // only with UIDPLUS
}
```

The result contains `destination`, plus `uid` and `uidValidity` when the server supports UIDPLUS, and `seq` when the target is the currently selected mailbox. The message content can be a `Buffer`, `Uint8Array` or string. A failed upload throws.

## Mailbox Quota

Check mailbox quota. `getQuota()` returns `false` if the server does not support the QUOTA extension or the path does not exist:

```js
let quota = await client.getQuota();      // defaults to INBOX
if (!quota) {
    console.log('Quota not supported');
} else {
    if (quota.storage) {
        // bytes, plus the usage as a percentage of the limit
        console.log('Storage:', quota.storage.usage, '/', quota.storage.limit, quota.storage.status);
    }
    if (quota.message) {
        console.log('Messages:', quota.message.usage, '/', quota.message.limit);
    }
}
```

## Working with Multiple Mailboxes

### Process All Mailboxes

```js
let mailboxes = await client.list();

for (let mailbox of mailboxes) {
    // Skip non-selectable mailboxes
    if (mailbox.flags.has('\\Noselect')) {
        continue;
    }

    let lock = await client.getMailboxLock(mailbox.path);
    try {
        console.log(`Processing ${mailbox.path}...`);
        console.log(`Messages: ${client.mailbox.exists}`);
        // Process messages in this mailbox
    } finally {
        lock.release();
    }
}
```

### Search Across Mailboxes

```js
let mailboxes = await client.list();
let results = new Map();

for (let mailbox of mailboxes) {
    if (mailbox.flags.has('\\Noselect')) continue;

    let lock = await client.getMailboxLock(mailbox.path);
    try {
        let uids = await client.search({
            from: 'important@example.com'
        }, { uid: true });

        if (uids && uids.length > 0) {
            results.set(mailbox.path, uids);
        }
    } finally {
        lock.release();
    }
}

console.log('Found messages in:', results);
```

## Path Delimiters

Different servers use different path delimiters, usually `.` or `/`. The simplest way to handle this is to pass paths as arrays, which ImapFlow joins with the server's delimiter and prefixes with the personal namespace when the server requires one:

```js
await client.mailboxCreate(['Projects', '2024', 'ImapFlow']);
```

If you build the path string yourself, take the delimiter from the listing:

```js
let mailboxes = await client.list();
let delimiter = mailboxes[0]?.delimiter || '/';

let path = ['Projects', '2024', 'ImapFlow'].join(delimiter);
await client.mailboxCreate(path);
```

The namespace prefix (such as `INBOX.`) is still added automatically when the path does not already start with it.

## Best Practices

1. **Always release locks** - Use `finally` blocks
2. **Check for \\Noselect flag** - Some mailboxes are not selectable
3. **Use special use flags** - More reliable than hardcoded names
4. **Handle errors** - Mailboxes might not exist or be accessible
5. **Be cautious with delete** - Deleted mailboxes cannot be recovered

## Next Steps

- Learn about [Fetching Messages](./fetching-messages.md)
- Explore [Configuration](./configuration.md)
- See [Examples](../examples/fetching-messages.md)
