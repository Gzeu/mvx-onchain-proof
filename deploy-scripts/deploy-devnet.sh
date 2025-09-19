#!/bin/bash

# MultiversX OnChain Proof - DevNet Deployment Script
# Description: Automated deployment script for DevNet environment

set -e  # Exit on any error

# Configuration
NETWORK="devnet"
CHAIN_ID="D"
PROXY_URL="https://devnet-gateway.multiversx.com"
GAS_LIMIT="100000000"
CONTRACT_NAME="onchain-proof"
WASM_PATH="./contract/output/${CONTRACT_NAME}.wasm"
WALLET_PATH="./walletKey.json"
DEPLOY_LOG="./deploy-${NETWORK}.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
print_header() {
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}  MultiversX OnChain Proof${NC}"
    echo -e "${BLUE}  DevNet Deployment Script${NC}"
    echo -e "${BLUE}================================${NC}"
    echo
}

print_step() {
    echo -e "${YELLOW}➤ $1${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ Error: $1${NC}"
    exit 1
}

check_dependencies() {
    print_step "Checking dependencies..."
    
    # Check if mxpy is installed
    if ! command -v mxpy &> /dev/null; then
        print_error "mxpy is not installed. Please install MultiversX SDK CLI."
    fi
    
    # Check mxpy version
    echo "mxpy version: $(mxpy --version)"
    
    # Check if wallet file exists
    if [ ! -f "$WALLET_PATH" ]; then
        print_error "Wallet file not found at $WALLET_PATH"
    fi
    
    print_success "Dependencies check passed"
}

build_contract() {
    print_step "Building smart contract..."
    
    cd contract
    
    # Install Rust dependencies
    mxpy deps install rust --overwrite
    
    # Clean previous builds
    if [ -d "output" ]; then
        rm -rf output
    fi
    
    # Build contract
    sc-meta all build
    
    # Check if WASM was generated
    if [ ! -f "output/${CONTRACT_NAME}.wasm" ]; then
        cd ..
        print_error "Contract build failed - WASM file not found"
    fi
    
    cd ..
    print_success "Contract built successfully"
}

validate_wasm() {
    print_step "Validating WASM file..."
    
    # Check WASM file size (should be reasonable)
    WASM_SIZE=$(stat -f%z "$WASM_PATH" 2>/dev/null || stat -c%s "$WASM_PATH" 2>/dev/null)
    
    if [ "$WASM_SIZE" -lt 1000 ]; then
        print_error "WASM file seems too small ($WASM_SIZE bytes)"
    fi
    
    if [ "$WASM_SIZE" -gt 1000000 ]; then
        print_error "WASM file seems too large ($WASM_SIZE bytes)"
    fi
    
    print_success "WASM validation passed (${WASM_SIZE} bytes)"
}

check_wallet_balance() {
    print_step "Checking wallet balance..."
    
    # Get wallet address
    WALLET_ADDRESS=$(mxpy wallet derive $WALLET_PATH --index 0 | grep "Address" | awk '{print $2}')
    echo "Wallet address: $WALLET_ADDRESS"
    
    # Check balance (this is a simple check, might need adjustment based on mxpy output format)
    echo "Please ensure your wallet has sufficient EGLD for deployment (approximately 0.05 EGLD)"
    
    print_success "Wallet check completed"
}

deploy_contract() {
    print_step "Deploying contract to DevNet..."
    
    # Create log file
    echo "Deployment started at $(date)" > $DEPLOY_LOG
    echo "Network: $NETWORK" >> $DEPLOY_LOG
    echo "Chain ID: $CHAIN_ID" >> $DEPLOY_LOG
    echo "Proxy: $PROXY_URL" >> $DEPLOY_LOG
    echo "WASM: $WASM_PATH" >> $DEPLOY_LOG
    echo "" >> $DEPLOY_LOG
    
    # Deploy command
    DEPLOY_RESULT=$(mxpy contract deploy \
        --bytecode="$WASM_PATH" \
        --keyfile="$WALLET_PATH" \
        --gas-limit="$GAS_LIMIT" \
        --proxy="$PROXY_URL" \
        --chain="$CHAIN_ID" \
        --send \
        --outfile="deploy-${NETWORK}.json" 2>&1)
    
    echo "$DEPLOY_RESULT" >> $DEPLOY_LOG
    echo "$DEPLOY_RESULT"
    
    # Extract contract address from output
    if echo "$DEPLOY_RESULT" | grep -q "contract address"; then
        CONTRACT_ADDRESS=$(echo "$DEPLOY_RESULT" | grep "contract address" | awk '{print $NF}')
        
        if [ -n "$CONTRACT_ADDRESS" ]; then
            echo "" >> $DEPLOY_LOG
            echo "CONTRACT_ADDRESS=$CONTRACT_ADDRESS" >> $DEPLOY_LOG
            echo "DEPLOYMENT_SUCCESS=true" >> $DEPLOY_LOG
            
            print_success "Contract deployed successfully!"
            echo -e "${GREEN}Contract Address: $CONTRACT_ADDRESS${NC}"
        else
            print_error "Could not extract contract address from deployment output"
        fi
    else
        print_error "Deployment failed. Check $DEPLOY_LOG for details."
    fi
}

verify_deployment() {
    print_step "Verifying deployment..."
    
    if [ -f "deploy-${NETWORK}.json" ]; then
        echo "Deployment transaction file created: deploy-${NETWORK}.json"
        
        # You can add additional verification here
        # For example, query the contract to ensure it's responsive
        
        print_success "Deployment verification completed"
    else
        print_error "Deployment transaction file not found"
    fi
}

generate_env_file() {
    print_step "Generating environment file..."
    
    if [ -n "$CONTRACT_ADDRESS" ]; then
        cat > ".env.${NETWORK}" << EOF
# MultiversX OnChain Proof - DevNet Configuration
# Generated on $(date)

NETWORK=${NETWORK}
CHAIN_ID=${CHAIN_ID}
PROXY_URL=${PROXY_URL}
CONTRACT_ADDRESS=${CONTRACT_ADDRESS}

# Frontend Configuration
REACT_APP_NETWORK=${NETWORK}
REACT_APP_CHAIN_ID=${CHAIN_ID}
REACT_APP_PROXY_URL=${PROXY_URL}
REACT_APP_CONTRACT_ADDRESS=${CONTRACT_ADDRESS}
EOF
        
        print_success "Environment file created: .env.${NETWORK}"
    else
        print_error "Cannot generate environment file - contract address not available"
    fi
}

print_deployment_summary() {
    echo
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}     Deployment Summary${NC}"
    echo -e "${BLUE}================================${NC}"
    echo -e "Network: ${GREEN}$NETWORK${NC}"
    echo -e "Chain ID: ${GREEN}$CHAIN_ID${NC}"
    echo -e "Proxy URL: ${GREEN}$PROXY_URL${NC}"
    
    if [ -n "$CONTRACT_ADDRESS" ]; then
        echo -e "Contract Address: ${GREEN}$CONTRACT_ADDRESS${NC}"
        echo
        echo -e "${YELLOW}Next Steps:${NC}"
        echo "1. Update your frontend configuration with the contract address"
        echo "2. Test the contract functionality"
        echo "3. Share the contract address for verification"
        echo
        echo -e "${YELLOW}Explorer Links:${NC}"
        echo "Transaction: https://devnet-explorer.multiversx.com/transactions/[TX_HASH]"
        echo "Contract: https://devnet-explorer.multiversx.com/accounts/$CONTRACT_ADDRESS"
    else
        echo -e "Status: ${RED}FAILED${NC}"
        echo "Check the deployment log: $DEPLOY_LOG"
    fi
    
    echo -e "${BLUE}================================${NC}"
}

# Main execution
main() {
    print_header
    
    # Pre-deployment checks
    check_dependencies
    build_contract
    validate_wasm
    check_wallet_balance
    
    # Deploy
    deploy_contract
    
    # Post-deployment
    verify_deployment
    generate_env_file
    
    # Summary
    print_deployment_summary
}

# Run main function
main "$@"