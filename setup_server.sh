#!/bin/bash

# OKR Management System - Server Setup Script for Ubuntu 24.04
# This script installs Docker, Docker Compose, and starts the application.

set -e

echo "--- 🚀 Bắt đầu quá trình cài đặt hệ thống OKR ---"

# 1. Cập nhật hệ thống
echo "--- 🔄 Cập nhật hệ thống... ---"
sudo apt-get update
sudo apt-get upgrade -y

# 1.5 Tạo Swap (Tránh treo máy khi build RAM yếu)
echo "--- 💾 Kiểm tra và tạo bộ nhớ ảo (Swap)... ---"
if ! grep -q "swap" /etc/fstab; then
  echo "Đang tạo 2GB Swap file..."
  sudo fallocate -l 2G /swapfile || sudo dd if=/dev/zero of=/swapfile bs=1M count=2048
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
  echo "✅ Đã tạo Swap thành công!"
else
  echo "✅ Hệ thống đã có Swap, bỏ qua."
fi

# 2. Cài đặt các gói cần thiết
echo "--- 📦 Cài đặt các gói phụ trợ... ---"
sudo apt-get install -y ca-certificates curl gnupg lsb-release

# 3. Thêm Docker GPG key và Repository
echo "--- 🔑 Thêm Docker GPG key... ---"
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo "--- 📁 Thêm Docker Repository... ---"
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# 4. Cài đặt Docker Engine & Docker Compose
echo "--- 🐳 Cài đặt Docker & Docker Compose... ---"
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# 5. Kiểm tra cài đặt
echo "--- ✅ Kiểm tra phiên bản... ---"
docker --version
docker compose version

# 6. Khởi tạo thư mục dữ liệu và phân quyền
echo "--- 📁 Khởi tạo thư mục dữ liệu và phân quyền... ---"
mkdir -p mongodb_data uploads
sudo chmod -R 777 mongodb_data uploads

# 7. Khởi động ứng dụng
echo "--- 🏗️ Đang build và khởi động các containers (có thể mất vài phút)... ---"
sudo docker compose up -d --build

echo "--- ✨ HOÀN THÀNH! ---"
echo "--- 🌍 Bạn có thể truy cập ứng dụng tại địa chỉ IP của server trên trình duyệt. ---"
echo "--- 📊 Kiểm tra trạng thái các service: sudo docker compose ps ---"
