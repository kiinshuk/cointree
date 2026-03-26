# Contri - Expense Sharing App 💰

A mobile expense-sharing app built with React Native and Expo. Split expenses easily with friends and family.

## 📱 Features

- **One-tap Expense Add** - Quick add with smart defaults
- **Custom Splits** - Split expenses unequally based on what each person consumed
- **Group Management** - Create groups and add members by email
- **Balance Tracking** - Real-time balance calculation showing who owes whom
- **Settle Up** - One-tap settlement when you want to clear debts
- **Human-friendly Output** - "You owe ₹150" instead of confusing numbers
- **Authentication** - Secure email/password login with auto-login

## 🛠️ Tech Stack

- **Framework**: React Native with Expo SDK 54
- **Backend**: Firebase (Auth + Firestore)
- **Navigation**: React Navigation

## 🚀 Quick Start

### 1. Clone & Install
```bash
git clone https://github.com/kiinshuk/cointree.git
cd contri
npm install
```

### 2. Configure Firebase (Required)

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new project
3. Enable **Authentication** (Email/Password provider)
4. Enable **Firestore** database (start in test mode)
5. Go to **Project Settings > General**
6. Copy your Firebase config

### 3. Add Firebase Config

Edit `firebase/config.js` with your credentials:
```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

### 4. Run the App

```bash
npx expo start
```

Scan QR code with **Expo Go** app on your phone.

---

## 📲 Running Without Installing Tools

### Option A: Expo Go (Easiest)
- Clone repo
- Run `npm install`
- Run `npx expo start`
- Scan QR code

### Option B: Prebuilt APK

Download the latest APK from releases (coming soon).

### Option C: Build with EAS
```bash
npm install -g eas-cli
eas login
eas build -p android
```

---

## 📁 Project Structure

```
Contri/
├── App.js                    # Entry point
├── context/                  # Auth & Group contexts
├── firebase/                 # Firebase config
├── navigation/               # Navigation setup
├── screens/                  # All app screens
│   ├── LoginScreen.js
│   ├── SignupScreen.js
│   ├── GroupsScreen.js
│   ├── GroupDetailScreen.js
│   └── SettingsScreen.js
├── utils/                    # Balance calculator
├── android/                  # Native Android code
├── app.json                  # Expo config
└── package.json
```

## 🔧 Firebase Setup Detailed

1. **Create Firebase Project**
   - Go to [firebase.google.com](https://console.firebase.google.com)
   - Click "Add project"
   - Follow the steps

2. **Enable Authentication**
   - Build > Authentication > Get Started
   - Sign-in method > Email/Password > Enable

3. **Enable Firestore**
   - Build > Firestore Database > Create Database
   - Start in test mode (allows all reads/writes for 30 days)

4. **Get Config**
   - Project Settings (gear icon) > General
   - Copy the `firebaseConfig` object

5. **Update Code**
   - Open `firebase/config.js`
   - Replace placeholder values with your actual Firebase config

---

## ⚠️ Important Notes

- **Firebase config is required** - App won't work without valid Firebase credentials
- **API keys are not included** - You must add your own Firebase config
- **Test mode Firestore** - Allows development without rules setup

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

---

**Note**: This app requires your own Firebase project to function.