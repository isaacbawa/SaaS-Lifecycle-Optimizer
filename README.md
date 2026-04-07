# LifecycleOS - SaaS Lifecycle Infrastructure & Email Marketing Platform

A production-grade, SaaS-native growth system designed exclusively for SaaS companies to manage activation, retention, and expansion through behavior-driven email marketing powered by real product data.

## Tech Stack (Frontend)

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Styling:** TailwindCSS + ShadCN UI
- **Charts:** Recharts
- **Validation:** Zod + React Hook Form

## Getting Started

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env.local

# Run development server
npm run dev

# Type-check
npm run typecheck

# Production build
npm run build
npm start
```

## Production Scheduler (Vercel Hobby Safe)

This project exposes a secure scheduler endpoint at `/api/v1/scheduler`.

- Set `CRON_SECRET` in Vercel environment variables.
- Trigger the endpoint from an external scheduler:

```bash
curl -X POST https://your-domain.com/api/v1/scheduler \
	-H "Authorization: Bearer $CRON_SECRET"
```

Recommended interval:
- Every 5 minutes for flow/event processing.
- Every 1-5 minutes for high-volume email retry workloads.

This avoids deployment failures tied to plan-limited built-in cron features.

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── (app)/              # Authenticated app shell (sidebar + header)
│   │   ├── dashboard/      # Overview: KPIs + lifecycle distribution
│   │   ├── activation/     # Activation funnel + trial conversion
│   │   ├── retention/      # Churn risk analysis + user table
│   │   ├── expansion/      # Expansion MRR + upgrade opportunities
│   │   ├── accounts/       # B2B account health overview
│   │   ├── flows/          # Email flow builder + management
│   │   ├── revenue/        # ARR/MRR analytics + plan breakdown
│   │   ├── sdk/            # SDK integration guide
│   │   ├── deliverability/ # Email deliverability monitoring
│   │   └── settings/       # Profile, team, billing, API keys
│   ├── pricing/            # Public pricing page
│   └── page.tsx            # Marketing landing page
├── components/
│   ├── dashboard/          # Dashboard-specific components
│   ├── layout/             # App sidebar, header, marketing layout
│   ├── retention/          # Churn analysis client component
│   └── ui/                 # ShadCN UI component library
├── hooks/                  # Custom React hooks
└── lib/                    # Types, utilities, seed data
```

## Architecture

This is the **frontend application** of the LifecycleOS platform. The full production system includes:

- **Backend:** NestJS + GraphQL (Apollo Server)
- **Event Streaming:** Apache Kafka (Confluent Cloud)
- **Database:** PostgreSQL (Neon) + ClickHouse (analytics)
- **Cache:** Redis (Upstash)
- **Email:** AWS SES (dedicated IPs)
- **Jobs:** BullMQ
- **Auth:** Clerk
- **Infra:** AWS ECS Fargate, Terraform, GitHub Actions

## License

Proprietary. All rights reserved.

```bash
**It was important to;**
# Production build
npm run build
npm start
```
