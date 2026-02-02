# API Gateway Module Outputs

output "api_id" {
  description = "ID of the HTTP API"
  value       = aws_apigatewayv2_api.main.id
}

output "api_endpoint" {
  description = "Default endpoint URL of the API"
  value       = aws_apigatewayv2_api.main.api_endpoint
}

output "api_execution_arn" {
  description = "Execution ARN for Lambda permissions"
  value       = aws_apigatewayv2_api.main.execution_arn
}

output "custom_domain_name" {
  description = "Custom domain name"
  value       = aws_apigatewayv2_domain_name.api.domain_name
}

output "custom_domain_target" {
  description = "Target domain name for DNS CNAME record (API Gateway regional domain)"
  value       = aws_apigatewayv2_domain_name.api.domain_name_configuration[0].target_domain_name
}

output "custom_domain_hosted_zone_id" {
  description = "Hosted zone ID for Route53 alias records"
  value       = aws_apigatewayv2_domain_name.api.domain_name_configuration[0].hosted_zone_id
}

output "stage_invoke_url" {
  description = "Invoke URL for the default stage"
  value       = aws_apigatewayv2_stage.default.invoke_url
}

output "log_group_name" {
  description = "Name of the CloudWatch log group"
  value       = aws_cloudwatch_log_group.api.name
}
