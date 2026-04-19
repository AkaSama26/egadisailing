/**
 * Vitest setup file — caricato prima di ogni test file.
 * Carica .env per avere DATABASE_URL disponibile ai test integration.
 */
import { config } from "dotenv";
import { resolve } from "node:path";

config({ path: resolve(__dirname, "../../.env") });
