# Cricket Cost Splitter 🏏

A React-based web application for managing cricket match expenses and player payments across multiple clubs (MICC and Sadhooz).

## Features

### 🏏 Match Management
- **Weekend Dashboard**: View Saturday (MICC) and Sunday (Sadhooz) matches for the current weekend
- **Weekday Matches**: Add additional matches on weekdays
- **Cost Splitting**: Automatically divide ground and cafeteria costs among selected players
- **Progress Through Weekends**: Easily move to the next weekend with carry-forward balances

### 👥 Player Management
- **Player Database**: Store player information (ID, Name, Mobile)
- **Shared Players**: Same players can participate in both MICC and Sadhooz matches
- **CRUD Operations**: Add, edit, and delete players easily

### 💰 Payment Tracking
- **Payment Status**: Track Paid, Pending, and Partial payments
- **One-Click Updates**: Toggle payment status with a single click
- **Partial Payments**: Handle custom partial payment amounts
- **Balance Management**: Automatic carry-forward of overpayments and pending amounts
- **Consolidated Table View**: Single table showing all players with their payment status across matches
- **Editable Amounts**: Click to edit payment amounts and previous balances directly in the table

### 📱 WhatsApp Integration
- **Payment Reminders**: Generate images for WhatsApp sharing
- **Two Image Types**:
  - All players with pending payments
  - Weekend players with pending balances
- **Mobile-Friendly**: Optimized for sharing in cricket team groups

### 💾 Data Management
- **Cloud Sync**: Optional Firebase integration for real-time data synchronization across devices
- **Offline Support**: Works seamlessly without internet connection, syncs when online
- **Browser Storage**: Automatic saving to localStorage as backup
- **Export/Import**: Download and restore data as JSON files
- **Automatic Backups**: Cloud-based backup system with restore functionality
- **Multi-Device Access**: Access your data from phone, tablet, or computer

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm

### Installation & Running

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm start
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

### Building for Production

```bash
npm run build
```

## Usage Guide

### Initial Setup
1. **Add Players**: Go to the "Players" tab and add all players who participate in matches
2. **Create Matches**: Use the Dashboard to create Saturday/Sunday matches or add weekday matches

### Match Management
1. **Select Players**: Choose which players attended each match
2. **Enter Costs**: Input ground cost and cafeteria cost
3. **Review Split**: Check the automatic cost calculation per player
4. **Save Match**: Save the match to generate payment records

### Payment Tracking
1. **View Payments**: See all payment records for each match
2. **Payment Table**: Use the consolidated payments view to see all players at once
3. **Update Status**: Click payment status buttons to toggle between Paid/Pending/Partial
4. **Edit Amounts**: Click on any amount to edit payment values or previous balances
5. **Monitor Balances**: Track who owes money and who has overpaid with color-coded totals

### WhatsApp Reminders
1. **Go to WhatsApp Tab**: Select the type of reminder needed
2. **Preview**: Review the generated image
3. **Download**: Save the image to share in team groups

### Data Backup
1. **Export**: Download your data as a JSON file for backup
2. **Import**: Restore data from a backup file
3. **Clear Data**: Reset all data if needed

## Technical Details

### Built With
- **React 18** with TypeScript
- **Firebase** for real-time database and cloud sync
- **date-fns** for date management
- **html2canvas** for image generation
- **uuid** for unique identifiers

### Architecture
- Component-based React architecture
- Hybrid storage: Firebase + localStorage for optimal performance
- Real-time data synchronization across devices
- Pure functions for calculations
- Responsive CSS design

### Browser Support
- Chrome (recommended)
- Firefox
- Safari
- Edge

## Data Structure

The app stores data in the following structure:
- **Players**: ID, name, mobile, balance
- **Weekends**: Saturday/Sunday matches plus weekday matches
- **Matches**: Players, costs, payments
- **Payments**: Amount due, amount paid, status

## 🚀 Deployment

Ready to deploy? Check out [DEPLOYMENT.md](./DEPLOYMENT.md) for step-by-step instructions on:
- Deploying to Vercel
- Setting up Firebase for data sync
- Configuring environment variables
- Enabling real-time sync across devices

---

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

Enjoy managing your cricket team expenses! 🏏
