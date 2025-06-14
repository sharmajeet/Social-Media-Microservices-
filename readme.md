# Social Media Microservices Backend

![Project Banner](./assets/banner/banner.jpg)  
*Building the Future of Social Media with Microservices*

Welcome to the **Social Media Microservices Backend**! This project is a scalable, microservices-based backend for a social media platform, built with Node.js and orchestrated using Docker Compose. It consists of multiple services that work together to provide a robust backend system, including user authentication, post management, media handling, and search functionality.

---

## 🌟 Features
- **Microservices Architecture**: Modular services for scalability and maintainability.
- **API Gateway**: Centralized entry point for routing client requests.
- **Authentication**: Secure user authentication and authorization with JWT.
- **Post Management**: Create, retrieve, and manage user posts.
- **Media Handling**: Upload and retrieve media files.
- **Search Functionality**: Search for posts and users efficiently.
- **Redis Caching**: Improve performance with Redis caching.
- **Dockerized**: Easy setup and deployment using Docker Compose.

---

## 🏗️ Architecture Overview
The project is structured as a microservices architecture, with the following services:
- **`api-gateway`**: Routes client requests to appropriate services (port `3000`).
- **`identity-service`**: Handles user authentication and authorization (port `3001`).
- **`post-service`**: Manages user posts (port `3002`).
- **`media-service`**: Handles media uploads and retrieval (port `3003`).
- **`search-service`**: Provides search functionality (port `3004`).
- **`redis`**: Caching layer for performance optimization (port `6379`).

All services communicate over a Docker network (`microservices-network`) and use MongoDB as the primary database.

---

## 📋 Prerequisites
Before you begin, ensure you have the following installed:
- [Docker](https://docs.docker.com/get-docker/) (v20.10 or later)
- [Docker Compose](https://docs.docker.com/compose/install/) (v2.0 or later)
- [Node.js](https://nodejs.org/) (v18.x, for local development outside Docker)
- [Git](https://git-scm.com/downloads)
- A MongoDB Atlas account (or a local MongoDB instance)

---

## 📂 Project Structure
```
Social-Media-Microservices-/
├── api-gateway/           # API Gateway service
│   ├── src/              # Source code
│   ├── Dockerfile        # Dockerfile for the service
│   ├── .env              # Environment variables (create this file)
│   └── package.json      # Node.js dependencies
├── identity-service/      # Identity Service (authentication)
│   ├── src/
│   ├── Dockerfile
│   ├── .env
│   └── package.json
├── post-service/          # Post Service (post management)
│   ├── src/
│   ├── Dockerfile
│   ├── .env
│   └── package.json
├── media-service/         # Media Service (media management)
│   ├── src/
│   ├── Dockerfile
│   ├── .env
│   └── package.json
├── search-service/        # Search Service (search functionality)
│   ├── src/
│   ├── Dockerfile
│   ├── .env
│   └── package.json
├── shared/                # Shared code (e.g., middleware like errorHandler)
│   └── middlewares/
├── docker-compose.yml     # Docker Compose configuration
└── README.md              # This file
```

---

## 🚀 Getting Started

### 1. Clone the Repository
```bash
git clone https://github.com/sharmajeet/Social-Media-Microservices-.git
cd Social-Media-Microservices-
```
> **Note**: If you encounter authentication issues, use a Personal Access Token (PAT) or SSH. See GitHub Authentication for details.

### 2. Set Up Environment Variables

Each service requires a `.env` file in its directory. Create these files based on the examples below:

**api-gateway/.env**
```env
PORT=3000
NODE_ENV=development
IDENTITY_SERVICE_URL=http://identity-service:3001
POST_SERVICE_URL=http://post-service:3002
MEDIA_SERVICE_URL=http://media-service:3003
REDIS_URL=redis://redis:6379
JWT_SECRET=your_jwt_secret_here
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.1dbyuhf.mongodb.net/<dbname>?retryWrites=true&w=majority
```

**identity-service/.env**
```env
PORT=3001
NODE_ENV=development
REDIS_URL=redis://redis:6379
JWT_SECRET=your_jwt_secret_here
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.1dbyuhf.mongodb.net/<dbname>?retryWrites=true&w=majority
```

**post-service/.env**
```env
PORT=3002
NODE_ENV=development
REDIS_URL=redis://redis:6379
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.1dbyuhf.mongodb.net/<dbname>?retryWrites=true&w=majority
```

**media-service/.env**
```env
PORT=3003
NODE_ENV=development
REDIS_URL=redis://redis:6379
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.1dbyuhf.mongodb.net/<dbname>?retryWrites=true&w=majority
```

**search-service/.env**
```env
PORT=3004
NODE_ENV=development
REDIS_URL=redis://redis:6379
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.1dbyuhf.mongodb.net/<dbname>?retryWrites=true&w=majority
```

> Replace `your_jwt_secret_here` and MongoDB credentials accordingly.

---

### 3. Build and Run with Docker
```bash
docker-compose up --build
```

### 4. Verify Services
Check the logs for successful startup:
```
api-gateway: info: API Gateway is running on port 3000
identity-service: info: Identity Service is running on port 3001
post-service: info: Post Service is running on port 3002
media-service: info: Media Service is running on port 3003
search-service: info: Search Service is running on port 3004
redis: Ready to accept connections tcp
```

### 5. Stop the Services
```bash
docker-compose down
```

---

## 🔗 Accessing the Services

| Service           | URL                       | Port  |
|-------------------|----------------------------|--------|
| API Gateway       | http://localhost:3000      | 3000   |
| Identity Service  | http://localhost:3001      | 3001   |
| Post Service      | http://localhost:3002      | 3002   |
| Media Service     | http://localhost:3003      | 3003   |
| Search Service    | http://localhost:3004      | 3004   |

> Use the **API Gateway** as the entry point. Other services are accessible for testing.

<!-- ---

## 🛠️ Troubleshooting

### Redis Connection Error
```
[ioredis] Unhandled error event: Error: connect ECONNREFUSED 127.0.0.1:6379
```
**Cause**: The service is trying to connect to Redis at `127.0.0.1`.

**Solution**:
- Ensure `.env` files have `REDIS_URL=redis://redis:6379`
- Confirm code uses `process.env.REDIS_URL`

```js
const Redis = require('ioredis');
const redis = new Redis(process.env.REDIS_URL || 'redis://redis:6379');
redis.on('error', (err) => console.error('Redis error:', err));
```

### MongoDB Connection Error
```
Error: querySrv ESERVFAIL
```
**Solution**:
- Check `MONGO_URI` format.
- Use local MongoDB if DNS fails. Add to `docker-compose.yml`:

```yaml
mongodb:
  image: mongo:6
  ports:
    - "27017:27017"
  networks:
    - microservices-network
  volumes:
    - mongo-data:/data/db

volumes:
  mongo-data:
```

Update `.env`:
```
MONGO_URI=mongodb://mongodb:27017/<dbname>
``` -->

<!-- ---

### Service Crashes

**Cause**: Missing shared files or misconfigured Dockerfile.

**Fix**:
Ensure Dockerfile includes:
```dockerfile
COPY ../shared ./shared
```

--- -->

<!-- ## 🔐 GitHub Authentication

If cloning fails:
- **Use PAT**:
```bash
git remote set-url origin https://<username>:<pat>@github.com/sharmajeet/Social-Media-Microservices-.git
```

- **Use SSH (recommended)**:
```bash
ssh-keygen -t ed25519 -C "your_email@example.com"
# Add public key to GitHub
git remote set-url origin git@github.com:sharmajeet/Social-Media-Microservices-.git
```

--- -->

## 🤝 Contributing
1. Fork the repository.
2. Create a feature branch:
```bash
git checkout -b feature/your-feature
```
3. Commit your changes:
```bash
git commit -m "Add your feature"
```
4. Push and open a pull request.

---

## 📄 License
This project is licensed under the MIT License. See the `LICENSE` file for details.

---

## 📧 Contact
For questions or support, reach out to **sharmajeet**.

⭐ **If you find this project helpful, please give it a star on GitHub!**
