import { describe, expect, it } from "vitest";
import { auditLogRetentionWhere } from "./retention";

describe("auditLogRetentionWhere", () => {
  it("preserva lo stato persistente del cutover storico", () => {
    const cutoff = new Date("2028-07-19T12:00:00.000Z");

    expect(auditLogRetentionWhere(cutoff)).toEqual({
      timestamp: { lt: cutoff },
      NOT: {
        entity: "DeploymentCutover",
        entityId: "historical-email-v1",
      },
    });
  });
});
