# Advanced Farmer Portal

## Runtime Architecture

The live application currently uses MongoDB with Mongoose models. `backend/prisma/schema.prisma` is maintained as a relational deployment reference and now includes `stores`, `farmer_store_links`, `store_settings`, and farmer OTP tables.

## Delivered Features

- Farmer OTP request and verification endpoints for email or mobile number
- Six-digit bcrypt-hashed OTPs with 5-minute expiry, 60-second resend cooldown, and 5-attempt cap
- Secure `httpOnly` JWT cookies after successful login
- Multi-store data model and farmer-store links
- Farmer dashboard store cards and store switcher
- Farmer catalog search by product name, brand, and NPK ratio
- Wishlist and product availability request endpoints
- Notification model and read/list endpoints
- Inline expandable customer rows with purchase history

## API Additions

```text
POST /api/auth/farmer/otp/request
POST /api/auth/farmer/otp/verify
POST /api/auth/logout
POST /api/stores
GET  /api/stores
GET  /api/farmer/stores
POST /api/farmer/stores/:storeId/switch
GET  /api/farmer/catalog
POST /api/farmer/catalog/:productId/wishlist
POST /api/farmer/catalog/:productId/availability
GET  /api/notifications
PATCH /api/notifications/:id/read
```

## OTP Delivery Configuration

```text
SMS_PROVIDER=MSG91 | FAST2SMS | WEBHOOK
MSG91_AUTH_KEY=
MSG91_TEMPLATE_ID=
FAST2SMS_API_KEY=
SMS_WEBHOOK_URL=
SMS_WEBHOOK_TOKEN=
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
```

`MSG91` is the preferred India-first provider. `WEBHOOK` can be used to bridge Twilio or another SMS service.

## Deployment Notes

1. Configure MongoDB, JWT, SMTP, and SMS environment variables.
2. Start the backend once so the seed routine creates the default store and backfills legacy records with `storeId`.
3. Ensure frontend requests include credentials so secure cookies are sent.
4. In production, serve frontend and backend over HTTPS so secure cookies work correctly.

## Remaining Production Work

- Add a real file-upload pipeline for profile photos and product images.
- Replace the legacy Kannada locale file with reviewed UTF-8 translations.
- Add background jobs for reminder scheduling, retries, and provider webhooks.
- Add automated tests around OTP edge cases, store isolation, and notification fan-out.
