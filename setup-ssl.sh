#!/bin/bash

# ==========================================
# SSL Setup Script for pharmacaree.live
# ==========================================
# Run this AFTER deploy.sh and DNS propagation

set -e

DOMAIN="pharmacaree.live"
EMAIL="your-email@example.com"  # Change this to your email

echo "=========================================="
echo "SSL Certificate Setup for $DOMAIN"
echo "=========================================="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

# Step 1: Install Certbot
echo ""
print_status "Installing Certbot..."
sudo apt-get update
sudo apt-get install -y certbot

# Step 2: Stop nginx temporarily
echo ""
print_status "Stopping nginx container..."
docker compose stop nginx

# Step 3: Get SSL certificate
echo ""
print_status "Obtaining SSL certificate..."
sudo certbot certonly --standalone -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos --email $EMAIL

# Step 4: Copy certificates to nginx ssl directory
echo ""
print_status "Copying certificates..."
sudo cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem ./nginx/ssl/
sudo cp /etc/letsencrypt/live/$DOMAIN/privkey.pem ./nginx/ssl/
sudo chmod 644 ./nginx/ssl/*.pem

# Step 5: Update nginx config for SSL (create new config)
echo ""
print_status "Updating nginx configuration for SSL..."

cat > ./nginx/nginx.conf << 'NGINX_CONF'
events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent"';
    access_log /var/log/nginx/access.log main;
    error_log /var/log/nginx/error.log warn;

    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;

    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript 
               application/json application/javascript application/xml;

    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;

    upstream backend {
        server backend:8080;
    }

    upstream frontend {
        server frontend:80;
    }

    # HTTP - Redirect to HTTPS
    server {
        listen 80;
        server_name pharmacaree.live www.pharmacaree.live;
        return 301 https://$server_name$request_uri;
    }

    # HTTPS
    server {
        listen 443 ssl http2;
        server_name pharmacaree.live www.pharmacaree.live;

        ssl_certificate /etc/nginx/ssl/fullchain.pem;
        ssl_certificate_key /etc/nginx/ssl/privkey.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
        ssl_prefer_server_ciphers off;
        ssl_session_cache shared:SSL:10m;

        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

        location /health {
            access_log off;
            return 200 "healthy\n";
            add_header Content-Type text/plain;
        }

        location /api/ {
            limit_req zone=api burst=20 nodelay;
            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        location /oauth2/ {
            proxy_pass http://backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        location /actuator/ {
            proxy_pass http://backend;
            proxy_set_header Host $host;
        }

        location / {
            proxy_pass http://frontend;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
NGINX_CONF

# Step 6: Restart nginx
echo ""
print_status "Starting nginx with SSL..."
docker compose up -d nginx

# Step 7: Setup auto-renewal
echo ""
print_status "Setting up certificate auto-renewal..."
(crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --quiet && cp /etc/letsencrypt/live/$DOMAIN/*.pem $(pwd)/nginx/ssl/ && docker compose restart nginx") | crontab -

echo ""
echo "=========================================="
print_status "SSL Setup Complete!"
echo "=========================================="
echo ""
echo "Your site is now accessible at:"
echo "  - https://pharmacaree.live"
echo "  - https://www.pharmacaree.live"
echo ""
print_warning "Remember to update EMAIL in this script before running!"
echo ""
