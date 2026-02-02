# Lambda Module Variables

variable "function_name" {
  description = "Name of the Lambda function"
  type        = string
}

variable "handler" {
  description = "Lambda handler (e.g., src.handlers.agent_questions.handler)"
  type        = string
}

variable "runtime" {
  description = "Lambda runtime (e.g., python3.13)"
  type        = string
  default     = "python3.13"
}

variable "source_dir" {
  description = "Path to the source directory to package"
  type        = string
}

variable "memory_size" {
  description = "Lambda memory in MB"
  type        = number
  default     = 256
}

variable "timeout" {
  description = "Lambda timeout in seconds"
  type        = number
  default     = 10
}

variable "environment_variables" {
  description = "Environment variables for the Lambda function"
  type        = map(string)
  default     = {}
}

variable "dynamo_table_arns" {
  description = "List of DynamoDB table ARNs the Lambda can access (includes indexes)"
  type        = list(string)
  default     = []
}

variable "log_retention_days" {
  description = "CloudWatch log retention in days"
  type        = number
  default     = 14
}

variable "allow_apigw_invoke" {
  description = "Whether to allow API Gateway to invoke this function"
  type        = bool
  default     = true
}

variable "api_gateway_execution_arn" {
  description = "API Gateway execution ARN for Lambda permission"
  type        = string
  default     = ""
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}
