#!/bin/bash

# Doris Protocol Local Services Setup Script
# Helps users set up Ollama and IPFS for local-first operation

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Utility functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check system requirements
check_requirements() {
    log_info "Checking system requirements..."
    
    # Check Node.js
    if command_exists node; then
        NODE_VERSION=$(node --version)
        log_success "Node.js found: $NODE_VERSION"
    else
        log_error "Node.js not found. Please install Node.js v20+ first."
        exit 1
    fi
    
    # Check pnpm
    if command_exists pnpm; then
        PNPM_VERSION=$(pnpm --version)
        log_success "pnpm found: $PNPM_VERSION"
    else
        log_error "pnpm not found. Please install pnpm first: npm install -g pnpm"
        exit 1
    fi
    
    # Check available disk space (require at least 10GB)
    AVAILABLE_SPACE=$(df . | awk 'NR==2 {print $4}')
    if [ "$AVAILABLE_SPACE" -lt 10485760 ]; then  # 10GB in KB
        log_warning "Low disk space detected. Recommend at least 10GB free for local services."
    fi
    
    log_info "System requirements check completed."
}

# Install Ollama
install_ollama() {
    log_info "Installing Ollama..."
    
    if command_exists ollama; then
        log_success "Ollama already installed"
        return 0
    fi
    
    # Detect OS
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        if command_exists brew; then
            log_info "Installing Ollama via Homebrew..."
            brew install ollama
        else
            log_info "Installing Ollama via curl..."
            curl -fsSL https://ollama.ai/install.sh | sh
        fi
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        log_info "Installing Ollama via curl..."
        curl -fsSL https://ollama.ai/install.sh | sh
    else
        log_error "Unsupported OS. Please install Ollama manually from https://ollama.ai"
        return 1
    fi
    
    log_success "Ollama installed successfully"
}

# Setup Ollama models
setup_ollama() {
    log_info "Setting up Ollama models..."
    
    if ! command_exists ollama; then
        log_error "Ollama not found. Please install it first."
        return 1
    fi
    
    # Start Ollama service
    log_info "Starting Ollama service..."
    ollama serve &
    OLLAMA_PID=$!
    
    # Wait for service to start
    sleep 5
    
    # Check if we can connect
    if ! curl -s http://localhost:11434/api/version >/dev/null; then
        log_warning "Could not connect to Ollama service. It might take a moment to start."
        sleep 10
    fi
    
    # Ask user which model to install
    echo "Which Ollama model would you like to install?"
    echo "1) llama2 (7B) - Balanced performance, ~4GB"
    echo "2) mistral (7B) - Fast and efficient, ~4GB" 
    echo "3) codellama (7B) - Best for technical content, ~4GB"
    echo "4) llama2:13b - Higher quality, ~7GB"
    echo "5) tinyllama - Smallest model, ~637MB"
    echo "6) Skip model installation"
    read -p "Enter your choice (1-6): " MODEL_CHOICE
    
    case $MODEL_CHOICE in
        1)
            log_info "Downloading llama2 model..."
            ollama pull llama2
            echo "OLLAMA_MODEL=llama2" >> .env
            ;;
        2)
            log_info "Downloading mistral model..."
            ollama pull mistral
            echo "OLLAMA_MODEL=mistral" >> .env
            ;;
        3)
            log_info "Downloading codellama model..."
            ollama pull codellama
            echo "OLLAMA_MODEL=codellama" >> .env
            ;;
        4)
            log_info "Downloading llama2:13b model..."
            ollama pull llama2:13b
            echo "OLLAMA_MODEL=llama2:13b" >> .env
            ;;
        5)
            log_info "Downloading tinyllama model..."
            ollama pull tinyllama
            echo "OLLAMA_MODEL=tinyllama" >> .env
            ;;
        6)
            log_info "Skipping model installation"
            ;;
        *)
            log_warning "Invalid choice. Skipping model installation."
            ;;
    esac
    
    # Kill the background Ollama process
    kill $OLLAMA_PID 2>/dev/null || true
    
    log_success "Ollama setup completed"
}

# Install IPFS
install_ipfs() {
    log_info "Installing IPFS..."
    
    if command_exists ipfs; then
        log_success "IPFS already installed"
        return 0
    fi
    
    # Detect OS and architecture
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        if command_exists brew; then
            log_info "Installing IPFS via Homebrew..."
            brew install ipfs
        else
            log_info "Installing IPFS via curl..."
            curl -sSL https://dist.ipfs.io/kubo/v0.23.0/kubo_v0.23.0_darwin-amd64.tar.gz | tar -xz
            sudo mv kubo/ipfs /usr/local/bin/
            rm -rf kubo
        fi
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        log_info "Installing IPFS via curl..."
        curl -sSL https://dist.ipfs.io/kubo/v0.23.0/kubo_v0.23.0_linux-amd64.tar.gz | tar -xz
        sudo mv kubo/ipfs /usr/local/bin/
        rm -rf kubo
    else
        log_error "Unsupported OS. Please install IPFS manually from https://ipfs.io"
        return 1
    fi
    
    log_success "IPFS installed successfully"
}

# Setup IPFS
setup_ipfs() {
    log_info "Setting up IPFS..."
    
    if ! command_exists ipfs; then
        log_error "IPFS not found. Please install it first."
        return 1
    fi
    
    # Initialize IPFS repo if not exists
    if [ ! -d "$HOME/.ipfs" ]; then
        log_info "Initializing IPFS repository..."
        ipfs init
    else
        log_info "IPFS repository already exists"
    fi
    
    # Configure IPFS settings
    log_info "Configuring IPFS settings..."
    
    # Set API and Gateway addresses
    ipfs config Addresses.API /ip4/127.0.0.1/tcp/5001
    ipfs config Addresses.Gateway /ip4/127.0.0.1/tcp/8080
    
    # Set storage limit (default 10GB)
    ipfs config Datastore.StorageMax 10GB
    
    # Test IPFS by starting daemon briefly
    log_info "Testing IPFS configuration..."
    ipfs daemon &
    IPFS_PID=$!
    
    # Wait for daemon to start
    sleep 10
    
    # Test connection
    if curl -s http://localhost:5001/api/v0/version >/dev/null; then
        log_success "IPFS daemon is working correctly"
    else
        log_warning "Could not connect to IPFS daemon"
    fi
    
    # Stop daemon
    kill $IPFS_PID 2>/dev/null || true
    sleep 2
    
    log_success "IPFS setup completed"
}

# Create or update .env file
setup_env() {
    log_info "Setting up environment configuration..."
    
    # Create .env if it doesn't exist
    if [ ! -f .env ]; then
        cp .env.example .env
        log_info "Created .env file from template"
    fi
    
    # Enable local services in .env
    if command_exists ollama; then
        log_info "Enabling local AI in .env..."
        if grep -q "LOCAL_AI_ENABLED" .env; then
            sed -i.bak 's/LOCAL_AI_ENABLED=false/LOCAL_AI_ENABLED=true/' .env
        else
            echo "LOCAL_AI_ENABLED=true" >> .env
        fi
        
        if ! grep -q "OLLAMA_BASE_URL" .env; then
            echo "OLLAMA_BASE_URL=http://localhost:11434" >> .env
        fi
    fi
    
    if command_exists ipfs; then
        log_info "Enabling local IPFS in .env..."
        if grep -q "LOCAL_IPFS_ENABLED" .env; then
            sed -i.bak 's/LOCAL_IPFS_ENABLED=false/LOCAL_IPFS_ENABLED=true/' .env
        else
            echo "LOCAL_IPFS_ENABLED=true" >> .env
        fi
        
        if ! grep -q "IPFS_API_URL" .env; then
            echo "IPFS_API_URL=http://localhost:5001" >> .env
            echo "IPFS_GATEWAY_URL=http://localhost:8080" >> .env
        fi
    fi
    
    # Clean up backup file
    rm -f .env.bak
    
    log_success "Environment configuration completed"
}

# Test the setup
test_setup() {
    log_info "Testing local services setup..."
    
    # Test Ollama
    if command_exists ollama; then
        log_info "Testing Ollama..."
        ollama serve &
        OLLAMA_PID=$!
        sleep 5
        
        if curl -s http://localhost:11434/api/version >/dev/null; then
            log_success "✓ Ollama is working"
        else
            log_warning "✗ Ollama test failed"
        fi
        
        kill $OLLAMA_PID 2>/dev/null || true
    fi
    
    # Test IPFS
    if command_exists ipfs; then
        log_info "Testing IPFS..."
        ipfs daemon &
        IPFS_PID=$!
        sleep 10
        
        if curl -s http://localhost:5001/api/v0/version >/dev/null; then
            log_success "✓ IPFS is working"
        else
            log_warning "✗ IPFS test failed"
        fi
        
        kill $IPFS_PID 2>/dev/null || true
        sleep 2
    fi
    
    log_success "Setup testing completed"
}

# Main setup function
main() {
    echo "======================================"
    echo "  Doris Protocol Local Services Setup"
    echo "======================================"
    echo
    
    log_info "This script will help you set up local AI and IPFS services for Doris Protocol."
    log_info "This enables privacy-first, offline-capable content creation and publishing."
    echo
    
    # Check what to install
    echo "What would you like to set up?"
    echo "1) Both Ollama (AI) and IPFS"
    echo "2) Only Ollama (AI)"
    echo "3) Only IPFS"
    echo "4) Just configure existing installations"
    read -p "Enter your choice (1-4): " SETUP_CHOICE
    
    case $SETUP_CHOICE in
        1)
            INSTALL_OLLAMA=true
            INSTALL_IPFS=true
            ;;
        2)
            INSTALL_OLLAMA=true
            INSTALL_IPFS=false
            ;;
        3)
            INSTALL_OLLAMA=false
            INSTALL_IPFS=true
            ;;
        4)
            INSTALL_OLLAMA=false
            INSTALL_IPFS=false
            ;;
        *)
            log_error "Invalid choice. Exiting."
            exit 1
            ;;
    esac
    
    echo
    check_requirements
    echo
    
    # Install services
    if [ "$INSTALL_OLLAMA" = true ]; then
        install_ollama
        setup_ollama
        echo
    fi
    
    if [ "$INSTALL_IPFS" = true ]; then
        install_ipfs
        setup_ipfs
        echo
    fi
    
    # Setup environment
    setup_env
    echo
    
    # Test setup
    test_setup
    echo
    
    # Final instructions
    echo "======================================"
    echo "  Setup Complete! 🎉"
    echo "======================================"
    echo
    log_success "Local services are ready to use!"
    echo
    echo "Next steps:"
    echo "1. Test content creation: pnpm run generate:post"
    echo "2. Test AI enhancement: pnpm run enhance:ai"
    echo "3. Test local deployment: pnpm run deploy:ipfs"
    echo "4. Start web interface: pnpm run dev"
    echo
    echo "To manage services:"
    if [ "$INSTALL_OLLAMA" = true ]; then
        echo "- Start Ollama: ollama serve"
        echo "- Chat with AI: ollama run \$OLLAMA_MODEL"
    fi
    if [ "$INSTALL_IPFS" = true ]; then
        echo "- Start IPFS: ipfs daemon"
        echo "- IPFS Gateway: http://localhost:8080"
    fi
    echo
    echo "Documentation:"
    echo "- Ollama setup: local-services/ollama/README.md"
    echo "- IPFS setup: local-services/ipfs/README.md"
    echo
    log_success "Happy blogging with Doris Protocol! 🚀"
}

# Run main function
main "$@" 