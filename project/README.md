<div align="center">
  <h1>✏️ Quill - AI-Powered Learning Platform</h1>
  <p>An intelligent learning platform combining AI with an intuitive interface for seamless document analysis and interactive learning.</p>
  
  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
  [![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)
  [![Open in Expo](https://img.shields.io/badge/Open%20in-Expo-4630EB.svg?style=flat&logo=EXPO&labelColor=f3f3f3&logoColor=000)](https://expo.dev/)

  ![Quill Demo](https://via.placeholder.com/800x400.png?text=Quill+App+Demo)
</div>

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Configuration](#configuration)
- [Development](#-development)
  - [Running Locally](#running-locally)
  - [Building for Production](#building-for-production)
  - [Testing](#testing)
- [Deployment](#-deployment)
- [Contributing](#-contributing)
- [License](#-license)
- [Acknowledgements](#-acknowledgements)

## ✨ Features

### Core Features

- **Document Intelligence**
  - Upload and analyze PDF documents
  - Smart text extraction and processing
  - Interactive document navigation

- **Smart Chat**
  - Context-aware AI conversations
  - Document-specific Q&A
  - Real-time response streaming

- **User Management**
  - Secure OTP-based authentication
  - Profile management
  - Role-based access control

- **Real-time Features**
  - Live document collaboration
  - Instant notifications
  - WebSocket-based updates

## 🛠 Tech Stack

### Frontend
- React Native (Expo)
- TypeScript
- Redux Toolkit
- React Navigation
- Styled Components

### Backend
- Python 3.10+
- FastAPI
- SQLAlchemy (ORM)
- PostgreSQL
- Redis

### AI/ML
- Natural Language Processing
- Document Analysis
- Vector Embeddings

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ & npm 9+
- Python 3.10+
- PostgreSQL 14+
- Redis 6+
- Expo CLI (`npm install -g expo-cli`)
- Python virtual environment

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/quill.git
   cd quill
   ```

2. **Backend Setup**
   ```bash
   # Create and activate virtual environment
   cd backend
   python -m venv venv
   source venv/bin/activate  # Windows: .\venv\Scripts\activate
   
   # Install dependencies
   pip install --upgrade pip
   pip install -r requirements-dev.txt
   ```

3. **Frontend Setup**
   ```bash
   cd ../frontend
   npm install
   # or
   yarn install
   ```

### Configuration

1. **Backend (`.env`)**
   ```env
   # Database
   DATABASE_URL=postgresql://user:password@localhost:5432/quill
   
   # Security
   SECRET_KEY=your-secret-key-here
   JWT_SECRET=your-jwt-secret
   
   # Redis
   REDIS_URL=redis://localhost:6379
   
   # CORS
   FRONTEND_URL=http://localhost:19006
   ```

2. **Frontend (`.env`)**
   ```env
   EXPO_PUBLIC_API_URL=http://localhost:8000
   EXPO_PUBLIC_WS_URL=ws://localhost:8000/ws
   EXPO_PUBLIC_ENV=development
   ```

## 💻 Development

### Running Locally

1. **Start Backend**
   ```bash
   cd backend
   uvicorn app.main:app --reload
   ```

2. **Start Frontend**
   ```bash
   cd frontend
   expo start
   ```
   - Press `a` for Android emulator
   - Press `i` for iOS simulator (macOS only)
   - Scan QR code with Expo Go app (mobile)

### Testing

#### Backend Tests
```bash
cd backend
pytest tests/
```

#### Frontend Tests
```bash
cd frontend
npm test
# or
yarn test
```

## 🚀 Deployment

### Production Build

1. **Backend**
   ```bash
   # Install production dependencies
   pip install -r requirements.txt
   
   # Run with production settings
   uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
   ```

2. **Frontend**
   ```bash
   # Build for production
   expo build:web
   
   # Deploy to hosting service
   firebase deploy  # Example for Firebase Hosting
   ```

### Mobile App Distribution

#### Android
```bash
# Build APK
expo build:android -t apk

# Or build app bundle
expo build:android -t app-bundle
```

#### iOS
```bash
# Build for iOS (requires macOS)
expo build:ios
```

## 🤝 Contributing

We welcome contributions! Please read our [Contributing Guidelines](CONTRIBUTING.md) to get started.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgements

- [Expo](https://expo.dev/) for the amazing cross-platform development experience
- [FastAPI](https://fastapi.tiangolo.com/) for the high-performance backend
- All the open-source libraries and tools that made this project possible

