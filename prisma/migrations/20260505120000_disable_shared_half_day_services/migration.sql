UPDATE "Service"
SET "active" = false,
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" IN ('boat-shared-morning', 'boat-shared-afternoon');
