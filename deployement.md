# Deployment Guide - Complete Setup Instructions

This document covers two different deployment setups for this project:

1. **Azure + SQLite** - Single instance hosting
2. **AWS EC2 + DynamoDB** - Cloud-native NoSQL

---

## 1) Azure + SQLite Deployment

Use this for quick deployments, demos, and low-traffic single-instance hosting.

### Step 1: Initial Setup (Local Machine or Azure VM)

#### 1.1 Create data directory

```bash
mkdir -p ./data
```

#### 1.2 Copy environment template

```bash
cp .env.example .env
```

Edit `.env` with your values:

```env
PORT=3000
NODE_ENV=production
JWT_SECRET=your-super-secret-key-min-32-chars-CHANGE-THIS
JWT_EXPIRES_IN=7d
COOKIE_SECURE=true

DB_PROVIDER=sqlite
SQLITE_DB_PATH=./data/app.db
```

#### 1.3 Install dependencies

```bash
npm install
```

#### 1.4 Start the app (SQLite auto-creates)

```bash
node server.js
```

The database file will be created automatically at `./data/app.db` on first run.

### Step 2: Create and Register Users

#### Option A: Via Browser UI

1. Open `http://localhost:3000/register`
2. Fill in fields:
   - Name: Your full name
   - Email: your@email.com
   - Password: minimum 8 characters
3. Click "Register"
4. You will be logged in and redirected to `/hero` (congratulations page)

#### Option B: Via curl (for testing/automation)

```bash
curl -X POST http://localhost:3000/api/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Vinay Raj",
    "email": "vinay@example.com",
    "password": "SecurePassword123"
  }'
```

Expected response:

```json
{
  "user": {
    "id": "a1b2c3d4-e5f6-7g8h-9i0j-k1l2m3n4o5p6",
    "name": "Vinay Raj",
    "email": "vinay@example.com"
  }
}
```

### Step 3: View All Registered Users in SQLite

Check database for all users:

```bash
# If using default path ./data/app.db
sqlite3 ./data/app.db "SELECT id, name, email, created_at FROM users ORDER BY created_at DESC;"
```

Example output:

```
id                                    | name      | email             | created_at
a1b2c3d4-e5f6-7g8h-9i0j-k1l2m3n4o5p6 | Vinay Raj | vinay@example.com | 2026-04-20T19:34:51.000Z
```

To see all users with password hashes (for debugging):

```bash
sqlite3 ./data/app.db "SELECT * FROM users;"
```

### Step 4: Test Login Flow

1. Go to `http://localhost:3000/login`
2. Enter your registered email and password
3. Click "Login"
4. You should see `/hero` page with:
   - Congratulations message
   - Your name displayed
   - Your email shown
   - Logout button

### Step 5: Deploy to Azure Web App

#### Prerequisites:

- Azure Web App created with Node 18+ or Node 20 runtime
- GitHub repository or local git setup

#### Deployment steps:

1. **Set Environment Variables in Azure Portal:**
   - Go to App Service > Configuration > Application settings
   - Add each key-value pair:
     - PORT = 3000
     - NODE_ENV = production
     - JWT_SECRET = (use strong random value)
     - JWT_EXPIRES_IN = 7d
     - COOKIE_SECURE = true
     - DB_PROVIDER = sqlite
     - SQLITE_DB_PATH = ./data/app.db
   - Click Save

2. **Set Startup Command:**
   - Go to App Service > Configuration > General settings
   - Startup Command: `node server.js`
   - Save

3. **Deploy code:**
   - Via GitHub Actions: Push to repo, Action auto-deploys
   - Via Zip Deploy: `az webapp deployment source config-zip --resource-group ... --name ... --src ...`
   - Via Local Git: `git push azure main`

4. **After deployment, create first user:**

   ```bash
   curl -X POST https://your-app-name.azurewebsites.net/api/register \
     -H "Content-Type: application/json" \
     -d '{
       "name": "Your Name",
       "email": "you@example.com",
       "password": "YourPassword123"
     }'
   ```

5. **Access your app:**
   - Login page: `https://your-app-name.azurewebsites.net/login`
   - Register page: `https://your-app-name.azurewebsites.net/register`
   - Hero page (after login): `https://your-app-name.azurewebsites.net/hero`

6. **View users in Azure:**
   - Web App has local `/data/app.db` file
   - SSH into Kudu console: `https://your-app-name.scm.azurewebsites.net`
   - Run: `sqlite3 /home/site/wwwroot/data/app.db "SELECT * FROM users;"`

### Step 6: Deploy to Azure VM (Linux)

#### Prerequisites:

- Azure VM with Ubuntu/Debian or CentOS/RHEL
- SSH access configured
- Inbound port 3000 open in NSG

#### Step-by-step deployment:

1. **SSH into VM:**

   ```bash
   ssh azureuser@your-vm-public-ip
   ```

2. **Install Node.js (if not already installed):**

   For Ubuntu/Debian:

   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

   Or using NVM:

   ```bash
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
   source ~/.bashrc
   nvm install 20
   ```

3. **Clone/copy project to VM:**

   ```bash
   git clone https://github.com/your-username/AzureWithDb.git
   cd AzureWithDb
   ```

4. **Set up environment variables:**

   ```bash
   cp .env.example .env
   nano .env
   ```

   Edit with your values.

5. **Install dependencies:**

   ```bash
   npm install
   ```

6. **Create data directory for SQLite:**

   ```bash
   mkdir -p ./data
   ```

7. **Start app with PM2 (process manager):**

   ```bash
   npm install -g pm2
   pm2 start server.js --name auth-app
   pm2 save
   pm2 startup
   ```

8. **Verify app is running:**

   ```bash
   pm2 logs auth-app --lines 20
   curl http://localhost:3000/login
   ```

9. **Open Azure NSG firewall rule for port 3000:**
   - Go to Azure Portal > VM > Networking > Add inbound port rule
   - Source: Any
   - Source port ranges: \*
   - Destination: Any
   - Destination port ranges: 3000
   - Protocol: TCP
   - Action: Allow
   - Priority: 300

10. **Access from your browser:**

    ```
    http://your-vm-public-ip:3000/login
    ```

11. **Create first user:**

    ```bash
    curl -X POST http://localhost:3000/api/register \
      -H "Content-Type: application/json" \
      -d '{
        "name": "Test User",
        "email": "test@example.com",
        "password": "TestPassword123"
      }'
    ```

12. **View all users in SQLite (on VM):**

    ```bash
    sqlite3 ./data/app.db "SELECT id, name, email, created_at FROM users ORDER BY created_at DESC;"
    ```

13. **Backup database (recommended):**
    ```bash
    cp ./data/app.db ./data/app.db.backup.$(date +%Y%m%d_%H%M%S)
    ```

---

## 2) AWS EC2 + DynamoDB Deployment

Use this for cloud-native NoSQL with managed database scaling.

### Step 1: Create DynamoDB Table in AWS

1. Go to AWS Console > DynamoDB > Tables
2. Click "Create Table"
3. Table settings:
   - **Table name**: `users` (or set in DYNAMO_TABLE_USERS env var)
   - **Partition key**: `email` (String type)
   - **Billing mode**: On-demand (recommended for variable workloads)
   - Leave other settings as default
4. Click "Create Table"
5. Wait for table status to show "Active"

DynamoDB will auto-create attributes (id, name, passwordHash, createdAt) when users are added.

### Step 2: Create IAM User (if not using EC2 Role)

#### Option A: Using EC2 IAM Role (Recommended - more secure)

1. Go to AWS Console > IAM > Roles
2. Create role:
   - Trusted entity: EC2
   - Attach policy: "AmazonDynamoDBFullAccess" or custom policy
3. Attach role to EC2 instance
4. Skip AWS credentials in .env

#### Option B: Using IAM User (Less secure)

1. Go to AWS Console > IAM > Users
2. Create user: `dynamodb-app-user`
3. Attach inline policy:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": ["dynamodb:PutItem", "dynamodb:GetItem", "dynamodb:Scan"],
         "Resource": "arn:aws:dynamodb:ap-south-1:123456789:table/users"
       }
     ]
   }
   ```
4. Create access keys
5. Store in .env

### Step 3: Launch and Configure EC2 Instance

1. **SSH into EC2:**

   ```bash
   ssh ec2-user@your-ec2-public-ip
   ```

2. **Install Node.js:**

   ```bash
   curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
   sudo yum install -y nodejs
   ```

3. **Clone project:**

   ```bash
   git clone https://github.com/your-username/AzureWithDb.git
   cd AzureWithDb
   ```

4. **Create .env file:**

   ```bash
   cp .env.example .env
   nano .env
   ```

   Edit for DynamoDB:

   ```env
   PORT=3000
   NODE_ENV=production
   JWT_SECRET=your-strong-secret-key-CHANGE-THIS
   JWT_EXPIRES_IN=7d
   COOKIE_SECURE=true

   DB_PROVIDER=dynamodb
   AWS_REGION=ap-south-1
   DYNAMO_TABLE_USERS=users
   AWS_ACCESS_KEY_ID=your-access-key
   AWS_SECRET_ACCESS_KEY=your-secret-key
   # Skip above if using EC2 IAM role
   ```

5. **Install dependencies:**

   ```bash
   npm install
   ```

6. **Start with PM2:**

   ```bash
   npm install -g pm2
   pm2 start server.js --name auth-app
   pm2 save
   pm2 startup
   ```

7. **Verify running:**

   ```bash
   pm2 logs auth-app
   curl http://localhost:3000/login
   ```

8. **Open Security Group for port 3000:**
   - Go to EC2 > Security Groups > Select your group
   - Inbound rule:
     - Type: Custom TCP
     - Port range: 3000
     - Source: 0.0.0.0/0 (or your IP)

### Step 4: Register Users in DynamoDB

1. **Create first user via curl:**

   ```bash
   curl -X POST http://localhost:3000/api/register \
     -H "Content-Type: application/json" \
     -d '{
       "name": "EC2 User",
       "email": "ec2user@example.com",
       "password": "EC2Password123"
     }'
   ```

2. **View all users in DynamoDB:**

   From EC2 terminal:

   ```bash
   aws dynamodb scan \
     --table-name users \
     --region ap-south-1 \
     --output table
   ```

   From AWS Console:
   - Go to DynamoDB > Tables > users > Explore items
   - All registered users visible with attributes

### Step 5: Set Up Nginx Reverse Proxy (Optional but Recommended)

For production access on port 80:

1. **Install Nginx:**

   ```bash
   sudo yum install -y nginx
   sudo systemctl start nginx
   sudo systemctl enable nginx
   ```

2. **Create Nginx config:**

   ```bash
   sudo nano /etc/nginx/conf.d/app.conf
   ```

   Add:

   ```nginx
   server {
     listen 80;
     server_name _;

     location / {
       proxy_pass http://127.0.0.1:3000;
       proxy_set_header Host $host;
       proxy_set_header X-Real-IP $remote_addr;
       proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
     }
   }
   ```

3. **Test and reload:**

   ```bash
   sudo nginx -t
   sudo systemctl reload nginx
   ```

4. **Open port 80 in Security Group**
5. **Access via:** `http://your-ec2-ip` (port 80)

---

## 3) Switching Between Azure SQLite and EC2 DynamoDB

Same code, different databases - just change environment variables!

### Azure + SQLite

```env
DB_PROVIDER=sqlite
SQLITE_DB_PATH=./data/app.db
```

### EC2 + DynamoDB

```env
DB_PROVIDER=dynamodb
AWS_REGION=ap-south-1
DYNAMO_TABLE_USERS=users
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx
```

No code changes required. App auto-detects database provider via env vars.

---

## 4) Post-Deployment Health Checks

### SQLite (Azure VM)

```bash
# 1. Check app running
pm2 status

# 2. View app logs
pm2 logs auth-app --lines 20

# 3. Check database file exists
ls -lh ./data/app.db

# 4. List all users
sqlite3 ./data/app.db "SELECT id, name, email, created_at FROM users;"

# 5. Test register endpoint
curl -X POST http://localhost:3000/api/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@test.com","password":"Test12345"}'

# 6. Test login endpoint
curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"Test12345"}'
```

### DynamoDB (EC2)

```bash
# 1. Check app running
pm2 status

# 2. View app logs
pm2 logs auth-app --lines 20

# 3. Check AWS connectivity
aws dynamodb describe-table --table-name users --region ap-south-1

# 4. List all users
aws dynamodb scan --table-name users --region ap-south-1

# 5. Test register endpoint
curl -X POST http://localhost:3000/api/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@test.com","password":"Test12345"}'

# 6. Test login endpoint
curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"Test12345"}'
```

---

## 5) Troubleshooting

### SQLite Issues

**Database not found:**

```bash
mkdir -p ./data
node server.js  # Creates DB on first run
```

**Check database path:**

```bash
echo $SQLITE_DB_PATH
node -e "const p=require('path'); console.log(p.resolve(process.env.SQLITE_DB_PATH || './data/app.db'))"
```

**View database file size:**

```bash
ls -lh ./data/app.db
```

### DynamoDB Issues

**Connection refused:**

```bash
# Verify AWS credentials
aws sts get-caller-identity

# Check table exists
aws dynamodb describe-table --table-name users --region ap-south-1
```

**Permission denied:**

- Check IAM policy attached to EC2 role
- Ensure it includes `dynamodb:PutItem`, `dynamodb:GetItem`, `dynamodb:Scan`

### Port Issues

**Port 3000 already in use:**

```bash
lsof -i :3000
kill -9 <PID>
# Or use different port: PORT=3001 node server.js
```

**Cannot access from browser:**

- Check Azure NSG / AWS Security Group
- Verify inbound rule for port 3000
- Test locally: `curl http://localhost:3000/login`

### Hero Page Issues

**"Loading..." stays forever:**

- Check browser console (F12 > Console tab)
- Verify auth cookie set: `document.cookie` in console
- Check network tab for `/api/me` errors
- Verify JWT_SECRET matches server value

**Redirect loop between login/hero:**

- Check JWT token validity
- Verify `JWT_SECRET` is set correctly
- Check `COOKIE_SECURE=true` if using HTTPS

---

## 6) Monitoring and Logs

### Azure Web App

- Logs: Azure Portal > App Service > Logs
- Real-time: `az webapp up --logs`

### Azure VM

```bash
# View app logs
pm2 logs auth-app

# System logs
sudo journalctl -u pm2-azureuser

# Check memory/CPU
top
```

### AWS EC2

```bash
# View app logs
pm2 logs auth-app

# System logs
sudo tail -f /var/log/cloud-init-output.log

# Check memory/CPU
top

# CloudWatch logs (if configured)
aws logs tail /aws/ec2/app-logs --follow
```
