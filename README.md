# ProxiService

ProxiService helps people in Greater Tunis find local service providers, request bookings, and review completed jobs. Providers manage their profiles, services, and booking requests.

## Run on Windows

1. Install Node.js 20 or newer and XAMPP.
2. Open the XAMPP Control Panel. Start **MySQL**.
3. Open `http://localhost/phpmyadmin`. Create a database named `proxiservice` with the `utf8mb4_unicode_ci` collation.
4. In PowerShell at this project folder, copy `.env.example` to `.env`.
5. Set `SESSION_SECRET` in `.env` to a random value with at least 32 characters, for example the output of `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`. Do not commit `.env`.
6. Run `npm ci`.
7. Run `npm run db:generate`.
8. Run `npm run db:migrate`.
9. Run `npm run db:seed`.
10. Run `npm run dev` and open `http://localhost:3000`.

`DATABASE_URL` in `.env.example` uses the local XAMPP settings: MySQL on port 3306, user `root`, and no password. Change it only if your local XAMPP settings differ.

## Demo accounts

| Role | Email | Password |
|---|---|---|
| Client | `client@proxiservice.tn` | `Demo1234` |
| Provider (plumber, Ben Arous) | `provider@proxiservice.tn` | `Demo1234` |

The provider account has two pending booking requests. The seed can be rerun without adding duplicate records.

## Useful commands

| Command | Purpose |
|---|---|
| `npm run dev` | Start the local website. |
| `npm run db:generate` | Generate Prisma Client. |
| `npm run db:migrate` | Apply schema migrations to local MySQL. |
| `npm run db:seed` | Add demo data. |
| `npm test` | Run HTTP route-handler tests. |
| `npx tsc --noEmit` | Check TypeScript. |
| `npm run build` | Build the production app. |

## Main routes

| URL | Purpose |
|---|---|
| `/` | Home and provider discovery. |
| `/search` | Provider search and map. |
| `/providers/[id]` | Public provider profile. |
| `/register`, `/login` | Account creation and sign-in. |
| `/client/dashboard` | Client bookings. |
| `/provider/dashboard` | Provider requests and services. |
