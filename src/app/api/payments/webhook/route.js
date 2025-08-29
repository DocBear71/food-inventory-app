// file: /src/app/api/payments/webhook/route.js v2 - Proper Email Implementations

import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import connectDB from '@/lib/mongodb';
import { User } from '@/lib/models';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(request) {
    try {
        const body = await request.text();
        const signature = request.headers.get('stripe-signature');

        if (!signature || !webhookSecret) {
            console.error('❌ Missing signature or webhook secret');
            return NextResponse.json(
                { error: 'Missing signature or webhook secret' },
                { status: 400 }
            );
        }

        let event;
        try {
            event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
        } catch (err) {
            console.error('❌ Webhook signature verification failed:', err.message);
            return NextResponse.json(
                { error: 'Webhook signature verification failed' },
                { status: 400 }
            );
        }

        console.log('📨 Received Stripe webhook:', event.type);

        await connectDB();

        // Handle different event types
        switch (event.type) {
            case 'checkout.session.completed':
                await handleCheckoutCompleted(event.data.object);
                break;

            case 'customer.subscription.created':
                await handleSubscriptionCreated(event.data.object);
                break;

            case 'customer.subscription.updated':
                await handleSubscriptionUpdated(event.data.object);
                break;

            case 'customer.subscription.deleted':
                await handleSubscriptionDeleted(event.data.object);
                break;

            case 'invoice.payment_succeeded':
                await handlePaymentSucceeded(event.data.object);
                break;

            case 'invoice.payment_failed':
                await handlePaymentFailed(event.data.object);
                break;

            case 'customer.subscription.trial_will_end':
                await handleTrialWillEnd(event.data.object);
                break;

            default:
                console.log(`📝 Unhandled event type: ${event.type}`);
        }

        return NextResponse.json({ received: true });

    } catch (error) {
        console.error('❌ Webhook error:', error);
        return NextResponse.json(
            { error: 'Webhook processing failed' },
            { status: 500 }
        );
    }
}

// Handle successful checkout completion
async function handleCheckoutCompleted(session) {
    try {
        console.log('✅ Processing checkout completion:', session.id);

        const userId = session.metadata?.userId;
        if (!userId) {
            console.error('❌ No userId in checkout session metadata');
            return;
        }

        const user = await User.findById(userId);
        if (!user) {
            console.error('❌ User not found:', userId);
            return;
        }

        // Get subscription details from metadata
        const tier = session.metadata.tier;
        const billingCycle = session.metadata.billingCycle;
        const previousTier = session.metadata.previousTier;

        // Get the subscription from Stripe
        const stripeSubscription = await stripe.subscriptions.retrieve(session.subscription);

        // Update user subscription
        const now = new Date();

        // FIXED: Safe date conversion with proper null checking
        let subscriptionEndDate = null;
        if (stripeSubscription && stripeSubscription.current_period_end) {
            try {
                subscriptionEndDate = new Date(stripeSubscription.current_period_end * 1000);
                // Validate the date is actually valid
                if (isNaN(subscriptionEndDate.getTime())) {
                    const { NativeDialog } = await import('@/components/mobile/NativeDialog');
                    await NativeDialog.showError({
                        title: 'Upgrade Failed',
                        message: 'Individual upgrade failed'
                    });
                    return;
                }
            } catch (error) {
                console.warn('Error creating subscription end date:', error);
                // Fallback: 1 year from now for annual, 1 month for monthly
                const fallbackPeriod = billingCycle === 'annual' ? 365 : 30;
                subscriptionEndDate = new Date(now.getTime() + (fallbackPeriod * 24 * 60 * 60 * 1000));
            }
        } else {
            console.warn('No current_period_end found, using fallback date');
            // Fallback based on billing cycle
            const fallbackPeriod = billingCycle === 'annual' ? 365 : 30;
            subscriptionEndDate = new Date(now.getTime() + (fallbackPeriod * 24 * 60 * 60 * 1000));
        }

        user.subscription = {
            ...user.subscription,
            tier: tier,
            status: 'active',
            billingCycle: billingCycle,
            startDate: now,
            endDate: subscriptionEndDate,
            stripeCustomerId: session.customer,
            stripeSubscriptionId: session.subscription,
            lastPaymentDate: now,
            nextBillingDate: subscriptionEndDate,
            // Clear trial data since they're now paying
            trialStartDate: null,
            trialEndDate: null
        };

        await user.save();

        console.log('✅ Subscription activated:', {
            userId: user._id,
            email: user.email,
            tier: tier,
            billingCycle: billingCycle,
            previousTier: previousTier,
            nextBilling: subscriptionEndDate.toISOString()
        });

        try {
            const { sendWelcomeEmail } = await import('../../../../lib/email-todo-implementations.js');
            await sendWelcomeEmail({
                userEmail: user.email,
                userName: user.name || user.displayName || 'there',
                tier: tier,
                billingCycle: billingCycle,
                endDate: subscriptionEndDate,
                isNewUser: previousTier === 'free' || !previousTier
            });
            console.log('✅ Welcome email sent for checkout completion');
        } catch (emailError) {
            console.error('❌ Failed to send welcome email:', emailError);
            // Don't throw - email failure shouldn't break subscription processing
        }

    } catch (error) {
        console.error('❌ Error handling checkout completion:', error);
    }
}

// Handle subscription creation
async function handleSubscriptionCreated(subscription) {
    try {
        console.log('📝 Processing subscription creation:', subscription.id);

        const userId = subscription.metadata?.userId;
        if (!userId) {
            console.error('❌ No userId in subscription metadata');
            return;
        }

        const user = await User.findById(userId);
        if (!user) {
            console.error('❌ User not found:', userId);
            return;
        }

        // Extract tier info from subscription metadata or line items
        const tier = subscription.metadata?.tier || 'gold'; // fallback
        const billingCycle = subscription.metadata?.billingCycle || 'monthly';

        const now = new Date();

        // FIXED: Safe date conversion with proper null checking
        let subscriptionEndDate = null;
        if (subscription && subscription.current_period_end) {
            try {
                subscriptionEndDate = new Date(subscription.current_period_end * 1000);
                // Validate the date is actually valid
                if (isNaN(subscriptionEndDate.getTime())) {
                    const { NativeDialog } = await import('@/components/mobile/NativeDialog');
                    await NativeDialog.showError({
                        title: 'Upgrade Failed',
                        message: 'Individual upgrade failed'
                    });
                    return;
                }
            } catch (error) {
                console.warn('Error creating subscription end date:', error);
                // Fallback: 1 year from now for annual, 1 month for monthly
                const fallbackPeriod = billingCycle === 'annual' ? 365 : 30;
                subscriptionEndDate = new Date(now.getTime() + (fallbackPeriod * 24 * 60 * 60 * 1000));
            }
        } else {
            console.warn('No current_period_end found, using fallback date');
            // Fallback based on billing cycle
            const fallbackPeriod = billingCycle === 'annual' ? 365 : 30;
            subscriptionEndDate = new Date(now.getTime() + (fallbackPeriod * 24 * 60 * 60 * 1000));
        }

        user.subscription = {
            ...user.subscription,
            tier: tier,
            status: subscription.status, // 'active', 'trialing', etc.
            billingCycle: billingCycle,
            startDate: now,
            endDate: subscriptionEndDate,
            stripeSubscriptionId: subscription.id,
            nextBillingDate: subscriptionEndDate
        };

        await user.save();

        console.log('✅ Subscription created in database:', {
            userId: user._id,
            subscriptionId: subscription.id,
            tier: tier,
            status: subscription.status
        });

        // Send welcome email if this is a new paid subscription (not trial)
        if (subscription.status === 'active') {
            try {
                const { sendWelcomeEmail } = await import('../../../../lib/email-todo-implementations.js');
                await sendWelcomeEmail({
                    userEmail: user.email,
                    userName: user.name || user.displayName || 'there',
                    tier: tier,
                    billingCycle: billingCycle,
                    endDate: subscriptionEndDate,
                    isNewUser: true
                });
                console.log('✅ Welcome email sent for new subscription');
            } catch (emailError) {
                console.error('❌ Failed to send welcome email:', emailError);
            }
        }

    } catch (error) {
        console.error('❌ Error handling subscription creation:', error);
    }
}

// Handle subscription updates
async function handleSubscriptionUpdated(subscription) {
    try {
        console.log('🔄 Processing subscription update:', subscription.id);

        // Find user by Stripe subscription ID
        const user = await User.findOne({
            'subscription.stripeSubscriptionId': subscription.id
        });

        if (!user) {
            console.error('❌ User not found for subscription:', subscription.id);
            return;
        }

        // Update subscription details with safe date handling
        let subscriptionEndDate = null;
        if (subscription && subscription.current_period_end) {
            try {
                subscriptionEndDate = new Date(subscription.current_period_end * 1000);
                // Validate the date is actually valid
                if (isNaN(subscriptionEndDate.getTime())) {
                    const { NativeDialog } = await import('@/components/mobile/NativeDialog');
                    await NativeDialog.showError({
                        title: 'Upgrade Failed',
                        message: 'Individual upgrade failed'
                    });
                    return;
                }
            } catch (error) {
                console.warn('Error creating subscription end date:', error);
                // Fallback: 1 month from now (most subscriptions are monthly)
                subscriptionEndDate = new Date(Date.now() + (30 * 24 * 60 * 60 * 1000));
            }
        } else {
            console.warn('No current_period_end found, using fallback date');
            // Fallback: 1 month from now
            subscriptionEndDate = new Date(Date.now() + (30 * 24 * 60 * 60 * 1000));
        }

        user.subscription = {
            ...user.subscription,
            status: subscription.status,
            endDate: subscriptionEndDate,
            nextBillingDate: subscriptionEndDate
        };

        // Handle plan changes
        if (subscription.items?.data?.length > 0) {
            const priceId = subscription.items.data[0].price.id;
            // You can map price IDs to tiers here if needed
            console.log('💰 Subscription price changed to:', priceId);
        }

        await user.save();

        console.log('✅ Subscription updated:', {
            userId: user._id,
            subscriptionId: subscription.id,
            status: subscription.status,
            nextBilling: subscriptionEndDate.toISOString()
        });

    } catch (error) {
        console.error('❌ Error handling subscription update:', error);
    }
}

// Handle subscription deletion/cancellation
async function handleSubscriptionDeleted(subscription) {
    try {
        console.log('❌ Processing subscription deletion:', subscription.id);

        // Find user by Stripe subscription ID
        const user = await User.findOne({
            'subscription.stripeSubscriptionId': subscription.id
        });

        if (!user) {
            console.error('❌ User not found for subscription:', subscription.id);
            return;
        }

        // Store previous subscription details for the email
        const previousTier = user.subscription.tier;
        const previousBillingCycle = user.subscription.billingCycle;

        // Downgrade to free tier
        user.subscription = {
            ...user.subscription,
            tier: 'free',
            status: 'cancelled',
            endDate: new Date(), // Immediate cancellation
            stripeSubscriptionId: null,
            nextBillingDate: null
        };

        await user.save();

        console.log('✅ Subscription cancelled:', {
            userId: user._id,
            email: user.email,
            subscriptionId: subscription.id
        });

        try {
            const { sendCancellationConfirmationEmail } = await import('../../../../lib/email-todo-implementations.js');
            await sendCancellationConfirmationEmail({
                userEmail: user.email,
                userName: user.name || user.displayName || 'there',
                tier: previousTier,
                billingCycle: previousBillingCycle,
                accessUntilDate: subscription.current_period_end ?
                    new Date(subscription.current_period_end * 1000) : new Date(),
                cancellationReason: subscription.cancellation_details?.reason || 'User requested cancellation'
            });
            console.log('✅ Cancellation confirmation email sent');
        } catch (emailError) {
            console.error('❌ Failed to send cancellation email:', emailError);
        }

    } catch (error) {
        console.error('❌ Error handling subscription deletion:', error);
    }
}

// Handle successful payments
async function handlePaymentSucceeded(invoice) {
    try {
        console.log('💰 Processing successful payment:', invoice.id);

        // Find user by Stripe customer ID
        const user = await User.findOne({
            'subscription.stripeCustomerId': invoice.customer
        });

        if (!user) {
            console.error('❌ User not found for customer:', invoice.customer);
            return;
        }

        // Update last payment date
        user.subscription = {
            ...user.subscription,
            lastPaymentDate: new Date(),
            status: 'active' // Ensure status is active after successful payment
        };

        await user.save();

        console.log('✅ Payment recorded:', {
            userId: user._id,
            email: user.email,
            invoiceId: invoice.id,
            amount: invoice.amount_paid / 100, // Convert cents to dollars
            currency: invoice.currency
        });

        try {
            const { sendPaymentConfirmationEmail } = await import('../../../../lib/email-todo-implementations.js');

            // Get subscription details for the email
            const stripeSubscription = invoice.subscription ?
                await stripe.subscriptions.retrieve(invoice.subscription) : null;

            await sendPaymentConfirmationEmail({
                userEmail: user.email,
                userName: user.name || user.displayName || 'there',
                amount: (invoice.amount_paid / 100).toFixed(2),
                currency: invoice.currency.toUpperCase(),
                invoiceId: invoice.id,
                tier: user.subscription.tier,
                billingCycle: user.subscription.billingCycle,
                nextBillingDate: user.subscription.nextBillingDate,
                paymentMethod: invoice.payment_intent?.payment_method_types?.[0] || 'Card'
            });
            console.log('✅ Payment confirmation email sent');
        } catch (emailError) {
            console.error('❌ Failed to send payment confirmation email:', emailError);
        }

    } catch (error) {
        console.error('❌ Error handling payment success:', error);
    }
}

// Handle failed payments
async function handlePaymentFailed(invoice) {
    try {
        console.log('❌ Processing failed payment:', invoice.id);

        // Find user by Stripe customer ID
        const user = await User.findOne({
            'subscription.stripeCustomerId': invoice.customer
        });

        if (!user) {
            console.error('❌ User not found for customer:', invoice.customer);
            return;
        }

        // Update subscription status but don't immediately downgrade
        // Stripe will handle retry logic
        user.subscription = {
            ...user.subscription,
            status: 'past_due'
        };

        await user.save();

        console.log('⚠️ Payment failed recorded:', {
            userId: user._id,
            email: user.email,
            invoiceId: invoice.id,
            attemptCount: invoice.attempt_count
        });

        try {
            const { sendPaymentFailedEmail } = await import('../../../../lib/email-todo-implementations.js');

            await sendPaymentFailedEmail({
                userEmail: user.email,
                userName: user.name || user.displayName || 'there',
                amount: (invoice.amount_due / 100).toFixed(2),
                currency: invoice.currency.toUpperCase(),
                attemptCount: invoice.attempt_count,
                nextRetryDate: invoice.next_payment_attempt ?
                    new Date(invoice.next_payment_attempt * 1000) : null,
                tier: user.subscription.tier,
                billingCycle: user.subscription.billingCycle,
                reason: invoice.last_payment_error?.message || 'Payment declined'
            });
            console.log('✅ Payment failed email sent');
        } catch (emailError) {
            console.error('❌ Failed to send payment failed email:', emailError);
        }

    } catch (error) {
        console.error('❌ Error handling payment failure:', error);
    }
}

// Handle trial ending soon
async function handleTrialWillEnd(subscription) {
    try {
        console.log('⏰ Processing trial ending notification:', subscription.id);

        // Find user by Stripe subscription ID
        const user = await User.findOne({
            'subscription.stripeSubscriptionId': subscription.id
        });

        if (!user) {
            console.error('❌ User not found for subscription:', subscription.id);
            return;
        }

        console.log('⏰ Trial ending soon for user:', {
            userId: user._id,
            email: user.email,
            trialEnd: new Date(subscription.trial_end * 1000).toISOString()
        });

        try {
            const { sendTrialEndingEmail } = await import('../../../../lib/email-todo-implementations.js');

            const trialEndDate = new Date(subscription.trial_end * 1000);
            const now = new Date();
            const daysRemaining = Math.ceil((trialEndDate - now) / (1000 * 60 * 60 * 24));

            await sendTrialEndingEmail({
                userEmail: user.email,
                userName: user.name || user.displayName || 'there',
                daysRemaining: Math.max(0, daysRemaining),
                trialEndDate: trialEndDate,
                currentTier: user.subscription.tier || 'platinum'
            });
            console.log('✅ Trial ending email sent');
        } catch (emailError) {
            console.error('❌ Failed to send trial ending email:', emailError);
        }

    } catch (error) {
        console.error('❌ Error handling trial ending notification:', error);
    }
}