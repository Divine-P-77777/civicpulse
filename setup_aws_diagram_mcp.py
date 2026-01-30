#!/usr/bin/env python3
"""
Setup script for AWS Diagram MCP Server
Installs dependencies and configures the MCP server for Kiro
"""

import json
import subprocess
import sys
from pathlib import Path
import os

def install_dependencies():
    """Install required Python packages"""
    print("Installing AWS Diagram MCP Server dependencies...")
    
    # Install main dependencies
    subprocess.check_call([
        sys.executable, "-m", "pip", "install", 
        "mcp>=1.1.3",
        "pydantic>=2.0.0", 
        "diagrams>=0.23.4"
    ])
    
    # Try to install graphviz (required for diagrams)
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "graphviz>=0.20.1"])
        print("✅ Graphviz Python package installed")
    except subprocess.CalledProcessError:
        print("⚠️  Warning: Could not install graphviz Python package")
        print("   You may need to install Graphviz system package separately")
        print("   Windows: choco install graphviz")
        print("   macOS: brew install graphviz") 
        print("   Ubuntu: sudo apt-get install graphviz")
    
    # Install optional packages
    try:
        subprocess.check_call([
            sys.executable, "-m", "pip", "install",
            "pillow>=10.0.0",
            "matplotlib>=3.7.0"
        ])
        print("✅ Optional packages installed")
    except subprocess.CalledProcessError:
        print("⚠️  Warning: Could not install optional packages")

def update_mcp_config():
    """Update MCP configuration to include AWS Diagram server"""
    
    # Path to MCP config
    config_path = Path.home() / ".kiro" / "settings" / "mcp.json"
    
    # Ensure directory exists
    config_path.parent.mkdir(parents=True, exist_ok=True)
    
    # Load existing config or create new one
    if config_path.exists():
        with open(config_path, 'r') as f:
            config = json.load(f)
    else:
        config = {"mcpServers": {}}
    
    # Add AWS Diagram server configuration
    current_dir = Path(__file__).parent.absolute()
    server_path = current_dir / "aws_diagram_mcp_server.py"
    
    config["mcpServers"]["aws-diagram"] = {
        "command": "python",
        "args": [str(server_path)],
        "env": {},
        "disabled": False,
        "autoApprove": []
    }
    
    # Save updated config
    with open(config_path, 'w') as f:
        json.dump(config, f, indent=2)
    
    print(f"✅ Updated MCP configuration: {config_path}")
    return config_path

def create_example_usage():
    """Create example usage documentation"""
    
    example_content = """# AWS Diagram MCP Server - Usage Examples

## Available Tools

### 1. Generate CivicPulse Architecture Diagram
```
Tool: generate_civicpulse_diagram
Parameters:
- template: "full" | "minimal" | "ai-focus" | "custom"
- title: "Custom title for diagram"
- format: "png" | "jpg" | "svg" | "pdf"
- include_components: object with boolean flags
```

### 2. Generate Custom AWS Diagram
```
Tool: generate_custom_aws_diagram
Parameters:
- title: "Custom AWS Architecture"
- services: ["EC2", "RDS", "S3", "Lambda"]
- connections: [{"from": "EC2", "to": "RDS", "label": "queries"}]
- format: "png"
```

### 3. List AWS Services
```
Tool: list_aws_services
Parameters:
- category: "compute" | "database" | "storage" | "networking" | "security" | "ai_ml" | "analytics" | "all"
```

## Example Prompts for Kiro

1. **Generate Full Architecture:**
   "Generate a complete AWS architecture diagram for CivicPulse with all components"

2. **Create Minimal Diagram:**
   "Create a minimal AWS diagram showing just the core CivicPulse components"

3. **AI Services Focus:**
   "Generate an AWS diagram focusing on the AI and ML services used in CivicPulse"

4. **Custom Diagram:**
   "Create a custom AWS diagram with EC2, RDS, S3, and Lambda services"

5. **List Services:**
   "Show me all available AWS AI/ML services for diagrams"

## Templates Available

### Full Architecture (template: "full")
- Complete CivicPulse infrastructure
- Frontend (Next.js on ECS)
- Backend (FastAPI on ECS)
- Database (PostgreSQL/Supabase)
- AI Services (Bedrock, Textract, OpenAI, Gemini)
- Storage (S3, CloudFront)
- Security (IAM, Cognito)
- Monitoring (CloudWatch)
- Networking (VPC, ALB, Route53)

### Minimal Architecture (template: "minimal")
- Core components only
- EC2 instance
- PostgreSQL database
- S3 storage
- Basic frontend/backend

### AI Focus (template: "ai-focus")
- Emphasizes AI/ML pipeline
- Document processing flow
- AI service integrations
- Vector database
- Knowledge base

## Output

Diagrams are generated as image files in the current directory:
- civicpulse_full_architecture.png
- civicpulse_minimal_architecture.png
- civicpulse_ai_architecture.png
- custom_aws_architecture.png

## Troubleshooting

1. **Graphviz Error:**
   Install system Graphviz package:
   - Windows: `choco install graphviz`
   - macOS: `brew install graphviz`
   - Ubuntu: `sudo apt-get install graphviz`

2. **Permission Error:**
   Ensure write permissions in current directory

3. **Import Error:**
   Run: `pip install diagrams graphviz`
"""
    
    with open("AWS_DIAGRAM_USAGE.md", "w") as f:
        f.write(example_content)
    
    print("✅ Created usage documentation: AWS_DIAGRAM_USAGE.md")

def main():
    """Main setup function"""
    print("🚀 Setting up AWS Diagram MCP Server for CivicPulse")
    print("=" * 50)
    
    try:
        # Install dependencies
        install_dependencies()
        
        # Update MCP configuration
        config_path = update_mcp_config()
        
        # Create usage examples
        create_example_usage()
        
        print("\n✅ Setup completed successfully!")
        print("\nNext steps:")
        print("1. Restart Kiro to load the new MCP server")
        print("2. Try: 'Generate a complete AWS architecture diagram for CivicPulse'")
        print("3. Check AWS_DIAGRAM_USAGE.md for more examples")
        print(f"4. MCP config updated at: {config_path}")
        
        # Check if Graphviz system package is available
        try:
            subprocess.run(["dot", "-V"], capture_output=True, check=True)
            print("✅ Graphviz system package detected")
        except (subprocess.CalledProcessError, FileNotFoundError):
            print("\n⚠️  Warning: Graphviz system package not found")
            print("   Install it for diagram generation to work:")
            print("   Windows: choco install graphviz")
            print("   macOS: brew install graphviz")
            print("   Ubuntu: sudo apt-get install graphviz")
        
    except Exception as e:
        print(f"\n❌ Setup failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()