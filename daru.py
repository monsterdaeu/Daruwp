import requests
import time
import random

# 🛡️ یہاں اپنا WhatsApp API ٹوکن محفوظ طریقے سے رکھیں
ACCESS_TOKEN = 'YOUR_ACCESS_TOKEN_HERE'
PHONE_NUMBER_ID = 'YOUR_PHONE_NUMBER_ID_HERE'

# 📞 
numbers = [
    '',
    '',
    ''
]
# 🎨 Daru 
logos = [
    "★彡[𝐃𝐀𝐑𝐔]彡★",
    "𓆩𝐃𝐀𝐑𝐔𓆪",
    "꧁༒☬ＤＡＲＵ☬༒꧂",
    "『𝐃𝐀𝐑𝐔』",
    "✧･ﾟ: *✧･ﾟ:* 𝐃𝐀𝐑𝐔 *:･ﾟ✧*:･ﾟ✧"
]

# 🔁 تمام نمبرز کو میسج بھیجیں
for number in numbers:
    selected_logo = random.choice(logos)

    message = f'''
{selected_logo}

السلام علیکم!
یہ ایک آٹومیٹڈ میسج ہے جو Daru واٹس ایپ ٹول کے ذریعے Termux سے بھیجا گیا ہے۔

✧ شکریہ! ✧
'''

    url = f'https://graph.facebook.com/v19.0/{PHONE_NUMBER_ID}/messages'
    headers = {
        'Authorization': f'Bearer {ACCESS_TOKEN}',
        'Content-Type': 'application/json'
    }

    payload = {
        'messaging_product': 'whatsapp',
        'to': number,
        'type': 'text',
        'text': {'body': message}
    }

    response = requests.post(url, headers=headers, json=payload)

    print(f"📨 {number} کو میسج بھیجا گیا: {response.status_code}")
    time.sleep(1)
