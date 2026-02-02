# API Gateway Module
# Creates HTTP API with custom domain, routes, and Lambda integrations
# Reference: ADR-03 API Design, ADR-06 Infrastructure as Code

locals {
  common_tags = merge(var.tags, {
    Module = "api"
  })
}

# =============================================================================
# HTTP API
# =============================================================================
resource "aws_apigatewayv2_api" "main" {
  name          = var.api_name
  protocol_type = "HTTP"
  description   = "Ask-a-Human API"

  cors_configuration {
    allow_origins     = var.cors_origins
    allow_methods     = ["GET", "POST", "OPTIONS"]
    allow_headers     = ["Content-Type", "X-Fingerprint", "X-Agent-Id", "X-Idempotency-Key"]
    expose_headers    = ["X-RateLimit-Limit", "X-RateLimit-Remaining", "X-RateLimit-Reset"]
    max_age           = 3600
    allow_credentials = false
  }

  tags = local.common_tags
}

# =============================================================================
# Default Stage (auto-deploy)
# =============================================================================
resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.main.id
  name        = "$default"
  auto_deploy = true

  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.api.arn
    format = jsonencode({
      requestId      = "$context.requestId"
      ip             = "$context.identity.sourceIp"
      requestTime    = "$context.requestTime"
      httpMethod     = "$context.httpMethod"
      routeKey       = "$context.routeKey"
      status         = "$context.status"
      responseLength = "$context.responseLength"
      integrationLatency = "$context.integrationLatency"
    })
  }

  tags = local.common_tags
}

# =============================================================================
# CloudWatch Log Group for API Gateway
# =============================================================================
resource "aws_cloudwatch_log_group" "api" {
  name              = "/aws/apigateway/${var.api_name}"
  retention_in_days = var.log_retention_days

  tags = local.common_tags
}

# =============================================================================
# Custom Domain
# =============================================================================
resource "aws_apigatewayv2_domain_name" "api" {
  domain_name = var.domain_name

  domain_name_configuration {
    certificate_arn = var.certificate_arn
    endpoint_type   = "REGIONAL"
    security_policy = "TLS_1_2"
  }

  tags = local.common_tags
}

# =============================================================================
# Domain Mapping
# =============================================================================
resource "aws_apigatewayv2_api_mapping" "api" {
  api_id      = aws_apigatewayv2_api.main.id
  domain_name = aws_apigatewayv2_domain_name.api.domain_name
  stage       = aws_apigatewayv2_stage.default.id
}

# =============================================================================
# Lambda Integrations
# =============================================================================
resource "aws_apigatewayv2_integration" "agent_questions" {
  api_id             = aws_apigatewayv2_api.main.id
  integration_type   = "AWS_PROXY"
  integration_method = "POST"
  integration_uri    = var.agent_questions_lambda_invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_integration" "human_api" {
  api_id             = aws_apigatewayv2_api.main.id
  integration_type   = "AWS_PROXY"
  integration_method = "POST"
  integration_uri    = var.human_api_lambda_invoke_arn
  payload_format_version = "2.0"
}

# =============================================================================
# Routes - Agent API
# =============================================================================
resource "aws_apigatewayv2_route" "post_agent_questions" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "POST /agent/questions"
  target    = "integrations/${aws_apigatewayv2_integration.agent_questions.id}"
}

resource "aws_apigatewayv2_route" "get_agent_question" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "GET /agent/questions/{question_id}"
  target    = "integrations/${aws_apigatewayv2_integration.agent_questions.id}"
}

# =============================================================================
# Routes - Human API
# =============================================================================
resource "aws_apigatewayv2_route" "get_human_questions" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "GET /human/questions"
  target    = "integrations/${aws_apigatewayv2_integration.human_api.id}"
}

resource "aws_apigatewayv2_route" "get_human_question" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "GET /human/questions/{question_id}"
  target    = "integrations/${aws_apigatewayv2_integration.human_api.id}"
}

resource "aws_apigatewayv2_route" "post_human_responses" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "POST /human/responses"
  target    = "integrations/${aws_apigatewayv2_integration.human_api.id}"
}
