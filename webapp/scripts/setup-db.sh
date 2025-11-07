#!/bin/bash

# Resolve paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SCHEMA_PATH="$PROJECT_ROOT/prisma/schema.prisma"

# Check MongoDB
echo "Checking MongoDB connection..."
mongosh --eval "db.runCommand({ ping: 1 })" > /dev/null 2>&1
if [ $? -ne 0 ]; then
  echo "MongoDB is not running. Please start MongoDB first."
  exit 1
fi

# Check Redis
echo "Checking Redis connection..."
redis-cli ping > /dev/null 2>&1
if [ $? -ne 0 ]; then
  echo "Redis is not running. Please start Redis first."
  exit 1
fi

# Generate Prisma Client
echo "Generating Prisma client..."
npx prisma generate --schema "$SCHEMA_PATH"

# Push schema to database
echo "Pushing schema to MongoDB..."
npx prisma db push --schema "$SCHEMA_PATH"

echo "Database setup complete!"
