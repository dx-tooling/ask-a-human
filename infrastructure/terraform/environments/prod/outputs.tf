# Production Environment Outputs

# =============================================================================
# Database Outputs
# =============================================================================
output "questions_table_name" {
  description = "Name of the questions DynamoDB table"
  value       = module.database.questions_table_name
}

output "responses_table_name" {
  description = "Name of the responses DynamoDB table"
  value       = module.database.responses_table_name
}

output "subscriptions_table_name" {
  description = "Name of the subscriptions DynamoDB table"
  value       = module.database.subscriptions_table_name
}

output "user_stats_table_name" {
  description = "Name of the user stats DynamoDB table"
  value       = module.database.user_stats_table_name
}

output "all_table_arns" {
  description = "List of all DynamoDB table ARNs"
  value       = module.database.all_table_arns
}

# =============================================================================
# ACM Certificate Outputs
# =============================================================================
output "acm_certificate_arn" {
  description = "ARN of the ACM certificate"
  value       = aws_acm_certificate.main.arn
}

output "acm_certificate_status" {
  description = "Status of the ACM certificate"
  value       = aws_acm_certificate.main.status
}

# =============================================================================
# DNS Validation Records for IONOS
# Add these CNAME records at IONOS to validate the certificate
# =============================================================================
output "acm_validation_records" {
  description = "DNS CNAME records to add at IONOS for certificate validation"
  value = {
    for dvo in aws_acm_certificate.main.domain_validation_options : dvo.domain_name => {
      name  = dvo.resource_record_name
      type  = dvo.resource_record_type
      value = dvo.resource_record_value
    }
  }
}

output "ionos_dns_instructions" {
  description = "Instructions for adding DNS records at IONOS"
  value       = <<-EOT
    
    ============================================================
    MANUAL STEP REQUIRED: Add DNS records at IONOS
    ============================================================
    
    To validate the ACM certificate, add the following CNAME records
    at IONOS DNS management for ask-a-human.com:
    
    1. Log into IONOS (https://my.ionos.com)
    2. Go to Domains & SSL -> ask-a-human.com -> DNS
    3. Add the CNAME records shown in 'acm_validation_records' output
    4. Wait 5-30 minutes for validation to complete
    
    The certificate will transition from "Pending validation" to "Issued"
    once the DNS records are verified.
    
    Check status with: aws acm describe-certificate --certificate-arn <ARN>
    ============================================================
  EOT
}

# =============================================================================
# Lambda Outputs
# =============================================================================
output "lambda_agent_questions_arn" {
  description = "ARN of the agent questions Lambda function"
  value       = module.lambda_agent_questions.function_arn
}

output "lambda_human_api_arn" {
  description = "ARN of the human API Lambda function"
  value       = module.lambda_human_api.function_arn
}

# =============================================================================
# API Gateway Outputs
# =============================================================================
output "api_endpoint" {
  description = "Default API Gateway endpoint URL"
  value       = module.api.api_endpoint
}

output "api_custom_domain" {
  description = "Custom domain for the API"
  value       = module.api.custom_domain_name
}

output "api_custom_domain_target" {
  description = "Target domain for CNAME record at IONOS"
  value       = module.api.custom_domain_target
}

output "api_dns_instructions" {
  description = "Instructions for configuring API DNS at IONOS"
  value       = <<-EOT
    
    ============================================================
    MANUAL STEP REQUIRED: Add API DNS record at IONOS
    ============================================================
    
    To enable the custom domain api.ask-a-human.com:
    
    1. Log into IONOS (https://my.ionos.com)
    2. Go to Domains & SSL -> ask-a-human.com -> DNS
    3. Add a CNAME record:
       - Name: api
       - Value: ${module.api.custom_domain_target}
    4. Wait 5-30 minutes for DNS propagation
    
    Test with: curl https://api.ask-a-human.com/human/questions
    ============================================================
  EOT
}
