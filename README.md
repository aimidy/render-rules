# render-rules

Lightweight, composable rule evaluation engine for objects (and arrays of objects). Define simple field conditions or nest logical groups (`all` / `any`) with optional negation. Includes rich date/time operators and relative-now comparisons.

## Features

- Simple field conditions (equality, comparison, membership, string ops)
- Nested logical groups: `all` (AND) / `any` (OR)
- `not` inversion available on any condition or group
- Array row evaluation (rows array is treated with OR semantics)
- Date & time operators (absolute & relative to `Date.now()`)
- Robust handling of mixed input types: `Date`, ISO string, timestamp number
- Graceful failure (invalid date inputs yield `false`, unknown operator throws)

## Installation

```bash
npm install @aimidy/render-rules
```

## Basic Usage

```ts
import { evaluateCondition } from '@aimidy/render-rules';

const rule = { field: 'age', operator: 'equals', value: 30 };
const row = { age: 30 };

console.log(evaluateCondition(rule, row)); // true
```

## Configuration Options

The `evaluateCondition` function accepts an optional `options` parameter for customizing evaluation behavior:

```ts
interface EvaluateOptions {
    treatMissingRowAsFalse?: boolean; // default: true
    onError?: (err: Error, info: { rule: Rule | Condition; row: any }) => void;
}
```

### `treatMissingRowAsFalse`

Controls how `null` or `undefined` rows are handled:

```ts
// Default behavior (treatMissingRowAsFalse: true)
evaluateCondition(rule, null); // false
evaluateCondition(rule, undefined); // false

// Alternative behavior (treatMissingRowAsFalse: false)
evaluateCondition(rule, null, { treatMissingRowAsFalse: false }); // true
evaluateCondition(rule, undefined, { treatMissingRowAsFalse: false }); // true
```

### `onError` Callback

Provides custom error handling instead of throwing exceptions:

```ts
const options = {
    onError: (error, info) => {
        console.log('Evaluation error:', error.message);
        console.log('Rule:', info.rule);
        console.log('Row:', info.row);
    },
};

// Instead of throwing, calls onError and returns false
evaluateCondition({ field: 'x', operator: 'unknown', value: 1 }, { x: 1 }, options); // false (calls onError callback)
```

## Supported Operators

| Category          | Operators                                                                                                                                  |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Comparison        | `equals`, `notEquals`, `greaterThan`, `lessThan`                                                                                           |
| Collection/String | `contains`, `startsWith`, `endsWith`, `in`, `notIn`                                                                                        |
| Date / Time       | `dateEquals`, `dateNotEquals`, `dateAfter`, `dateBefore`, `dateOnOrAfter`, `dateOnOrBefore`, `nowAfterPlusMinutes`, `nowBeforePlusMinutes` |

### Date / Time Operator Semantics

| Operator               | Meaning (row.dt vs rule.value)      |
| ---------------------- | ----------------------------------- |
| `dateEquals`           | row time === value time             |
| `dateNotEquals`        | row time !== value time             |
| `dateAfter`            | row time > value time               |
| `dateBefore`           | row time < value time               |
| `dateOnOrAfter`        | row time >= value time              |
| `dateOnOrBefore`       | row time <= value time              |
| `nowAfterPlusMinutes`  | `Date.now()` > (row time + minutes) |
| `nowBeforePlusMinutes` | `Date.now()` < (row time + minutes) |

Accepted date inputs for both sides (where applicable): `Date` instance, ISO 8601 string, or numeric timestamp (milliseconds). If either side cannot be parsed into a valid date the result is `false` (for `dateNotEquals`, implementation also returns `false` when invalid).

### Example: Date & Relative Time

```ts
const row = {
    startAt: '2024-01-01T10:00:00.000Z',
    endAt: new Date('2024-01-01T12:00:00.000Z'),
};

// startAt after 09:00Z?
evaluateCondition(
    { field: 'startAt', operator: 'dateAfter', value: '2024-01-01T09:00:00.000Z' },
    row,
); // true

// endAt on or after noon?
evaluateCondition(
    { field: 'endAt', operator: 'dateOnOrAfter', value: '2024-01-01T12:00:00.000Z' },
    row,
); // true

// Has 30 minutes passed since startAt?
evaluateCondition({ field: 'startAt', operator: 'nowAfterPlusMinutes', value: 30 }, row);

// Are we still before startAt + 90 minutes?
evaluateCondition({ field: 'startAt', operator: 'nowBeforePlusMinutes', value: 90 }, row);
```

## Nested Groups (`all` / `any`)

```ts
const groupRule = {
    all: [
        { field: 'age', operator: 'greaterThan', value: 18 },
        { field: 'status', operator: 'equals', value: 'active' },
    ],
};

evaluateCondition(groupRule, { age: 25, status: 'active' }); // true

// With error handling
evaluateCondition(
    groupRule,
    { age: 25, status: 'active' },
    {},
    {
        onError: (error) => console.log('Error:', error.message),
    },
); // true
```

Combining `any` + `all`:

```ts
const nested = {
    any: [
        { field: 'role', operator: 'equals', value: 'admin' },
        {
            all: [
                { field: 'age', operator: 'greaterThan', value: 18 },
                { field: 'status', operator: 'equals', value: 'active' },
            ],
        },
    ],
};

evaluateCondition(nested, { age: 25, status: 'active', role: 'user' }); // true
```

## Array Row Evaluation (OR semantics)

If you pass an array of rows, the rule is considered satisfied if ANY row matches.

```ts
const rows = [{ age: 20 }, { age: 30 }];
evaluateCondition({ field: 'age', operator: 'equals', value: 30 }, rows); // true
```

## Negation (`not`)

```ts
evaluateCondition({ field: 'age', operator: 'equals', value: 30, not: true }, { age: 30 }); // false

evaluateCondition(
    {
        all: [
            { field: 'age', operator: 'greaterThan', value: 18 },
            { field: 'status', operator: 'equals', value: 'active' },
        ],
        not: true,
    },
    { age: 25, status: 'active' },
); // false
```

## Error Handling

By default, unknown operators and invalid inputs throw errors:

```ts
try {
    evaluateCondition({ field: 'x', operator: 'unknown', value: 1 }, { x: 1 });
} catch (err) {
    console.error(err); // Unknown operator: unknown
}
```

### Custom Error Handling with `onError`

Instead of throwing exceptions, you can provide an error callback:

```ts
const options = {
    onError: (error, info) => {
        console.log('Evaluation failed:', error.message);
        console.log('Rule:', info.rule);
        console.log('Row data:', info.row);
        // Log to monitoring service, etc.
    },
};

// Returns false instead of throwing
evaluateCondition({ field: 'x', operator: 'unknown', value: 1 }, { x: 1 }, options); // false (calls onError callback)

// Also handles invalid row types
evaluateCondition({ field: 'age', operator: 'equals', value: 30 }, 'not an object', options); // false (calls onError callback)
```

### Handling Missing Rows

Control how `null` or `undefined` rows are treated:

```ts
// Default: treat missing rows as false
evaluateCondition(rule, null); // false
evaluateCondition(rule, undefined); // false

// Alternative: treat missing rows as true
evaluateCondition(rule, null, { treatMissingRowAsFalse: false }); // true
evaluateCondition(rule, undefined, { treatMissingRowAsFalse: false }); // true
```

## Testing

This project uses Jest.

```bash
npm test
```

## License

ISC
