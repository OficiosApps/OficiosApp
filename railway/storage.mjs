import { DatabaseSync } from "node:sqlite";
import { createHash, randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, readdirSync } from "node:fs";
import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { resolve, dirname, sep, join } from "node:path";
import { fileURLToPath } from "node:url";
import { defaultMarketConfig } from "../worker/market-settings.mjs";

const project = fileURLToPath(new URL("../", import.meta.url));
export function openStorage(dataDir) {
  const root = resolve(dataDir);
  mkdirSync(root, { recursive: true, mode: 0o700 });
  const sqlite = new DatabaseSync(join(root, "oficios.sqlite"), {
    enableDoubleQuotedStringLiterals: true,
  });
  sqlite.exec("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;");
  sqlite.exec(
    "CREATE TABLE IF NOT EXISTS railway_migrations(name TEXT PRIMARY KEY, sha256 TEXT NOT NULL, applied_at INTEGER NOT NULL)",
  );
  const migrations = readdirSync(join(project, "drizzle"))
    .filter((n) => n.endsWith(".sql"))
    .sort()
    .map((n) => ["drizzle/" + n, readFileSync(join(project, "drizzle", n), "utf8")]);
  migrations.push(["railway/auth.sql", readFileSync(join(project, "railway/auth.sql"), "utf8")]);
  for (const [name, sql] of migrations) {
    const hash = createHash("sha256").update(sql).digest("hex");
    const prior = sqlite.prepare("SELECT sha256 FROM railway_migrations WHERE name = ?").get(name);
    if (prior) {
      if (prior.sha256 !== hash) throw new Error("Una migración aplicada cambió: " + name);
      continue;
    }
    sqlite.exec("BEGIN IMMEDIATE");
    try {
      sqlite.exec(sql);
      sqlite.prepare("INSERT INTO railway_migrations VALUES(?,?,?)").run(name, hash, Date.now());
      sqlite.exec("COMMIT");
    } catch (error) {
      sqlite.exec("ROLLBACK");
      throw error;
    }
  }
  // Only configuration is seeded. Never create identities, jobs or staff accounts.
  sqlite
    .prepare(
      "INSERT INTO market_settings(setting_key,body,version,update_token,updated_by,updated_at) VALUES('commercial',?,0,?,'system:seed',?) ON CONFLICT(setting_key) DO NOTHING",
    )
    .run(JSON.stringify(defaultMarketConfig()), randomUUID(), Date.now());
  function prepare(sql, values = []) {
    return {
      bind(...params) {
        return prepare(sql, params);
      },
      async first(column) {
        const row = sqlite.prepare(sql).get(...values);
        return column ? (row?.[column] ?? null) : (row ?? null);
      },
      async all() {
        return { results: sqlite.prepare(sql).all(...values) };
      },
      runSync() {
        return { meta: { changes: Number(sqlite.prepare(sql).run(...values).changes) } };
      },
      async run() {
        return this.runSync();
      },
    };
  }
  const DB = {
    prepare,
    async batch(statements) {
      sqlite.exec("BEGIN IMMEDIATE");
      try {
        const result = statements.map((s) => s.runSync());
        sqlite.exec("COMMIT");
        return result;
      } catch (error) {
        sqlite.exec("ROLLBACK");
        throw error;
      }
    },
  };
  const files = join(root, "uploads");
  mkdirSync(files, { recursive: true, mode: 0o700 });
  const filePath = (key) => {
    if (
      typeof key !== "string" ||
      !key ||
      key.includes("\\") ||
      key.includes("\0") ||
      key.split("/").some((part) => part === ".." || part === ".")
    )
      throw new Error("Clave de archivo inválida");
    const target = resolve(files, key);
    if (!target.startsWith(files + sep)) throw new Error("Clave de archivo inválida");
    return target;
  };
  const BUCKET = {
    async put(key, bytes) {
      const target = filePath(key),
        temporary = target + "." + randomUUID() + ".tmp";
      await mkdir(dirname(target), { recursive: true, mode: 0o700 });
      try {
        await writeFile(temporary, bytes, { mode: 0o600 });
        await rename(temporary, target);
      } finally {
        await unlink(temporary).catch((e) => {
          if (e.code !== "ENOENT") throw e;
        });
      }
    },
    async get(key) {
      try {
        return { body: await readFile(filePath(key)) };
      } catch (error) {
        if (error.code === "ENOENT") return null;
        throw error;
      }
    },
    async delete(key) {
      try {
        await unlink(filePath(key));
      } catch (error) {
        if (error.code !== "ENOENT") throw error;
      }
    },
  };
  return { DB, BUCKET, sqlite, close: () => sqlite.close() };
}
