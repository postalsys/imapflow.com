---
sidebar_position: 4
---

# Searching Messages

This guide covers how to search for messages using ImapFlow's powerful search capabilities.

## Basic Search

The `search()` method finds messages matching specified criteria and returns their sequence numbers or UIDs.

```js
let lock = await client.getMailboxLock('INBOX');
try {
    // Get UIDs of unseen messages
    let uids = await client.search({ seen: false }, { uid: true });
    console.log('Unseen UIDs:', uids);

    // Get sequence numbers instead
    let seqs = await client.search({ seen: false });
    console.log('Unseen sequences:', seqs);
} finally {
    lock.release();
}
```

## Search Criteria

### Flag-based Searches

Search by message flags:

```js
// Unseen messages
await client.search({ seen: false });

// Seen messages
await client.search({ seen: true });

// Flagged messages
await client.search({ flagged: true });

// Deleted messages (marked for deletion)
await client.search({ deleted: true });

// Draft messages
await client.search({ draft: true });

// Answered messages
await client.search({ answered: true });

// New messages (recent but not seen)
await client.search({ new: true });

// Recent messages
await client.search({ recent: true });

// All messages
await client.search({ all: true });
```

### Address-based Searches

Search by email addresses:

```js
// From a specific sender
await client.search({ from: 'sender@example.com' });

// To a specific recipient
await client.search({ to: 'recipient@example.com' });

// CC'd to someone
await client.search({ cc: 'someone@example.com' });

// BCC'd to someone (rarely useful as BCC headers are often stripped)
await client.search({ bcc: 'hidden@example.com' });
```

### Content Searches

Search message content:

```js
// Subject contains text
await client.search({ subject: 'important meeting' });

// Body contains text
await client.search({ body: 'quarterly report' });

// Any text (searches headers and body)
await client.search({ text: 'project deadline' });
```

### Date-based Searches

Search by dates (uses internal date by default):

```js
// Messages received since a date
await client.search({ since: new Date('2024-01-01') });

// Messages received before a date
await client.search({ before: new Date('2024-06-01') });

// Messages received on a specific date
await client.search({ on: new Date('2024-03-15') });

// Combine for date ranges
await client.search({
    since: new Date('2024-01-01'),
    before: new Date('2024-02-01')
});

// Using sent date instead of received date
await client.search({ sentSince: new Date('2024-01-01') });
await client.search({ sentBefore: new Date('2024-06-01') });
await client.search({ sentOn: new Date('2024-03-15') });
```

### Size-based Searches

Search by message size:

```js
// Messages larger than 1MB
await client.search({ larger: 1024 * 1024 });

// Messages smaller than 100KB
await client.search({ smaller: 100 * 1024 });

// Size range
await client.search({
    larger: 1024 * 1024,
    smaller: 10 * 1024 * 1024
});
```

### UID and Sequence Ranges

Search within specific ranges:

```js
// Search within UID range
await client.search({ uid: '1:1000' }, { uid: true });

// Search within sequence range
await client.search({ seq: '1:100' });
```

### Header Searches

Search by specific headers:

```js
// Messages with a specific header value
await client.search({
    header: {
        'X-Priority': '1'
    }
});

// Messages that have a specific header (any value)
await client.search({
    header: {
        'X-Mailer': true
    }
});

// Multiple header conditions
await client.search({
    header: {
        'Content-Type': 'multipart/mixed',
        'X-Spam-Flag': 'YES'
    }
});
```

### Keyword Searches

Search by custom keywords (flags):

```js
// Messages with a custom keyword
await client.search({ keyword: '$Important' });

// Messages without a custom keyword
await client.search({ unKeyword: '$Processed' });
```

## Complex Searches

### Combining Criteria (AND)

All criteria in a single object are combined with AND:

```js
// Unseen AND from specific sender AND larger than 10KB
let uids = await client.search({
    seen: false,
    from: 'boss@example.com',
    larger: 10 * 1024
}, { uid: true });
```

### OR Searches

Use the `or` array to combine criteria with OR:

```js
// Messages from Alice OR Bob
let uids = await client.search({
    or: [
        { from: 'alice@example.com' },
        { from: 'bob@example.com' }
    ]
}, { uid: true });

// Complex OR with multiple conditions
let uids = await client.search({
    or: [
        { from: 'important@example.com' },
        { flagged: true },
        { subject: 'urgent' }
    ],
    seen: false  // AND unseen
}, { uid: true });
```

### NOT Searches

Use the `not` object to negate criteria:

```js
// Not from a specific sender
let uids = await client.search({
    not: { from: 'spam@example.com' }
}, { uid: true });

// Combine NOT with other criteria
let uids = await client.search({
    seen: false,
    not: { from: 'newsletter@example.com' }
}, { uid: true });
```

### Nested Complex Queries

Combine OR, NOT, and AND for complex queries:

```js
// (From Alice OR From Bob) AND NOT flagged AND unseen
let uids = await client.search({
    or: [
        { from: 'alice@example.com' },
        { from: 'bob@example.com' }
    ],
    not: { flagged: true },
    seen: false
}, { uid: true });
```

## CONDSTORE Searches

If the server supports [CONDSTORE extension (RFC 7162)](https://www.rfc-editor.org/rfc/rfc7162.html), you can search by modification sequence:

```js
// Messages modified since a specific modseq
let uids = await client.search({
    modseq: 12345n
}, { uid: true });
```

## OBJECTID Searches

If the server supports [OBJECTID extension (RFC 8474)](https://www.rfc-editor.org/rfc/rfc8474.html):

```js
// Search by email ID
let uids = await client.search({
    emailId: 'unique-email-id-here'
}, { uid: true });

// Search by thread ID
let uids = await client.search({
    threadId: 'thread-id-here'
}, { uid: true });
```

## Gmail-Specific Searches

When connected to Gmail, you can use Gmail's raw search syntax:

```js
// Gmail raw search
let uids = await client.search({
    gmraw: 'has:attachment larger:5M'
}, { uid: true });

// Other Gmail raw search examples
await client.search({ gmraw: 'is:important' });
await client.search({ gmraw: 'in:sent' });
await client.search({ gmraw: 'label:work' });
await client.search({ gmraw: 'filename:pdf' });
await client.search({ gmraw: 'has:drive has:document' });
await client.search({ gmraw: 'before:2024/01/01 after:2023/01/01' });

// gmailraw is an alias for gmraw
await client.search({ gmailraw: 'is:starred' });
```

## Using Search Results

### With fetch()

Pass search results directly to fetch:

```js
let lock = await client.getMailboxLock('INBOX');
try {
    let uids = await client.search({ seen: false }, { uid: true });

    if (uids.length > 0) {
        // fetch() accepts the search results directly
        let messages = await client.fetchAll(uids, {
            envelope: true
        }, { uid: true });

        for (let message of messages) {
            console.log(message.envelope.subject);
        }
    }
} finally {
    lock.release();
}
```

### Search as Range in fetch()

You can also pass search criteria directly to fetch methods:

```js
// fetch() can take a SearchObject as range
for await (let message of client.fetch({ seen: false }, { envelope: true })) {
    console.log(message.envelope.subject);
}
```

## Performance Tips

1. **Be specific** - More specific searches are faster
2. **Use UIDs** - Always prefer `{ uid: true }` option
3. **Limit date ranges** - Narrow date ranges improve performance
4. **Avoid body searches** - Full-text body searches can be slow
5. **Use Gmail raw** - For Gmail, raw search is often faster and more powerful

## Common Search Patterns

### Find Unread Messages from Today

```js
let today = new Date();
today.setHours(0, 0, 0, 0);

let uids = await client.search({
    seen: false,
    since: today
}, { uid: true });
```

### Find Large Attachments

```js
// Messages likely to have attachments (> 500KB)
let uids = await client.search({
    larger: 500 * 1024
}, { uid: true });
```

### Find Messages in a Thread

```js
// Find all messages in a conversation
let uids = await client.search({
    or: [
        { subject: 'Re: Project Update' },
        { subject: 'Project Update' }
    ]
}, { uid: true });
```

### Find Old Messages to Archive

```js
let sixMonthsAgo = new Date();
sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

let uids = await client.search({
    before: sixMonthsAgo,
    seen: true
}, { uid: true });
```

## Next Steps

- Learn about [Fetching Messages](./fetching-messages.md)
- See [API Reference](../api/imapflow-client.md#searchquery-options)
- Explore [Examples](../examples/fetching-messages.md)
