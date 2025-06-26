# Local IPFS Node Service

## Overview

Running your own IPFS node gives you complete control over content publishing and eliminates dependency on third-party pinning services. This is ideal for true decentralized, self-sovereign content distribution.

## Benefits

- ✅ **Full Control**: Your node, your rules
- ✅ **No Costs**: No subscription fees for pinning services
- ✅ **Privacy**: Content stays on your infrastructure
- ✅ **Resilience**: Direct participation in IPFS network
- ✅ **Speed**: Local access to your content

## Installation

### Option 1: IPFS Desktop (Recommended for beginners)
```bash
# macOS
brew install ipfs-desktop

# Or download from https://github.com/ipfs/ipfs-desktop/releases
```

### Option 2: Command Line IPFS
```bash
# macOS
brew install ipfs

# Linux
curl -sSL https://dist.ipfs.io/kubo/v0.23.0/kubo_v0.23.0_linux-amd64.tar.gz | tar -xz
sudo mv kubo/ipfs /usr/local/bin/

# Or use install script
curl -sSL https://dist.ipfs.io/kubo/v0.23.0/install.sh | bash
```

### Option 3: Docker (Isolated environment)
```bash
# Pull IPFS image
docker pull ipfs/kubo:latest

# Create data directory
mkdir -p ~/.ipfs-docker

# Run IPFS container
docker run -d --name ipfs-node \
  -v ~/.ipfs-docker:/data/ipfs \
  -p 4001:4001 \
  -p 5001:5001 \
  -p 8080:8080 \
  ipfs/kubo:latest
```

## Initial Setup

### Initialize IPFS Node
```bash
# Initialize your IPFS repository
ipfs init

# You'll see output like:
# peer identity: QmYourNodeID...
# to get started, enter: ipfs cat /ipfs/QmQPeNsJPyVWPFDVHb77w8G42Fvo15z4bG2X8D2GhfbSXc/readme
```

### Configure Node
```bash
# Edit configuration (optional)
ipfs config edit

# Or set specific values
ipfs config Addresses.API /ip4/127.0.0.1/tcp/5001
ipfs config Addresses.Gateway /ip4/127.0.0.1/tcp/8080
```

### Start IPFS Daemon
```bash
# Start the IPFS daemon
ipfs daemon

# You should see:
# Daemon is ready
# API server listening on /ip4/127.0.0.1/tcp/5001
# Gateway server listening on /ip4/127.0.0.1/tcp/8080
```

## Doris Protocol Integration

### Environment Configuration
Add to your `.env` file:
```bash
# Enable local IPFS
LOCAL_IPFS_ENABLED=true
IPFS_API_URL=http://localhost:5001
IPFS_GATEWAY_URL=http://localhost:8080

# Disable cloud IPFS services (optional)
# PINATA_API_KEY=
# WEB3_STORAGE_TOKEN=
```

### Test Connection
```bash
# Test IPFS API connection
curl -X POST http://localhost:5001/api/v0/version

# Should return:
# {"Version":"0.23.0","Commit":"...","Repo":"15","System":"..."}
```

## Content Publishing

### Manual Publishing
```bash
# Add a file to IPFS
echo "Hello from Doris Protocol!" > test.txt
ipfs add test.txt
# Returns: QmHash...

# Pin content to ensure it stays
ipfs pin add QmHash...

# Access via gateway
curl http://localhost:8080/ipfs/QmHash...
```

### Doris Protocol Publishing
```bash
# Deploy your site to local IPFS
pnpm run deploy:ipfs

# Content will be:
# 1. Added to your local IPFS node
# 2. Automatically pinned
# 3. Available via your gateway
```

## Performance Optimization

### Storage Configuration
```bash
# Check storage usage
ipfs repo stat

# Set storage limits (e.g., 10GB)
ipfs config Datastore.StorageMax 10GB

# Configure garbage collection
ipfs config --json Datastore.GCPeriod '"1h"'
```

### Network Configuration
```bash
# Configure connection limits
ipfs config Swarm.ConnMgr.HighWater 900
ipfs config Swarm.ConnMgr.LowWater 600

# Enable experimental features (optional)
ipfs config --json Experimental.AcceleratedDHTClient true
```

### Bandwidth Management
```bash
# Limit bandwidth usage (bytes per second)
# 1MB/s download, 256KB/s upload
ipfs config Swarm.Transports.Network.Relay false
ipfs config --json Swarm.ResourceMgr.Enabled true
```

## Advanced Configuration

### Custom Gateway Domain
If you have a domain, you can set up custom gateway:

```bash
# Configure reverse proxy (nginx example)
server {
    listen 80;
    server_name ipfs.yourdomain.com;
    
    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Cluster Setup (Multiple Nodes)
```bash
# Install IPFS Cluster
go install github.com/ipfs/ipfs-cluster-ctl@latest

# Initialize cluster
ipfs-cluster-service init

# Start cluster
ipfs-cluster-service daemon
```

### Backup and Sync
```bash
# Export your IPFS repository
ipfs repo migrate --to-backup

# Sync with remote IPFS node (optional)
ipfs bootstrap add /ip4/your-remote-node-ip/tcp/4001/p2p/QmRemoteNodeID
```

## Monitoring and Maintenance

### Health Checks
```bash
# Check node status
ipfs id

# Check connected peers
ipfs swarm peers | wc -l

# Check pinned content
ipfs pin ls --type=recursive
```

### Log Monitoring
```bash
# Monitor IPFS logs
tail -f ~/.ipfs/logs/ipfs.log

# Set log levels
ipfs log level debug
```

### Automated Maintenance
Create a maintenance script `local-services/ipfs/maintenance.sh`:
```bash
#!/bin/bash

# IPFS Node Maintenance Script
echo "Starting IPFS maintenance..."

# Check if daemon is running
if ! pgrep -x "ipfs" > /dev/null; then
    echo "Starting IPFS daemon..."
    nohup ipfs daemon > ~/.ipfs/daemon.log 2>&1 &
    sleep 5
fi

# Garbage collection to free space
echo "Running garbage collection..."
ipfs repo gc

# Update to latest version (optional)
# ipfs update install latest

# Restart if needed
# kill $(pgrep ipfs)
# nohup ipfs daemon > ~/.ipfs/daemon.log 2>&1 &

echo "Maintenance complete!"
```

Make it executable and run periodically:
```bash
chmod +x local-services/ipfs/maintenance.sh

# Add to crontab (daily at 2 AM)
echo "0 2 * * * /path/to/your/project/local-services/ipfs/maintenance.sh" | crontab -
```

## Security Considerations

### Network Security
```bash
# Disable public gateway if not needed
ipfs config Addresses.Gateway ""

# Configure firewall rules
# Allow only necessary ports:
# 4001: IPFS swarm
# 5001: API (localhost only)
# 8080: Gateway (optional)
```

### Content Management
```bash
# Remove sensitive content
ipfs pin rm QmHashToRemove
ipfs repo gc

# Block unwanted content
ipfs block rm QmHashToBlock
```

### Access Control
```bash
# Restrict API access to localhost
ipfs config Addresses.API /ip4/127.0.0.1/tcp/5001

# Enable API authentication (if needed)
ipfs config --json API.HTTPHeaders.Access-Control-Allow-Origin '["http://localhost:3000"]'
```

## Troubleshooting

### Common Issues

1. **Daemon won't start**
```bash
# Check for lock files
rm ~/.ipfs/repo.lock
rm ~/.ipfs/api

# Restart daemon
ipfs daemon
```

2. **Out of storage space**
```bash
# Check usage
ipfs repo stat

# Run garbage collection
ipfs repo gc

# Increase storage limit
ipfs config Datastore.StorageMax 20GB
```

3. **Slow content retrieval**
```bash
# Check peers
ipfs swarm peers

# Connect to more peers
ipfs bootstrap add --default

# Check connectivity
ipfs diag net
```

4. **API connection issues**
```bash
# Check API address
ipfs config Addresses.API

# Test connection
curl http://localhost:5001/api/v0/version
```

### Performance Issues
```bash
# Monitor resource usage
top -p $(pgrep ipfs)

# Check network stats
ipfs bitswap stat

# Adjust configuration
ipfs config Swarm.ConnMgr.HighWater 100  # Reduce connections
```

## Integration with Doris Protocol

### Automated Deployment
Create `local-services/scripts/deploy-local-ipfs.js`:
```javascript
import fs from 'fs';
import { execSync } from 'child_process';

export async function deployToLocalIPFS(contentPath) {
    try {
        // Add content to IPFS
        const result = execSync(`ipfs add -r ${contentPath}`, { encoding: 'utf-8' });
        const lines = result.trim().split('\n');
        const lastLine = lines[lines.length - 1];
        const hash = lastLine.split(' ')[1];
        
        // Pin the content
        execSync(`ipfs pin add ${hash}`);
        
        // Update DNSLink (if configured)
        // execSync(`ipfs name publish ${hash}`);
        
        return {
            success: true,
            hash,
            url: `http://localhost:8080/ipfs/${hash}`
        };
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}
```

### Status Monitoring
```javascript
export async function checkIPFSStatus() {
    try {
        const response = await fetch('http://localhost:5001/api/v0/version');
        const data = await response.json();
        return {
            online: true,
            version: data.Version,
            api: 'http://localhost:5001',
            gateway: 'http://localhost:8080'
        };
    } catch (error) {
        return {
            online: false,
            error: error.message
        };
    }
}
```

## Next Steps

1. **Install and Initialize**: Set up your IPFS node
2. **Test Integration**: Verify Doris Protocol can connect
3. **Configure Optimization**: Tune for your hardware/network
4. **Set Up Monitoring**: Implement health checks
5. **Plan Backup Strategy**: Ensure content persistence
6. **Consider Clustering**: Scale with multiple nodes if needed

For more information:
- [IPFS Documentation](https://docs.ipfs.io/)
- [IPFS GitHub](https://github.com/ipfs/kubo)
- [IPFS Community](https://discuss.ipfs.io/) 