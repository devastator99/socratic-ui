# Quill - AI-Powered Learning Platform

## Project Overview

Quill is an intelligent learning platform that combines the power of AI with an intuitive mobile interface. Built with React Native (Expo) and Python, it offers a seamless experience for document analysis, interactive learning, and knowledge sharing.

## Key Features

### Core Features

- **Document Intelligence**: Upload, analyze, and interact with PDF documents
- **Smart Chat**: Context-aware conversations with AI assistance
- **User Management**: Secure authentication with OTP verification
- **Real-time Updates**: WebSocket-based live interactions
- **Cross-platform**: Works on iOS, Android, and web

### Technical Stack

- **Frontend**: React Native (Expo) with TypeScript
- **Backend**: FastAPI (Python 3.8+)
- **Database**: PostgreSQL with SQLAlchemy ORM
- **Real-time**: WebSocket support
- **AI/ML**: Advanced document processing and analysis

## Getting Started

### Prerequisites

- Node.js & npm
- Python 3.8+
- Expo CLI (`npm install -g expo-cli`)
- PostgreSQL 12+
- Redis (for real-time features)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/quill.git
   cd quill
   ```

2. **Backend Setup**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # Windows: .\venv\Scripts\activate
   pip install -r requirements.txt
   ```

3. **Frontend Setup**
   ```bash
   cd ../frontend
   npm install
   # or
   yarn
   ```

### Configuration

1. **Backend** (`backend/.env`)
   ```env
   DATABASE_URL=postgresql://user:password@localhost:5432/quill
   SECRET_KEY=your-secret-key
   REDIS_URL=redis://localhost:6379
   ```

2. **Frontend** (`frontend/.env`)
   ```env
   EXPO_PUBLIC_API_URL=http://localhost:8000
   EXPO_PUBLIC_WS_URL=ws://localhost:8000/ws
   ```

## Running the Application

### Start Backend
```bash
cd backend
uvicorn main:app --reload
```

### Start Frontend
```bash
cd frontend
expo start
```

## Mobile App

### Android

- Use Expo Go app for development
- For production, build with EAS or Android Studio
- Place debug keystore in `android/app/debug.keystore`

### iOS

- Requires macOS with Xcode
- Use Expo Go or build with EAS

## Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

