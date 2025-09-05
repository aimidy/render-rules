import { All, Any, anyObject, Condition, Rule, EvaluateOptions } from './types';

function toDate(input: any): Date | null {
    if (input instanceof Date) return isNaN(input.getTime()) ? null : input;
    if (typeof input === 'number') {
        const d = new Date(input);
        return isNaN(d.getTime()) ? null : d;
    }
    if (typeof input === 'string') {
        const d = new Date(input);
        return isNaN(d.getTime()) ? null : d;
    }
    return null;
}

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
 * Evaluates a rule or condition against a given data row (or array of rows).
 *
 * - If `row` is `null` or `undefined`, returns `false` (unless `treatMissingRowAsFalse` is `false`).
 * - If `row` is an array, returns `true` if any row in the array satisfies the rule or condition.
 * - If `rule` is a single condition, evaluates it using `evaluateSingleCondition`.
 * - If `rule` is an "any" group, returns `true` if any sub-rule is satisfied.
 * - If `rule` is an "all" group, returns `true` only if all sub-rules are satisfied.
 * - If `rule.not` is `true`, the result will be negated.
 *
 * @param rule - The rule or condition to evaluate.
 * @param row - The data object or array of objects to evaluate the rule against.
 * @param options - Optional configuration for evaluation behavior.
 * @returns `true` if the rule or condition is satisfied, otherwise `false`.
 * @throws {Error} If `row` is not an object or array of objects.
 */
export function evaluateCondition(
    rule: Rule | Condition,
    row: anyObject | anyObject[],
    options: EvaluateOptions = {},
): boolean {
    const { treatMissingRowAsFalse = true, onError } = options;

    if (row === null || row === undefined) {
        if (treatMissingRowAsFalse) return false;
        if (onError) {
            onError(new Error('Row is null or undefined'), { rule, row });
            return false;
        }

        throw new Error('Row is null or undefined');
    }

    if (typeof row !== 'object') {
        if (onError) {
            onError(new Error('Row must be an object or an array of objects'), { rule, row });
            return false;
        }
        throw new Error('Row must be an object or an array of objects');
    }

    let result: boolean;
    switch (true) {
        case Array.isArray(row) && row.length === 0:
            result = false;
            break;
        case Array.isArray(row):
            result = row.some((r) => evaluateCondition(rule, r, options));
            break;
        case typeof row === 'object' && !Array.isArray(row):
            result = evaluateRuleForRowObject(row, rule, options);
            break;
        default:
            if (onError) {
                onError(new Error('Row must be an object or an array of objects'), { rule, row });
                return false;
            }
            throw new Error('Row must be an object or an array of objects');
    }

    if ('not' in rule && rule.not) return !result;

    return result;
}

/**
 * Evaluates a rule or condition against a given row object (or array of row objects).
 *
 * - If the rule is a single condition, it evaluates the condition directly.
 * - If the rule is an "any" group, it returns true if any sub-rule evaluates to true.
 * - If the rule is an "all" group, it returns true only if all sub-rules evaluate to true.
 * - Returns false if the rule does not match any known structure.
 *
 * @param row - The row object or array of row objects to evaluate the rule against.
 * @param rule - The rule or condition to evaluate.
 * @param options - Optional configuration for evaluation behavior.
 * @returns `true` if the rule or condition is satisfied for the given row, otherwise `false`.
 */
function evaluateRuleForRowObject(
    row: anyObject | anyObject[],
    rule: Rule | Condition,
    options: EvaluateOptions = {},
): boolean {
    const { onError } = options;
    switch (true) {
        case isCondition(rule):
            return evaluateSingleCondition(rule, row, options);
        case isAny(rule):
            return rule.any.some((subRule) => evaluateCondition(subRule, row, options));
        case isAll(rule):
            return rule.all.every((subRule) => evaluateCondition(subRule, row, options));
        default:
            if (onError) {
                onError(new Error('Rule must be a condition, any group, or all group'), {
                    rule,
                    row,
                });
                return false;
            }
            throw new Error('Rule must be a condition, any group, or all group');
    }
}

/**
 * Evaluates a single condition against a given row object.
 *
 * @param condition - The condition to evaluate, containing a field, operator, and value.
 * @param row - The object representing a data row to be checked against the condition.
 * @param options - Optional configuration for evaluation behavior.
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
 * Date/time operators:
 * - 'dateEquals': Checks if the field value (date) is equal to the condition value (date).
 * - 'dateNotEquals': Checks if the field value (date) is not equal to the condition value (date).
 * - 'dateAfter': Checks if the field value (date) is after the condition value (date).
 * - 'dateBefore': Checks if the field value (date) is before the condition value (date).
 * - 'dateOnOrAfter': Checks if the field value (date) is on or after the condition value (date).
 * - 'dateOnOrBefore': Checks if the field value (date) is on or before the condition value (date).
 * - 'nowAfterPlusMinutes': Checks if the current time is after the field value (date) plus the condition value (minutes).
 * - 'nowBeforePlusMinutes': Checks if the current time is before the field value (date) plus the condition value (minutes).
 */
function evaluateSingleCondition(
    condition: Condition,
    row: anyObject,
    options: EvaluateOptions = {},
): boolean {
    const { field, operator, value } = condition;
    const rowValue = row[field];

    try {
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
            // ---- 日期 / 時間判斷新增 ----
            case 'dateEquals': {
                const d1 = toDate(rowValue);
                const d2 = toDate(value);
                return !!(d1 && d2 && d1.getTime() === d2.getTime());
            }
            case 'dateNotEquals': {
                const d1 = toDate(rowValue);
                const d2 = toDate(value);
                return !!(d1 && d2 && d1.getTime() !== d2.getTime());
            }
            case 'dateAfter': {
                const d1 = toDate(rowValue);
                const d2 = toDate(value);
                return !!(d1 && d2 && d1.getTime() > d2.getTime());
            }
            case 'dateBefore': {
                const d1 = toDate(rowValue);
                const d2 = toDate(value);
                return !!(d1 && d2 && d1.getTime() < d2.getTime());
            }
            case 'dateOnOrAfter': {
                const d1 = toDate(rowValue);
                const d2 = toDate(value);
                return !!(d1 && d2 && d1.getTime() >= d2.getTime());
            }
            case 'dateOnOrBefore': {
                const d1 = toDate(rowValue);
                const d2 = toDate(value);
                return !!(d1 && d2 && d1.getTime() <= d2.getTime());
            }
            case 'nowAfterPlusMinutes': {
                // value: number (分鐘)
                if (typeof value !== 'number') return false;
                const base = toDate(rowValue);
                if (!base) return false;
                const compareTs = base.getTime() + value * 60_000;
                return Date.now() > compareTs;
            }
            case 'nowBeforePlusMinutes': {
                if (typeof value !== 'number') return false;
                const base = toDate(rowValue);
                if (!base) return false;
                const compareTs = base.getTime() + value * 60_000;
                return Date.now() < compareTs;
            }
            default:
                throw new Error(`Unknown operator: ${operator}`);
        }
    } catch (error) {
        const { onError } = options;
        if (onError) {
            onError(error as Error, { rule: condition, row });
            return false;
        }
        // 如果有錯誤處理器，拋出錯誤；否則重新拋出錯誤
        throw error;
    }
}
