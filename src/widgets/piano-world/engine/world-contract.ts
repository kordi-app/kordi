import contract from "./world-contract.json";

/**
 * The rules the server enforces and this client is built to, from
 * world-contract.json — the same file as the server's
 * src/main/resources/world-contract.json (CI fails when they differ; change
 * both together). Read the server's numbers from here; never copy them.
 */
export const WORLD_CONTRACT = contract;

/** The socket protocol this client speaks (sent on connect as ?v=) */
export const PROTOCOL_VERSION: number = contract.protocol;
