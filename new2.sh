#!/bin/bash
# Find PID of process listening on port 3000
PID=$(lsof -t -i:3000)

if [ -z "$PID" ]; then
  echo "No process found on port 3000."
else
  echo "Killing process(es): $PID"
  kill -9 $PID
fi

# Clean up Next.js lock file if it exists
if [ -f "./.next/dev/lock" ]; then
  echo "Removing .next dev lock file..."
  rm "./.next/dev/lock"
fi

echo "Cleanup complete. Try running 'npm run dev' now."
