FROM mcr.microsoft.com/playwright:v1.56.1-jammy

WORKDIR /app

# Initialize npm and install dependencies
RUN npm init -y && npm i @playwright/test yaml fs-extra

# Copy UI runners (both server and CLI versions)
COPY tools/ui-runner.js /app/ui-runner.js
COPY tools/ui-runner-cli.js /app/ui-runner-cli.js

# Set NODE_PATH for module resolution
ENV NODE_PATH=/app/node_modules

# Keep container running
CMD ["sh", "-c", "echo verifier ready && tail -f /dev/null"]
