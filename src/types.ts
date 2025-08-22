type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never };
type XOR<T, U> = T | U extends object ? (Without<T, U> & U) | (Without<U, T> & T) : T | U;

export type Rule = XOR<Any, All> & { not?: boolean };

export type Any = {
    any: Rule[] | Condition[];
};

export type All = {
    all: Rule[] | Condition[];
};

export type Condition = {
    field: string;
    operator: Operator;
    value: any;
};

export type Operator =
    | 'equals'
    | 'notEquals'
    | 'greaterThan'
    | 'lessThan'
    | 'contains'
    | 'startsWith'
    | 'endsWith'
    | 'in'
    | 'notIn'
    // 日期 / 時間新增:
    | 'dateEquals'
    | 'dateNotEquals'
    | 'dateAfter'
    | 'dateBefore'
    | 'dateOnOrAfter'
    | 'dateOnOrBefore'
    | 'nowAfterPlusMinutes'
    | 'nowBeforePlusMinutes';

export type anyObject = Record<string, any>;
