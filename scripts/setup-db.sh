#!/bin/bash

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
npx prisma generate

# Push schema to database
echo "Pushing schema to MongoDB..."
npx prisma db push

echo "Database setup complete!"
