// src/config/stripe.config.ts
export const stripeConfig = {
  secretKey: process.env.STRIPE_SECRET_KEY || '',
  publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
  apiVersion: '2023-10-16' as const,
};

// Validar configuración al inicio
if (!stripeConfig.secretKey) {
  throw new Error('STRIPE_SECRET_KEY is required');
}

if (!stripeConfig.publishableKey) {
  throw new Error('STRIPE_PUBLISHABLE_KEY is required');
}