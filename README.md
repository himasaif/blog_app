# blog_app

Node.js + Express + MySQL demo.

## Requirements
- Node.js (LTS)
- MySQL (محلي أو سيرفر خارجي)

## Setup (Local)
```bash
# 1) انسخ ملف البيئة من المثال
cp .env.example .env

# 2) عدّل قيم .env حسب جهازك
# 3) نزّل الاعتمادات
npm install

# 4) شغّل
npm run dev   # أثناء التطوير (nodemon)
# أو
npm start     # تشغيل عادي
