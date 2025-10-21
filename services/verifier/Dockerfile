FROM mcr.microsoft.com/playwright:v1.40.0-jammy

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source
COPY . .

# Install Playwright browsers
RUN npx playwright install chromium

# Create virtual display for headless mode
RUN apt-get update && apt-get install -y xvfb

# Start Xvfb and run verifier service
CMD Xvfb :99 -screen 0 1920x1080x24 & node verifier-service.js
