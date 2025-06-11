# render-rules

A simple library for defining and applying rendering rules in your project.

## Features

- Define custom rendering rules
- Apply rules to data or UI components
- Easy integration

## Installation

```bash
npm install render-rules
```

## Usage

### Basic Usage

```ts
import { evaluateCondition } from '@aimidy/render-rules';

const rule = { field: 'age', operator: 'equals', value: 30 };
const row = { age: 30 };

console.log(evaluateCondition(rule, row)); // true
```

### Supported Operators

- `equals`
- `notEquals`
- `greaterThan`
- `lessThan`
- `contains`
- `startsWith`
- `endsWith`
- `in`
- `notIn`

### Nested AND/OR Rules

```ts
import { evaluateCondition } from '@aimidy/render-rules';

const rule = {
    all: [
        { field: 'age', operator: 'greaterThan', value: 18 },
        { field: 'status', operator: 'equals', value: 'active' },
    ],
};

const row = { age: 25, status: 'active' };

console.log(evaluateCondition(rule, row)); // true
```

```ts
const rule = {
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

const row = { age: 25, status: 'active', role: 'user' };

console.log(evaluateCondition(rule, row)); // true
```

### Array Data Evaluation

```ts
const rule = { field: 'age', operator: 'equals', value: 30 };
const rows = [{ age: 20 }, { age: 30 }];

console.log(evaluateCondition(rule, rows)); // true
```

### Error Handling

```ts
const rule = { field: 'age', operator: 'unknown', value: 30 };
const row = { age: 30 };

try {
    evaluateCondition(rule, row);
} catch (e) {
    console.error(e); // Unknown operator: unknown
}
```

### Negate Rule Result (`not` property)

You can use the `not` property to invert the result of a rule or condition.

```ts
import { evaluateCondition } from '@aimidy/render-rules';

// Negate a single condition
const rule = { field: 'age', operator: 'equals', value: 30, not: true };
const row = { age: 30 };

console.log(evaluateCondition(rule, row)); // false

// Negate a group
const groupRule = {
    all: [
        { field: 'age', operator: 'greaterThan', value: 18 },
        { field: 'status', operator: 'equals', value: 'active' },
    ],
    not: true,
};

const groupRow = { age: 25, status: 'active' };

console.log(evaluateCondition(groupRule, groupRow)); // false
```

## License

MIT
