import { All, Any, anyObject, Condition, Rule } from './types';

function isCondition(obj: any): obj is Condition {
    return obj && typeof obj === 'object' && 'field' in obj && 'operator' in obj && 'value' in obj;
}

function isAny(obj: any): obj is Any {
    return obj && typeof obj === 'object' && 'any' in obj && Array.isArray(obj.any);
}

function isAll(obj: any): obj is All {
    return obj && typeof obj === 'object' && 'all' in obj && Array.isArray(obj.all);
}

/**
 * Evaluates a rule or condition against a given data row (or array of rows) and context.
 *
 * - If `row` is `null` or `undefined`, returns `false`.
 * - If `row` is an array, returns `true` if any row in the array satisfies the rule or condition.
 * - If `rule` is a single condition, evaluates it using `evaluateSingleCondition`.
 * - If `rule` is an "any" group, returns `true` if any sub-rule is satisfied.
 * - If `rule` is an "all" group, returns `true` only if all sub-rules are satisfied.
 *
 * @param rule - The rule or condition to evaluate.
 * @param row - The data object or array of objects to evaluate the rule against.
 * @param context - Optional context object for evaluation.
 * @returns `true` if the rule or condition is satisfied, otherwise `false`.
 * @throws {Error} If `row` is not an object or array of objects.
 */
export function evaluateCondition(
    rule: Rule | Condition,
    row: anyObject | anyObject[],
    context = {},
): boolean {
    if (row === null || row === undefined) return false;

    if (typeof row !== 'object') throw new Error('Row must be an object or an array of objects');

    switch (true) {
        case Array.isArray(row) && row.length === 0:
            return false; // Empty array, no rows to evaluate
        case Array.isArray(row):
            // If row is an array, evaluate each row against the rule
            return row.some((r) => evaluateCondition(rule, r, context));
        case typeof row === 'object' && !Array.isArray(row):
            return evaluateRuleForRowObject(row, rule, context);
        default:
            return false;
    }
}

/**
 * Evaluates a rule or condition against a given row object (or array of row objects) within a specific context.
 *
 * - If the rule is a single condition, it evaluates the condition directly.
 * - If the rule is an "any" group, it returns true if any sub-rule evaluates to true.
 * - If the rule is an "all" group, it returns true only if all sub-rules evaluate to true.
 * - Returns false if the rule does not match any known structure.
 *
 * @param row - The row object or array of row objects to evaluate the rule against.
 * @param rule - The rule or condition to evaluate.
 * @param context - Additional context that may be used during evaluation.
 * @returns `true` if the rule or condition is satisfied for the given row and context, otherwise `false`.
 */
function evaluateRuleForRowObject(
    row: anyObject | anyObject[],
    rule: Rule | Condition,
    context: anyObject,
): boolean {
    if (isCondition(rule)) return evaluateSingleCondition(rule, row);

    if (isAny(rule)) return rule.any.some((subRule) => evaluateCondition(subRule, row, context));

    if (isAll(rule)) return rule.all.every((subRule) => evaluateCondition(subRule, row, context));

    return false;
}

/**
 * Evaluates a single condition against a given row object.
 *
 * @param condition - The condition to evaluate, containing a field, operator, and value.
 * @param row - The object representing a data row to be checked against the condition.
 * @returns `true` if the row satisfies the condition; otherwise, `false`.
 *
 * @throws {Error} Throws an error if the operator is unknown.
 *
 * Supported operators:
 * - 'equals': Checks if the field value is strictly equal to the condition value.
 * - 'notEquals': Checks if the field value is not strictly equal to the condition value.
 * - 'greaterThan': Checks if the field value is greater than the condition value.
 * - 'lessThan': Checks if the field value is less than the condition value.
 * - 'contains': Checks if the field value (array) contains the condition value.
 * - 'startsWith': Checks if the field value (string) starts with the condition value.
 * - 'endsWith': Checks if the field value (string) ends with the condition value.
 * - 'in': Checks if the field value is included in the condition value (array).
 * - 'notIn': Checks if the field value is not included in the condition value (array).
 */
function evaluateSingleCondition(condition: Condition, row: anyObject): boolean {
    const { field, operator, value } = condition;
    const rowValue = row[field];

    switch (operator) {
        case 'equals':
            return rowValue === value;
        case 'notEquals':
            return rowValue !== value;
        case 'greaterThan':
            return rowValue > value;
        case 'lessThan':
            return rowValue < value;
        case 'contains':
            return Array.isArray(rowValue) ? rowValue.includes(value) : false;
        case 'startsWith':
            return typeof rowValue === 'string' && rowValue.startsWith(value);
        case 'endsWith':
            return typeof rowValue === 'string' && rowValue.endsWith(value);
        case 'in':
            return Array.isArray(value) && value.includes(rowValue);
        case 'notIn':
            return Array.isArray(value) && !value.includes(rowValue);
        default:
            throw new Error(`Unknown operator: ${operator}`);
    }
}
