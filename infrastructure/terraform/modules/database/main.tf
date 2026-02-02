# Database Module - DynamoDB Tables
# Reference: ADR-02 Database Schema Design

locals {
  common_tags = merge(var.tags, {
    Module = "database"
  })
}

# =============================================================================
# Questions Table
# Stores question metadata and status
# =============================================================================
resource "aws_dynamodb_table" "questions" {
  name         = "${var.table_prefix}-questions"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "question_id"

  attribute {
    name = "question_id"
    type = "S"
  }

  attribute {
    name = "status"
    type = "S"
  }

  attribute {
    name = "created_at"
    type = "S"
  }

  attribute {
    name = "agent_id"
    type = "S"
  }

  # GSI: ByStatus - Fetch open questions for humans
  global_secondary_index {
    name            = "ByStatus"
    hash_key        = "status"
    range_key       = "created_at"
    projection_type = "ALL"
  }

  # GSI: ByAgentId - Agent fetches their questions
  global_secondary_index {
    name            = "ByAgentId"
    hash_key        = "agent_id"
    range_key       = "created_at"
    projection_type = "ALL"
  }

  # TTL: Automatically deletes expired questions
  ttl {
    attribute_name = "expires_at"
    enabled        = true
  }

  tags = local.common_tags
}

# =============================================================================
# Responses Table
# Stores individual human responses
# =============================================================================
resource "aws_dynamodb_table" "responses" {
  name         = "${var.table_prefix}-responses"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "question_id"
  range_key    = "response_id"

  attribute {
    name = "question_id"
    type = "S"
  }

  attribute {
    name = "response_id"
    type = "S"
  }

  attribute {
    name = "fingerprint_hash"
    type = "S"
  }

  attribute {
    name = "created_at"
    type = "S"
  }

  # GSI: ByFingerprint - Check if user already answered, rate limiting
  global_secondary_index {
    name            = "ByFingerprint"
    hash_key        = "fingerprint_hash"
    range_key       = "created_at"
    projection_type = "ALL"
  }

  tags = local.common_tags
}

# =============================================================================
# Subscriptions Table
# Stores push notification subscriptions
# =============================================================================
resource "aws_dynamodb_table" "subscriptions" {
  name         = "${var.table_prefix}-subscriptions"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "subscription_id"

  attribute {
    name = "subscription_id"
    type = "S"
  }

  attribute {
    name = "active"
    type = "S"
  }

  attribute {
    name = "last_notified_at"
    type = "S"
  }

  # GSI: ByLastNotified - Find users eligible for notification
  # Note: Using string "true"/"false" for active to enable sparse index behavior
  global_secondary_index {
    name            = "ByLastNotified"
    hash_key        = "active"
    range_key       = "last_notified_at"
    projection_type = "ALL"
  }

  tags = local.common_tags
}

# =============================================================================
# User Stats Table
# Stores gamification data (anonymous, keyed by fingerprint)
# =============================================================================
resource "aws_dynamodb_table" "user_stats" {
  name         = "${var.table_prefix}-user-stats"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "fingerprint_hash"

  attribute {
    name = "fingerprint_hash"
    type = "S"
  }

  attribute {
    name = "_leaderboard"
    type = "S"
  }

  attribute {
    name = "total_points"
    type = "N"
  }

  # GSI: ByTotalPoints - Leaderboard queries
  # _leaderboard is a constant string partition key to enable sorting by points
  global_secondary_index {
    name            = "ByTotalPoints"
    hash_key        = "_leaderboard"
    range_key       = "total_points"
    projection_type = "ALL"
  }

  tags = local.common_tags
}
