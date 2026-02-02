# ADR-06: Infrastructure as Code

**Status:** Accepted  
**Date:** 2026-02-02  
**Deciders:** Project Team

## Context

The Ask-a-Human platform runs on AWS serverless infrastructure. We need:
- Reproducible deployments
- Version-controlled infrastructure
- Environment parity (dev/staging/prod)
- Documented infrastructure decisions

## Decision

### Tool: Terraform

We will use **Terraform** for infrastructure as code.

**Rationale:**
- Cloud-agnostic (though we're AWS-focused)
- Declarative configuration
- Strong AWS provider support
- State management built-in
- Widely adopted, well-documented

**Version:** Terraform 1.14.4 (available at `/usr/local/bin/terraform-1.14.4`)

---

## AWS Account Structure

| Account | ID | Purpose |
|---------|-----|---------|
| IAM | 343194324802 | Identity management |
| Infra | 325062206315 | Production workloads |

**Region:** `us-west-1`

**Access:**
- IAM user: `manuel@kiessling.net`
- Role: `AccountManager@infra-webapp-prod`
- Switch role URL: `https://signin.aws.amazon.com/switchrole?roleName=AccountManager&account=325062206315`

---

## Module Structure

```
infrastructure/
├── terraform/
│   ├── environments/
│   │   ├── dev/
│   │   │   ├── main.tf
│   │   │   ├── variables.tf
│   │   │   └── terraform.tfvars
│   │   └── prod/
│   │       ├── main.tf
│   │       ├── variables.tf
│   │       └── terraform.tfvars
│   ├── modules/
│   │   ├── api/
│   │   │   ├── main.tf
│   │   │   ├── variables.tf
│   │   │   └── outputs.tf
│   │   ├── database/
│   │   │   ├── main.tf
│   │   │   ├── variables.tf
│   │   │   └── outputs.tf
│   │   ├── frontend/
│   │   │   ├── main.tf
│   │   │   ├── variables.tf
│   │   │   └── outputs.tf
│   │   ├── notifications/
│   │   │   ├── main.tf
│   │   │   ├── variables.tf
│   │   │   └── outputs.tf
│   │   └── monitoring/
│   │       ├── main.tf
│   │       ├── variables.tf
│   │       └── outputs.tf
│   └── shared/
│       └── backend.tf
└── scripts/
    ├── deploy.sh
    └── destroy.sh
```

---

## Module Responsibilities

### api/
- API Gateway (HTTP API)
- Lambda functions
- IAM roles for Lambda
- Custom domain configuration

### database/
- DynamoDB tables (Questions, Responses, Subscriptions, UserStats)
- GSIs
- IAM policies for table access

### frontend/
- S3 bucket for static assets
- CloudFront distribution
- ACM certificate
- Custom domain (aah.dx-tooling.org)

### notifications/
- SQS queue for notification jobs
- Lambda function (notification dispatcher)
- IAM role for FCM access
- Secrets Manager for FCM credentials

### monitoring/
- CloudWatch alarms
- CloudWatch dashboards
- Log groups
- SNS topics for alerts

---

## Domain Configuration

**Domain:** `aah.dx-tooling.org`  
**DNS Provider:** IONOS (not Route53)

### SSL Certificate (ACM)

Since DNS is not in Route53, we use DNS validation with manual CNAME records:

```hcl
resource "aws_acm_certificate" "main" {
  domain_name       = "aah.dx-tooling.org"
  validation_method = "DNS"
  
  subject_alternative_names = [
    "api.aah.dx-tooling.org"
  ]
  
  lifecycle {
    create_before_destroy = true
  }
}

output "acm_validation_records" {
  description = "DNS records to add at IONOS for certificate validation"
  value = {
    for dvo in aws_acm_certificate.main.domain_validation_options : dvo.domain_name => {
      name  = dvo.resource_record_name
      type  = dvo.resource_record_type
      value = dvo.resource_record_value
    }
  }
}
```

**Manual Step:** After running Terraform, add the output CNAME records at IONOS.

### CloudFront Distribution

```hcl
resource "aws_cloudfront_distribution" "frontend" {
  aliases = ["aah.dx-tooling.org"]
  
  origin {
    domain_name = aws_s3_bucket.frontend.bucket_regional_domain_name
    origin_id   = "S3-frontend"
    
    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.frontend.cloudfront_access_identity_path
    }
  }
  
  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "S3-frontend"
    viewer_protocol_policy = "redirect-to-https"
    
    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }
  }
  
  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate.main.arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }
}

output "cloudfront_domain" {
  description = "CloudFront domain - create CNAME at IONOS pointing aah.dx-tooling.org to this"
  value       = aws_cloudfront_distribution.frontend.domain_name
}
```

### API Gateway Custom Domain

```hcl
resource "aws_apigatewayv2_domain_name" "api" {
  domain_name = "api.aah.dx-tooling.org"
  
  domain_name_configuration {
    certificate_arn = aws_acm_certificate.main.arn
    endpoint_type   = "REGIONAL"
    security_policy = "TLS_1_2"
  }
}

output "api_gateway_domain" {
  description = "API Gateway domain - create CNAME at IONOS pointing api.aah.dx-tooling.org to this"
  value       = aws_apigatewayv2_domain_name.api.domain_name_configuration[0].target_domain_name
}
```

---

## State Management

### Backend Configuration

```hcl
# shared/backend.tf
terraform {
  backend "s3" {
    bucket         = "aah-terraform-state"
    key            = "terraform.tfstate"
    region         = "us-west-1"
    encrypt        = true
    dynamodb_table = "aah-terraform-locks"
  }
}
```

### State Bucket Bootstrap

Created manually before first Terraform run:

```bash
aws s3api create-bucket \
  --bucket aah-terraform-state \
  --region us-west-1 \
  --create-bucket-configuration LocationConstraint=us-west-1

aws dynamodb create-table \
  --table-name aah-terraform-locks \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region us-west-1
```

---

## Secrets Management

### Local Secrets

Secrets are stored locally in the `secrets/` directory (not committed to git):

| File | Description |
|------|-------------|
| `secrets/AWS.txt` | AWS access keys for IAM user |
| `secrets/ask-a-human-poc-firebase-adminsdk-fbsvc-3a666671a0.json` | Firebase Admin SDK service account |

See [Infrastructure Accounts](../fundamentals/01-available-infrastructure-accounts-and-services.md) for details.

### Firebase Credentials

FCM service account credentials stored in AWS Secrets Manager:

```hcl
resource "aws_secretsmanager_secret" "fcm_credentials" {
  name = "aah/fcm-service-account"
}

# Value set manually or via CLI (using actual secrets file):
# aws secretsmanager put-secret-value \
#   --secret-id aah/fcm-service-account \
#   --secret-string file://secrets/ask-a-human-poc-firebase-adminsdk-fbsvc-3a666671a0.json
```

Lambda retrieves at runtime:

```python
import boto3
import json

def get_fcm_credentials():
    client = boto3.client('secretsmanager')
    response = client.get_secret_value(SecretId='aah/fcm-service-account')
    return json.loads(response['SecretString'])
```

---

## Deployment Workflow

### Initial Setup

```bash
# 1. Bootstrap state bucket (one-time)
./scripts/bootstrap-state.sh

# 2. Initialize Terraform
cd infrastructure/terraform/environments/prod
terraform init

# 3. Plan and apply
terraform plan -out=tfplan
terraform apply tfplan

# 4. Add DNS records at IONOS (manual)
# - CNAME for certificate validation
# - CNAME for aah.dx-tooling.org → CloudFront
# - CNAME for api.aah.dx-tooling.org → API Gateway

# 5. Wait for certificate validation
aws acm wait certificate-validated \
  --certificate-arn <certificate-arn>
```

### Ongoing Deployments

```bash
# Infrastructure changes
cd infrastructure/terraform/environments/prod
terraform plan -out=tfplan
terraform apply tfplan

# Application code (Lambda)
./scripts/deploy-lambda.sh

# Frontend (S3)
./scripts/deploy-frontend.sh
```

---

## IAM Roles

### Lambda Execution Role

```hcl
resource "aws_iam_role" "lambda_execution" {
  name = "aah-lambda-execution"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "lambda.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_basic" {
  role       = aws_iam_role.lambda_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "lambda_dynamodb" {
  name = "dynamodb-access"
  role = aws_iam_role.lambda_execution.id
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem",
        "dynamodb:Query",
        "dynamodb:Scan"
      ]
      Resource = [
        aws_dynamodb_table.questions.arn,
        "${aws_dynamodb_table.questions.arn}/index/*",
        aws_dynamodb_table.responses.arn,
        "${aws_dynamodb_table.responses.arn}/index/*",
        aws_dynamodb_table.subscriptions.arn,
        "${aws_dynamodb_table.subscriptions.arn}/index/*",
        aws_dynamodb_table.user_stats.arn,
        "${aws_dynamodb_table.user_stats.arn}/index/*"
      ]
    }]
  })
}
```

---

## Environment Variables

### Lambda Environment

```hcl
resource "aws_lambda_function" "api" {
  # ...
  
  environment {
    variables = {
      ENVIRONMENT          = var.environment
      QUESTIONS_TABLE      = aws_dynamodb_table.questions.name
      RESPONSES_TABLE      = aws_dynamodb_table.responses.name
      SUBSCRIPTIONS_TABLE  = aws_dynamodb_table.subscriptions.name
      USER_STATS_TABLE     = aws_dynamodb_table.user_stats.name
      FCM_SECRET_ARN       = aws_secretsmanager_secret.fcm_credentials.arn
      NOTIFICATION_QUEUE   = aws_sqs_queue.notifications.url
    }
  }
}
```

---

## Alternatives Considered

### AWS CDK
- **Pros:** TypeScript, higher-level constructs
- **Cons:** AWS-specific, synthesizes to CloudFormation
- **Decision:** Terraform is more portable and widely understood

### Serverless Framework
- **Pros:** Simple Lambda deployment
- **Cons:** Limited to Lambda/API Gateway, less flexible
- **Decision:** Terraform provides more control over all resources

### CloudFormation
- **Pros:** Native AWS, no external tools
- **Cons:** Verbose YAML/JSON, slower iteration
- **Decision:** Terraform has better developer experience

### Pulumi
- **Pros:** Real programming languages
- **Cons:** Smaller community, state management complexity
- **Decision:** Terraform's HCL is sufficient and more widely known

## Consequences

### Positive
- Infrastructure is version controlled
- Reproducible environments
- Clear documentation of what's deployed
- Easy to review changes via PR

### Negative
- Learning curve for Terraform
- State management requires care
- Manual DNS step for IONOS

### Risks
- State file corruption (mitigated by S3 + DynamoDB locking)
- Drift between code and reality (mitigated by `terraform plan`)

## Related Documents

- [ADR-01: System Architecture](01-system-architecture.md)
- [Infrastructure Accounts](../fundamentals/01-available-infrastructure-accounts-and-services.md)
