FROM node:20-alpine

# Install http-server globally
RUN npm install -g http-server

# Set working directory
WORKDIR /workspace/artifacts

# Expose port
EXPOSE 3002

# Start http-server
CMD ["http-server", ".", "-p", "3002", "-a", "0.0.0.0", "-c-1"]
