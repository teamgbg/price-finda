# Use official Playwright image with pre-installed browsers
FROM mcr.microsoft.com/playwright:v1.49.0-focal

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Expose port
EXPOSE 8080

# Start server
CMD ["npm", "start"]
