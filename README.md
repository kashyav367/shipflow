# 🚀 ShipFlow.ai

> **AI-first product and engineering agent** that clarifies requirements, drafts comprehensive PRDs, populates Kanban tasks, and reviews code on GitHub.

ShipFlow.ai automates the tedious parts of the product delivery cycle. It bridges the gap between raw feature requests and production-ready code through turn-by-turn interactive specification and validation.

---

## ✨ Features

- **🗣️ Turn-by-Turn Discovery Chat**: Clarify edge cases, api constraints, and scope directly with the AI Analyst before a single line of code is written.
- **📄 Context-Aware Specs (PRDs)**: Automatically generate comprehensive technical PRDs detailing Prisma database schemas, API structures, and routes.
- **📋 Kanban Planning**: Automatically break down approved PRDs into granular, developer-friendly tasks on your active Kanban board.
- **🔍 Automated Pull Request Reviews**: Review submitted code changes on GitHub against the original PRD to verify logic alignment and catch bugs.
- **📈 Continuous Delivery Metrics**: Track velocity and task alignment to monitor feature shipping speeds with DORA metrics.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js (App Router)](https://nextjs.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Database / ORM**: [Prisma](https://www.prisma.io/) with PostgreSQL/SQLite
- **Background Jobs**: [Inngest](https://www.inngest.com/) for reliable agentic workflow orchestration
- **Authentication**: [Better-Auth](https://www.better-auth.com/) (GitHub Provider integration)
- **UI Components**: Radix Primitives & Lucide / Phosphor Icons

---

## ⚙️ Getting Started

### 1. Prerequisites

Ensure you have Node.js (v18+ recommended) and `npm`, `pnpm`, or `bun` installed.

### 2. Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/your-username/shipflow.git
cd shipflow/shipflow-ai
npm install
```

### 3. Environment Setup

Create a `.env` file in the root of the `shipflow-ai` directory and populate it with your local variables:

```env
# Database Connections
DATABASE_URL="file:./dev.db"

# Better Auth Credentials
BETTER_AUTH_SECRET="your-auth-secret-here"
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"

# GitHub App Integration Keys
GITHUB_APP_ID="your-app-id"
GITHUB_APP_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
GITHUB_WEBHOOK_SECRET="your-webhook-secret"

# Inngest Keys (Local Dev uses Dev Server)
INNGEST_EVENT_KEY="your-event-key"
INNGEST_SIGNING_KEY="your-signing-key"
```

### 4. Database Initialization

Run migrations to set up your local database:

```bash
npx prisma db push
```

### 5. Running the Application

To run the full local development stack, you need to execute three services in separate terminals:

#### Terminal 1: Run the Next.js Dev Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) with your browser to view the homepage.

#### Terminal 2: Run the Inngest Dev Server (for Background Agentic Workflows)
```bash
npx inngest-cli@latest dev
```
This runs the local Inngest orchestrator at [http://localhost:8288](http://localhost:8288).

#### Terminal 3: Setup Ngrok Webhook Proxy (for GitHub App Webhook Integration)
```bash
ngrok http 3000
```
Update your GitHub App Webhook URL configuration with the active Ngrok tunnel address.

---

## 📂 Project Structure

```text
shipflow-ai/
├── app/                  # Next.js App Router (Layouts, Pages, APIs)
│   ├── (auth)/           # Authentication Routes (Sign-in/Sign-up)
│   ├── (protected)/      # Workspace Dashboard, Kanban, and Features
│   └── api/              # API Endpoints (Auth, GitHub callbacks, Inngest triggers)
├── components/           # Reusable Base UI components
├── features/             # Feature-based module components (auth, kanban, review)
├── lib/                  # Central utility libraries (auth clients, database config)
├── prisma/               # Database Prisma schemas and migrations
└── public/               # Public static assets (Icons, generated vector images)
```

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/your-username/shipflow/issues) to get started.

---

## 📄 License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
