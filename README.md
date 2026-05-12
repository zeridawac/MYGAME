# REDA INVEST GAME

Fullstack Arabic RTL investment/game app built for local development only.

## Local Stack

- Backend: Node.js, Express, MongoDB, Mongoose, JWT, bcryptjs
- Frontend: React, Vite, Axios, Recharts, Vanilla CSS
- Backend port: `http://localhost:5000`
- Frontend port: `http://localhost:5173`

## Environment

Create `backend/.env`:

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/reda_invest_game
JWT_SECRET=change_this_secret
CLIENT_URL=http://localhost:5173
```

Create `frontend/.env`:

```env
VITE_API_URL=http://localhost:5000/api
```

## Setup

```bash
cd backend
npm install
npm run seed
npm run dev
```

```bash
cd frontend
npm install
npm run dev
```

## First Admin

Run this after MongoDB is running:

```bash
cd backend
npm run seed
```

Credentials:

- Username: `admin`
- Password: `admin123456`

Starter invite code:

- `ADMINFIRST`

Starter gift coupon:

- `WELCOME600`

## Health Checks

- `GET http://localhost:5000/` returns `API is running 🚀`
- `GET http://localhost:5000/api/status` returns JSON success

## Feature Test Flow

1. Start MongoDB locally on `127.0.0.1:27017`.
2. Run `cd backend && npm run seed`.
3. Run `cd backend && npm run dev`.
4. Run `cd frontend && npm run dev`.
5. Login with `admin / admin123456`.
6. Open admin and test:
   - Create invite codes.
   - Create, disable, and delete gift coupons.
   - Create and disable tasks.
   - Review task submissions.
   - Set coin conversion rate.
   - Adjust game daily limits.
   - Review activity history.
7. Register a normal user with an invite code.
8. Test user pages:
   - Dashboard coin and dollar value.
   - Games: spin, scratch card, lucky box, daily reward.
   - Gifts: redeem `WELCOME600`.
   - Tasks: submit proof text and optional image.
   - Investments, withdrawals, and bank info.

## Notes

- Do not deploy yet.
- The backend is a pure API and does not serve the frontend.
- The frontend uses only `VITE_API_URL` through `src/api/config.js`.
