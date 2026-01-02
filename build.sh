#!/bin/bash
# Unix/Mac shell script for building 5eMobile module

echo "Building 5eMobile module..."
node build.js

if [ $? -ne 0 ]; then
    echo "Build failed!"
    exit 1
fi

echo "Build complete!"

