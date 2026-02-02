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
