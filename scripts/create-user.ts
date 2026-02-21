import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL || "file:./prisma/dev.db",
});

const prisma = new PrismaClient({ adapter });

type UserInput = {
  userId: string;
  email: string;
  password: string;
  vorname: string;
  nachname: string;
};

function readArg(name: string): string | undefined {
  const args = process.argv.slice(2);
  const key = `--${name}`;
  const index = args.indexOf(key);
  if (index < 0) return undefined;
  return args[index + 1];
}

function requiredOrDefault(value: string | undefined, fallback: string) {
  const v = value?.trim();
  return v && v.length > 0 ? v : fallback;
}

function parseInput(): UserInput {
  const generatedPassword = randomBytes(12).toString("base64url");

  return {
    userId: requiredOrDefault(readArg("userId"), "admin"),
    email: requiredOrDefault(readArg("email"), "admin@brapool.local"),
    password: requiredOrDefault(readArg("password"), generatedPassword),
    vorname: requiredOrDefault(readArg("vorname"), "Admin"),
    nachname: requiredOrDefault(readArg("nachname"), "User"),
  };
}

function printUsage() {
  console.log(
    "Usage: npm run create-user -- --userId admin --email admin@brapool.local --password <pass> --vorname Admin --nachname User"
  );
}

async function main() {
  if (process.argv.includes("--help")) {
    printUsage();
    return;
  }

  const { userId, email, password, vorname, nachname } = parseInput();

  if (password.length < 8) {
    throw new Error("Passwort muss mindestens 8 Zeichen haben.");
  }

  const hash = await bcrypt.hash(password, 12);

  const user = await prisma.user.upsert({
    where: { userId },
    create: {
      userId,
      email,
      vorname,
      nachname,
      password: hash,
    },
    update: {
      email,
      vorname,
      nachname,
      password: hash,
    },
    select: { id: true, userId: true, email: true },
  });

  console.log("User erstellt/aktualisiert:", user);
  console.log("Login:", { userId, password });
}

main()
  .catch((e) => {
    console.error("❌ create-user failed:", e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
