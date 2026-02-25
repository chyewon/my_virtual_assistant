#!/bin/bash

# 1. Clean up any existing process on port 3000
echo "Checking for existing processes on port 3000..."
PID=$(lsof -t -i:3000)
if [ -z "$PID" ]; then
  echo "Port 3000 is clear."
else
  echo "Killing process $PID to free up port 3000..."
  kill -9 $PID
fi

# 2. Remove Next.js lock file if it exists
if [ -f "./.next/dev/lock" ]; then
  echo "Removing Next.js dev lock..."
  rm "./.next/dev/lock"
fi

# 3. Sync Capacitor (Copy configuration and plugins to Android)
echo "Syncing Capacitor with Android..."
npx cap sync android

# 4. Start the Next.js development server
echo "Starting Next.js dev server..."
npm run dev
