import sys
import os

# Thêm đường dẫn để import được telegram_bot
sys.path.append(os.getcwd())

from telegram_bot import send_telegram_message

def test():
    print("--- 🤖 Bắt đầu kiểm tra Bot Telegram ---")
    msg = "🚀 <b>TEST BOT THÀNH CÔNG!</b>\n\nHệ thống OKR đã kết nối thành công với Bot Telegram của bạn.\nThời gian: "
    import datetime
    msg += datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    print("Đang gửi tin nhắn...")
    send_telegram_message(msg)
    print("--- ✅ Hoàn thành! Kiểm tra điện thoại của bạn nhé. ---")

if __name__ == "__main__":
    test()
