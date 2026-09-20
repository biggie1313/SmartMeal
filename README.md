# SmartMeal

SmartMeal is a subscription meal-planning web app for households that want a simpler weekly plan, grocery checklist, saved plans, meal favorites, substitutions, and Premium nutrition controls.

## Current features

- Responsive commercial landing page
- Supabase email accounts with sign-up, sign-in, email confirmation resend, and password reset
- Free 7-day meal planner
- Household size, budget, and dietary style controls
- Premium nutrition targets: balanced, high protein, and lower carb
- Premium ingredient-reuse preference
- Premium saved weekly plans with restore and delete
- Premium meal favorites stored in Supabase
- Premium meal substitutions
- Interactive grocery checklist stored in the browser
- Stripe-hosted Premium ($7.99/month) subscription checkout in sandbox/test mode
- Dedicated Family subscription product/price prepared in Stripe sandbox; Family checkout and shared-household features are implemented
- Stripe webhook-driven Premium access
- Stripe Customer Portal entry point for subscription management
- Responsive mobile layout

## Production configuration

Frontend: static HTML/CSS/JavaScript  
Auth/database: Supabase  
Payments/subscriptions: Stripe  
Hosting: Vercel

The current Stripe integration is configured for sandbox/test mode. Create matching live Stripe prices, webhooks, and Vercel environment variables before accepting real customer payments.

## Security

- Stripe secret and Supabase service-role keys stay server-side in Vercel environment variables.
- Frontend uses only the Supabase publishable key.
- Saved plans and favorites use Supabase Row Level Security so users can access only their own records.

## Roadmap

Live grocery price comparison is the next major feature. The current Family plan includes a shared household, shared grocery list, shared preferences, and invite codes.
