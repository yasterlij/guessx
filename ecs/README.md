# Guess X ECS Deployment Guide

This directory contains ECS Fargate task definitions and deployment tools for running Guess X microservices and web application in Amazon ECS.

---

## 1. Container Images in GitHub Container Registry (GHCR)

All production images are built for `linux/amd64` and hosted on GitHub Container Registry:

| Service | GHCR Image Repository | Default Port | CPU / Memory |
| :--- | :--- | :--- | :--- |
| **Identity Service** | `ghcr.io/yasterlij/takelow/identity-service:latest` | `3000` | 512 / 1024 MiB |
| **Auction Engine** | `ghcr.io/yasterlij/takelow/auction-engine:latest` | `3000` | 512 / 1024 MiB |
| **Query Service** | `ghcr.io/yasterlij/takelow/query-service:latest` | `3000` | 512 / 1024 MiB |
| **Guess X Web** | `ghcr.io/yasterlij/takelow/takelow-web:latest` | `80` | 256 / 512 MiB |

Every build is tagged with both `:latest` and the specific git commit SHA (e.g. `:66c467cfec4044ad8663f09bae86c7ef573084f5`).

---

## 2. Directory Structure

```text
ecs/
├── README.md
└── task-definitions/
    ├── identity-service.json   # Auth, wallet, notifications
    ├── auction-engine.json     # Bidding, timer, real-time Socket.IO, payment callbacks
    ├── query-service.json      # Read queries, active/closed auction listings
    ├── takelow-web.json        # Nginx reverse proxy + Vite SPA
    └── migrate.json            # Standalone migration task (db:migrate)
```

---

## 3. Standalone Deployment with `deploy-ecs.sh`

The deployment script [`scripts/deploy-ecs.sh`](file:///Users/tamrat/Documents/Code/takelow/scripts/deploy-ecs.sh) can be run standalone locally or inside CI/CD. It automatically sources `.env.production` or `.env` if present.

### Prerequisites

- AWS CLI v2 configured with IAM credentials having ECS & Application Load Balancer permissions:
  ```bash
  aws configure
  # or export AWS_ACCESS_KEY_ID=... AWS_SECRET_ACCESS_KEY=... AWS_REGION=us-east-1
  ```
- `jq` installed (`brew install jq`)

### Commands

#### Preview deployment plan (dry run)
```bash
bash scripts/deploy-ecs.sh --dry-run
```

#### Deploy all services to ECS cluster
```bash
bash scripts/deploy-ecs.sh --cluster takelow-cluster --tag latest
```

#### Deploy specific commit SHA
```bash
bash scripts/deploy-ecs.sh --cluster takelow-cluster --tag 66c467cfec4044ad8663f09bae86c7ef573084f5
```

#### Register task definitions only (without updating active services)
```bash
bash scripts/deploy-ecs.sh --register-only
```

#### Update services without waiting for service stability
```bash
bash scripts/deploy-ecs.sh --no-wait
```

---

## 4. Running Database Migrations as a Standalone Fargate Task

Database migrations can be triggered directly as a one-off task on Fargate:

```bash
aws ecs run-task \
  --cluster takelow-cluster \
  --task-definition takelow-migrate \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[\"$SUBNET_ID\"],securityGroups=[\"$SECURITY_GROUP_ID\"],assignPublicIp=ENABLED}"
```

---

## 5. Environment Variables & AWS Secrets Reference

Configure these in AWS Systems Manager Parameter Store or AWS Secrets Manager:

- `SECRET_DATABASE_URL`: Citus / Postgres primary connection string
- `SECRET_REDIS_URL`: Redis cluster connection string
- `SECRET_JWT_SECRET`: HS256 secret (identical across identity, auction, and query services)
- `SECRET_JWT_REFRESH_SECRET`: Refresh token signing secret
- `SECRET_INTERNAL_API_KEY`: Inter-service communication API key
- `SECRET_BID_ENCRYPTION_KEY`: AES-256 bid encryption key
- `SECRET_AWASH_MERCHANT_ID`: Awash Bank merchant ID
- `SECRET_AWASH_SECRET_KEY`: Awash Bank secret key
- `SECRET_AWASH_WEBHOOK_SECRET`: Awash Bank webhook HMAC secret
