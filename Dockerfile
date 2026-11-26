# Stage 1: Build the React application
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency files first (leverages Docker cache)
COPY package*.json ./
RUN npm install

# Copy source code and build production assets
COPY . .
RUN npm run build

# Stage 2: Serve with lightweight Nginx
FROM nginx:alpine

# Copy built assets from builder stage to Nginx HTML directory
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose port 80 inside the container
EXPOSE 80

# Start Nginx in the foreground
CMD ["nginx", "-g", "daemon off;"]
