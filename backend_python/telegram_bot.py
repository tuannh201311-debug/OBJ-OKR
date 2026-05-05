import os
import urllib.request
import urllib.parse
import json
import threading
import time

TELEGRAM_TOKEN = "8513071768:AAFsksNWt7eyZkvp-ECe9dHzSXOd2BgJPMs"
BASE_URL = f"https://api.telegram.org/bot{TELEGRAM_TOKEN}"

# We will store the global group chat ID here in memory or in DB.
# For simplicity, if the bot receives any message, we will save that chat_id as the primary notification channel.
global_chat_id = None

def get_updates():
    global global_chat_id
    try:
        url = f"{BASE_URL}/getUpdates?limit=10"
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode('utf-8'))
            if data.get('ok') and data['result']:
                # Get the latest message's chat id
                latest_chat_id = data['result'][-1]['message']['chat']['id']
                if latest_chat_id != global_chat_id:
                    global_chat_id = latest_chat_id
                    # Persist to DB
                    from database import db
                    db["system_config"].update_one(
                        {"key": "telegram_chat_id"},
                        {"$set": {"value": global_chat_id}},
                        upsert=True
                    )
                    print(f"[Telegram Bot] Linked and saved chat ID: {global_chat_id}")
    except Exception as e:
        print(f"[Telegram Bot] Error getting updates: {e}")

def send_telegram_message(text: str):
    global global_chat_id
    if not global_chat_id:
        # Try to load from DB first
        from database import db
        config = db["system_config"].find_one({"key": "telegram_chat_id"})
        if config:
            global_chat_id = config["value"]
        
        if not global_chat_id:
            # Try to fetch from API if still not found
            get_updates()
        
    if global_chat_id:
        try:
            url = f"{BASE_URL}/sendMessage"
            data = urllib.parse.urlencode({'chat_id': global_chat_id, 'text': text, 'parse_mode': 'HTML'}).encode('utf-8')
            req = urllib.request.Request(url, data=data)
            with urllib.request.urlopen(req) as response:
                pass
        except Exception as e:
            print(f"[Telegram Bot] Error sending message: {e}")
    else:
        print("[Telegram Bot] No chat ID available to send message.")

from database import sub_tasks_collection, big_tasks_collection, okrs_collection
from datetime import datetime, timedelta

def check_deadlines():
    try:
        # Sử dụng giờ Việt Nam (UTC+7)
        now_ict = datetime.utcnow() + timedelta(hours=7)
        today = now_ict.date()
        
        # Lấy tất cả task chưa hoàn thành
        tasks = list(sub_tasks_collection.find({
            "progress": {"$lt": 100}
        }))
        
        for task in tasks:
            deadline_str = task.get("deadline")
            if not deadline_str:
                continue
                
            try:
                deadline_date = datetime.strptime(deadline_str, "%Y-%m-%d").date()
                days_left = (deadline_date - today).days
                
                # Báo khi còn đúng 7, 3, 1 ngày hoặc quá hạn (days_left < 0)
                if days_left in [7, 3, 1, 0] or (days_left < 0 and days_left > -30):
                    status_text = f"SẮP TỚI HẠN (Còn {days_left} ngày)" if days_left > 0 else "HẾT HẠN HÔM NAY" if days_left == 0 else f"QUÁ HẠN ({abs(days_left)} ngày)"
                    icon = "⚠️" if days_left >= 0 else "🚨"
                    
                    assignee = task.get('assignee', 'Chưa gán')
                    title = task.get('title', '')
                    
                    # Lấy thông tin OKR
                    okr_title = "Không xác định"
                    bt = big_tasks_collection.find_one({"id": task.get("big_task_id")})
                    if bt:
                        okr = okrs_collection.find_one({"id": bt.get("okr_id")})
                        if okr:
                            okr_title = okr.get("title", "Không xác định")
                            
                    msg = f"{icon} <b>CẢNH BÁO {status_text}</b>\n\n🎯 <b>Dự án (OKR):</b> {okr_title}\n📌 <b>Công việc:</b> {title}\n👤 <b>Người phụ trách:</b> {assignee}\n⏰ <b>Hạn chót:</b> {deadline_str}\n\nVui lòng cập nhật tiến độ!"
                    send_telegram_message(msg)
                    time.sleep(1) # avoid rate limit
            except ValueError:
                continue
    except Exception as e:
        print(f"[Telegram Bot] Error checking deadlines: {e}")

def start_telegram_polling():
    def poll():
        last_check_date = None
        while True:
            get_updates()
            
            # Giờ Việt Nam (UTC+7)
            ict_now = datetime.utcnow() + timedelta(hours=7)
            current_date = ict_now.strftime("%Y-%m-%d")
            
            # Kiểm tra nếu là 9:30 sáng và chưa gửi thông báo hôm nay
            if current_date != last_check_date:
                if ict_now.hour == 9 and ict_now.minute >= 30:
                    print(f"[Telegram Bot] Running daily deadline check at {ict_now}")
                    check_deadlines()
                    last_check_date = current_date
                
            time.sleep(30) # Kiểm tra mỗi 30 giây
            
    thread = threading.Thread(target=poll, daemon=True)
    thread.start()
