# Digital Census Portal - Frontend

React frontend for the Digital Census Portal.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Copy `.env.example` to `.env` and fill in Firebase configuration:
```bash
cp .env.example .env
```

3. Run development server:
```bash
npm run dev
```

## Features

- **Firebase Phone Authentication** with OTP
- **Role-based Routing** (Admin, Supervisor, Surveyor)
- **Offline-First** with IndexedDB auto-save
- **GPS Capture** on survey submission
- **Session Management** with 30-min idle timeout

## Folder Structure

```
src/
├── components/      # Reusable UI components
├── contexts/        # React contexts (Auth)
├── hooks/           # Custom hooks
├── pages/           # Page components by role
├── services/        # API, Firebase, IndexedDB
└── index.css        # Global styles
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| VITE_FIREBASE_API_KEY | Firebase API key |
| VITE_FIREBASE_AUTH_DOMAIN | Firebase auth domain |
| VITE_FIREBASE_PROJECT_ID | Firebase project ID |
| VITE_API_URL | Backend API URL (default: /api/v1) |
