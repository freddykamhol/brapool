-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Waesche" (
    "systemId" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "barcode" TEXT NOT NULL,
    "kategorie" TEXT NOT NULL,
    "groesse" TEXT NOT NULL,
    "cws" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'EINGELAGERT',
    "bemerkung" TEXT,
    "eingelagertAm" DATETIME,
    "ausgetragenVon" TEXT,
    "ausgegebenAn" TEXT,
    "ausgabeDatum" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Waesche" ("ausgabeDatum", "ausgegebenAn", "ausgetragenVon", "barcode", "bemerkung", "createdAt", "eingelagertAm", "groesse", "kategorie", "status", "systemId", "updatedAt") SELECT "ausgabeDatum", "ausgegebenAn", "ausgetragenVon", "barcode", "bemerkung", "createdAt", "eingelagertAm", "groesse", "kategorie", "status", "systemId", "updatedAt" FROM "Waesche";
DROP TABLE "Waesche";
ALTER TABLE "new_Waesche" RENAME TO "Waesche";
CREATE UNIQUE INDEX "Waesche_barcode_key" ON "Waesche"("barcode");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
