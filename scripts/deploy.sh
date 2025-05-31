#!/bin/bash

# Build and deploy the Move package to Sui testnet
echo "Building Move package..."
sui move build

echo "Deploying to Sui testnet..."
sui client publish --gas-budget 20000000

echo "Deployment completed!"
echo "Please update the package_id in sui.config.json with the deployed package ID"
