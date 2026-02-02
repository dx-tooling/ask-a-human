"""DynamoDB client wrapper and utilities.

Reference: ADR-02 Database Schema Design
"""

from __future__ import annotations

import os
from typing import TYPE_CHECKING, Any

import boto3

if TYPE_CHECKING:
    from mypy_boto3_dynamodb.service_resource import DynamoDBServiceResource, Table

# Lazy initialization of DynamoDB resource
_dynamodb_resource: DynamoDBServiceResource | None = None
_questions_table: Table | None = None
_responses_table: Table | None = None


def get_dynamodb_resource() -> DynamoDBServiceResource:
    """Get or create the DynamoDB resource.

    Returns:
        The DynamoDB service resource.
    """
    global _dynamodb_resource  # noqa: PLW0603
    if _dynamodb_resource is None:
        _dynamodb_resource = boto3.resource("dynamodb")
    return _dynamodb_resource


def get_questions_table() -> Table:
    """Get the questions table resource.

    Returns:
        The DynamoDB Table resource for questions.
    """
    global _questions_table  # noqa: PLW0603
    if _questions_table is None:
        table_name = os.environ.get("QUESTIONS_TABLE", "aah-questions")
        _questions_table = get_dynamodb_resource().Table(table_name)
    return _questions_table


def get_responses_table() -> Table:
    """Get the responses table resource.

    Returns:
        The DynamoDB Table resource for responses.
    """
    global _responses_table  # noqa: PLW0603
    if _responses_table is None:
        table_name = os.environ.get("RESPONSES_TABLE", "aah-responses")
        _responses_table = get_dynamodb_resource().Table(table_name)
    return _responses_table


def serialize_item(item: dict[str, Any]) -> dict[str, Any]:
    """Convert Python types to DynamoDB-compatible types.

    Removes None values as DynamoDB doesn't accept them.

    Args:
        item: Dictionary to serialize.

    Returns:
        Dictionary with None values removed.
    """
    return {k: v for k, v in item.items() if v is not None}


def deserialize_item(item: dict[str, Any]) -> dict[str, Any]:
    """Convert DynamoDB item to Python dict.

    Handles Decimal to int/float conversion.

    Args:
        item: DynamoDB item dictionary.

    Returns:
        Dictionary with Decimal values converted to int/float.
    """
    from decimal import Decimal

    result: dict[str, Any] = {}
    for key, value in item.items():
        if isinstance(value, Decimal):
            # Convert Decimal to int if it's a whole number, otherwise float
            if value % 1 == 0:
                result[key] = int(value)
            else:
                result[key] = float(value)
        elif isinstance(value, list):
            result[key] = [_deserialize_value(v) for v in value]
        elif isinstance(value, dict):
            result[key] = deserialize_item(value)
        else:
            result[key] = value
    return result


def _deserialize_value(value: Any) -> Any:
    """Deserialize a single value from DynamoDB format.

    Args:
        value: Value to deserialize.

    Returns:
        Deserialized value.
    """
    from decimal import Decimal

    if isinstance(value, dict):
        return deserialize_item(value)
    if isinstance(value, Decimal):
        return int(value) if value % 1 == 0 else float(value)
    return value
