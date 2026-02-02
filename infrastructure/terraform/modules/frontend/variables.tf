# Frontend Module Variables
# S3 bucket and CloudFront distribution for static website hosting

variable "bucket_name" {
  description = "Name of the S3 bucket for frontend assets"
  type        = string
}

variable "domain_name" {
  description = "Domain name for the CloudFront distribution (e.g., ask-a-human.com)"
  type        = string
}

variable "certificate_arn" {
  description = "ARN of the ACM certificate in us-east-1 for CloudFront"
  type        = string
}

variable "api_domain" {
  description = "API domain for CORS (e.g., api.ask-a-human.com)"
  type        = string
  default     = ""
}

variable "price_class" {
  description = "CloudFront distribution price class"
  type        = string
  default     = "PriceClass_100" # US, Canada, Europe only (cheapest)
}

variable "tags" {
  description = "Additional tags to apply to resources"
  type        = map(string)
  default     = {}
}
