# API Gateway Module Variables

variable "api_name" {
  description = "Name of the API Gateway"
  type        = string
  default     = "aah-api"
}

variable "domain_name" {
  description = "Custom domain name for the API"
  type        = string
}

variable "certificate_arn" {
  description = "ARN of the ACM certificate for the custom domain"
  type        = string
}

variable "cors_origins" {
  description = "Allowed CORS origins"
  type        = list(string)
  default     = ["*"]
}

variable "agent_questions_lambda_invoke_arn" {
  description = "Invoke ARN of the agent questions Lambda function"
  type        = string
}

variable "human_api_lambda_invoke_arn" {
  description = "Invoke ARN of the human API Lambda function"
  type        = string
}

variable "log_retention_days" {
  description = "CloudWatch log retention in days"
  type        = number
  default     = 14
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}
