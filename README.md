# GDG Project Hub

A modern, fast, and secure project management and communication tool designed for small teams (15-20 members). Built to replace scattered WhatsApp document sharing with a centralized, organized, and real-time platform.

🌐 **Live Link:** [https://gdg-project-hub.web.app](https://gdg-project-hub.web.app)

## Features

- **Master Admin System:** A hidden master admin can login and manage the team.
- **Role-Based Access Control:** Only admins can add or remove members. 
- **Real-time Chat:** Team members can communicate instantly using the built-in global chat room.
- **Document Management:** Save, search, and manage important project links and documents with descriptions.
- **Member Activity Tracking:** See who is working on the project and their last active status.
- **Premium Glassmorphism UI:** A beautiful, dark-themed, responsive user interface.

## Tech Stack

- **Frontend:** React, Vite, CSS (Glassmorphism design system)
- **Icons:** Lucide React
- **Routing:** React Router DOM
- **Database & Hosting:** Firebase (Firestore + Firebase Hosting)

## Local Setup

1. **Clone the repository:**
   ```bash
   git clone <your-repo-url>
   cd project-management
   ```

2. **Install Dependencies:**
   ```bash
   npm install
   ```

3. **Environment Variables:**
   Create a `.env` file in the root directory and add your Firebase credentials and Master Admin details:
   ```env
   VITE_APP_USERNAME=admin
   VITE_APP_PASSWORD=your_secure_password
   
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_domain.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   ```

4. **Run the Development Server:**
   ```bash
   npm run dev
   ```

## Deployment

To deploy the latest changes to Firebase Hosting, run:

```bash
npm run build
npx firebase deploy
```

## Security Note

This app uses a custom login system tailored for a small private team. Firestore rules are set to `allow read, write: if true;` to accommodate this. Keep your Firebase Config private and do not share the live link with unauthorized personnel.
