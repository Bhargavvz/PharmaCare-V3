#!/bin/bash

# ==========================================
# PharmaCare+ AWS EC2 Deployment Script
# ==========================================
# This script sets up Docker and deploys the application
# Run on a fresh Ubuntu 22.04 EC2 instance

set -e

echo "=========================================="
echo "PharmaCare+ Deployment Script"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored messages
print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

# ==========================================
# Step 1: Update System
# ==========================================
echo ""
print_status "Updating system packages..."
sudo apt-get update -y
sudo apt-get upgrade -y

# ==========================================
# Step 2: Install Docker
# ==========================================
echo ""
print_status "Installing Docker..."

# Remove old versions
sudo apt-get remove -y docker docker-engine docker.io containerd runc 2>/dev/null || true

# Install dependencies
sudo apt-get install -y \
    ca-certificates \
    curl \
    gnupg \
    lsb-release

# Add Docker's official GPG key
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Add the repository to Apt sources
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine
sudo apt-get update -y
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Add current user to docker group
sudo usermod -aG docker $USER

print_status "Docker installed successfully!"

# ==========================================
# Step 3: Verify Docker Installation
# ==========================================
echo ""
print_status "Verifying Docker installation..."
docker --version
docker compose version

# ==========================================
# Step 4: Configure PostgreSQL for Docker (if using existing VM PostgreSQL)
# ==========================================
echo ""
print_status "Configuring PostgreSQL for Docker connections..."

# Check if PostgreSQL is installed
if command -v psql &> /dev/null; then
    print_status "PostgreSQL detected. Configuring for Docker..."
    
    # Find PostgreSQL config directory
    PG_VERSION=$(psql --version | grep -oP '\d+' | head -1)
    PG_HBA="/etc/postgresql/${PG_VERSION}/main/pg_hba.conf"
    PG_CONF="/etc/postgresql/${PG_VERSION}/main/postgresql.conf"
    
    # Backup configs
    sudo cp "$PG_HBA" "${PG_HBA}.backup" 2>/dev/null || true
    sudo cp "$PG_CONF" "${PG_CONF}.backup" 2>/dev/null || true
    
    # Add Docker network access to pg_hba.conf if not already present
    if ! sudo grep -q "172.16.0.0/12" "$PG_HBA" 2>/dev/null; then
        echo "host    all    all    172.16.0.0/12    md5" | sudo tee -a "$PG_HBA"
        print_status "Added Docker network to pg_hba.conf"
    else
        print_status "Docker network already configured in pg_hba.conf"
    fi
    
    # Set listen_addresses = '*' in postgresql.conf
    if sudo grep -q "^listen_addresses" "$PG_CONF" 2>/dev/null; then
        sudo sed -i "s/^listen_addresses.*/listen_addresses = '*'/" "$PG_CONF"
    else
        echo "listen_addresses = '*'" | sudo tee -a "$PG_CONF"
    fi
    print_status "Set listen_addresses = '*' in postgresql.conf"
    
    # Restart PostgreSQL
    sudo systemctl restart postgresql
    print_status "PostgreSQL restarted"
    
    # Create pharmacare database if it doesn't exist
    sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname = 'pharmacare'" | grep -q 1 || \
        sudo -u postgres psql -c "CREATE DATABASE pharmacare;"
    print_status "Database 'pharmacare' ready"
    
else
    print_warning "PostgreSQL not found - using Docker container for PostgreSQL"
fi

# ==========================================
# Step 5: Setup Environment
# ==========================================
echo ""
print_status "Setting up environment..."

if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        cp .env.example .env
        print_warning "Created .env from .env.example"
        print_warning "Please edit .env file with your configuration:"
        print_warning "  nano .env"
        echo ""
        print_error "Edit the .env file and run this script again!"
        exit 1
    else
        print_error ".env.example not found!"
        exit 1
    fi
else
    print_status ".env file found"
fi

# ==========================================
# Step 6: Create SSL directory
# ==========================================
echo ""
print_status "Creating SSL directory..."
mkdir -p nginx/ssl

# ==========================================
# Step 7: Clean up old containers (if any)
# ==========================================
echo ""
print_status "Cleaning up old containers..."
docker compose down 2>/dev/null || true
docker container prune -f 2>/dev/null || true

# ==========================================
# Step 8: Build and Start Containers
# ==========================================
echo ""
print_status "Building Docker images..."
docker compose build --no-cache

echo ""
print_status "Starting containers..."
docker compose up -d

# ==========================================
# Step 9: Wait for services to be healthy
# ==========================================
echo ""
print_status "Waiting for services to start..."
sleep 30

# ==========================================
# Step 10: Check service status
# ==========================================
echo ""
print_status "Checking service status..."
docker compose ps

echo ""
echo "=========================================="
print_status "Deployment Complete!"
echo "=========================================="
echo ""
echo "Your application should be accessible at:"
echo "  - http://$(curl -s ifconfig.me 2>/dev/null || echo 'YOUR_EC2_PUBLIC_IP')"
echo ""
echo "Useful commands:"
echo "  - View logs:        docker compose logs -f"
echo "  - Backend logs:     docker compose logs backend"
echo "  - Stop services:    docker compose down"
echo "  - Restart services: docker compose restart"
echo "  - Update app:       git pull && docker compose up -d --build"
echo ""
print_warning "Remember to configure your AWS Security Group to allow:"
echo "  - Port 22 (SSH)"
echo "  - Port 80 (HTTP)"
echo "  - Port 443 (HTTPS - if using SSL)"
echo ""
