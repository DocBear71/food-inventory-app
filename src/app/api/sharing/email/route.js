// file: /src/app/api/sharing/email/route.js v1 - Email sharing API with subscription validation

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
// authOptions no longer needed in NextAuth v5
import { sendShoppingListEmail, validateEmails } from '@/lib/email';
import { User, EmailLog } from '@/lib/models';
import { checkFeatureAccess, checkUsageLimit, getUsageLimit } from '@/lib/subscription-config';
import connectDB from '@/lib/mongodb';

export async function POST(request) {
    try {
        await connectDB();

        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        const body = await request.json();
        const {
            toEmails,
            senderName,
            shoppingList,
            personalMessage = '',
            context = 'shopping-list',
            contextName = 'Shopping List'
        } = body;

        // Validate required fields
        if (!toEmails || !Array.isArray(toEmails) || toEmails.length === 0) {
            return NextResponse.json({ error: 'At least one recipient email is required' }, { status: 400 });
        }

        if (!senderName || !senderName.trim()) {
            return NextResponse.json({ error: 'Sender name is required' }, { status: 400 });
        }

        if (!shoppingList) {
            return NextResponse.json({ error: 'Shopping list data is required' }, { status: 400 });
        }

        // Validate email format
        const cleanEmails = toEmails.filter(email => email && email.trim());
        if (!validateEmails(cleanEmails)) {
            return NextResponse.json({ error: 'One or more email addresses are invalid' }, { status: 400 });
        }

        // Get user with subscription info
        const user = await User.findById(session.user.id).select('subscription usageTracking email');
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // SUBSCRIPTION VALIDATION
        const userSubscription = user.subscription || { tier: 'free', status: 'free' };

        // Check if user has email sharing access
        if (!checkFeatureAccess(userSubscription, 'EMAIL_SHARING')) {
            return NextResponse.json({
                error: 'Email sharing is a Gold feature. Please upgrade your subscription to share content via email.',
                upgradeRequired: true,
                feature: 'EMAIL_SHARING'
            }, { status: 403 });
        }

        // Check usage limits for paid users
        if (userSubscription.tier !== 'free') {
            const currentMonth = new Date().getMonth();
            const currentYear = new Date().getFullYear();

            // Reset monthly counter if new month
            if (!user.usageTracking ||
                user.usageTracking.currentMonth !== currentMonth ||
                user.usageTracking.currentYear !== currentYear) {

                user.usageTracking = {
                    ...user.usageTracking,
                    currentMonth,
                    currentYear,
                    monthlyEmailShares: 0,
                    lastUpdated: new Date()
                };
            }

            const currentUsage = user.usageTracking.monthlyEmailShares || 0;

            // Check if they're within their limit
            if (!checkUsageLimit(userSubscription, 'emailSharesPerMonth', currentUsage)) {
                const limit = getUsageLimit(userSubscription, 'emailSharesPerMonth');
                return NextResponse.json({
                    error: `You've reached your monthly email sharing limit (${limit} emails). ${
                        userSubscription.tier === 'gold'
                            ? 'Upgrade to Platinum for unlimited email sharing.'
                            : 'Please try again next month.'
                    }`,
                    limitExceeded: true,
                    currentUsage,
                    limit,
                    tier: userSubscription.tier
                }, { status: 429 });
            }
        }

        try {
            // Send the email using the email service with subscription validation
            const emailResult = await sendShoppingListEmail({
                toEmails: cleanEmails,
                senderName: senderName.trim(),
                senderEmail: user.email,
                shoppingList,
                personalMessage: personalMessage.trim(),
                context,
                contextName,
                userSubscription,
                userId: user._id
            });

            // Log the email send for tracking
            const emailLog = new EmailLog({
                userId: user._id,
                recipients: cleanEmails.map(email => ({ email, name: '' })),
                subject: `🛒 Shopping List from ${senderName.trim()}${contextName ? ` - ${contextName}` : ''}`,
                emailType: context === 'meal-plan' ? 'meal-plan' : 'shopping-list',
                content: {
                    personalMessage: personalMessage.trim(),
                    contextName,
                    shoppingListId: shoppingList.id || null
                },
                messageId: emailResult.messageId,
                status: 'sent'
            });

            await emailLog.save();

            // Update usage tracking (this is also done in the email service, but we do it here for redundancy)
            if (userSubscription.tier !== 'free') {
                user.usageTracking.monthlyEmailShares = (user.usageTracking.monthlyEmailShares || 0) + 1;
                user.usageTracking.lastUpdated = new Date();
                await user.save();
            }

            return NextResponse.json({
                success: true,
                messageId: emailResult.messageId,
                recipientCount: emailResult.recipientCount,
                message: `Email sent successfully to ${emailResult.recipientCount} recipient${emailResult.recipientCount !== 1 ? 's' : ''}`,
                usageInfo: userSubscription.tier !== 'free' ? {
                    currentUsage: user.usageTracking.monthlyEmailShares,
                    limit: getUsageLimit(userSubscription, 'emailSharesPerMonth'),
                    tier: userSubscription.tier
                } : null
            });

        } catch (emailError) {
            console.error('Email sending failed:', emailError);

            // Log the failed attempt
            const emailLog = new EmailLog({
                userId: user._id,
                recipients: cleanEmails.map(email => ({ email, name: '' })),
                subject: `🛒 Shopping List from ${senderName.trim()}`,
                emailType: 'shopping-list',
                content: {
                    personalMessage: personalMessage.trim(),
                    contextName
                },
                status: 'failed',
                error: emailError.message
            });

            await emailLog.save();

            // Check if it's a subscription-related error
            if (emailError.message.includes('Gold feature') || emailError.message.includes('upgrade')) {
                return NextResponse.json({
                    error: emailError.message,
                    upgradeRequired: true
                }, { status: 403 });
            }

            if (emailError.message.includes('monthly email sharing limit')) {
                return NextResponse.json({
                    error: emailError.message,
                    limitExceeded: true
                }, { status: 429 });
            }

            return NextResponse.json({
                error: 'Failed to send email. Please try again later.',
                details: emailError.message
            }, { status: 500 });
        }

    } catch (error) {
        console.error('Email sharing API error:', error);
        return NextResponse.json({
            error: 'Internal server error',
            details: error.message
        }, { status: 500 });
    }
}

// GET endpoint to retrieve user's email sharing usage stats
export async function GET(request) {
    try {
        await connectDB();

        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        const user = await User.findById(session.user.id).select('subscription usageTracking');
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const userSubscription = user.subscription || { tier: 'free', status: 'free' };
        const hasAccess = checkFeatureAccess(userSubscription, 'EMAIL_SHARING');

        if (!hasAccess) {
            return NextResponse.json({
                hasAccess: false,
                tier: userSubscription.tier,
                upgradeRequired: true
            });
        }

        const currentUsage = user.usageTracking?.monthlyEmailShares || 0;
        const limit = getUsageLimit(userSubscription, 'emailSharesPerMonth');

        return NextResponse.json({
            hasAccess: true,
            tier: userSubscription.tier,
            currentUsage,
            limit,
            unlimited: limit === -1,
            remaining: limit === -1 ? -1 : Math.max(0, limit - currentUsage),
            resetDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1) // First day of next month
        });

    } catch (error) {
        console.error('Email usage stats API error:', error);
        return NextResponse.json({
            error: 'Internal server error'
        }, { status: 500 });
    }
}