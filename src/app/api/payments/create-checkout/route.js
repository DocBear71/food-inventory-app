// file: /src/app/api/payments/create-checkout/route.js v2 - Enhanced with Iowa sales tax collection

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
// authOptions no longer needed in NextAuth v5
import Stripe from 'stripe';
import connectDB from '@/lib/mongodb';
import { User } from '@/lib/models';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(request) {
    try {
        console.log('🔄 Creating Stripe checkout session...');

        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            );
        }

        const { tier, billingCycle, currentTier, source } = await request.json();

        // Validate inputs
        if (!tier || !billingCycle) {
            return NextResponse.json(
                { error: 'Tier and billing cycle are required' },
                { status: 400 }
            );
        }

        if (!['monthly', 'annual'].includes(billingCycle)) {
            return NextResponse.json(
                { error: 'Invalid billing cycle' },
                { status: 400 }
            );
        }

        if (!['free', 'gold', 'platinum'].includes(tier)) {
            return NextResponse.json(
                { error: 'Invalid tier' },
                { status: 400 }
            );
        }

        // Can't create checkout for free tier
        if (tier === 'free') {
            return NextResponse.json(
                { error: 'Cannot create checkout for free tier' },
                { status: 400 }
            );
        }

        await connectDB();

        // Get user from database
        const user = await User.findById(session.user.id);
        if (!user) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        // Price configuration (in cents)
        const prices = {
            gold: {
                monthly: 499,  // $4.99
                annual: 4999   // $49.99
            },
            platinum: {
                monthly: 999,  // $9.99
                annual: 9999   // $99.99
            }
        };

        const price = prices[tier][billingCycle];
        if (!price) {
            return NextResponse.json(
                { error: 'Invalid price configuration' },
                { status: 400 }
            );
        }

        // Determine if this is an upgrade, downgrade, or new subscription
        const isUpgrade = currentTier === 'free' ||
            (currentTier === 'gold' && tier === 'platinum');
        const isDowngrade = (currentTier === 'platinum' && tier === 'gold');

        // Create or retrieve Stripe customer
        let stripeCustomerId = user.subscription?.stripeCustomerId;

        // Check if existing customer ID is valid (handles test/live mode switches)
        if (stripeCustomerId) {
            try {
                await stripe.customers.retrieve(stripeCustomerId);
                console.log('✅ Existing Stripe customer found:', stripeCustomerId);
            } catch (error) {
                console.log('❌ Existing customer ID invalid (likely test/live mode switch), creating new customer');
                stripeCustomerId = null;
            }
        }

        if (!stripeCustomerId) {
            console.log('🆕 Creating new Stripe customer...');
            const customer = await stripe.customers.create({
                email: user.email,
                name: user.name,
                metadata: {
                    userId: user._id.toString(),
                    currentTier: currentTier || 'free'
                }
            });
            stripeCustomerId = customer.id;

            // Save customer ID to user
            user.subscription = user.subscription || {};
            user.subscription.stripeCustomerId = stripeCustomerId;
            await user.save();
            console.log('✅ Stripe customer created:', stripeCustomerId);
        }

        // Create line items
        const lineItems = [{
            price_data: {
                currency: 'usd',
                product_data: {
                    name: `Doc Bear's Comfort Food - ${tier.charAt(0).toUpperCase() + tier.slice(1)} Plan`,
                    description: `${tier === 'gold' ? 'Essential tools for active home cooks' : 'Complete kitchen management for serious cooking enthusiasts'}`,
                    metadata: {
                        tier: tier,
                        billingCycle: billingCycle
                    }
                },
                unit_amount: price,
                recurring: {
                    interval: billingCycle === 'annual' ? 'year' : 'month'
                }
            },
            quantity: 1
        }];

        // Determine success and cancel URLs
        const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
        const successUrl = `${baseUrl}/account/billing?success=true&tier=${tier}&billing=${billingCycle}`;
        const cancelUrl = `${baseUrl}/account/billing?cancelled=true`;

        // Create checkout session with AUTOMATIC TAX COLLECTION
        console.log('🔄 Creating Stripe checkout session with tax collection...');
        const checkoutSession = await stripe.checkout.sessions.create({
            customer: stripeCustomerId,
            payment_method_types: ['card'],
            line_items: lineItems,
            mode: 'subscription',
            success_url: successUrl,
            cancel_url: cancelUrl,

            // ✅ ENABLE AUTOMATIC TAX COLLECTION
            automatic_tax: {
                enabled: true,
            },

            // ✅ COLLECT CUSTOMER ADDRESS FOR TAX CALCULATION
            billing_address_collection: 'required',

            // Subscription configuration
            subscription_data: {
                metadata: {
                    userId: user._id.toString(),
                    tier: tier,
                    billingCycle: billingCycle,
                    previousTier: currentTier || 'free',
                    source: source || 'billing-page',
                    isUpgrade: isUpgrade.toString(),
                    isDowngrade: isDowngrade.toString()
                },
                // For upgrades, start immediately
                // For downgrades, start at next billing cycle
                billing_cycle_anchor_config: isDowngrade ? {
                    // Let them keep current benefits until next billing cycle
                    day_of_month: new Date().getDate()
                } : undefined
            },

            // Customer portal settings
            customer_update: {
                address: 'auto',
                name: 'auto'
            },

            // Allow promotional codes
            allow_promotion_codes: true,

            // Custom fields for additional info (including business use for tax exemptions)
            custom_fields: [
                {
                    key: 'business_use',
                    label: {
                        type: 'custom',
                        custom: 'Is this for business use?'
                    },
                    type: 'dropdown',
                    dropdown: {
                        options: [
                            { label: 'Personal use', value: 'personal' },
                            { label: 'Business use', value: 'business' }
                        ]
                    },
                    optional: true
                }
            ],

            // Metadata for webhook processing
            metadata: {
                userId: user._id.toString(),
                tier: tier,
                billingCycle: billingCycle,
                previousTier: currentTier || 'free',
                source: source || 'billing-page',
                userEmail: user.email,
                userName: user.name
            }
        });

        console.log('✅ Stripe checkout session created with tax collection:', checkoutSession.id);

        // Log the checkout creation
        console.log('💳 Checkout session created:', {
            sessionId: checkoutSession.id,
            userId: user._id,
            email: user.email,
            tier: tier,
            billingCycle: billingCycle,
            price: price / 100, // Convert back to dollars for logging
            isUpgrade: isUpgrade,
            isDowngrade: isDowngrade,
            automaticTax: true, // ✅ LOG TAX COLLECTION STATUS
            timestamp: new Date().toISOString()
        });

        return NextResponse.json({
            success: true,
            url: checkoutSession.url,
            sessionId: checkoutSession.id
        });

    } catch (error) {
        console.error('❌ Error creating checkout session:', error);

        // Handle specific Stripe errors
        if (error.type === 'StripeCardError') {
            return NextResponse.json(
                { error: 'Payment failed. Please check your card details.' },
                { status: 400 }
            );
        }

        if (error.type === 'StripeRateLimitError') {
            return NextResponse.json(
                { error: 'Too many requests. Please try again later.' },
                { status: 429 }
            );
        }

        if (error.type === 'StripeInvalidRequestError') {
            return NextResponse.json(
                { error: 'Invalid request. Please check your information.' },
                { status: 400 }
            );
        }

        if (error.type === 'StripeAPIError') {
            return NextResponse.json(
                { error: 'Payment service temporarily unavailable.' },
                { status: 503 }
            );
        }

        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}