# Project Name : Cherry-Myo Restaurant Ordering System
# Client Restaurant : Cherry Myo
**Cherry Myo** is a Burmese restaurant located in Bangkapi, Bangkok, close to the Ramkhamhaeng area. It serves authentic, home-style Burmese food such as goat curry and traditional fish dishes, prepared fresh each day. The restaurant is popular among Myanmar students and workers in the neighborhood and offers a friendly, casual atmosphere where people can enjoy familiar flavors from home.

# Google Map : https://maps.app.goo.gl/4yp1j4Yo7hobpuRq6

# https://cherry-myo-restaurant-ordering-system-main.vercel.app/table/1

A modern, full-stack restaurant ordering system built with React, Node.js, and MongoDB. This comprehensive solution provides seamless ordering experiences for customers and powerful management tools for restaurant staff.

![Cherry-Myo Restaurant](./public/image/cherry_myo.png)

## ✨ Features

### 🛍️ Customer Features
- **Digital Menu Browsing** - Browse categorized menus (Food, Grill, Beverages, Special, Promotions)
- **QR Code Table Ordering** - Scan QR codes to order directly from tables
- **Shopping Cart** - Add, remove, and modify orders with real-time calculations
- **Order History** - Track previous orders and reorder favorites
- **Real-time Updates** - Live order status updates using Socket.io
- **Feedback System** - Submit reviews and ratings
- **Dark/Light Mode** - Customizable UI theme

### 👨‍💼 Admin Features
- **Menu Management** - CRUD operations for all menu categories
- **Order Management** - View and manage incoming orders
- **Sales Analytics** - Comprehensive sales reports with charts
- **Table Management** - Monitor table occupancy and orders
- **Kitchen Dashboard** - Real-time order queue for kitchen staff
- **Waiter Interface** - Order management for serving staff
- **Promotion Management** - Create and manage special offers

### 🔧 Technical Features
- **Responsive Design** - Works on desktop, tablet, and mobile devices
- **Real-time Communication** - Socket.io for live updates
- **Secure Authentication** - Firebase authentication integration
- **File Upload** - Image upload for menu items and payment slips
- **PDF Generation** - Generate receipts and reports
- **CSV Export** - Export sales data for analysis

## 🛠️ Tech Stack

### Frontend
- **React 19** - Modern React with hooks and context
- **Vite** - Fast build tool and development server
- **Tailwind CSS** - Utility-first CSS framework
- **React Router** - Client-side routing
- **Socket.io Client** - Real-time communication
- **Lucide React** - Beautiful icons
- **React Toastify** - Toast notifications
- **Recharts** - Data visualization
- **jsPDF** - PDF generation
- **SweetAlert2** - Beautiful alerts

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web application framework
- **MongoDB** - NoSQL database
- **Mongoose** - MongoDB object modeling
- **Socket.io** - Real-time bidirectional communication
- **Stripe** - Payment processing
- **Multer** - File upload handling
- **CORS** - Cross-origin resource sharing

### Additional Services
- **Firebase** - Authentication
- **Supabase** - Image storage
- **Vercel** - Deployment and frontend hosting
- **Render** - Deployment and backend hosting

## 🚀 Quick Start

### Prerequisites
- Node.js (v18.17.1 or higher)
- pnpm (package manager)
- MongoDB database
- Firebase project
- Stripe account (for payments)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/YelLin21/Cherry-Myo-Restaurant-Ordering-System.git
   cd Cherry-Myo-Restaurant-Ordering-System
   ```

2. **Install dependencies**
   ```bash
   # Install root dependencies
   pnpm install
   
   # Install backend dependencies
   cd backend
   pnpm install
   cd ..
   ```

3. **Environment Configuration**
   
   Create `.env` file in the root directory:
   ```env
   # Firebase Configuration
   VITE_FIREBASE_API_KEY=your_firebase_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
   VITE_FIREBASE_PROJECT_ID=your_firebase_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
   VITE_FIREBASE_APP_ID=your_firebase_app_id
   
   # Supabase Configuration
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   
   # Stripe Configuration
   VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
   ```
   
   Create `.env` file in the `backend` directory:
   ```env
   # Database
   MONGO_URI=your_mongodb_connection_string
   
   # Server Configuration
   PORT=5000
   NODE_ENV=development
   
   # Stripe
   STRIPE_SECRET_KEY=your_stripe_secret_key
   
   

4. **Start the development servers**
   ```bash
   # Start both frontend and backend concurrently
   pnpm run dev
   ```
   
   Or start them separately:
   ```bash
   # Frontend (http://localhost:5173)
   npm run dev
   
   # Backend (http://localhost:5000)
   cd backend
   npm run dev
   ```

## 📱 Usage

### For Customers
1. **Browse Menu** - Visit the homepage and explore different menu categories
2. **Table Ordering** - Scan the QR code at your table to start ordering
3. **Add to Cart** - Select items and customize your order
4. **Checkout** - Choose payment method (Stripe or PromptPay)
5. **Track Order** - Monitor your order status in real-time
6. **Leave Feedback** - Rate your experience after dining

### For Administrators
1. **Access Admin Panel** - Navigate to `/admin` and authenticate
2. **Manage Menus** - Add, edit, or remove menu items with images
3. **Process Orders** - View and manage incoming orders
4. **View Analytics** - Check sales reports and performance metrics
5. **Table Management** - Monitor table occupancy and orders

### For Kitchen Staff
1. **Kitchen Dashboard** - Access `/kitchen` for order queue
2. **Order Processing** - Mark orders as preparing, ready, or completed
3. **Real-time Updates** - Receive new orders instantly

### For Waiters
1. **Waiter Interface** - Access `/waiter` for table management
2. **Order Status** - Update order delivery status
3. **Customer Service** - Handle special requests

## 🏗️ Project Structure

```
Cherry-Myo-Restaurant-Ordering-System/
├── backend/                    # Backend server
│   ├── index.js               # Main server file
│   ├── models/                # Database models
│   ├── routes/                # API routes
│   ├── middlewares/           # Custom middlewares
│   └── uploads/               # File upload directory
├── src/                       # Frontend source code
│   ├── components/            # Reusable React components
│   ├── pages/                 # Page components
│   ├── context/               # React context providers
│   ├── assets/                # Static assets
│   └── utils/                 # Utility functions
├── public/                    # Public assets
│   └── image/                 # Restaurant images
├── lib/                       # Database configuration
└── deployment files          # Various config files
```

## 🚀 Deployment

### Vercel Deployment (Recommended)

1. **Connect to Vercel**
   ```bash
   # Install Vercel CLI
   npm i -g vercel
   
   # Login and deploy
   vercel
   ```

2. **Configure Environment Variables**
   - Add all environment variables in Vercel dashboard
   - Set up MongoDB Atlas for production database

3. **Deploy Backend**
   - Deploy backend separately or use a service like Render
   - Update API endpoints in frontend

### Manual Deployment

1. **Build the project**
   ```bash
   pnpm run build
   ```

2. **Start production server**
   ```bash
   pnpm start
   ```


## 👥 Authors

- **YelLin**  - [YelLin21](https://github.com/YelLin21)
- **KelvinKaung**  - [KelvinKaungDev](https://github.com/KelvinKaungDev)
- **KyawZ1nLynn**  - [YKyawZ1nLynn](https://github.com/KyawZ1nLynn)

---

**⭐ Star this repository if you find it helpful!**

Built with ❤️ for the restaurant industry

