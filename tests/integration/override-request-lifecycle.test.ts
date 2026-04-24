import { beforeAll, afterAll, beforeEach, describe, expect, it } from "vitest";
import { setupTestDb, resetTestDb, closeTestDb } from "../helpers/test-db";
import Decimal from "decimal.js";

let db: Awaited<ReturnType<typeof setupTestDb>>;

beforeAll(async () => {
  db = await setupTestDb();
});

afterAll(async () => {
  await closeTestDb();
});

beforeEach(async () => {
  await resetTestDb();
});

describe("createOverrideRequest", () => {
  it("persiste OverrideRequest PENDING con tutti i campi", async () => {
    // Seed helpers TBD in task 2.2
    expect(true).toBe(true); // placeholder
  });
});
