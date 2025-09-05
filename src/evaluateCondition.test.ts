// filepath: c:\project\home\render-rules\src\evaluateCondition.test.ts
import { evaluateCondition } from './evaluateCondition';
import { Condition, Rule } from './types';

describe('evaluateCondition - basic operators', () => {
    it('equals', () => {
        const rule: Condition = { field: 'age', operator: 'equals', value: 30 };
        expect(evaluateCondition(rule, { age: 30 })).toBe(true);
    });

    it('notEquals', () => {
        const rule: Condition = { field: 'status', operator: 'notEquals', value: 'active' };
        expect(evaluateCondition(rule, { status: 'active' })).toBe(false);
    });

    it('greaterThan / lessThan', () => {
        expect(evaluateCondition({ field: 'n', operator: 'greaterThan', value: 5 }, { n: 6 })).toBe(
            true,
        );
        expect(evaluateCondition({ field: 'n', operator: 'lessThan', value: 5 }, { n: 6 })).toBe(
            false,
        );
    });

    it('contains', () => {
        expect(
            evaluateCondition(
                { field: 'tags', operator: 'contains', value: 'a' },
                { tags: ['a', 'b'] },
            ),
        ).toBe(true);
        expect(
            evaluateCondition(
                { field: 'tags', operator: 'contains', value: 'c' },
                { tags: ['a', 'b'] },
            ),
        ).toBe(false);
    });

    it('startsWith / endsWith', () => {
        expect(
            evaluateCondition(
                { field: 'name', operator: 'startsWith', value: 'Jo' },
                { name: 'John' },
            ),
        ).toBe(true);
        expect(
            evaluateCondition(
                { field: 'name', operator: 'endsWith', value: 'son' },
                { name: 'John' },
            ),
        ).toBe(false);
    });

    it('in / notIn', () => {
        expect(
            evaluateCondition(
                { field: 'role', operator: 'in', value: ['admin'] },
                { role: 'admin' },
            ),
        ).toBe(true);
        expect(
            evaluateCondition(
                { field: 'role', operator: 'notIn', value: ['admin'] },
                { role: 'admin' },
            ),
        ).toBe(false);
    });

    it('any / all groups', () => {
        const anyRule: Rule = {
            any: [
                { field: 'x', operator: 'equals', value: 1 },
                { field: 'x', operator: 'equals', value: 2 },
            ],
        };
        const allRule: Rule = {
            all: [
                { field: 'a', operator: 'equals', value: 1 },
                { field: 'b', operator: 'equals', value: 2 },
            ],
        };
        expect(evaluateCondition(anyRule, { x: 2 })).toBe(true);
        expect(evaluateCondition(allRule, { a: 1, b: 2 })).toBe(true);
        expect(evaluateCondition(allRule, { a: 1, b: 3 })).toBe(false);
    });

    it('complex nested any/all combinations', () => {
        // Test: (age >= 18 AND (role = 'admin' OR role = 'user')) AND status = 'active'
        const complexRule: Rule = {
            all: [
                { field: 'age', operator: 'greaterThan', value: 17 },
                {
                    any: [
                        { field: 'role', operator: 'equals', value: 'admin' },
                        { field: 'role', operator: 'equals', value: 'user' },
                    ],
                },
                { field: 'status', operator: 'equals', value: 'active' },
            ],
        };

        // Should pass: age=25, role=admin, status=active
        expect(evaluateCondition(complexRule, { age: 25, role: 'admin', status: 'active' })).toBe(
            true,
        );

        // Should pass: age=20, role=user, status=active
        expect(evaluateCondition(complexRule, { age: 20, role: 'user', status: 'active' })).toBe(
            true,
        );

        // Should fail: age=16 (too young)
        expect(evaluateCondition(complexRule, { age: 16, role: 'admin', status: 'active' })).toBe(
            false,
        );

        // Should fail: role=guest (not admin or user)
        expect(evaluateCondition(complexRule, { age: 25, role: 'guest', status: 'active' })).toBe(
            false,
        );

        // Should fail: status=inactive
        expect(evaluateCondition(complexRule, { age: 25, role: 'admin', status: 'inactive' })).toBe(
            false,
        );
    });

    it('nested any within all within any', () => {
        // Test: ((name starts with 'A' OR name starts with 'B') AND age > 20) OR (role = 'admin')
        const deeplyNestedRule: Rule = {
            any: [
                {
                    all: [
                        {
                            any: [
                                { field: 'name', operator: 'startsWith', value: 'A' },
                                { field: 'name', operator: 'startsWith', value: 'B' },
                            ],
                        },
                        { field: 'age', operator: 'greaterThan', value: 20 },
                    ],
                },
                { field: 'role', operator: 'equals', value: 'admin' },
            ],
        };

        // Should pass: name=Alice, age=25 (matches first branch)
        expect(evaluateCondition(deeplyNestedRule, { name: 'Alice', age: 25 })).toBe(true);

        // Should pass: name=Bob, age=30 (matches first branch)
        expect(evaluateCondition(deeplyNestedRule, { name: 'Bob', age: 30 })).toBe(true);

        // Should pass: role=admin (matches second branch, regardless of name/age)
        expect(
            evaluateCondition(deeplyNestedRule, { name: 'Charlie', age: 15, role: 'admin' }),
        ).toBe(true);

        // Should fail: name=Charlie (doesn't start with A or B)
        expect(evaluateCondition(deeplyNestedRule, { name: 'Charlie', age: 25 })).toBe(false);

        // Should fail: name=Alice but age=15 (too young)
        expect(evaluateCondition(deeplyNestedRule, { name: 'Alice', age: 15 })).toBe(false);
    });

    it('mixed operators in complex conditions', () => {
        // Test: (score >= 80 AND (tags contains 'premium' OR tags contains 'vip')) AND (status in ['active', 'pending'])
        const mixedOperatorsRule: Rule = {
            all: [
                { field: 'score', operator: 'greaterThan', value: 79 },
                {
                    any: [
                        { field: 'tags', operator: 'contains', value: 'premium' },
                        { field: 'tags', operator: 'contains', value: 'vip' },
                    ],
                },
                { field: 'status', operator: 'in', value: ['active', 'pending'] },
            ],
        };

        // Should pass: score=85, tags=['premium', 'featured'], status='active'
        expect(
            evaluateCondition(mixedOperatorsRule, {
                score: 85,
                tags: ['premium', 'featured'],
                status: 'active',
            }),
        ).toBe(true);

        // Should pass: score=90, tags=['vip'], status='pending'
        expect(
            evaluateCondition(mixedOperatorsRule, {
                score: 90,
                tags: ['vip'],
                status: 'pending',
            }),
        ).toBe(true);

        // Should fail: score=75 (too low)
        expect(
            evaluateCondition(mixedOperatorsRule, {
                score: 75,
                tags: ['premium'],
                status: 'active',
            }),
        ).toBe(false);

        // Should fail: no premium or vip tags
        expect(
            evaluateCondition(mixedOperatorsRule, {
                score: 85,
                tags: ['basic'],
                status: 'active',
            }),
        ).toBe(false);

        // Should fail: status not in allowed list
        expect(
            evaluateCondition(mixedOperatorsRule, {
                score: 85,
                tags: ['premium'],
                status: 'inactive',
            }),
        ).toBe(false);
    });

    it('negation with complex nested conditions', () => {
        // Test: NOT ((age < 18) OR (role = 'guest'))
        const negatedComplexRule: Rule = {
            not: true,
            any: [
                { field: 'age', operator: 'lessThan', value: 18 },
                { field: 'role', operator: 'equals', value: 'guest' },
            ],
        };

        // Should pass: age=25, role=user (NOT (false OR false) = true)
        expect(evaluateCondition(negatedComplexRule, { age: 25, role: 'user' })).toBe(true);

        // Should fail: age=16 (NOT (true OR false) = false)
        expect(evaluateCondition(negatedComplexRule, { age: 16, role: 'user' })).toBe(false);

        // Should fail: role=guest (NOT (false OR true) = false)
        expect(evaluateCondition(negatedComplexRule, { age: 25, role: 'guest' })).toBe(false);

        // Should fail: age=16 AND role=guest (NOT (true OR true) = false)
        expect(evaluateCondition(negatedComplexRule, { age: 16, role: 'guest' })).toBe(false);
    });

    it('empty any => false, empty all => true', () => {
        expect(evaluateCondition({ any: [] }, { a: 1 } as any)).toBe(false);
        expect(evaluateCondition({ all: [] }, { a: 1 } as any)).toBe(true);
    });

    it('array rows OR logic', () => {
        const rule: Condition = { field: 'age', operator: 'equals', value: 30 };
        expect(evaluateCondition(rule, [{ age: 20 }, { age: 30 }])).toBe(true);
        expect(evaluateCondition(rule, [{ age: 20 }, { age: 25 }])).toBe(false);
    });

    it('null row => false', () => {
        expect(evaluateCondition({ field: 'age', operator: 'equals', value: 1 }, null as any)).toBe(
            false,
        );
    });

    it('non object row throws', () => {
        expect(() =>
            evaluateCondition({ field: 'age', operator: 'equals', value: 1 }, 5 as any),
        ).toThrow();
    });

    it('unknown operator throws', () => {
        expect(() =>
            evaluateCondition({ field: 'x', operator: '???', value: 1 } as any, { x: 1 }),
        ).toThrow('Unknown operator: ???');
    });

    it('not inversion (condition + groups)', () => {
        expect(
            evaluateCondition({ field: 'x', operator: 'equals', value: 1, not: true } as any, {
                x: 1,
            }),
        ).toBe(false);
        expect(
            evaluateCondition({ any: [{ field: 'x', operator: 'equals', value: 1 }], not: true }, {
                x: 1,
            } as any),
        ).toBe(false);
        expect(
            evaluateCondition({ all: [{ field: 'x', operator: 'equals', value: 1 }], not: true }, {
                x: 1,
            } as any),
        ).toBe(false);
    });
});

describe('evaluateCondition - date/time operators', () => {
    const BASE_ISO = '2024-01-01T10:00:00.000Z';
    const BEFORE_ISO = '2024-01-01T09:30:00.000Z';
    const AFTER_ISO = '2024-01-01T11:00:00.000Z';
    const BASE_TS = new Date(BASE_ISO).getTime();
    const BEFORE_TS = new Date(BEFORE_ISO).getTime();
    const AFTER_TS = new Date(AFTER_ISO).getTime();

    const make = (operator: Condition['operator'], value: any): Condition =>
        ({
            field: 'dt',
            operator,
            value,
        }) as Condition;

    describe('dateEquals', () => {
        it('true for identical ISO strings', () => {
            expect(evaluateCondition(make('dateEquals', BASE_ISO), { dt: BASE_ISO })).toBe(true);
        });
        it('true for Date vs timestamp', () => {
            expect(evaluateCondition(make('dateEquals', BASE_TS), { dt: new Date(BASE_ISO) })).toBe(
                true,
            );
        });
        it('false for different times', () => {
            expect(evaluateCondition(make('dateEquals', AFTER_ISO), { dt: BASE_ISO })).toBe(false);
        });
        it('false when either invalid', () => {
            expect(evaluateCondition(make('dateEquals', 'invalid'), { dt: BASE_ISO })).toBe(false);
            expect(evaluateCondition(make('dateEquals', BASE_ISO), { dt: 'invalid' })).toBe(false);
        });
    });

    describe('dateNotEquals', () => {
        it('true for different times', () => {
            expect(evaluateCondition(make('dateNotEquals', AFTER_ISO), { dt: BASE_ISO })).toBe(
                true,
            );
        });
        it('false for equal times', () => {
            expect(evaluateCondition(make('dateNotEquals', BASE_ISO), { dt: BASE_ISO })).toBe(
                false,
            );
        });
        it('false if any side invalid (implementation returns false)', () => {
            expect(evaluateCondition(make('dateNotEquals', 'invalid'), { dt: BASE_ISO })).toBe(
                false,
            );
        });
    });

    describe('dateAfter / dateBefore', () => {
        it('dateAfter true when row > value', () => {
            expect(evaluateCondition(make('dateAfter', BEFORE_ISO), { dt: BASE_ISO })).toBe(true);
        });
        it('dateAfter false when row == value', () => {
            expect(evaluateCondition(make('dateAfter', BASE_ISO), { dt: BASE_ISO })).toBe(false);
        });
        it('dateAfter false when row < value', () => {
            expect(evaluateCondition(make('dateAfter', AFTER_ISO), { dt: BASE_ISO })).toBe(false);
        });

        it('dateBefore true when row < value', () => {
            expect(evaluateCondition(make('dateBefore', AFTER_ISO), { dt: BASE_ISO })).toBe(true);
        });
        it('dateBefore false when row == value', () => {
            expect(evaluateCondition(make('dateBefore', BASE_ISO), { dt: BASE_ISO })).toBe(false);
        });
        it('dateBefore false when row > value', () => {
            expect(evaluateCondition(make('dateBefore', BEFORE_ISO), { dt: BASE_ISO })).toBe(false);
        });

        it('dateAfter false when invalid date', () => {
            expect(evaluateCondition(make('dateAfter', 'invalid'), { dt: BASE_ISO })).toBe(false);
        });
        it('dateBefore false when invalid date', () => {
            expect(evaluateCondition(make('dateBefore', 'invalid'), { dt: BASE_ISO })).toBe(false);
        });
    });

    describe('dateOnOrAfter / dateOnOrBefore', () => {
        it('dateOnOrAfter true for equal', () => {
            expect(evaluateCondition(make('dateOnOrAfter', BASE_ISO), { dt: BASE_ISO })).toBe(true);
        });
        it('dateOnOrAfter true for row after', () => {
            expect(evaluateCondition(make('dateOnOrAfter', BEFORE_ISO), { dt: BASE_ISO })).toBe(
                true,
            );
        });
        it('dateOnOrAfter false for row before', () => {
            expect(evaluateCondition(make('dateOnOrAfter', AFTER_ISO), { dt: BASE_ISO })).toBe(
                false,
            );
        });

        it('dateOnOrBefore true for equal', () => {
            expect(evaluateCondition(make('dateOnOrBefore', BASE_ISO), { dt: BASE_ISO })).toBe(
                true,
            );
        });
        it('dateOnOrBefore true for row before', () => {
            expect(evaluateCondition(make('dateOnOrBefore', AFTER_ISO), { dt: BASE_ISO })).toBe(
                true,
            );
        });
        it('dateOnOrBefore false for row after', () => {
            expect(evaluateCondition(make('dateOnOrBefore', BEFORE_ISO), { dt: BASE_ISO })).toBe(
                false,
            );
        });

        it('dateOnOrAfter false when invalid', () => {
            expect(evaluateCondition(make('dateOnOrAfter', 'invalid'), { dt: BASE_ISO })).toBe(
                false,
            );
        });
        it('dateOnOrBefore false when invalid', () => {
            expect(evaluateCondition(make('dateOnOrBefore', 'invalid'), { dt: BASE_ISO })).toBe(
                false,
            );
        });
    });

    describe('nowAfterPlusMinutes / nowBeforePlusMinutes', () => {
        const FIXED_NOW = new Date('2024-01-01T12:00:00.000Z').getTime();
        let nowSpy: jest.SpyInstance<number, []>;

        beforeAll(() => {
            nowSpy = jest.spyOn(Date, 'now').mockImplementation(() => FIXED_NOW);
        });
        afterAll(() => {
            nowSpy.mockRestore();
        });

        it('nowAfterPlusMinutes true when now > base+minutes', () => {
            const base = new Date(FIXED_NOW - 10 * 60_000).toISOString(); // 10m ago
            expect(evaluateCondition(make('nowAfterPlusMinutes', 5), { dt: base })).toBe(true);
        });

        it('nowAfterPlusMinutes false when now <= base+minutes', () => {
            const base = new Date(FIXED_NOW - 2 * 60_000).toISOString(); // 2m ago
            expect(evaluateCondition(make('nowAfterPlusMinutes', 5), { dt: base })).toBe(false);
        });

        it('nowBeforePlusMinutes true when now < base+minutes', () => {
            const base = new Date(FIXED_NOW - 2 * 60_000).toISOString(); // 2m ago
            expect(evaluateCondition(make('nowBeforePlusMinutes', 5), { dt: base })).toBe(true);
        });

        it('nowBeforePlusMinutes false when now >= base+minutes', () => {
            const base = new Date(FIXED_NOW - 10 * 60_000).toISOString(); // 10m ago
            expect(evaluateCondition(make('nowBeforePlusMinutes', 5), { dt: base })).toBe(false);
        });

        it('nowAfterPlusMinutes false when value not number', () => {
            expect(
                evaluateCondition(
                    { field: 'dt', operator: 'nowAfterPlusMinutes', value: '5' } as any,
                    { dt: new Date(FIXED_NOW).toISOString() },
                ),
            ).toBe(false);
        });

        it('nowBeforePlusMinutes false when base invalid', () => {
            expect(evaluateCondition(make('nowBeforePlusMinutes', 5), { dt: 'invalid-date' })).toBe(
                false,
            );
        });
    });

    describe('mixed types & arrays', () => {
        it('row timestamp number vs value ISO', () => {
            expect(evaluateCondition(make('dateEquals', BASE_ISO), { dt: BASE_TS })).toBe(true);
        });

        it('array of rows OR match for dateAfter', () => {
            const rule = make('dateAfter', BEFORE_ISO);
            const rows = [{ dt: BEFORE_ISO }, { dt: BASE_ISO }];
            expect(evaluateCondition(rule, rows as any)).toBe(true);
        });

        it('array of rows OR no match for dateAfter', () => {
            const rule = make('dateAfter', AFTER_ISO);
            const rows = [{ dt: BEFORE_ISO }, { dt: BASE_ISO }];
            expect(evaluateCondition(rule, rows as any)).toBe(false);
        });

        it('negation on date condition', () => {
            const rule = { ...make('dateEquals', BASE_ISO), not: true } as any;
            expect(evaluateCondition(rule, { dt: BASE_ISO })).toBe(false);
        });
    });

    describe('edge cases and additional scenarios', () => {
        it('handles different date formats', () => {
            // Test with different valid date formats
            const date1 = '2024-01-01T10:00:00Z';
            const date2 = '2024-01-01T10:00:00.000Z';
            const date3 = new Date('2024-01-01T10:00:00Z');

            expect(evaluateCondition(make('dateEquals', date1), { dt: date2 })).toBe(true);
            expect(evaluateCondition(make('dateEquals', date1), { dt: date3 })).toBe(true);
        });

        it('handles null and undefined values', () => {
            expect(evaluateCondition(make('dateEquals', BASE_ISO), { dt: null })).toBe(false);
            expect(evaluateCondition(make('dateEquals', BASE_ISO), { dt: undefined })).toBe(false);
            expect(evaluateCondition(make('dateEquals', null), { dt: BASE_ISO })).toBe(false);
            expect(evaluateCondition(make('dateEquals', undefined), { dt: BASE_ISO })).toBe(false);
        });

        it('handles empty string dates', () => {
            expect(evaluateCondition(make('dateEquals', ''), { dt: BASE_ISO })).toBe(false);
            expect(evaluateCondition(make('dateEquals', BASE_ISO), { dt: '' })).toBe(false);
        });

        it('handles non-date values gracefully', () => {
            expect(evaluateCondition(make('dateEquals', BASE_ISO), { dt: 'not-a-date' })).toBe(
                false,
            );
            expect(evaluateCondition(make('dateEquals', 'not-a-date'), { dt: BASE_ISO })).toBe(
                false,
            );
            expect(evaluateCondition(make('dateEquals', BASE_ISO), { dt: 123 })).toBe(false);
            expect(evaluateCondition(make('dateEquals', BASE_ISO), { dt: {} })).toBe(false);
        });

        it('handles negative minutes in nowAfterPlusMinutes/nowBeforePlusMinutes', () => {
            const FIXED_NOW = new Date('2024-01-01T12:00:00.000Z').getTime();
            const nowSpy = jest.spyOn(Date, 'now').mockImplementation(() => FIXED_NOW);

            try {
                // Test with negative minutes (going back in time)
                const base = new Date(FIXED_NOW + 5 * 60_000).toISOString(); // 5m in future
                expect(evaluateCondition(make('nowAfterPlusMinutes', -10), { dt: base })).toBe(
                    true,
                );
                expect(evaluateCondition(make('nowBeforePlusMinutes', -10), { dt: base })).toBe(
                    false,
                );
            } finally {
                nowSpy.mockRestore();
            }
        });

        it('handles zero minutes in nowAfterPlusMinutes/nowBeforePlusMinutes', () => {
            const FIXED_NOW = new Date('2024-01-01T12:00:00.000Z').getTime();
            const nowSpy = jest.spyOn(Date, 'now').mockImplementation(() => FIXED_NOW);

            try {
                const base = new Date(FIXED_NOW).toISOString(); // exactly now
                expect(evaluateCondition(make('nowAfterPlusMinutes', 0), { dt: base })).toBe(false);
                expect(evaluateCondition(make('nowBeforePlusMinutes', 0), { dt: base })).toBe(
                    false,
                );
            } finally {
                nowSpy.mockRestore();
            }
        });

        it('handles very large minute values', () => {
            const FIXED_NOW = new Date('2024-01-01T12:00:00.000Z').getTime();
            const nowSpy = jest.spyOn(Date, 'now').mockImplementation(() => FIXED_NOW);

            try {
                const base = new Date(FIXED_NOW - 1000 * 60_000).toISOString(); // 1000 minutes ago
                expect(evaluateCondition(make('nowAfterPlusMinutes', 500), { dt: base })).toBe(
                    true,
                );
                expect(evaluateCondition(make('nowBeforePlusMinutes', 500), { dt: base })).toBe(
                    false,
                );
            } finally {
                nowSpy.mockRestore();
            }
        });

        it('handles decimal minute values', () => {
            const FIXED_NOW = new Date('2024-01-01T12:00:00.000Z').getTime();
            const nowSpy = jest.spyOn(Date, 'now').mockImplementation(() => FIXED_NOW);

            try {
                const base = new Date(FIXED_NOW - 2.5 * 60_000).toISOString(); // 2.5 minutes ago
                expect(evaluateCondition(make('nowAfterPlusMinutes', 2), { dt: base })).toBe(true);
                expect(evaluateCondition(make('nowBeforePlusMinutes', 2), { dt: base })).toBe(
                    false,
                );
            } finally {
                nowSpy.mockRestore();
            }
        });
    });
});

describe('evaluateCondition - EvaluateOptions', () => {
    describe('treatMissingRowAsFalse option', () => {
        const rule: Condition = { field: 'age', operator: 'equals', value: 30 };

        it('default behavior (treatMissingRowAsFalse: true)', () => {
            expect(evaluateCondition(rule, null as any)).toBe(false);
            expect(evaluateCondition(rule, undefined as any)).toBe(false);
        });

        it('treatMissingRowAsFalse: false - throws error for null/undefined when no onError', () => {
            const options = { treatMissingRowAsFalse: false };
            expect(() => evaluateCondition(rule, null as any, options)).toThrow(
                'Row is null or undefined',
            );
            expect(() => evaluateCondition(rule, undefined as any, options)).toThrow(
                'Row is null or undefined',
            );
        });

        it('treatMissingRowAsFalse: true - returns false for null/undefined', () => {
            const options = { treatMissingRowAsFalse: true };
            expect(evaluateCondition(rule, null as any, options)).toBe(false);
            expect(evaluateCondition(rule, undefined as any, options)).toBe(false);
        });

        it('treatMissingRowAsFalse: false with onError - calls onError and returns false', () => {
            const onError = jest.fn();
            const options = { treatMissingRowAsFalse: false, onError };
            const rule: Condition = { field: 'age', operator: 'equals', value: 30 };

            const result = evaluateCondition(rule, null as any, options);

            expect(result).toBe(false);
            expect(onError).toHaveBeenCalledTimes(1);
            expect(onError).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: 'Row is null or undefined',
                }),
                { rule, row: null },
            );
        });

        it('works with complex nested rules', () => {
            const complexRule: Rule = {
                all: [
                    { field: 'age', operator: 'greaterThan', value: 18 },
                    { field: 'status', operator: 'equals', value: 'active' },
                ],
            };

            const options = { treatMissingRowAsFalse: false };
            expect(() => evaluateCondition(complexRule, null as any, options)).toThrow(
                'Row is null or undefined',
            );
            expect(() => evaluateCondition(complexRule, undefined as any, options)).toThrow(
                'Row is null or undefined',
            );
        });
    });

    describe('onError callback', () => {
        it('calls onError for unknown operator and returns false', () => {
            const onError = jest.fn();
            const options = { onError };
            const rule = { field: 'x', operator: 'unknown', value: 1 } as any;
            const row = { x: 1 };

            const result = evaluateCondition(rule, row, options);

            expect(result).toBe(false);
            expect(onError).toHaveBeenCalledTimes(1);
            expect(onError).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: 'Unknown operator: unknown',
                }),
                { rule, row },
            );
        });

        it('calls onError for invalid row type and returns false', () => {
            const onError = jest.fn();
            const options = { onError };
            const rule: Condition = { field: 'age', operator: 'equals', value: 30 };
            const row = 'not an object';

            const result = evaluateCondition(rule, row as any, options);

            expect(result).toBe(false);
            expect(onError).toHaveBeenCalledTimes(1);
            expect(onError).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: 'Row must be an object or an array of objects',
                }),
                { rule, row },
            );
        });

        it('calls onError for null row when treatMissingRowAsFalse is false', () => {
            const onError = jest.fn();
            const options = { treatMissingRowAsFalse: false, onError };
            const rule: Condition = { field: 'age', operator: 'equals', value: 30 };

            const result = evaluateCondition(rule, null as any, options);

            expect(result).toBe(false);
            expect(onError).toHaveBeenCalledTimes(1);
            expect(onError).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: 'Row is null or undefined',
                }),
                { rule, row: null },
            );
        });

        it('calls onError for invalid rule structure and returns false', () => {
            const onError = jest.fn();
            const options = { onError };
            const rule = { invalid: 'structure' } as any;
            const row = { age: 30 };

            const result = evaluateCondition(rule, row, options);

            expect(result).toBe(false);
            expect(onError).toHaveBeenCalledTimes(1);
            expect(onError).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: 'Rule must be a condition, any group, or all group',
                }),
                { rule, row },
            );
        });

        it('calls onError for invalid row in default case and returns false', () => {
            const onError = jest.fn();
            const options = { onError };
            const rule: Condition = { field: 'age', operator: 'equals', value: 30 };
            const row = 123; // invalid type

            const result = evaluateCondition(rule, row as any, options);

            expect(result).toBe(false);
            expect(onError).toHaveBeenCalledTimes(1);
            expect(onError).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: 'Row must be an object or an array of objects',
                }),
                { rule, row },
            );
        });

        it('does not call onError when evaluation succeeds', () => {
            const onError = jest.fn();
            const options = { onError };
            const rule: Condition = { field: 'age', operator: 'equals', value: 30 };
            const row = { age: 30 };

            const result = evaluateCondition(rule, row, options);

            expect(result).toBe(true);
            expect(onError).not.toHaveBeenCalled();
        });

        it('works with nested rules and error propagation', () => {
            const onError = jest.fn();
            const options = { onError };
            const rule: Rule = {
                all: [
                    { field: 'age', operator: 'equals', value: 30 },
                    { field: 'x', operator: 'unknown', value: 1 } as any,
                ],
            };
            const row = { age: 30 };

            const result = evaluateCondition(rule, row, options);

            expect(result).toBe(false);
            expect(onError).toHaveBeenCalledTimes(1);
            expect(onError).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: 'Unknown operator: unknown',
                }),
                { rule: { field: 'x', operator: 'unknown', value: 1 }, row },
            );
        });
    });

    describe('combined options', () => {
        it('both treatMissingRowAsFalse and onError work together', () => {
            const onError = jest.fn();
            const options = { treatMissingRowAsFalse: false, onError };
            const rule: Condition = { field: 'age', operator: 'equals', value: 30 };

            const result = evaluateCondition(rule, null as any, options);

            expect(result).toBe(false);
            expect(onError).toHaveBeenCalledTimes(1);
            expect(onError).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: 'Row is null or undefined',
                }),
                { rule, row: null },
            );
        });

        it('onError callback receives correct rule and row information', () => {
            const onError = jest.fn();
            const options = { onError };
            const rule: Rule = {
                any: [
                    { field: 'x', operator: 'unknown', value: 1 } as any,
                    { field: 'y', operator: 'equals', value: 2 },
                ],
            };
            const row = { y: 2 };

            const result = evaluateCondition(rule, row, options);

            expect(result).toBe(true); // Should be true because second condition passes
            expect(onError).toHaveBeenCalledTimes(1); // onError called for first condition error
            expect(onError).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: 'Unknown operator: unknown',
                }),
                { rule: { field: 'x', operator: 'unknown', value: 1 }, row },
            );
        });
    });

    describe('backward compatibility', () => {
        it('works without options parameter (backward compatibility)', () => {
            const rule: Condition = { field: 'age', operator: 'equals', value: 30 };
            const row = { age: 30 };

            // Should work exactly as before
            expect(evaluateCondition(rule, row)).toBe(true);
            expect(evaluateCondition(rule, null as any)).toBe(false);
        });

        it('works with empty options object', () => {
            const rule: Condition = { field: 'age', operator: 'equals', value: 30 };
            const row = { age: 30 };

            expect(evaluateCondition(rule, row, {})).toBe(true);
            expect(evaluateCondition(rule, null as any, {})).toBe(false);
        });

        it('works with partial options', () => {
            const rule: Condition = { field: 'age', operator: 'equals', value: 30 };
            const row = { age: 30 };

            // Only treatMissingRowAsFalse - should throw when no onError
            expect(() =>
                evaluateCondition(rule, null as any, { treatMissingRowAsFalse: false }),
            ).toThrow('Row is null or undefined');

            // Only onError
            const onError = jest.fn();
            expect(evaluateCondition(rule, row, { onError })).toBe(true);
            expect(onError).not.toHaveBeenCalled();
        });
    });

    describe('error handling edge cases', () => {
        it('handles onError callback that throws', () => {
            const onError = jest.fn().mockImplementation(() => {
                throw new Error('Callback error');
            });
            const options = { onError };
            const rule = { field: 'x', operator: 'unknown', value: 1 } as any;
            const row = { x: 1 };

            // Should throw because onError callback throws
            expect(() => evaluateCondition(rule, row, options)).toThrow('Callback error');
            expect(onError).toHaveBeenCalled();
        });

        it('handles onError callback that returns a value', () => {
            const onError = jest.fn().mockReturnValue('ignored return value');
            const options = { onError };
            const rule = { field: 'x', operator: 'unknown', value: 1 } as any;
            const row = { x: 1 };

            const result = evaluateCondition(rule, row, options);

            expect(result).toBe(false); // Should still return false
            expect(onError).toHaveBeenCalled();
        });

        it('handles multiple errors in nested rules', () => {
            const onError = jest.fn();
            const options = { onError };
            const rule: Rule = {
                all: [
                    { field: 'x', operator: 'unknown1', value: 1 } as any,
                    { field: 'y', operator: 'unknown2', value: 2 } as any,
                ],
            };
            const row = { x: 1, y: 2 };

            const result = evaluateCondition(rule, row, options);

            expect(result).toBe(false);
            // Should call onError for the first error encountered
            expect(onError).toHaveBeenCalledTimes(1);
        });
    });
});
