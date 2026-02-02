# Ask-a-Human Production Environment
# Reference: ADR-06 Infrastructure as Code

terraform {
  required_version = ">= 1.14.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket         = "aah-terraform-state-325062206315"
    key            = "prod/terraform.tfstate"
    region         = "us-west-1"
    encrypt        = true
    dynamodb_table = "aah-terraform-locks"
  }
}

# =============================================================================
# Provider Configuration
# =============================================================================
provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "ask-a-human"
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}

# =============================================================================
# Database Module
# Creates DynamoDB tables for questions, responses, subscriptions, user stats
# =============================================================================
module "database" {
  source = "../../modules/database"

  environment  = var.environment
  table_prefix = var.table_prefix

  tags = {
    Component = "database"
  }
}

# =============================================================================
# ACM Certificate
# SSL certificate for CloudFront and API Gateway custom domains
# DNS validation - records must be added manually at IONOS
# =============================================================================
resource "aws_acm_certificate" "main" {
  domain_name       = var.domain_name
  validation_method = "DNS"

  subject_alternative_names = [
    var.api_subdomain
  ]

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Name      = "aah-certificate"
    Component = "ssl"
  }
}

# =============================================================================
# Lambda Functions
# Backend API handlers for agent and human endpoints
# =============================================================================
module "lambda_agent_questions" {
  source = "../../modules/lambda"

  function_name = "aah-agent-questions"
  handler       = "src.handlers.agent_questions.handler"
  runtime       = "python3.13"
  source_dir    = "${path.module}/../../../../backend-app"

  memory_size = 256
  timeout     = 10

  environment_variables = {
    QUESTIONS_TABLE = module.database.questions_table_name
    RESPONSES_TABLE = module.database.responses_table_name
  }

  dynamo_table_arns = module.database.all_table_and_index_arns

  allow_apigw_invoke        = true
  api_gateway_execution_arn = module.api.api_execution_arn

  tags = {
    Component = "lambda"
    Handler   = "agent-questions"
  }
}

module "lambda_human_api" {
  source = "../../modules/lambda"

  function_name = "aah-human-api"
  handler       = "src.handlers.human_api.handler"
  runtime       = "python3.13"
  source_dir    = "${path.module}/../../../../backend-app"

  memory_size = 256
  timeout     = 10

  environment_variables = {
    QUESTIONS_TABLE = module.database.questions_table_name
    RESPONSES_TABLE = module.database.responses_table_name
  }

  dynamo_table_arns = module.database.all_table_and_index_arns

  allow_apigw_invoke        = true
  api_gateway_execution_arn = module.api.api_execution_arn

  tags = {
    Component = "lambda"
    Handler   = "human-api"
  }
}

# =============================================================================
# API Gateway
# HTTP API with custom domain and Lambda integrations
# =============================================================================
module "api" {
  source = "../../modules/api"

  api_name        = "aah-api"
  domain_name     = var.api_subdomain
  certificate_arn = aws_acm_certificate.main.arn

  cors_origins = [
    "https://${var.domain_name}",
    "https://www.${var.domain_name}",
  ]

  agent_questions_lambda_invoke_arn = module.lambda_agent_questions.invoke_arn
  human_api_lambda_invoke_arn       = module.lambda_human_api.invoke_arn

  tags = {
    Component = "api"
  }
}
