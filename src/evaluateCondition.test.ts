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
});
