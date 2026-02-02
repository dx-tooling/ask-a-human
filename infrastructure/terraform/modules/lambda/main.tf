# Lambda Module
# Creates Lambda function with IAM role, CloudWatch logs, and API Gateway permissions
# Reference: ADR-06 Infrastructure as Code

locals {
  common_tags = merge(var.tags, {
    Module = "lambda"
  })
}

# =============================================================================
# IAM Role for Lambda Execution
# =============================================================================
resource "aws_iam_role" "lambda_exec" {
  name = "${var.function_name}-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })

  tags = local.common_tags
}

# =============================================================================
# IAM Policy for CloudWatch Logs
# =============================================================================
resource "aws_iam_role_policy" "lambda_logs" {
  name = "${var.function_name}-logs"
  role = aws_iam_role.lambda_exec.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "${aws_cloudwatch_log_group.lambda.arn}:*"
      }
    ]
  })
}

# =============================================================================
# IAM Policy for DynamoDB Access
# =============================================================================
resource "aws_iam_role_policy" "lambda_dynamodb" {
  count = length(var.dynamo_table_arns) > 0 ? 1 : 0

  name = "${var.function_name}-dynamodb"
  role = aws_iam_role.lambda_exec.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:Scan"
        ]
        Resource = var.dynamo_table_arns
      }
    ]
  })
}

# =============================================================================
# CloudWatch Log Group
# =============================================================================
resource "aws_cloudwatch_log_group" "lambda" {
  name              = "/aws/lambda/${var.function_name}"
  retention_in_days = var.log_retention_days

  tags = local.common_tags
}

# =============================================================================
# Lambda Deployment Package
# =============================================================================
data "archive_file" "lambda" {
  type        = "zip"
  source_dir  = var.source_dir
  output_path = "${path.module}/.terraform/${var.function_name}.zip"

  excludes = [
    "__pycache__",
    "*.pyc",
    ".pytest_cache",
    "tests",
    ".git",
    ".gitignore",
    "README.md",
  ]
}

# =============================================================================
# Lambda Function
# =============================================================================
resource "aws_lambda_function" "main" {
  function_name = var.function_name
  role          = aws_iam_role.lambda_exec.arn
  handler       = var.handler
  runtime       = var.runtime

  filename         = data.archive_file.lambda.output_path
  source_code_hash = data.archive_file.lambda.output_base64sha256

  memory_size = var.memory_size
  timeout     = var.timeout

  environment {
    variables = var.environment_variables
  }

  depends_on = [
    aws_cloudwatch_log_group.lambda,
    aws_iam_role_policy.lambda_logs,
  ]

  tags = local.common_tags
}

# =============================================================================
# Lambda Permission for API Gateway
# Allows API Gateway to invoke this Lambda function
# =============================================================================
resource "aws_lambda_permission" "apigw" {
  count = var.allow_apigw_invoke ? 1 : 0

  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.main.function_name
  principal     = "apigateway.amazonaws.com"

  # Allow invocation from any stage/route of the API
  source_arn = "${var.api_gateway_execution_arn}/*/*"
}
