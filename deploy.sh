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
# Step 4: Setup Environment
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
# Step 5: Create SSL directory
# ==========================================
echo ""
print_status "Creating SSL directory..."
mkdir -p nginx/ssl

# ==========================================
# Step 6: Build and Start Containers
# ==========================================
echo ""
print_status "Building Docker images..."
docker compose build --no-cache

echo ""
print_status "Starting containers..."
docker compose up -d

# ==========================================
# Step 7: Wait for services to be healthy
# ==========================================
echo ""
print_status "Waiting for services to start..."
sleep 30

# ==========================================
# Step 8: Check service status
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
echo "  - Stop services:    docker compose down"
echo "  - Restart services: docker compose restart"
echo "  - Update app:       git pull && docker compose up -d --build"
echo ""
print_warning "Remember to configure your AWS Security Group to allow:"
echo "  - Port 22 (SSH)"
echo "  - Port 80 (HTTP)"
echo "  - Port 443 (HTTPS - if using SSL)"
echo ""
