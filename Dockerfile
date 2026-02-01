# ===== MULTI-SERVICE DOCKERFILE WITH SUPERVISORD =====
FROM ubuntu:22.04

# Avoid interactive prompts during package installation
ENV DEBIAN_FRONTEND=noninteractive

# Install system dependencies
RUN apt-get update && apt-get install -y \
    openjdk-17-jdk \
    maven \
    nginx \
    mysql-server \
    supervisor \
    curl \
    wget \
    ca-certificates \
    gnupg \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js 20 (required for Vite)
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs

# Set JAVA_HOME
ENV JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64

# Create application directories
WORKDIR /app
RUN mkdir -p /app/backend /app/frontend /app/logs /var/log/supervisor

# ===== BACKEND BUILD =====
COPY Backend/euraka_example ./backend/EurekaServer
COPY Backend/UserService/UserService ./backend/UserService
COPY Backend/ContentService/ContentService ./backend/ContentService

# Build backend services
RUN cd /app/backend/EurekaServer && mvn clean package -DskipTests
RUN cd /app/backend/UserService && mvn clean package -DskipTests
RUN cd /app/backend/ContentService && mvn clean package -DskipTests

# Copy JAR files to app directory
RUN cp /app/backend/EurekaServer/target/*.jar /app/eureka.jar
RUN cp /app/backend/UserService/target/*.jar /app/user.jar
RUN cp /app/backend/ContentService/target/*.jar /app/content.jar

# ===== FRONTEND BUILD =====
COPY Frontend ./frontend

# Install frontend dependencies and build
RUN cd /app/frontend && npm install
RUN cd /app/frontend && npm run build:client

# Copy built frontend to nginx directory
RUN cp -r /app/frontend/dist/spa/* /var/www/html/

# ===== MYSQL SETUP =====
# Initialize MySQL data directory
RUN mkdir -p /var/lib/mysql /var/run/mysqld
RUN chown -R mysql:mysql /var/lib/mysql /var/run/mysqld

# Initialize MySQL database with proper setup
RUN service mysql start && \
    mysql -u root -e "CREATE DATABASE IF NOT EXISTS vartaverse;" && \
    mysql -u root -e "CREATE USER IF NOT EXISTS 'appuser'@'%' IDENTIFIED BY 'apppass';" && \
    mysql -u root -e "GRANT ALL PRIVILEGES ON vartaverse.* TO 'appuser'@'%';" && \
    mysql -u root -e "FLUSH PRIVILEGES;" && \
    service mysql stop

# ===== NGINX CONFIGURATION =====
RUN echo 'server { \
    listen 80; \
    server_name localhost; \
    root /var/www/html; \
    index index.html; \
    \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
    \
    location /api/users/ { \
        proxy_pass http://localhost:8083/; \
        proxy_set_header Host $host; \
        proxy_set_header X-Real-IP $remote_addr; \
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; \
        proxy_set_header X-Forwarded-Proto $scheme; \
    } \
    \
    location /api/content/ { \
        proxy_pass http://localhost:8082/; \
        proxy_set_header Host $host; \
        proxy_set_header X-Real-IP $remote_addr; \
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; \
        proxy_set_header X-Forwarded-Proto $scheme; \
    } \
    \
    location /eureka/ { \
        proxy_pass http://localhost:8761/; \
        proxy_set_header Host $host; \
        proxy_set_header X-Real-IP $remote_addr; \
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; \
        proxy_set_header X-Forwarded-Proto $scheme; \
    } \
}' > /etc/nginx/sites-available/default

# ===== SUPERVISORD CONFIGURATION =====
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Create startup scripts
RUN echo '#!/bin/bash\n\
mysqld_safe --user=mysql --datadir=/var/lib/mysql &\n\
wait' > /app/init-mysql.sh && chmod +x /app/init-mysql.sh

RUN echo '#!/bin/bash\n\
cd /app\n\
java -jar eureka.jar' > /app/start-eureka.sh && chmod +x /app/start-eureka.sh

RUN echo '#!/bin/bash\n\
cd /app\n\
export SPRING_DATASOURCE_URL=jdbc:mysql://localhost:3306/vartaverse\n\
export SPRING_DATASOURCE_USERNAME=appuser\n\
export SPRING_DATASOURCE_PASSWORD=apppass\n\
export EUREKA_CLIENT_SERVICEURL_DEFAULTZONE=http://localhost:8761/eureka/\n\
java -jar user.jar' > /app/start-user-service.sh && chmod +x /app/start-user-service.sh

RUN echo '#!/bin/bash\n\
cd /app\n\
export SPRING_DATASOURCE_URL=jdbc:mysql://localhost:3306/vartaverse\n\
export SPRING_DATASOURCE_USERNAME=appuser\n\
export SPRING_DATASOURCE_PASSWORD=apppass\n\
export EUREKA_CLIENT_SERVICEURL_DEFAULTZONE=http://localhost:8761/eureka/\n\
java -jar content.jar' > /app/start-content-service.sh && chmod +x /app/start-content-service.sh

# Expose ports
EXPOSE 80 3000 3306 8761 8082 8083

# Start supervisord
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]