import type { components } from "./generated/schema";

/**
 * REST contract types, generated from the server's OpenAPI spec (`pnpm gen:api`).
 * Entities alias their DTO types to these so a server-side rename or removal
 * shows up as a type error here instead of drifting silently.
 *
 *   type User = ApiSchema<"UserResponse">;
 */
export type ApiSchemas = components["schemas"];
export type ApiSchema<K extends keyof ApiSchemas> = ApiSchemas[K];

/**
 * True when a hand-narrowed client type (literal unions where the server sends
 * plain strings) has exactly the server DTO's fields and every value fits it.
 * Pair with AssertTrue for a compile error:
 *
 *   type _Check = AssertTrue<FitsContract<Appearance, ApiSchema<"AppearanceDto">>>;
 */
export type FitsContract<Client, Server> = [Client] extends [Server]
  ? [keyof Client] extends [keyof Server]
    ? [keyof Server] extends [keyof Client]
      ? true
      : false
    : false
  : false;

export type AssertTrue<T extends true> = T;
