const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
} = require("@aws-sdk/lib-dynamodb");

class DynamoUserRepository {
  constructor() {
    this.tableName = process.env.DYNAMO_TABLE_USERS;
    this.region = process.env.AWS_REGION;
    this.client = null;
  }

  async setup() {
    if (!this.tableName) {
      throw new Error(
        "DYNAMO_TABLE_USERS is required when DB_PROVIDER=dynamodb",
      );
    }

    if (!this.region) {
      throw new Error("AWS_REGION is required when DB_PROVIDER=dynamodb");
    }

    const baseClient = new DynamoDBClient({ region: this.region });
    this.client = DynamoDBDocumentClient.from(baseClient, {
      marshallOptions: { removeUndefinedValues: true },
    });
  }

  async findByEmail(email) {
    const response = await this.client.send(
      new GetCommand({
        TableName: this.tableName,
        Key: { email },
      }),
    );

    if (!response.Item) {
      return null;
    }

    return {
      id: response.Item.id,
      name: response.Item.name,
      email: response.Item.email,
      passwordHash: response.Item.passwordHash,
      createdAt: response.Item.createdAt,
    };
  }

  async createUser(user) {
    try {
      await this.client.send(
        new PutCommand({
          TableName: this.tableName,
          Item: {
            id: user.id,
            name: user.name,
            email: user.email,
            passwordHash: user.passwordHash,
            createdAt: user.createdAt,
          },
          ConditionExpression: "attribute_not_exists(email)",
        }),
      );
    } catch (error) {
      if (error && error.name === "ConditionalCheckFailedException") {
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

module.exports = { DynamoUserRepository };
