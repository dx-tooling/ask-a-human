# Database Module Outputs

# Table Names
output "questions_table_name" {
  description = "Name of the questions DynamoDB table"
  value       = aws_dynamodb_table.questions.name
}

output "responses_table_name" {
  description = "Name of the responses DynamoDB table"
  value       = aws_dynamodb_table.responses.name
}

output "subscriptions_table_name" {
  description = "Name of the subscriptions DynamoDB table"
  value       = aws_dynamodb_table.subscriptions.name
}

output "user_stats_table_name" {
  description = "Name of the user stats DynamoDB table"
  value       = aws_dynamodb_table.user_stats.name
}

# Table ARNs
output "questions_table_arn" {
  description = "ARN of the questions DynamoDB table"
  value       = aws_dynamodb_table.questions.arn
}

output "responses_table_arn" {
  description = "ARN of the responses DynamoDB table"
  value       = aws_dynamodb_table.responses.arn
}

output "subscriptions_table_arn" {
  description = "ARN of the subscriptions DynamoDB table"
  value       = aws_dynamodb_table.subscriptions.arn
}

output "user_stats_table_arn" {
  description = "ARN of the user stats DynamoDB table"
  value       = aws_dynamodb_table.user_stats.arn
}

# All table ARNs (for IAM policies)
output "all_table_arns" {
  description = "List of all DynamoDB table ARNs"
  value = [
    aws_dynamodb_table.questions.arn,
    aws_dynamodb_table.responses.arn,
    aws_dynamodb_table.subscriptions.arn,
    aws_dynamodb_table.user_stats.arn,
  ]
}

# All table ARNs with GSI suffix (for IAM policies)
output "all_table_and_index_arns" {
  description = "List of all DynamoDB table and index ARNs for IAM policies"
  value = [
    aws_dynamodb_table.questions.arn,
    "${aws_dynamodb_table.questions.arn}/index/*",
    aws_dynamodb_table.responses.arn,
    "${aws_dynamodb_table.responses.arn}/index/*",
    aws_dynamodb_table.subscriptions.arn,
    "${aws_dynamodb_table.subscriptions.arn}/index/*",
    aws_dynamodb_table.user_stats.arn,
    "${aws_dynamodb_table.user_stats.arn}/index/*",
  ]
}
