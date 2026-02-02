# Terraform Backend Configuration
# This file documents the backend settings. Copy this to your environment's main.tf
# or reference it when initializing Terraform.
#
# The S3 bucket and DynamoDB table were created manually during bootstrap.
# See: infrastructure/scripts/aws-assume-role.sh for authentication setup.

terraform {
  backend "s3" {
    bucket         = "aah-terraform-state-325062206315"
    key            = "prod/terraform.tfstate"
    region         = "us-west-1"
    encrypt        = true
    dynamodb_table = "aah-terraform-locks"
  }
}
