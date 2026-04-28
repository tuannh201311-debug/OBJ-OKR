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
        now = datetime.utcnow()
        target_date = now + timedelta(days=2)
        target_date_str = target_date.strftime("%Y-%m-%d")
        
        # Find subtasks that have deadline = target_date_str and are not done
        tasks = list(sub_tasks_collection.find({
            "deadline": target_date_str,
            "progress": {"$lt": 100}
        }))
        
        for task in tasks:
            assignee = task.get('assignee', 'Chưa gán')
            title = task.get('title', '')
            msg = f"⚠️ <b>CẢNH BÁO SẮP TỚI HẠN (Còn 2 ngày)</b>\n\n📌 <b>Công việc:</b> {title}\n👤 <b>Người phụ trách:</b> {assignee}\n⏰ <b>Hạn chót:</b> {target_date_str}\n\nVui lòng cập nhật tiến độ!"
            send_telegram_message(msg)
            time.sleep(1) # avoid rate limit
    except Exception as e:
        print(f"[Telegram Bot] Error checking deadlines: {e}")

def start_telegram_polling():
    def poll():
        last_check_date = None
        while True:
            get_updates()
            
            # Run daily check
            current_date = datetime.utcnow().strftime("%Y-%m-%d")
            if current_date != last_check_date:
                check_deadlines()
                last_check_date = current_date
                
            time.sleep(10)
            
    thread = threading.Thread(target=poll, daemon=True)
    thread.start()
