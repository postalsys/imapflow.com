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
    console.log('Path:', mailbox.path);
    console.log('Delimiter:', mailbox.delimiter);
    console.log('Flags:', mailbox.flags);
    console.log('Special use:', mailbox.specialUse);
    console.log('---');
}
```

### Get Mailbox Tree

Get mailboxes organized as a tree structure:

```js
let tree = await client.listTree();
console.log(JSON.stringify(tree, null, 2));
```

### List Subscribed Mailboxes

List only subscribed mailboxes:

```js
let subscribed = await client.list();
let subscribedOnly = subscribed.filter(m => m.subscribed);
```

## Special Use Mailboxes

Special use flags identify standard mailboxes:

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
let result = await client.mailboxCreate('Projects/2024');
console.log('Created:', result.path);
```

### Create Nested Mailboxes

You can pass an array of path segments and ImapFlow joins them using the server's delimiter and applies any required namespace prefix:

```js
// Joined with the server's delimiter (e.g. "INBOX.Work.Projects.ImapFlow")
await client.mailboxCreate(['Work', 'Projects', 'ImapFlow']);
```

Whether intermediate parent folders are created automatically is server-specific — if your server requires explicit parents, create them in order before the leaf.

## Renaming Mailboxes

```js
let result = await client.mailboxRename('Old Name', 'New Name');
console.log('Renamed to:', result.newPath);
```

## Deleting Mailboxes

```js
let result = await client.mailboxDelete('Temporary');
console.log('Deleted:', result.path);
```

**Warning:** This will delete all messages in the mailbox!

## Subscribing to Mailboxes

### Subscribe

```js
await client.mailboxSubscribe('Important');
```

### Unsubscribe

```js
await client.mailboxUnsubscribe('Old Projects');
```

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
    permanentFlags: Set,     // Flags that can be permanently stored
    highestModseq: 98765n,   // Highest modification sequence (if CONDSTORE)
    mailboxId: 'abcd-1234',  // Unique mailbox ID (if OBJECTID extension)
    specialUse: '\\Inbox',   // Special-use flag, if applicable
    readOnly: false          // True if opened in read-only mode
}
```

`recent` and `unseen` counts are not part of `client.mailbox`. To obtain them, call `client.status(path, { recent: true, unseen: true })`.

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
    await client.messageMove('1:10', 'Archive');
} finally {
    lock.release();
}
```

### Copy Messages

```js
let lock = await client.getMailboxLock('INBOX');
try {
    // Copy messages to another mailbox
    await client.messageCopy('1:10', 'Backup');
} finally {
    lock.release();
}
```

## Mailbox Quota

Check mailbox quota. `getQuota()` returns `false` if the server does not support the QUOTA extension or the path does not exist:

```js
let quota = await client.getQuota();      // defaults to INBOX
if (!quota) {
    console.log('Quota not supported');
} else {
    if (quota.storage) {
        console.log('Storage:', quota.storage.used, '/', quota.storage.limit);
    }
    if (quota.messages) {
        console.log('Messages:', quota.messages.used, '/', quota.messages.limit);
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

        if (uids.length > 0) {
            results.set(mailbox.path, uids);
        }
    } finally {
        lock.release();
    }
}

console.log('Found messages in:', results);
```

## Path Delimiters

Different servers use different path delimiters:

```js
let mailboxes = await client.list();
let delimiter = mailboxes[0]?.delimiter || '/';

// Create path with correct delimiter
let path = ['Projects', '2024', 'ImapFlow'].join(delimiter);
await client.mailboxCreate(path);
```

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
