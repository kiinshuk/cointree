# Contri - Expense Sharing App 💰

A mobile expense-sharing app built with React Native and Expo. Split expenses easily with friends and family.

## 📱 Features

- **One-tap Expense Add** - Quick add with smart defaults (you as payer, equal split, today's date)
- **Custom Splits** - Split expenses unequally based on what each person consumed
- **Group Management** - Create groups and add members by email
- **Balance Tracking** - Real-time balance calculation showing who owes whom
- **Settle Up** - One-tap settlement when you want to clear debts
- **Human-friendly Output** - "You owe ₹150" instead of confusing negative numbers
- **Authentication** - Secure email/password login with auto-login

## 🛠️ Tech Stack

- **Framework**: React Native with Expo SDK 54
- **Language**: JavaScript
- **Backend**: Firebase (Auth + Firestore)
- **Navigation**: React Navigation (Stack)
- **Storage**: AsyncStorage

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Expo Go app (for testing on mobile)
- Firebase account (for backend)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/kiinshuk/cointree.git
   cd contri
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Firebase**
   - Create a project at [firebase.google.com](https://firebase.google.com)
   - Enable **Authentication** (Email/Password)
   - Enable **Firestore** database
   - Copy your Firebase config to `firebase/config.js`

4. **Start the app**
   ```bash
   npx expo start
   ```

5. **Run on mobile**
   - Install **Expo Go** from Play Store/App Store
   - Scan the QR code from terminal
   - Or press `a` for Android emulator

## 📲 How to Use

### Creating a Group
1. Open the app and login/signup
2. Tap the **+** button to create a new group
3. Enter group name and tap "Create"

### Adding Members
1. Open a group
2. Tap the **👤** button in header
3. Enter member's email and search
4. Tap "Add" to add them

### Adding Expenses
1. Open a group
2. Tap **+** button or "Add Expense"
3. Enter description and amount
4. Choose split type:
   - **Equal**: Splits equally among all members
   - **Custom**: Enter what each person actually paid

### Viewing Balances
1. Tap on the balance card to see detailed breakdown
2. Shows who owes whom and how much

### Settling Up
1. If you owe money, tap "Settle Up"
2. Select who to pay
3. Amount is automatically calculated

## 📦 Building APK

### Option 1: Development Build (Recommended)
```bash
npx expo prebuild
npx expo run:android
```

### Option 2: Production Build
```bash
npx expo build:android
```

### Option 3: EAS Build (Best for distribution)
1. Install EAS CLI: `npm install -g eas-cli`
2. Configure: `eas configure`
3. Build: `eas build -p android`

The APK will be generated in `android/app/build/outputs/apk/` or can be downloaded from EAS.

## 📁 Project Structure

```
Contri/
├── App.js                 # Main entry point
├── context/               # React Context (Auth, Groups)
├── firebase/              # Firebase configuration
├── navigation/            # Navigation setup
├── screens/               # App screens
│   ├── LoginScreen.js
│   ├── SignupScreen.js
│   ├── GroupsScreen.js
│   ├── GroupDetailScreen.js
│   └── SettingsScreen.js
├── utils/                 # Utility functions
│   └── balanceCalculator.js
└── package.json
```

## 🔧 Configuration

Update `firebase/config.js` with your Firebase credentials:
```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-app-id"
};
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b`)
3. Commit your changes (`git commit -m 'Add feature'`)
4. Push to the branch (`git push origin feature-name`)
5. Open a Pull Request

## 📄 License

This project is private and for personal use.

## 🙏 Acknowledgments

- Built with [Expo](https://expo.dev)
- Firebase for backend services
- React Navigation for routing

---

**Note**: To use this app, you need to configure your own Firebase project. The app is not pre-configured with any backend.