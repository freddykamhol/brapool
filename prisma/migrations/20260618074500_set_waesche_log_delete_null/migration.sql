PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_WaescheLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'INFO',
    "message" TEXT NOT NULL,
    "waescheSystemId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WaescheLog_waescheSystemId_fkey" FOREIGN KEY ("waescheSystemId") REFERENCES "Waesche" ("systemId") ON DELETE SET NULL ON UPDATE CASCADE
);

INSERT INTO "new_WaescheLog" ("createdAt", "id", "message", "severity", "type", "waescheSystemId")
SELECT "createdAt", "id", "message", "severity", "type", "waescheSystemId" FROM "WaescheLog";

DROP TABLE "WaescheLog";
ALTER TABLE "new_WaescheLog" RENAME TO "WaescheLog";

CREATE INDEX "WaescheLog_createdAt_idx" ON "WaescheLog"("createdAt");
CREATE INDEX "WaescheLog_severity_idx" ON "WaescheLog"("severity");
CREATE INDEX "WaescheLog_type_idx" ON "WaescheLog"("type");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
