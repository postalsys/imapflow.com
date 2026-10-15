---
sidebar_position: 4
---

# Searching Messages

<div style={{textAlign: 'center'}}>
  <img src="/img/searching.png" alt="Searching messages" width="200" />
</div>

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

The result is an array of numbers sorted in ascending order. A few other outcomes are worth handling:

- If the server rejects the SEARCH command, `search()` resolves with `false` (the error is logged, not thrown).
- If no mailbox is selected, it resolves with `undefined`.
- If the query itself is invalid, it **throws**. An unknown key, a malformed keyword, an empty `not` operand or a key that needs an extension the server does not have (for example `gmraw` on a non-Gmail server) all reject with an error whose `code` is `InvalidSearchQuery` or `MissingServerExtension`. ImapFlow refuses such queries instead of silently dropping the criterion, because dropping it would widen the search, which is dangerous when the result is used to delete or move messages.

```js title="Handling search results safely"
let uids = await client.search({ seen: false }, { uid: true });
if (!uids || !uids.length) {
    console.log('Nothing found (or the search failed)');
}
```

An empty query (`{}`), `{ all: true }` or `true` matches every message in the mailbox.

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

// Setting a flag key to false negates it: { answered: false } is UNANSWERED
await client.search({ answered: false });

// New messages (recent but not seen)
await client.search({ new: true });

// Recent messages
await client.search({ recent: true });

// Not recent
await client.search({ old: true });

// All messages
await client.search({ all: true });
```

:::note IMAP4rev2 removed the \Recent flag
The `new`, `old`, and `recent` search keys rely on the `\Recent` flag, which no longer exists in [IMAP4rev2 (RFC 9051)](https://www.rfc-editor.org/rfc/rfc9051.html). ImapFlow automatically enables IMAP4rev2 mode on supporting servers, and on such sessions these three keys reject with an error whose `code` is `MissingServerExtension`. If you depend on them, set `disableIMAP4rev2: true` in the constructor options (the server must still support IMAP4rev1).
:::

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

All text searches, including the address searches above, are case-insensitive substring matches performed by the server. Non-ASCII values are supported: ImapFlow sends them as literals and adds `CHARSET UTF-8` to the command automatically (unless `UTF8=ACCEPT` from [RFC 6855](https://www.rfc-editor.org/rfc/rfc6855.html) is enabled, in which case no charset is needed).

```js
await client.search({ subject: 'Käsiraamat' });
```

### Date-based Searches

Search by dates. `since`, `before` and `on` match the message's internal date (when the server received it), the `sent*` variants match the `Date:` header. Values can be `Date` objects or date strings that `new Date()` understands:

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

// Date strings work the same way
await client.search({ since: '2024-01-01' });
```

How dates are converted:

- IMAP date searches only compare calendar days and ignore the time of day. ImapFlow takes the day from the date in **UTC** (`2024-03-15T23:30:00+02:00` is 15 March in UTC, but `2024-03-16T01:00:00+02:00` is also 15 March).
- For `before` and `sentBefore`, a value that is not exactly midnight UTC is moved to the next day, so that the day of the given timestamp is included. A `since` and `before` pair with the same date but different times would otherwise match nothing.
- If the server supports the [WITHIN extension (RFC 5032)](https://www.rfc-editor.org/rfc/rfc5032.html) and the date is in the past, `since` and `before` are sent as `YOUNGER` and `OLDER` with an interval in seconds, so the time of day is respected exactly.
- An invalid date (or an empty value) is ignored and adds no criterion.

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

// Several ranges in one set
await client.search({ uid: '10,20,30:40' }, { uid: true });
```

The `uid` and `seq` keys restrict which messages are searched. Whether the *result* contains UIDs or sequence numbers is controlled separately by the `{ uid: true }` option.

### Header Searches

Search by specific headers. Header names are case-insensitive and values are substring matches:

```js
// Messages with a specific header value
await client.search({
    header: {
        'X-Priority': '1'
    }
});

// Messages that have a specific header (any value).
// `true` sends an empty string, which matches any message that has the header
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

The value must be a string and a valid flag name, otherwise the search throws with code `InvalidSearchQuery`. `\Recent` is not a keyword and is refused, use the `recent` key instead.

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

Use the `or` array to combine criteria with OR. The array can have any number of entries, ImapFlow builds the nested binary `OR` tree that IMAP requires. Each entry can contain several keys, which are ANDed together inside that entry:

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

// Each OR entry can combine several criteria
let uids = await client.search({
    or: [
        { from: 'alice@example.com', flagged: true },
        { from: 'bob@example.com', seen: false }
    ]
}, { uid: true });
```

### NOT Searches

Use the `not` object to negate criteria. If the object has several keys, they are grouped, so `not: { a, b }` means "not (a and b)":

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

A falsy `not` value (for example `not: condition && { ... }`) is ignored. An operand that compiles to no criteria at all, like an empty object or an invalid date, throws instead, because a bare `NOT` would otherwise apply to whatever criterion follows it.

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
// Messages whose mod-sequence is equal to or greater than 12345
let uids = await client.search({
    modseq: 12345n
}, { uid: true });
```

The value can be a `BigInt` or a number. Compare it with `client.mailbox.highestModseq` from an earlier session to find what changed.

## OBJECTID Searches

Search by the stable email and thread identifiers that `fetch()` returns as `emailId` and `threadId`. This works with servers that support the [OBJECTID extension (RFC 8474)](https://www.rfc-editor.org/rfc/rfc8474.html), and on Gmail, where ImapFlow uses `X-GM-MSGID` and `X-GM-THRID` from the [Gmail IMAP extensions](https://developers.google.com/workspace/gmail/imap/imap-extensions) instead:

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

If the server supports neither extension, the search throws with code `MissingServerExtension`. An empty value adds no criterion.

## Gmail-Specific Searches

When connected to Gmail (the server advertises `X-GM-EXT-1`), you can use Gmail's own search syntax through the `X-GM-RAW` search key from the [Gmail IMAP extensions](https://developers.google.com/workspace/gmail/imap/imap-extensions). On any other server these keys throw with code `MissingServerExtension`.

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

### Gmail Labels

The `labels` key filters by Gmail label. `has` matches messages that carry all of the listed labels, `not` excludes messages that carry any of them. ImapFlow compiles it into an `X-GM-RAW` query with `label:` and `-label:` terms, quoting multi-word label names:

```js
let uids = await client.search({
    labels: {
        has: ['Work', 'Project X'],
        not: ['Archived']
    }
}, { uid: true });
```

An empty `labels` filter is a no-op and works on any server.

## ESEARCH Result Options

With the `returnOptions` search option you can ask for a summary instead of the full list of numbers, which is much cheaper on large mailboxes. `COUNT`, `MIN` and `MAX` return single numbers, while `ALL` still covers every match, only in compact form. On servers that support [ESEARCH (RFC 4731)](https://www.rfc-editor.org/rfc/rfc4731.html), or IMAP4rev2 where it is built in, the result is an object instead of an array:

```js
let result = await client.search({ seen: false }, {
    uid: true,
    returnOptions: ['COUNT', 'MIN', 'MAX']
});

console.log(result.count); // number of matches
console.log(result.min);   // lowest matching UID
console.log(result.max);   // highest matching UID
```

Add `'ALL'` to also get `result.all`, the matches as a compact sequence set such as `"1,5:10,20"`.

For paging, request a slice of the results with [PARTIAL (RFC 9394)](https://www.rfc-editor.org/rfc/rfc9394.html):

```js
let page = await client.search({ all: true }, {
    uid: true,
    returnOptions: [{ partial: '1:100' }]
});
console.log(page.partial); // { range: '1:100', messages: '...' }
```

If the server does not support ESEARCH, ImapFlow runs a regular search and derives `count`, `min`, `max` and `all` from the result itself. `partial` cannot be derived that way, so a request for only `partial` returns the plain array of numbers.

## Using Search Results

### With fetch()

Pass search results directly to fetch:

```js
let lock = await client.getMailboxLock('INBOX');
try {
    let uids = await client.search({ seen: false }, { uid: true });

    if (uids.length > 0) {
        // fetchAll() accepts the array of UIDs directly
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

You can also pass search criteria directly to fetch methods, and to the other methods that take a message range (`messageFlagsAdd()`, `messageMove()`, `messageDelete()`, and so on). ImapFlow runs a UID SEARCH first and then uses the matching UIDs:

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

Remember that date searches use the UTC calendar day (unless the server supports WITHIN). A local midnight is a different UTC day in many time zones, so build the date in UTC:

```js
let now = new Date();
let today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

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

If the server supports OBJECTID or is Gmail, use the thread ID of a known message:

```js
let message = await client.fetchOne(knownUid, { threadId: true }, { uid: true });
if (message && message.threadId) {
    let uids = await client.search({ threadId: message.threadId }, { uid: true });
}
```

Otherwise fall back to matching the subject (a substring match, so this also finds replies):

```js
let uids = await client.search({ subject: 'Project Update' }, { uid: true });
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
