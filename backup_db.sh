#!/bin/bash

# OKR System - Tự động sao lưu dữ liệu MongoDB
# Script này sẽ tạo một bản nén của thư mục dữ liệu

BACKUP_DIR="./backups"
SOURCE_DIR="./mongodb_data"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/mongodb_backup_$TIMESTAMP.tar.gz"

# Tạo thư mục backup nếu chưa có
mkdir -p $BACKUP_DIR

echo "--- 📦 Bắt đầu sao lưu dữ liệu... ---"

# Nén thư mục dữ liệu
# Lưu ý: Chúng ta dùng sudo để đảm bảo quyền truy cập file của MongoDB
sudo tar -czf $BACKUP_FILE $SOURCE_DIR

echo "✅ Đã tạo bản sao lưu tại: $BACKUP_FILE"

# Tùy chọn: Xóa các bản sao lưu cũ hơn 7 ngày để tiết kiệm dung lượng
find $BACKUP_DIR -type f -name "*.tar.gz" -mtime +7 -exec rm {} \;
echo "--- ✨ Hoàn thành! ---"
