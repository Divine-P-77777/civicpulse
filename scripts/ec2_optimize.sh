#!/bin/bash

echo "🚀 Starting EC2 Optimization..."

if [ ! -f /swapfile ]; then
  echo "Creating swap..."
  sudo fallocate -l 2G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
fi

sudo sysctl vm.swappiness=10
sudo sysctl vm.vfs_cache_pressure=50

echo "vm.swappiness=10" | sudo tee -a /etc/sysctl.conf
echo "vm.vfs_cache_pressure=50" | sudo tee -a /etc/sysctl.conf

echo "Memory status:"
free -h