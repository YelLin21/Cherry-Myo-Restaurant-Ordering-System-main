#!/bin/bash
echo "🚀 Starting deployment..."

cd /root/Cherry-Myo-Restaurant-Ordering-System-main

echo "📥 Pulling latest changes..."
git pull origin main

cd backend

echo "📦 Installing dependencies..."
pnpm install

echo "🔄 Restarting backend service..."
pm2 restart cherry-myo-backend

echo "✅ Deployment complete!"
pm2 status

echo "📋 Recent logs:"
pm2 logs cherry-myo-backend --lines 10
