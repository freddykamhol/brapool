-- CreateTable
CREATE TABLE "Waesche" (
    "systemId" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "barcode" TEXT NOT NULL,
    "kategorie" TEXT NOT NULL,
    "groesse" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'EINGELAGERT',
    "bemerkung" TEXT,
    "eingelagertAm" DATETIME,
    "ausgetragenVon" TEXT,
    "ausgegebenAn" TEXT,
    "ausgabeDatum" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "WaescheLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'INFO',
    "message" TEXT NOT NULL,
    "waescheSystemId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WaescheLog_waescheSystemId_fkey" FOREIGN KEY ("waescheSystemId") REFERENCES "Waesche" ("systemId") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Waesche_barcode_key" ON "Waesche"("barcode");

-- CreateIndex
CREATE INDEX "WaescheLog_createdAt_idx" ON "WaescheLog"("createdAt");

-- CreateIndex
CREATE INDEX "WaescheLog_severity_idx" ON "WaescheLog"("severity");

-- CreateIndex
CREATE INDEX "WaescheLog_type_idx" ON "WaescheLog"("type");
