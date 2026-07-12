import { createOpenRouter } from '@openrouter/ai-sdk-provider';

export const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY!,
  // Required for OpenRouter guardrails + app tracking in dashboard
  headers: {
    'HTTP-Referer': process.env.BETTER_AUTH_URL || 'https://shipflow-weld.vercel.app',
    'X-Title': 'ShipFlow AI',
  },
});