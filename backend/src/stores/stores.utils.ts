import { BadRequestException } from '@nestjs/common';

export function parseBigIntId(value: string, fieldName = 'id'): bigint {
  try {
    return BigInt(value);
  } catch {
    throw new BadRequestException(`${fieldName} must be a bigint string`);
  }
}

export function serializeBigInts<T>(value: T): T {
  if (typeof value === 'bigint') {
    return value.toString() as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => serializeBigInts(item)) as T;
  }

  if (value instanceof Date || value === null || value === undefined) {
    return value;
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).map(
      ([key, item]) => [key, serializeBigInts(item)],
    );
    return Object.fromEntries(entries) as T;
  }

  return value;
}

export function toBoolean(
  value: unknown,
  defaultValue?: boolean,
): boolean | undefined {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
  }

  return defaultValue;
}
