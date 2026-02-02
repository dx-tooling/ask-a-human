"""
DynamoDB client wrapper and utilities.
Reference: ADR-02 Database Schema Design
"""

import os
import boto3
from typing import Any


# Lazy initialization of DynamoDB resource
_dynamodb_resource = None
_questions_table = None
_responses_table = None


def get_dynamodb_resource():
    """Get or create the DynamoDB resource."""
    global _dynamodb_resource
    if _dynamodb_resource is None:
        _dynamodb_resource = boto3.resource("dynamodb")
    return _dynamodb_resource


def get_questions_table():
    """Get the questions table resource."""
    global _questions_table
    if _questions_table is None:
        table_name = os.environ.get("QUESTIONS_TABLE", "aah-questions")
        _questions_table = get_dynamodb_resource().Table(table_name)
    return _questions_table


def get_responses_table():
    """Get the responses table resource."""
    global _responses_table
    if _responses_table is None:
        table_name = os.environ.get("RESPONSES_TABLE", "aah-responses")
        _responses_table = get_dynamodb_resource().Table(table_name)
    return _responses_table


def serialize_item(item: dict) -> dict:
    """
    Convert Python types to DynamoDB-compatible types.
    Removes None values as DynamoDB doesn't accept them.
    """
    return {k: v for k, v in item.items() if v is not None}


def deserialize_item(item: dict) -> dict:
    """
    Convert DynamoDB item to Python dict.
    Handles Decimal to int/float conversion.
    """
    from decimal import Decimal
    
    result = {}
    for key, value in item.items():
        if isinstance(value, Decimal):
            # Convert Decimal to int if it's a whole number, otherwise float
            if value % 1 == 0:
                result[key] = int(value)
            else:
                result[key] = float(value)
        elif isinstance(value, list):
            result[key] = [
                deserialize_item(v) if isinstance(v, dict) else 
                (int(v) if isinstance(v, Decimal) and v % 1 == 0 else float(v) if isinstance(v, Decimal) else v)
                for v in value
            ]
        elif isinstance(value, dict):
            result[key] = deserialize_item(value)
        else:
            result[key] = value
    return result
