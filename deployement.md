# Deployment Guide

This document covers two different deployment setups for this project:

1. Azure + SQLite
2. AWS EC2 + DynamoDB

## 1) Azure + SQLite

Use this for quick deployments, demos, and low-traffic single-instance hosting.

### A. Prepare the app

```bash
npm install
```

Create your environment file (or set these in Azure App Settings):

```env
PORT=3000
NODE_ENV=production
JWT_SECRET=replace-with-a-long-random-secret
JWT_EXPIRES_IN=7d
COOKIE_SECURE=true

DB_PROVIDER=sqlite
SQLITE_DB_PATH=./data/app.db
```

### B. Deploy to Azure Web App (Linux)

1. Create a Web App with Node 18+ or Node 20 runtime.
2. Deploy code (GitHub Actions, Zip Deploy, or Local Git).
3. In App Settings, add all env values shown above.
4. Set Startup Command to:

```bash
node server.js
```

5. Ensure HTTPS is enabled (for secure cookies).

### C. Deploy to Azure VM

1. SSH into VM.
2. Install Node LTS.
3. Clone/copy your project.
4. Install dependencies:

```bash
npm install
```

5. Set env vars in shell or service config.
6. Start app:

```bash
node server.js
```

Optional production process manager:

```bash
npm i -g pm2
pm2 start server.js --name auth-app
pm2 save
```

### D. Notes for SQLite on Azure

1. SQLite uses a local file; this is best for single instance.
2. If you scale to multiple instances, each instance gets separate local file state.
3. For production scale, move to a managed DB.

## 2) AWS EC2 + DynamoDB

Use this for cloud-native NoSQL with managed database scaling.

### A. Create DynamoDB table

Create table with:

1. Table name: same as DYNAMO_TABLE_USERS
2. Partition key: email (String)
3. Billing mode: On-demand (recommended to start)

### B. Prepare environment variables on EC2

```env
PORT=3000
NODE_ENV=production
JWT_SECRET=replace-with-a-long-random-secret
JWT_EXPIRES_IN=7d
COOKIE_SECURE=true

DB_PROVIDER=dynamodb
AWS_REGION=ap-south-1
DYNAMO_TABLE_USERS=users
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
# Optional
# AWS_SESSION_TOKEN=your-session-token
```

Recommended: use an EC2 IAM Role instead of static access keys. If using IAM role, you can omit AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY.

### C. Deploy app on EC2

1. SSH into EC2 instance.
2. Install Node LTS.
3. Clone/copy the app.
4. Install dependencies:

```bash
npm install
```

5. Set env vars.
6. Start app:

```bash
node server.js
```

Optional process manager:

```bash
npm i -g pm2
pm2 start server.js --name auth-app
pm2 save
```

### D. Security group and reverse proxy

1. Open required inbound ports (typically 80/443).
2. Run app on internal port 3000.
3. Use Nginx/Apache as reverse proxy and TLS terminator.

## 3) Keep Same Code Across Both

Yes, this app is designed for that.

Only switch environment variables:

1. Azure + SQLite:
   DB_PROVIDER=sqlite and SQLITE_DB_PATH set.
2. EC2 + DynamoDB:
   DB_PROVIDER=dynamodb plus AWS and table envs.

No code change is required when moving between these two setups.

## 4) Quick Health Check

After deployment, verify:

1. `/login` loads
2. `/register` creates user
3. Login redirects to `/hero`
4. Logout returns to `/login`
