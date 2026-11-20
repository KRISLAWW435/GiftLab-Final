declare module 'bun:test' {
  export function describe(label: string, fn: () => void | Promise<void>): void;
  export function test(label: string, fn: () => void | Promise<void>): void;
  export function it(label: string, fn: () => void | Promise<void>): void;

  export interface Matchers<T> {
    toBe(expected: T): void;
    toEqual(expected: unknown): void;
    toMatchObject(expected: Record<string, unknown>): void;
    toBeGreaterThan(expected: number): void;
    toBeGreaterThanOrEqual(expected: number): void;
    toBeLessThan(expected: number): void;
    toBeLessThanOrEqual(expected: number): void;
    toBeCloseTo(expected: number, precision?: number): void;
    toContain(expected: unknown): void;
    toHaveLength(expected: number): void;
    toBeNull(): void;
    toBeUndefined(): void;
    toBeDefined(): void;
    toBeTruthy(): void;
    toBeFalsy(): void;
    toThrow(expected?: string | RegExp): void;
    readonly rejects: {
      toThrow(expected?: string | RegExp): Promise<void>;
    };
    readonly not: Matchers<T>;
  }

  export function expect<T>(actual: T): Matchers<T>;
}
