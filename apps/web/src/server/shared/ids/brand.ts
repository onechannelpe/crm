import type { ColumnType } from "kysely";

declare const idBrand: unique symbol;

export type BrandedId<Name extends string> = string & {
  readonly [idBrand]: Name;
};

export type GeneratedId<TId extends string> = ColumnType<
  TId,
  TId | string | undefined,
  TId | string
>;

export type IdColumn<TId extends string> = ColumnType<
  TId,
  TId | string,
  TId | string
>;

export type NullableIdColumn<TId extends string> = ColumnType<
  TId | null,
  TId | string | null,
  TId | string | null
>;
