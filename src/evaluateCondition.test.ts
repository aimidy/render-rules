import { evaluateCondition } from './evaluateCondition';
import { Condition, Rule } from './types';

describe('evaluateCondition', () => {
    it('should return true for equals operator', () => {
        const rule: Condition = { field: 'age', operator: 'equals', value: 30 };
        const row = { age: 30 };
        expect(evaluateCondition(rule, row)).toBe(true);
    });

    it('should return false for notEquals operator', () => {
        const rule: Condition = { field: 'status', operator: 'notEquals', value: 'active' };
        const row = { status: 'active' };
        expect(evaluateCondition(rule, row)).toBe(false);
    });

    it('should return true for greaterThan operator', () => {
        const rule: Condition = { field: 'score', operator: 'greaterThan', value: 50 };
        const row = { score: 60 };
        expect(evaluateCondition(rule, row)).toBe(true);
    });

    it('should return false for lessThan operator', () => {
        const rule: Condition = { field: 'score', operator: 'lessThan', value: 50 };
        const row = { score: 60 };
        expect(evaluateCondition(rule, row)).toBe(false);
    });

    it('should return true for contains operator', () => {
        const rule: Condition = { field: 'tags', operator: 'contains', value: 'urgent' };
        const row = { tags: ['urgent', 'review'] };
        expect(evaluateCondition(rule, row)).toBe(true);
    });

    it('should return false for contains operator when value not present', () => {
        const rule: Condition = { field: 'tags', operator: 'contains', value: 'done' };
        const row = { tags: ['urgent', 'review'] };
        expect(evaluateCondition(rule, row)).toBe(false);
    });

    it('should return true for startsWith operator', () => {
        const rule: Condition = { field: 'name', operator: 'startsWith', value: 'Jo' };
        const row = { name: 'John' };
        expect(evaluateCondition(rule, row)).toBe(true);
    });

    it('should return false for endsWith operator', () => {
        const rule: Condition = { field: 'name', operator: 'endsWith', value: 'son' };
        const row = { name: 'John' };
        expect(evaluateCondition(rule, row)).toBe(false);
    });

    it('should return true for in operator', () => {
        const rule: Condition = { field: 'role', operator: 'in', value: ['admin', 'user'] };
        const row = { role: 'admin' };
        expect(evaluateCondition(rule, row)).toBe(true);
    });

    it('should return false for notIn operator', () => {
        const rule: Condition = { field: 'role', operator: 'notIn', value: ['admin', 'user'] };
        const row = { role: 'admin' };
        expect(evaluateCondition(rule, row)).toBe(false);
    });

    it('should return true for any rule', () => {
        const rule: Rule = {
            any: [
                { field: 'age', operator: 'equals', value: 20 },
                { field: 'age', operator: 'equals', value: 30 },
            ],
        };
        const row = { age: 30 };
        expect(evaluateCondition(rule, row)).toBe(true);
    });

    it('should return false for all rule when one fails', () => {
        const rule: Rule = {
            all: [
                { field: 'age', operator: 'equals', value: 30 },
                { field: 'status', operator: 'equals', value: 'active' },
            ],
        };
        const row = { age: 30, status: 'inactive' };
        expect(evaluateCondition(rule, row)).toBe(false);
    });

    it('should return true for all rule when all pass', () => {
        const rule: Rule = {
            all: [
                { field: 'age', operator: 'equals', value: 30 },
                { field: 'status', operator: 'equals', value: 'active' },
            ],
        };
        const row = { age: 30, status: 'active' };
        expect(evaluateCondition(rule, row)).toBe(true);
    });

    it('should return false if row is null', () => {
        const rule: Condition = { field: 'age', operator: 'equals', value: 30 };
        expect(evaluateCondition(rule, null as any)).toBe(false);
    });

    it('should throw if row is not object or array', () => {
        const rule: Condition = { field: 'age', operator: 'equals', value: 30 };
        expect(() => evaluateCondition(rule, 123 as any)).toThrow();
    });

    it('should evaluate array of rows (OR logic)', () => {
        const rule: Condition = { field: 'age', operator: 'equals', value: 30 };
        const rows = [{ age: 20 }, { age: 30 }];
        expect(evaluateCondition(rule, rows)).toBe(true);
    });

    it('should return false for unknown operator', () => {
        const rule = { field: 'age', operator: 'unknown', value: 30 } as any;
        const row = { age: 30 };
        expect(() => evaluateCondition(rule, row)).toThrow('Unknown operator: unknown');
    });
    it('should return false for empty array row', () => {
        const rule: Condition = { field: 'age', operator: 'equals', value: 30 };
        expect(evaluateCondition(rule, [])).toBe(false);
    });

    it('should return false for empty all group', () => {
        const rule: Rule = { all: [] };
        const row = { age: 30 };
        expect(evaluateCondition(rule, row)).toBe(true); // 根據 all 的語意，空陣列應為 true
    });

    it('should return false for empty any group', () => {
        const rule: Rule = { any: [] };
        const row = { age: 30 };
        expect(evaluateCondition(rule, row)).toBe(false); // 根據 any 的語意，空陣列應為 false
    });

    it('should return false if field does not exist in row', () => {
        const rule: Condition = { field: 'age', operator: 'equals', value: 30 };
        const row = {};
        expect(evaluateCondition(rule, row)).toBe(false);
    });

    it('should invert result with not property on single condition', () => {
        const rule: any = { ...{ field: 'age', operator: 'equals', value: 30 }, not: true };
        const row = { age: 30 };
        expect(evaluateCondition(rule as any, row)).toBe(false);
    });

    it('should invert result with not property on any group', () => {
        const rule: Rule = {
            any: [
                { field: 'age', operator: 'equals', value: 20 },
                { field: 'age', operator: 'equals', value: 30 },
            ],
            not: true,
        };
        const row = { age: 30 };
        expect(evaluateCondition(rule, row)).toBe(false);
    });

    it('should invert result with not property on all group', () => {
        const rule: Rule = {
            all: [
                { field: 'age', operator: 'equals', value: 30 },
                { field: 'status', operator: 'equals', value: 'active' },
            ],
            not: true,
        };
        const row = { age: 30, status: 'active' };
        expect(evaluateCondition(rule, row)).toBe(false);
    });

    it('should return true for not property on any group with empty array', () => {
        const rule: Rule = { any: [], not: true };
        const row = { age: 30 };
        expect(evaluateCondition(rule, row)).toBe(true);
    });

    it('should return false for not property on all group with empty array', () => {
        const rule: Rule = { all: [], not: true };
        const row = { age: 30 };
        expect(evaluateCondition(rule, row)).toBe(false);
    });
});
