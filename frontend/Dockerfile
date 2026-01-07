# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the app
RUN npm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Copy package files for running preview server
COPY package*.json ./

# Install only production dependencies (we need vite for preview)
RUN npm ci

# Copy built assets from builder
COPY --from=builder /app/dist ./dist

# Expose port 8080
EXPOSE 8080

# Run vite preview server (serves built files)
CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0", "--port", "8080"]

