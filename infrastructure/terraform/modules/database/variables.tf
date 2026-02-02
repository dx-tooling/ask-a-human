# Database Module Variables

variable "environment" {
  description = "Environment name (e.g., prod, dev)"
  type        = string
}

variable "table_prefix" {
  description = "Prefix for DynamoDB table names"
  type        = string
  default     = "aah"
}

variable "tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default     = {}
}
