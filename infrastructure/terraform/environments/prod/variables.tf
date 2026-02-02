# Production Environment Variables

variable "aws_region" {
  description = "AWS region for all resources"
  type        = string
  default     = "us-west-1"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "prod"
}

variable "domain_name" {
  description = "Primary domain name for the application"
  type        = string
  default     = "ask-a-human.com"
}

variable "api_subdomain" {
  description = "Subdomain for the API"
  type        = string
  default     = "api.ask-a-human.com"
}

variable "table_prefix" {
  description = "Prefix for DynamoDB table names"
  type        = string
  default     = "aah"
}
