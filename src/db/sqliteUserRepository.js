const fs = require("fs");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();

class SQLiteUserRepository {
  constructor() {
    this.dbPath = process.env.SQLITE_DB_PATH || "./data/app.db";
    this.db = null;
  }

  async setup() {
    const absoluteDbPath = path.resolve(process.cwd(), this.dbPath);
    const dbFolder = path.dirname(absoluteDbPath);

    if (!fs.existsSync(dbFolder)) {
      fs.mkdirSync(dbFolder, { recursive: true });
    }

    this.db = new sqlite3.Database(absoluteDbPath);

    await this.run(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        created_at TEXT NOT NULL
      )
    `);
  }

  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function onRun(error) {
        if (error) {
          return reject(error);
        }
        return resolve(this);
      });
    });
  }

  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (error, row) => {
        if (error) {
          return reject(error);
        }
        return resolve(row || null);
      });
    });
  }

  async findByEmail(email) {
    const row = await this.get(
      "SELECT id, name, email, password_hash, created_at FROM users WHERE email = ?",
      [email],
    );

    if (!row) {
      return null;
    }

    return {
      id: row.id,
      name: row.name,
      email: row.email,
      passwordHash: row.password_hash,
      createdAt: row.created_at,
    };
  }

  async createUser(user) {
    try {
      await this.run(
        "INSERT INTO users (id, name, email, password_hash, created_at) VALUES (?, ?, ?, ?, ?)",
        [user.id, user.name, user.email, user.passwordHash, user.createdAt],
      );
    } catch (error) {
      if (error && error.code === "SQLITE_CONSTRAINT") {
        const duplicateError = new Error("Email already exists");
        duplicateError.code = "USER_EXISTS";
        throw duplicateError;
      }
      throw error;
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      passwordHash: user.passwordHash,
      createdAt: user.createdAt,
    };
  }
}

module.exports = { SQLiteUserRepository };
