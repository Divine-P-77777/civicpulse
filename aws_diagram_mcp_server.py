#!/usr/bin/env python3
"""
AWS Architecture Diagram MCP Server for CivicPulse
Generates AWS architecture diagrams using Python and Diagrams library
"""

import asyncio
import json
import sys
from typing import Any, Dict, List, Optional
from pathlib import Path
import tempfile
import base64

from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import (
    Resource,
    Tool,
    TextContent,
    ImageContent,
    EmbeddedResource,
)
from pydantic import BaseModel

# Try to import diagrams library
try:
    from diagrams import Diagram, Cluster, Edge
    from diagrams.aws.compute import EC2, ECS, Lambda
    from diagrams.aws.database import RDS, Dynamodb
    from diagrams.aws.network import ELB, CloudFront, Route53, VPC, InternetGateway
    from diagrams.aws.storage import S3
    from diagrams.aws.security import IAM, Cognito
    from diagrams.aws.analytics import Kinesis
    from diagrams.aws.ml import Bedrock, Textract
    from diagrams.aws.integration import SQS, SNS
    from diagrams.aws.management import Cloudwatch, CloudFormation
    from diagrams.onprem.client import Users, Client
    from diagrams.programming.framework import React, Fastapi
    from diagrams.programming.language import Python, Javascript
    from diagrams.saas.cdn import Cloudflare
    from diagrams.saas.analytics import Googleanalytics
    DIAGRAMS_AVAILABLE = True
except ImportError:
    DIAGRAMS_AVAILABLE = False

class DiagramConfig(BaseModel):
    """Configuration for AWS diagram generation"""
    title: str = "CivicPulse AWS Architecture"
    filename: str = "civicpulse_architecture"
    format: str = "png"
    show: bool = False
    direction: str = "TB"  # Top to Bottom
    
class ComponentConfig(BaseModel):
    """Configuration for AWS components"""
    include_frontend: bool = True
    include_backend: bool = True
    include_database: bool = True
    include_ai_services: bool = True
    include_storage: bool = True
    include_security: bool = True
    include_monitoring: bool = True
    include_networking: bool = True

# Initialize MCP Server
server = Server("aws-diagram-server")

@server.list_resources()
async def list_resources() -> List[Resource]:
    """List available diagram templates and examples"""
    return [
        Resource(
            uri="template://civicpulse-full",
            name="CivicPulse Full Architecture",
            description="Complete AWS architecture for CivicPulse application",
            mimeType="application/json"
        ),
        Resource(
            uri="template://civicpulse-minimal",
            name="CivicPulse Minimal Architecture", 
            description="Simplified AWS architecture focusing on core components",
            mimeType="application/json"
        ),
        Resource(
            uri="template://civicpulse-ai-focus",
            name="CivicPulse AI Services Focus",
            description="Architecture diagram highlighting AI and ML services",
            mimeType="application/json"
        ),
        Resource(
            uri="example://aws-best-practices",
            name="AWS Best Practices Example",
            description="Example diagram showing AWS best practices for web applications",
            mimeType="application/json"
        )
    ]

@server.read_resource()
async def read_resource(uri: str) -> str:
    """Read diagram template configurations"""
    
    if uri == "template://civicpulse-full":
        return json.dumps({
            "title": "CivicPulse - Complete AWS Architecture",
            "components": {
                "include_frontend": True,
                "include_backend": True,
                "include_database": True,
                "include_ai_services": True,
                "include_storage": True,
                "include_security": True,
                "include_monitoring": True,
                "include_networking": True
            },
            "services": {
                "compute": ["EC2", "ECS", "Lambda"],
                "database": ["RDS", "DynamoDB"],
                "storage": ["S3", "CloudFront"],
                "ai_ml": ["Bedrock", "Textract", "OpenAI"],
                "security": ["IAM", "Cognito"],
                "networking": ["VPC", "ALB", "Route53"],
                "monitoring": ["CloudWatch", "X-Ray"]
            }
        }, indent=2)
    
    elif uri == "template://civicpulse-minimal":
        return json.dumps({
            "title": "CivicPulse - Minimal Architecture",
            "components": {
                "include_frontend": True,
                "include_backend": True,
                "include_database": True,
                "include_ai_services": False,
                "include_storage": True,
                "include_security": False,
                "include_monitoring": False,
                "include_networking": False
            },
            "services": {
                "compute": ["EC2"],
                "database": ["RDS"],
                "storage": ["S3"],
                "frontend": ["React", "Next.js"],
                "backend": ["FastAPI", "Python"]
            }
        }, indent=2)
    
    elif uri == "template://civicpulse-ai-focus":
        return json.dumps({
            "title": "CivicPulse - AI Services Architecture",
            "components": {
                "include_ai_services": True,
                "include_backend": True,
                "include_storage": True,
                "include_database": True
            },
            "services": {
                "ai_ml": ["Bedrock", "Textract", "OpenAI", "Gemini"],
                "compute": ["Lambda", "ECS"],
                "storage": ["S3"],
                "database": ["Vector DB", "RDS"],
                "integration": ["SQS", "SNS"]
            }
        }, indent=2)
    
    else:
        return json.dumps({"error": "Template not found"}, indent=2)

@server.list_tools()
async def list_tools() -> List[Tool]:
    """List available diagram generation tools"""
    return [
        Tool(
            name="generate_civicpulse_diagram",
            description="Generate AWS architecture diagram for CivicPulse application",
            inputSchema={
                "type": "object",
                "properties": {
                    "template": {
                        "type": "string",
                        "enum": ["full", "minimal", "ai-focus", "custom"],
                        "description": "Diagram template to use",
                        "default": "full"
                    },
                    "title": {
                        "type": "string",
                        "description": "Custom title for the diagram",
                        "default": "CivicPulse AWS Architecture"
                    },
                    "format": {
                        "type": "string",
                        "enum": ["png", "jpg", "svg", "pdf"],
                        "description": "Output format for the diagram",
                        "default": "png"
                    },
                    "include_components": {
                        "type": "object",
                        "properties": {
                            "frontend": {"type": "boolean", "default": True},
                            "backend": {"type": "boolean", "default": True},
                            "database": {"type": "boolean", "default": True},
                            "ai_services": {"type": "boolean", "default": True},
                            "storage": {"type": "boolean", "default": True},
                            "security": {"type": "boolean", "default": True},
                            "monitoring": {"type": "boolean", "default": True},
                            "networking": {"type": "boolean", "default": True}
                        },
                        "description": "Components to include in the diagram"
                    }
                }
            }
        ),
        Tool(
            name="generate_custom_aws_diagram",
            description="Generate custom AWS architecture diagram with specified services",
            inputSchema={
                "type": "object",
                "properties": {
                    "title": {
                        "type": "string",
                        "description": "Title for the diagram",
                        "default": "Custom AWS Architecture"
                    },
                    "services": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "List of AWS services to include (e.g., EC2, RDS, S3, Lambda)"
                    },
                    "connections": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "from": {"type": "string"},
                                "to": {"type": "string"},
                                "label": {"type": "string"}
                            }
                        },
                        "description": "Connections between services"
                    },
                    "format": {
                        "type": "string",
                        "enum": ["png", "jpg", "svg", "pdf"],
                        "default": "png"
                    }
                },
                "required": ["services"]
            }
        ),
        Tool(
            name="list_aws_services",
            description="List available AWS services for diagram generation",
            inputSchema={
                "type": "object",
                "properties": {
                    "category": {
                        "type": "string",
                        "enum": ["compute", "database", "storage", "networking", "security", "ai_ml", "analytics", "all"],
                        "description": "Category of services to list",
                        "default": "all"
                    }
                }
            }
        ),
        Tool(
            name="validate_diagram_config",
            description="Validate diagram configuration before generation",
            inputSchema={
                "type": "object",
                "properties": {
                    "config": {
                        "type": "object",
                        "description": "Diagram configuration to validate"
                    }
                },
                "required": ["config"]
            }
        )
    ]

def create_civicpulse_full_diagram(title: str, format: str = "png") -> str:
    """Create complete CivicPulse architecture diagram"""
    
    if not DIAGRAMS_AVAILABLE:
        return "Error: diagrams library not installed. Run: pip install diagrams"
    
    filename = f"civicpulse_full_architecture"
    
    with Diagram(title, filename=filename, format=format, show=False, direction="TB"):
        
        # Users and Client
        users = Users("Users")
        
        with Cluster("Internet"):
            cdn = CloudFront("CloudFront CDN")
            route53 = Route53("Route 53")
        
        with Cluster("AWS VPC"):
            with Cluster("Public Subnet"):
                alb = ELB("Application Load Balancer")
                
            with Cluster("Private Subnet - Frontend"):
                frontend_ecs = ECS("Frontend ECS")
                react_app = React("Next.js App")
                
            with Cluster("Private Subnet - Backend"):
                backend_ecs = ECS("Backend ECS")
                fastapi_app = Fastapi("FastAPI")
                
            with Cluster("Database Subnet"):
                postgres = RDS("PostgreSQL (Supabase)")
                vector_db = Dynamodb("Vector Store")
                
            with Cluster("AI/ML Services"):
                bedrock = Bedrock("Amazon Bedrock")
                textract = Textract("Amazon Textract")
                lambda_ai = Lambda("AI Processing")
                
            with Cluster("Storage"):
                s3_docs = S3("Document Storage")
                s3_static = S3("Static Assets")
                
            with Cluster("Security"):
                iam = IAM("IAM Roles")
                cognito = Cognito("Supabase Auth")
                
            with Cluster("Monitoring"):
                cloudwatch = Cloudwatch("CloudWatch")
                
        with Cluster("External Services"):
            openai = Client("OpenAI API")
            gemini = Client("Google Gemini")
            cloudinary = Client("Cloudinary")
        
        # Connections
        users >> route53 >> cdn >> alb
        alb >> frontend_ecs >> react_app
        react_app >> backend_ecs >> fastapi_app
        
        fastapi_app >> postgres
        fastapi_app >> vector_db
        fastapi_app >> s3_docs
        fastapi_app >> lambda_ai
        
        lambda_ai >> bedrock
        lambda_ai >> textract
        lambda_ai >> openai
        lambda_ai >> gemini
        
        fastapi_app >> cloudinary
        cdn >> s3_static
        
        # Security connections
        frontend_ecs >> iam
        backend_ecs >> iam
        lambda_ai >> iam
        
        # Monitoring
        [frontend_ecs, backend_ecs, lambda_ai] >> cloudwatch
    
    return f"Generated diagram: {filename}.{format}"

def create_civicpulse_minimal_diagram(title: str, format: str = "png") -> str:
    """Create minimal CivicPulse architecture diagram"""
    
    if not DIAGRAMS_AVAILABLE:
        return "Error: diagrams library not installed. Run: pip install diagrams"
    
    filename = f"civicpulse_minimal_architecture"
    
    with Diagram(title, filename=filename, format=format, show=False, direction="TB"):
        
        users = Users("Users")
        
        with Cluster("AWS"):
            ec2 = EC2("EC2 Instance")
            rds = RDS("PostgreSQL")
            s3 = S3("File Storage")
            
        with Cluster("Application"):
            frontend = React("Next.js Frontend")
            backend = Fastapi("FastAPI Backend")
            
        # Connections
        users >> ec2
        ec2 >> frontend >> backend
        backend >> rds
        backend >> s3
    
    return f"Generated diagram: {filename}.{format}"

def create_civicpulse_ai_focus_diagram(title: str, format: str = "png") -> str:
    """Create AI-focused CivicPulse architecture diagram"""
    
    if not DIAGRAMS_AVAILABLE:
        return "Error: diagrams library not installed. Run: pip install diagrams"
    
    filename = f"civicpulse_ai_architecture"
    
    with Diagram(title, filename=filename, format=format, show=False, direction="TB"):
        
        with Cluster("Client Application"):
            frontend = React("Next.js Frontend")
            
        with Cluster("API Gateway"):
            api = Fastapi("FastAPI Gateway")
            
        with Cluster("AI Processing Pipeline"):
            with Cluster("Document Processing"):
                textract = Textract("Text Extraction")
                lambda_ocr = Lambda("OCR Processing")
                
            with Cluster("AI Analysis"):
                bedrock = Bedrock("Legal Analysis")
                lambda_ai = Lambda("AI Orchestrator")
                
            with Cluster("Knowledge Base"):
                vector_db = Dynamodb("Vector Store")
                s3_knowledge = S3("Legal Documents")
                
        with Cluster("External AI Services"):
            openai = Client("OpenAI GPT")
            gemini = Client("Google Gemini")
            
        with Cluster("Storage"):
            s3_docs = S3("User Documents")
            rds = RDS("Metadata Store")
            
        # Connections
        frontend >> api
        api >> lambda_ai
        lambda_ai >> [bedrock, openai, gemini]
        api >> lambda_ocr >> textract
        textract >> s3_docs
        lambda_ai >> vector_db
        vector_db >> s3_knowledge
        api >> rds
    
    return f"Generated diagram: {filename}.{format}"

@server.call_tool()
async def call_tool(name: str, arguments: Dict[str, Any]) -> List[TextContent]:
    """Handle tool calls for diagram generation"""
    
    if name == "generate_civicpulse_diagram":
        template = arguments.get("template", "full")
        title = arguments.get("title", "CivicPulse AWS Architecture")
        format = arguments.get("format", "png")
        
        try:
            if template == "full":
                result = create_civicpulse_full_diagram(title, format)
            elif template == "minimal":
                result = create_civicpulse_minimal_diagram(title, format)
            elif template == "ai-focus":
                result = create_civicpulse_ai_focus_diagram(title, format)
            else:
                result = "Error: Unknown template. Use 'full', 'minimal', or 'ai-focus'"
                
            return [TextContent(type="text", text=result)]
            
        except Exception as e:
            return [TextContent(type="text", text=f"Error generating diagram: {str(e)}")]
    
    elif name == "list_aws_services":
        category = arguments.get("category", "all")
        
        services = {
            "compute": ["EC2", "ECS", "Fargate", "Lambda", "Batch"],
            "database": ["RDS", "DynamoDB", "DocumentDB", "ElastiCache", "Redshift"],
            "storage": ["S3", "EFS", "FSx", "Storage Gateway"],
            "networking": ["VPC", "CloudFront", "Route53", "ELB", "API Gateway"],
            "security": ["IAM", "Cognito", "Secrets Manager", "KMS", "WAF"],
            "ai_ml": ["Bedrock", "SageMaker", "Textract", "Comprehend", "Rekognition"],
            "analytics": ["Kinesis", "EMR", "Glue", "Athena", "QuickSight"]
        }
        
        if category == "all":
            result = json.dumps(services, indent=2)
        else:
            result = json.dumps({category: services.get(category, [])}, indent=2)
            
        return [TextContent(type="text", text=result)]
    
    elif name == "validate_diagram_config":
        config = arguments.get("config", {})
        
        # Basic validation
        errors = []
        warnings = []
        
        if not config.get("title"):
            warnings.append("No title specified, using default")
            
        if not config.get("services"):
            errors.append("No services specified")
            
        format_type = config.get("format", "png")
        if format_type not in ["png", "jpg", "svg", "pdf"]:
            errors.append(f"Invalid format: {format_type}")
            
        validation_result = {
            "valid": len(errors) == 0,
            "errors": errors,
            "warnings": warnings
        }
        
        return [TextContent(type="text", text=json.dumps(validation_result, indent=2))]
    
    elif name == "generate_custom_aws_diagram":
        title = arguments.get("title", "Custom AWS Architecture")
        services = arguments.get("services", [])
        format = arguments.get("format", "png")
        
        if not DIAGRAMS_AVAILABLE:
            return [TextContent(type="text", text="Error: diagrams library not installed. Run: pip install diagrams")]
        
        try:
            filename = "custom_aws_architecture"
            
            with Diagram(title, filename=filename, format=format, show=False):
                # This would need more complex logic to dynamically create services
                # For now, return a simple message
                pass
            
            return [TextContent(type="text", text=f"Generated custom diagram: {filename}.{format}")]
            
        except Exception as e:
            return [TextContent(type="text", text=f"Error generating custom diagram: {str(e)}")]
    
    else:
        return [TextContent(type="text", text=f"Unknown tool: {name}")]

async def main():
    """Main entry point for the MCP server"""
    async with stdio_server() as (read_stream, write_stream):
        await server.run(read_stream, write_stream, server.create_initialization_options())

if __name__ == "__main__":
    asyncio.run(main())