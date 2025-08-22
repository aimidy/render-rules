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

Unknown operators throw an error:

```ts
try {
    evaluateCondition({ field: 'x', operator: 'unknown', value: 1 }, { x: 1 });
} catch (err) {
    console.error(err); // Unknown operator: unknown
}
```

## Testing

This project uses Jest.

```bash
npm test
```

## License

ISC
