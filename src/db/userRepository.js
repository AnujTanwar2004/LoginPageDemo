const { SQLiteUserRepository } = require("./sqliteUserRepository");
const { DynamoUserRepository } = require("./dynamoUserRepository");

function createUserRepository() {
  const provider = String(process.env.DB_PROVIDER || "sqlite").toLowerCase();

  if (provider === "dynamodb") {
    return new DynamoUserRepository();
  }

  return new SQLiteUserRepository();
}

module.exports = { createUserRepository };
