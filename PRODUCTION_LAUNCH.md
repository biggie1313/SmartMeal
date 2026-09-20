# SmartMeal Production Launch

## Already prepared in code

The application is configured to use these production environment variables when present:

- `STRIPE_PREMIUM_PRICE_ID`
- `STRIPE_FAMILY_PRICE_ID`
- `STRIPE_SUCCESS_URL`
- `STRIPE_CANCEL_URL`
- `STRIPE_PORTAL_RETURN_URL`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `SUPABASE_SERVICE_ROLE_KEY`

The code keeps the current sandbox price IDs as fallbacks so the existing test environment continues to work until production values are supplied.

## Stripe production setup

1. Activate Stripe live mode and complete any required business verification.
2. In live mode, create the Premium product/price at $7.99/month.
3. In live mode, create the Family product/price at $12.99/month.
4. Copy the live price IDs into Vercel Production environment variables:
   - `STRIPE_PREMIUM_PRICE_ID`
   - `STRIPE_FAMILY_PRICE_ID`
5. Create a live webhook/event destination pointing to:
   - `https://smartmeal-commercial-mvp.vercel.app/api/stripe-webhook`
6. Enable:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
7. Copy the live webhook signing secret to:
   - `STRIPE_WEBHOOK_SECRET`

## Vercel Production environment

Add or replace these variables for the Production environment:

- `STRIPE_SECRET_KEY` = live secret key
- `STRIPE_WEBHOOK_SECRET` = live webhook secret
- `STRIPE_PREMIUM_PRICE_ID` = live Premium price
- `STRIPE_FAMILY_PRICE_ID` = live Family price
- `STRIPE_SUCCESS_URL` = `https://smartmeal-commercial-mvp.vercel.app/?premium=success`
- `STRIPE_CANCEL_URL` = `https://smartmeal-commercial-mvp.vercel.app/?premium=cancel`
- `STRIPE_PORTAL_RETURN_URL` = `https://smartmeal-commercial-mvp.vercel.app/`
- `SUPABASE_SERVICE_ROLE_KEY` = production service-role key

Keep secret values server-side only. Do not put Stripe secret keys or the Supabase service-role key into frontend files.

After changing Production environment variables, redeploy the Vercel project so the new values are loaded.

## Supabase production checks

The current Supabase project contains:

- user profiles and Premium entitlement fields
- saved plans with Row Level Security
- Premium favorites with Row Level Security
- Family households, members, shared preferences, and shared grocery lists with Row Level Security

Before launch, confirm the production Supabase Authentication Site URL and redirect URLs include the final public domain.

## Final customer test

Perform the following in production only after live keys and webhook are configured:

1. Create a new customer account.
2. Confirm email if required.
3. Generate a Free meal plan.
4. Subscribe to Premium with a real payment method.
5. Confirm Premium tools unlock.
6. Save a plan and reload it.
7. Favorite a meal and verify it persists.
8. Open Manage subscription.
9. Test cancellation from the Stripe customer portal.
10. Verify the webhook changes the customer's subscription status in Supabase.

For Family:

1. Create a new Family subscription.
2. Confirm the Family workspace appears.
3. Create a household.
4. Copy the invite code.
5. Sign in with a second Family account and join with the code.
6. Add a shared grocery item from one account.
7. Verify the second account sees it.
8. Update a family meal preference and verify it is shared.

Do not use Stripe test cards once the live configuration is active.
