# Use a lightweight Node.js base image
FROM node:18-alpine

# Install dependencies for pdf-parse
RUN apk add --no-cache python3 make g++

# Set the working directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm ci 

# Copy the rest of the application code
COPY . .

# Create uploads directory
RUN mkdir -p uploads

# Create a non-root user and switch to it
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
RUN chown -R appuser:appgroup /usr/src/app
USER appuser

# Expose the port
EXPOSE 3005

# Start the application
CMD ["npm", "run", "dev"]