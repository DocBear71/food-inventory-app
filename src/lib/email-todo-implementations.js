// file: /src/lib/email-to-do-implementations.js - Implementing all the to-do items from email.js

import { sendSubscriptionUpgradeEmail, sendShoppingListEmail } from './email';

// 1. Welcome email for new subscriptions (from webhook handlers)
export async function sendWelcomeEmail(userData) {
    try {
        const { userEmail, userName, tier, billingCycle, isNewUser = false } = userData;

        console.log(`Sending welcome email to ${userEmail} for ${tier} subscription`);

        // Use the existing subscription upgrade template but customize for welcome
        const welcomeData = {
            ...userData,
            isUpgrade: true, // Use the upgrade styling for welcome
            previousTier: 'free',
            upgradeReason: isNewUser ? 'New subscription signup' : 'Subscription activated'
        };

        await sendSubscriptionUpgradeEmail(welcomeData);

        console.log(`✅ Welcome email sent successfully to ${userEmail}`);
        return { success: true };

    } catch (error) {
        console.error('❌ Error sending welcome email:', error);
        throw error;
    }
}

// 2. Payment confirmation email
export async function sendPaymentConfirmationEmail(userData) {
    try {
        const {
            userEmail,
            userName,
            amount,
            currency = 'USD',
            invoiceId,
            tier,
            billingCycle,
            nextBillingDate,
            paymentMethod = 'Card'
        } = userData;

        const currentYear = new Date().getFullYear();
        const paymentDate = new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Payment Confirmation - Doc Bear's Comfort Kitchen</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            line-height: 1.6;
            color: #333333;
            background-color: #f8fafc;
        }
        .email-container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
        }
        .header {
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            padding: 40px 30px;
            text-align: center;
        }
        .logo {
            font-size: 28px;
            font-weight: bold;
            color: #ffffff;
            margin-bottom: 8px;
        }
        .content {
            padding: 40px 30px;
        }
        .payment-card {
            background: #f0fdf4;
            border: 2px solid #10b981;
            border-radius: 12px;
            padding: 25px;
            margin: 25px 0;
            text-align: center;
        }
        .amount {
            font-size: 32px;
            font-weight: bold;
            color: #065f46;
            margin: 10px 0;
        }
        .detail-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #e2e8f0;
        }
        .detail-row:last-child { border-bottom: none; }
        .footer {
            background-color: #f7fafc;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e2e8f0;
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <div class="logo">🐻 Doc Bear's Comfort Kitchen</div>
            <p style="color: #a7f3d0; margin: 0;">Payment Confirmed</p>
        </div>
        
        <div class="content">
            <h1 style="text-align: center; color: #1a202c;">✅ Payment Successful!</h1>
            
            <p>Hello ${userName},</p>
            
            <p>Thank you for your payment! We've successfully processed your subscription payment.</p>
            
            <div class="payment-card">
                <h3 style="color: #065f46; margin: 0 0 15px 0;">Payment Confirmed</h3>
                <div class="amount">$${amount} ${currency}</div>
                <p style="color: #065f46; margin: 5px 0;">for ${tier.charAt(0).toUpperCase() + tier.slice(1)} ${billingCycle}</p>
            </div>
            
            <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <h4 style="margin: 0 0 15px 0; color: #1a202c;">Payment Details</h4>
                <div class="detail-row">
                    <span style="color: #4a5568;">Invoice ID:</span>
                    <span style="font-weight: 600;">${invoiceId}</span>
                </div>
                <div class="detail-row">
                    <span style="color: #4a5568;">Payment Date:</span>
                    <span style="font-weight: 600;">${paymentDate}</span>
                </div>
                <div class="detail-row">
                    <span style="color: #4a5568;">Payment Method:</span>
                    <span style="font-weight: 600;">${paymentMethod}</span>
                </div>
                <div class="detail-row">
                    <span style="color: #4a5568;">Subscription:</span>
                    <span style="font-weight: 600;">${tier.charAt(0).toUpperCase() + tier.slice(1)} ${billingCycle}</span>
                </div>
                ${nextBillingDate ? `
                <div class="detail-row">
                    <span style="color: #4a5568;">Next Billing:</span>
                    <span style="font-weight: 600;">${new Date(nextBillingDate).toLocaleDateString()}</span>
                </div>
                ` : ''}
            </div>
            
            <p>Your subscription is now active and you have full access to all ${tier} features.</p>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.APP_URL || 'https://docbearscomfort.kitchen'}/dashboard" 
                   style="display: inline-block; padding: 14px 28px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600;">
                    Continue to Dashboard
                </a>
            </div>
            
            <p>Thank you for being part of Doc Bear's Comfort Kitchen!</p>
        </div>
        
        <div class="footer">
            <p style="color: #718096; font-size: 14px; margin: 0;">This payment confirmation was sent automatically</p>
            <p style="color: #a0aec0; font-size: 12px; margin-top: 20px;">© ${currentYear} Doc Bear's Comfort Kitchen. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`;

        const text = `
Payment Confirmation - Doc Bear's Comfort Kitchen

Hello ${userName},

Thank you for your payment! We've successfully processed your subscription payment.

PAYMENT CONFIRMED: $${amount} ${currency}
For: ${tier.charAt(0).toUpperCase() + tier.slice(1)} ${billingCycle}

PAYMENT DETAILS:
- Invoice ID: ${invoiceId}
- Payment Date: ${paymentDate}
- Payment Method: ${paymentMethod}
- Subscription: ${tier.charAt(0).toUpperCase() + tier.slice(1)} ${billingCycle}
${nextBillingDate ? `- Next Billing: ${new Date(nextBillingDate).toLocaleDateString()}` : ''}

Your subscription is now active and you have full access to all ${tier} features.

Continue to your dashboard: ${process.env.APP_URL || 'https://docbearscomfort.kitchen'}/dashboard

Thank you for being part of Doc Bear's Comfort Kitchen!

© ${currentYear} Doc Bear's Comfort Kitchen. All rights reserved.
        `;

        // Send email using your existing email service
        const { default: emailService } = await import('./email');
        await emailService.sendEmail(
            userEmail,
            `Payment Confirmed - $${amount} - Doc Bear's Comfort Kitchen`,
            html,
            text
        );

        console.log(`✅ Payment confirmation email sent to ${userEmail}`);
        return { success: true };

    } catch (error) {
        console.error('❌ Error sending payment confirmation email:', error);
        throw error;
    }
}

// 3. Payment failed notification email
export async function sendPaymentFailedEmail(userData) {
    try {
        const {
            userEmail,
            userName,
            amount,
            currency = 'USD',
            attemptCount,
            nextRetryDate,
            tier,
            billingCycle,
            reason = 'Payment declined'
        } = userData;

        const currentYear = new Date().getFullYear();
        const failureDate = new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Payment Failed - Doc Bear's Comfort Kitchen</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            line-height: 1.6;
            color: #333333;
            background-color: #f8fafc;
        }
        .email-container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
        }
        .header {
            background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
            padding: 40px 30px;
            text-align: center;
        }
        .logo {
            font-size: 28px;
            font-weight: bold;
            color: #ffffff;
            margin-bottom: 8px;
        }
        .content {
            padding: 40px 30px;
        }
        .alert-card {
            background: #fef2f2;
            border: 2px solid #f87171;
            border-radius: 12px;
            padding: 25px;
            margin: 25px 0;
            text-align: center;
        }
        .action-button {
            display: inline-block;
            padding: 14px 28px;
            background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
            color: #ffffff;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            margin: 20px 0;
        }
        .footer {
            background-color: #f7fafc;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e2e8f0;
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <div class="logo">🐻 Doc Bear's Comfort Kitchen</div>
            <p style="color: #fed7aa; margin: 0;">Payment Issue</p>
        </div>
        
        <div class="content">
            <h1 style="text-align: center; color: #1a202c;">⚠️ Payment Failed</h1>
            
            <p>Hello ${userName},</p>
            
            <p>We were unable to process your payment for your Doc Bear's Comfort Kitchen subscription.</p>
            
            <div class="alert-card">
                <h3 style="color: #dc2626; margin: 0 0 15px 0;">Payment Declined</h3>
                <p style="color: #dc2626; margin: 5px 0;">$${amount} ${currency} for ${tier.charAt(0).toUpperCase() + tier.slice(1)} ${billingCycle}</p>
                <p style="color: #7c2d12; font-size: 14px;">Reason: ${reason}</p>
            </div>
            
            <div style="background: #fffbeb; border: 1px solid #f59e0b; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <h4 style="color: #92400e; margin: 0 0 10px 0;">What happens next?</h4>
                <ul style="color: #92400e; margin: 0; padding-left: 20px;">
                    <li>Your subscription remains active for now</li>
                    <li>We'll automatically retry payment ${nextRetryDate ? `on ${new Date(nextRetryDate).toLocaleDateString()}` : 'soon'}</li>
                    <li>This was attempt ${attemptCount} of our retry process</li>
                    <li>You can update your payment method anytime</li>
                </ul>
            </div>
            
            <div style="text-align: center;">
                <a href="${process.env.APP_URL || 'https://docbearscomfort.kitchen'}/account/billing" class="action-button">
                    Update Payment Method
                </a>
            </div>
            
            <p>To avoid any interruption to your service, please update your payment information as soon as possible.</p>
            
            <p>If you need assistance, please contact our support team.</p>
        </div>
        
        <div class="footer">
            <p style="color: #718096; font-size: 14px; margin: 0;">This payment notification was sent automatically</p>
            <p style="color: #a0aec0; font-size: 12px; margin-top: 20px;">© ${currentYear} Doc Bear's Comfort Kitchen. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`;

        const text = `
Payment Failed - Doc Bear's Comfort Kitchen

Hello ${userName},

We were unable to process your payment for your Doc Bear's Comfort Kitchen subscription.

PAYMENT DECLINED: $${amount} ${currency}
For: ${tier.charAt(0).toUpperCase() + tier.slice(1)} ${billingCycle}
Reason: ${reason}
Attempt: ${attemptCount}

WHAT HAPPENS NEXT:
- Your subscription remains active for now
- We'll automatically retry payment ${nextRetryDate ? `on ${new Date(nextRetryDate).toLocaleDateString()}` : 'soon'}
- You can update your payment method anytime

To avoid any interruption to your service, please update your payment information:
${process.env.APP_URL || 'https://docbearscomfort.kitchen'}/account/billing

If you need assistance, please contact our support team.

© ${currentYear} Doc Bear's Comfort Kitchen. All rights reserved.
        `;

        // Send email using your existing email service
        const { default: emailService } = await import('./email');
        await emailService.sendEmail(
            userEmail,
            `Payment Failed - Update Required - Doc Bear's Comfort Kitchen`,
            html,
            text
        );

        console.log(`✅ Payment failed email sent to ${userEmail}`);
        return { success: true };

    } catch (error) {
        console.error('❌ Error sending payment failed email:', error);
        throw error;
    }
}

// 4. Trial ending notification email
export async function sendTrialEndingEmail(userData) {
    try {
        const {
            userEmail,
            userName,
            daysRemaining,
            trialEndDate,
            currentTier = 'platinum'
        } = userData;

        const currentYear = new Date().getFullYear();
        const endDate = new Date(trialEndDate).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Trial Ending Soon - Doc Bear's Comfort Kitchen</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            line-height: 1.6;
            color: #333333;
            background-color: #f8fafc;
        }
        .email-container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
        }
        .header {
            background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
            padding: 40px 30px;
            text-align: center;
        }
        .logo {
            font-size: 28px;
            font-weight: bold;
            color: #ffffff;
            margin-bottom: 8px;
        }
        .content {
            padding: 40px 30px;
        }
        .trial-card {
            background: #faf5ff;
            border: 2px solid #8b5cf6;
            border-radius: 12px;
            padding: 25px;
            margin: 25px 0;
            text-align: center;
        }
        .countdown {
            font-size: 32px;
            font-weight: bold;
            color: #7c3aed;
            margin: 10px 0;
        }
        .subscribe-button {
            display: inline-block;
            padding: 16px 32px;
            background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
            color: #ffffff;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            font-size: 16px;
            margin: 20px 0;
        }
        .footer {
            background-color: #f7fafc;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e2e8f0;
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <div class="logo">🐻 Doc Bear's Comfort Kitchen</div>
            <p style="color: #e9d5ff; margin: 0;">Your Trial is Ending Soon</p>
        </div>
        
        <div class="content">
            <h1 style="text-align: center; color: #1a202c;">⏰ Trial Ending Soon</h1>
            
            <p>Hello ${userName},</p>
            
            <p>Your 7-day ${currentTier.charAt(0).toUpperCase() + currentTier.slice(1)} trial is coming to an end soon!</p>
            
            <div class="trial-card">
                <h3 style="color: #7c3aed; margin: 0 0 15px 0;">Trial Ending In</h3>
                <div class="countdown">${daysRemaining} Day${daysRemaining !== 1 ? 's' : ''}</div>
                <p style="color: #7c3aed; margin: 5px 0;">Trial ends on ${endDate}</p>
            </div>
            
            <div style="background: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <h4 style="color: #0c4a6e; margin: 0 0 15px 0;">🌟 Don't lose access to your premium features:</h4>
                <ul style="color: #0c4a6e; margin: 0; padding-left: 20px; font-size: 14px;">
                    <li>Unlimited inventory items and recipes</li>
                    <li>Advanced meal planning tools</li>
                    <li>Unlimited scanning and email sharing</li>
                    <li>Recipe collections and organization</li>
                    <li>Priority customer support</li>
                </ul>
            </div>
            
            <div style="text-align: center;">
                <a href="${process.env.APP_URL || 'https://docbearscomfort.kitchen'}/pricing" class="subscribe-button">
                    Continue with ${currentTier.charAt(0).toUpperCase() + currentTier.slice(1)}
                </a>
            </div>
            
            <p style="text-align: center; color: #6b7280; font-size: 14px;">
                If you don't subscribe by ${endDate}, your account will revert to the free plan.
            </p>
            
            <p>Thank you for trying Doc Bear's Comfort Kitchen! We hope you've enjoyed the premium experience.</p>
        </div>
        
        <div class="footer">
            <p style="color: #718096; font-size: 14px; margin: 0;">This trial reminder was sent automatically</p>
            <p style="color: #a0aec0; font-size: 12px; margin-top: 20px;">© ${currentYear} Doc Bear's Comfort Kitchen. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`;

        const text = `
Trial Ending Soon - Doc Bear's Comfort Kitchen

Hello ${userName},

Your 7-day ${currentTier.charAt(0).toUpperCase() + currentTier.slice(1)} trial is coming to an end soon!

TRIAL ENDING IN: ${daysRemaining} Day${daysRemaining !== 1 ? 's' : ''}
Trial ends on: ${endDate}

Don't lose access to your premium features:
- Unlimited inventory items and recipes
- Advanced meal planning tools
- Unlimited scanning and email sharing
- Recipe collections and organization
- Priority customer support

Continue with ${currentTier.charAt(0).toUpperCase() + currentTier.slice(1)}: ${process.env.APP_URL || 'https://docbearscomfort.kitchen'}/pricing

If you don't subscribe by ${endDate}, your account will revert to the free plan.

Thank you for trying Doc Bear's Comfort Kitchen! We hope you've enjoyed the premium experience.

© ${currentYear} Doc Bear's Comfort Kitchen. All rights reserved.
        `;

        // Send email using your existing email service
        const { default: emailService } = await import('./email');
        await emailService.sendEmail(
            userEmail,
            `Trial Ending in ${daysRemaining} Day${daysRemaining !== 1 ? 's' : ''} - Doc Bear's Comfort Kitchen`,
            html,
            text
        );

        console.log(`✅ Trial ending email sent to ${userEmail}`);
        return { success: true };

    } catch (error) {
        console.error('❌ Error sending trial ending email:', error);
        throw error;
    }
}

// 5. Cancellation confirmation email
export async function sendCancellationConfirmationEmail(userData) {
    try {
        const {
            userEmail,
            userName,
            tier,
            billingCycle,
            accessUntilDate,
            cancellationReason = null
        } = userData;

        const currentYear = new Date().getFullYear();
        const cancellationDate = new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        const accessUntil = new Date(accessUntilDate).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Subscription Cancelled - Doc Bear's Comfort Kitchen</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            line-height: 1.6;
            color: #333333;
            background-color: #f8fafc;
        }
        .email-container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
        }
        .header {
            background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%);
            padding: 40px 30px;
            text-align: center;
        }
        .logo {
            font-size: 28px;
            font-weight: bold;
            color: #ffffff;
            margin-bottom: 8px;
        }
        .content {
            padding: 40px 30px;
        }
        .cancellation-card {
            background: #f9fafb;
            border: 2px solid #9ca3af;
            border-radius: 12px;
            padding: 25px;
            margin: 25px 0;
            text-align: center;
        }
        .footer {
            background-color: #f7fafc;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e2e8f0;
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <div class="logo">🐻 Doc Bear's Comfort Kitchen</div>
            <p style="color: #d1d5db; margin: 0;">Subscription Cancelled</p>
        </div>
        
        <div class="content">
            <h1 style="text-align: center; color: #1a202c;">📋 Subscription Cancelled</h1>
            
            <p>Hello ${userName},</p>
            
            <p>We've successfully processed your cancellation request for your Doc Bear's Comfort Kitchen subscription.</p>
            
            <div class="cancellation-card">
                <h3 style="color: #4b5563; margin: 0 0 15px 0;">Cancellation Confirmed</h3>
                <p style="color: #6b7280; margin: 5px 0;">
                    ${tier.charAt(0).toUpperCase() + tier.slice(1)} ${billingCycle} subscription
                </p>
                <p style="color: #6b7280; font-size: 14px;">Cancelled on ${cancellationDate}</p>
            </div>
            
            <div style="background: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <h4 style="color: #0c4a6e; margin: 0 0 15px 0;">📅 Important Information</h4>
                <ul style="color: #0c4a6e; margin: 0; padding-left: 20px; font-size: 14px;">
                    <li><strong>You'll retain access until:</strong> ${accessUntil}</li>
                    <li>No further charges will occur after this date</li>
                    <li>Your account will revert to the free plan</li>
                    <li>All your data will be preserved</li>
                    <li>You can resubscribe anytime</li>
                </ul>
            </div>
            
            ${cancellationReason ? `
            <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 15px; margin: 20px 0; font-size: 14px;">
                <strong>Reason for cancellation:</strong> ${cancellationReason}
            </div>
            ` : ''}
            
            <p>We're sorry to see you go! If you have any feedback about your experience or suggestions for improvement, we'd love to hear from you.</p>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.APP_URL || 'https://docbearscomfort.kitchen'}/dashboard" 
                   style="display: inline-block; padding: 14px 28px; background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600;">
                    Continue to Dashboard
                </a>
            </div>
            
            <p>Thank you for being part of the Doc Bear's Comfort Kitchen community. You're always welcome back!</p>
        </div>
        
        <div class="footer">
            <p style="color: #718096; font-size: 14px; margin: 0;">This cancellation confirmation was sent automatically</p>
            <p style="color: #a0aec0; font-size: 12px; margin-top: 20px;">© ${currentYear} Doc Bear's Comfort Kitchen. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`;

        const text = `
Subscription Cancelled - Doc Bear's Comfort Kitchen

Hello ${userName},

We've successfully processed your cancellation request for your Doc Bear's Comfort Kitchen subscription.

CANCELLATION CONFIRMED
${tier.charAt(0).toUpperCase() + tier.slice(1)} ${billingCycle} subscription
Cancelled on: ${cancellationDate}

IMPORTANT INFORMATION:
- You'll retain access until: ${accessUntil}
- No further charges will occur after this date
- Your account will revert to the free plan
- All your data will be preserved
- You can resubscribe anytime

${cancellationReason ? `Reason for cancellation: ${cancellationReason}

` : ''}We're sorry to see you go! If you have any feedback about your experience or suggestions for improvement, we'd love to hear from you.

Continue to your dashboard: ${process.env.APP_URL || 'https://docbearscomfort.kitchen'}/dashboard

Thank you for being part of the Doc Bear's Comfort Kitchen community. You're always welcome back!

© ${currentYear} Doc Bear's Comfort Kitchen. All rights reserved.
        `;

        // Send email using your existing email service
        const { default: emailService } = await import('./email');
        await emailService.sendEmail(
            userEmail,
            `Subscription Cancelled - Doc Bear's Comfort Kitchen`,
            html,
            text
        );

        console.log(`✅ Cancellation confirmation email sent to ${userEmail}`);
        return { success: true };

    } catch (error) {
        console.error('❌ Error sending cancellation confirmation email:', error);
        throw error;
    }
}

// 6. Analytics tracking function (for email events)
export async function trackEmailEvent(eventData) {
    try {
        const {
            eventType, // 'email_sent', 'email_opened', 'email_clicked', 'email_bounced'
            userEmail,
            userId,
            emailType, // 'welcome', 'payment_confirmation', 'trial_ending', etc.
            metadata = {}
        } = eventData;

        console.log(`📊 Tracking email event: ${eventType} for ${emailType} to ${userEmail}`);

        // You can implement analytics tracking here
        // For example, sending to your analytics service

        const analyticsPayload = {
            event: eventType,
            properties: {
                email_type: emailType,
                user_email: userEmail,
                user_id: userId,
                timestamp: new Date().toISOString(),
                ...metadata
            }
        };

        // Example: Send to analytics service (implement based on your analytics provider)
        // await sendToAnalytics(analyticsPayload);

        // For now, just log it
        console.log('📊 Email analytics event:', JSON.stringify(analyticsPayload, null, 2));

        return { success: true, tracked: true };

    } catch (error) {
        console.error('❌ Error tracking email event:', error);
        // Don't throw - analytics failures shouldn't break email sending
        return { success: false, error: error.message };
    }
}

// 7. Helper function to integrate TODOs into webhook handlers
export async function handleWebhookEmailNotifications(webhookEvent) {
    try {
        const { type, data } = webhookEvent;

        switch (type) {
            case 'subscription.created':
            case 'checkout.session.completed':
                // Send welcome email for new subscriptions
                await sendWelcomeEmail({
                    userEmail: data.customer_email,
                    userName: data.customer_name || 'there',
                    tier: data.subscription_tier,
                    billingCycle: data.billing_cycle,
                    isNewUser: data.is_new_customer
                });
                break;

            case 'invoice.payment_succeeded':
                // Send payment confirmation
                await sendPaymentConfirmationEmail({
                    userEmail: data.customer_email,
                    userName: data.customer_name || 'there',
                    amount: (data.amount_paid / 100).toFixed(2),
                    currency: data.currency.toUpperCase(),
                    invoiceId: data.invoice_id,
                    tier: data.subscription_tier,
                    billingCycle: data.billing_cycle,
                    nextBillingDate: data.next_payment_attempt,
                    paymentMethod: data.payment_method_type
                });
                break;

            case 'invoice.payment_failed':
                // Send payment failed notification
                await sendPaymentFailedEmail({
                    userEmail: data.customer_email,
                    userName: data.customer_name || 'there',
                    amount: (data.amount_due / 100).toFixed(2),
                    currency: data.currency.toUpperCase(),
                    attemptCount: data.attempt_count,
                    nextRetryDate: data.next_payment_attempt,
                    tier: data.subscription_tier,
                    billingCycle: data.billing_cycle,
                    reason: data.failure_reason || 'Payment declined'
                });
                break;

            case 'customer.subscription.trial_will_end':
                // Send trial ending notification
                await sendTrialEndingEmail({
                    userEmail: data.customer_email,
                    userName: data.customer_name || 'there',
                    daysRemaining: data.days_until_trial_end,
                    trialEndDate: data.trial_end,
                    currentTier: data.subscription_tier
                });
                break;

            case 'customer.subscription.deleted':
                // Send cancellation confirmation
                await sendCancellationConfirmationEmail({
                    userEmail: data.customer_email,
                    userName: data.customer_name || 'there',
                    tier: data.subscription_tier,
                    billingCycle: data.billing_cycle,
                    accessUntilDate: data.current_period_end,
                    cancellationReason: data.cancellation_reason
                });
                break;

            default:
                console.log(`ℹ️ No email handler for webhook type: ${type}`);
        }

        // Track the email event
        await trackEmailEvent({
            eventType: 'email_sent',
            userEmail: data.customer_email,
            userId: data.customer_id,
            emailType: type.replace('.', '_'),
            metadata: { webhook_type: type }
        });

    } catch (error) {
        console.error('❌ Error handling webhook email notifications:', error);
        // Don't throw - email failures shouldn't break webhook processing
    }
}

// 8. Email queue processing (for handling email sending in background)
export async function processEmailQueue() {
    try {
        // This would integrate with your queue system (Redis, Bull, etc.)
        // For now, just a placeholder implementation

        console.log('📧 Processing email queue...');

        // Example queue processing logic:
        // const emailJobs = await getEmailJobsFromQueue();
        // for (const job of emailJobs) {
        //     try {
        //         await sendEmail(job);
        //         await markJobComplete(job.id);
        //     } catch (error) {
        //         await markJobFailed(job.id, error);
        //     }
        // }

        return { success: true, processed: 0 };

    } catch (error) {
        console.error('❌ Error processing email queue:', error);
        throw error;
    }
}