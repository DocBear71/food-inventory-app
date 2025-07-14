// file: src/app/api/feedback/submit/route.js v2 - Fixed API route for feedback submission

import {NextResponse} from 'next/server';
import { auth } from '@/lib/auth';
import emailService from '@/lib/email';

// Move template functions outside and before the POST function
function createFeedbackEmailTemplate(feedbackData) {
    const currentYear = new Date().getFullYear();
    const submissionTime = new Date(feedbackData.timestamp).toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short'
    });

    const feedbackTypeLabels = {
        'feature-request': '💡 Feature Request',
        'bug-report': '🐛 Bug Report',
        'general-feedback': '💬 General Feedback',
        'user-experience': '🎨 User Experience',
        'performance': '⚡ Performance',
        'recipe-feedback': '👨‍🍳 Recipe Feedback',
        'inventory-feedback': '📦 Inventory Features',
        'other': '📝 Other'
    };

    const ratingLabels = {
        '5': '⭐⭐⭐⭐⭐ Excellent',
        '4': '⭐⭐⭐⭐ Good',
        '3': '⭐⭐⭐ Okay',
        '2': '⭐⭐ Poor',
        '1': '⭐ Very Poor'
    };

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Feedback - Doc Bear's Comfort Kitchen</title>
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
            background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
            padding: 40px 30px;
            text-align: center;
        }
        
        .logo {
            font-size: 28px;
            font-weight: bold;
            color: #ffffff;
            margin-bottom: 8px;
        }
        
        .header-subtitle {
            color: #fecaca;
            font-size: 16px;
            margin: 0;
        }
        
        .content {
            padding: 40px 30px;
        }
        
        .feedback-details {
            background: #f8fafc;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
        }
        
        .detail-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 0;
            border-bottom: 1px solid #e2e8f0;
        }
        
        .detail-row:last-child {
            border-bottom: none;
        }
        
        .detail-label {
            font-weight: 500;
            color: #4a5568;
        }
        
        .detail-value {
            font-weight: 600;
            color: #1a202c;
        }
        
        .message-section {
            background: #f0f9ff;
            border: 1px solid #0ea5e9;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
        }
        
        .footer {
            background-color: #f7fafc;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e2e8f0;
        }
        
        .footer p {
            margin: 0 0 10px 0;
            color: #718096;
            font-size: 14px;
        }
        
        .footer .copyright {
            font-size: 12px;
            color: #a0aec0;
            margin-top: 20px;
        }
        
        @media only screen and (max-width: 600px) {
            .content, .header, .footer {
                padding: 25px 20px !important;
            }
            
            .detail-row {
                flex-direction: column;
                align-items: flex-start;
            }
            
            .detail-value {
                margin-top: 5px;
            }
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <div class="logo">🐻 Doc Bear's Comfort Kitchen</div>
            <p class="header-subtitle">New User Feedback</p>
        </div>
        
        <div class="content">
            <h2 style="color: #1f2937; margin: 0 0 20px 0;">📬 New Feedback Received</h2>
            
            <div class="feedback-details">
                <div class="detail-row">
                    <span class="detail-label">Type:</span>
                    <span class="detail-value">${feedbackTypeLabels[feedbackData.feedbackType] || feedbackData.feedbackType}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Subject:</span>
                    <span class="detail-value">${feedbackData.subject}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">From:</span>
                    <span class="detail-value">${feedbackData.anonymous ? 'Anonymous User' : `${feedbackData.name} (${feedbackData.email})`}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">User Tier:</span>
                    <span class="detail-value">${feedbackData.userTier || 'Unknown'}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Submitted:</span>
                    <span class="detail-value">${submissionTime}</span>
                </div>
                ${feedbackData.rating ? `
                <div class="detail-row">
                    <span class="detail-label">Rating:</span>
                    <span class="detail-value">${ratingLabels[feedbackData.rating] || feedbackData.rating}</span>
                </div>
                ` : ''}
            </div>
            
            <div class="message-section">
                <h3 style="color: #0c4a6e; margin: 0 0 15px 0;">💬 Message:</h3>
                <div style="color: #0c4a6e; white-space: pre-wrap; word-wrap: break-word;">
                    ${feedbackData.message}
                </div>
            </div>
            
            <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
                This feedback was submitted through the Doc Bear's Comfort Kitchen feedback system.
            </p>
        </div>
        
        <div class="footer">
            <p>This feedback notification was sent from Doc Bear's Comfort Kitchen</p>
            <p class="copyright">© ${currentYear} Doc Bear's Comfort Kitchen. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`;

    const text = `
New User Feedback - Doc Bear's Comfort Kitchen

📬 New Feedback Received

Type: ${feedbackTypeLabels[feedbackData.feedbackType] || feedbackData.feedbackType}
Subject: ${feedbackData.subject}
From: ${feedbackData.anonymous ? 'Anonymous User' : `${feedbackData.name} (${feedbackData.email})`}
User Tier: ${feedbackData.userTier || 'Unknown'}
Submitted: ${submissionTime}
${feedbackData.rating ? `Rating: ${ratingLabels[feedbackData.rating] || feedbackData.rating}` : ''}

MESSAGE:
${feedbackData.message}

This feedback was submitted through the Doc Bear's Comfort Kitchen feedback system.

© ${currentYear} Doc Bear's Comfort Kitchen. All rights reserved.
    `;

    return { html, text };
}

function createFeedbackConfirmationTemplate() {
    const currentYear = new Date().getFullYear();

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Thank You for Your Feedback - Doc Bear's Comfort Kitchen</title>
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
        
        .header-subtitle {
            color: #fef3c7;
            font-size: 16px;
            margin: 0;
        }
        
        .content {
            padding: 40px 30px;
        }
        
        .thank-you-icon {
            text-align: center;
            font-size: 48px;
            margin-bottom: 20px;
        }
        
        .footer {
            background-color: #f7fafc;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e2e8f0;
        }
        
        .footer p {
            margin: 0 0 10px 0;
            color: #718096;
            font-size: 14px;
        }
        
        .footer .copyright {
            font-size: 12px;
            color: #a0aec0;
            margin-top: 20px;
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <div class="logo">🐻 Doc Bear's Comfort Kitchen</div>
            <p class="header-subtitle">Thank You for Your Feedback!</p>
        </div>
        
        <div class="content">
            <div class="thank-you-icon">🙏</div>
            
            <h2 style="color: #1f2937; text-align: center; margin: 0 0 20px 0;">Your Feedback Matters!</h2>
            
            <p>Thank you for taking the time to share your feedback with the Doc Bear's Comfort Kitchen team. Your input is invaluable in helping us create the best possible experience for our users.</p>
            
            <div style="background: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <h3 style="color: #0c4a6e; margin: 0 0 10px 0;">How we use your feedback:</h3>
                <ul style="color: #0c4a6e; margin: 10px 0; padding-left: 20px;">
                    <li><strong>Product Development:</strong> Your suggestions directly influence our feature roadmap</li>
                    <li><strong>Bug Fixes:</strong> Issue reports help us identify and resolve problems quickly</li>
                    <li><strong>User Experience:</strong> Design feedback helps us create more intuitive interfaces</li>
                    <li><strong>Community Building:</strong> Your ideas help shape our community features</li>
                </ul>
            </div>
            
            <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <h3 style="color: #92400e; margin: 0 0 10px 0;">💡 Want to stay involved?</h3>
                <p style="color: #92400e; margin: 0;">
                    Follow our development progress, join our community discussions, and be the first to try new features by staying connected with us through our app and social channels.
                </p>
            </div>
            
            <p>If you have any follow-up thoughts or additional feedback, feel free to reply to this email or submit another feedback form anytime.</p>
            
            <p>Thank you for being part of the Doc Bear's Comfort Kitchen family!</p>
            
            <p style="margin-top: 30px;">
                Best regards,<br>
                <em>The Doc Bear's Comfort Kitchen Team</em>
            </p>
        </div>
        
        <div class="footer">
            <p>This confirmation was sent from Doc Bear's Comfort Kitchen</p>
            <p>Continue exploring features in your <a href="${process.env.APP_URL || 'https://docbearscomfort.kitchen'}/account" style="color: #4f46e5;">account dashboard</a></p>
            <p class="copyright">© ${currentYear} Doc Bear's Comfort Kitchen. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`;

    const text = `
Thank You for Your Feedback! - Doc Bear's Comfort Kitchen

🙏 Your Feedback Matters!

Thank you for taking the time to share your feedback with the Doc Bear's Comfort Kitchen team. Your input is invaluable in helping us create the best possible experience for our users.

How we use your feedback:
• Product Development: Your suggestions directly influence our feature roadmap
• Bug Fixes: Issue reports help us identify and resolve problems quickly
• User Experience: Design feedback helps us create more intuitive interfaces
• Community Building: Your ideas help shape our community features

💡 Want to stay involved?
Follow our development progress, join our community discussions, and be the first to try new features by staying connected with us through our app and social channels.

If you have any follow-up thoughts or additional feedback, feel free to reply to this email or submit another feedback form anytime.

Thank you for being part of the Doc Bear's Comfort Kitchen family!

Best regards,
The Doc Bear's Comfort Kitchen Team

Continue exploring features in your account dashboard: ${process.env.APP_URL || 'https://docbearscomfort.kitchen'}/account

© ${currentYear} Doc Bear's Comfort Kitchen. All rights reserved.
    `;

    return { html, text };
}

export async function POST(request) {
    try {
        const session = await auth();
        const body = await request.json();

        const {
            name,
            email,
            feedbackType,
            subject,
            message,
            rating,
            anonymous,
            userTier,
            userId,
            timestamp
        } = body;

        // Validate required fields
        if (!feedbackType || !subject || !message) {
            return NextResponse.json(
                {error: 'Missing required fields'},
                {status: 400}
            );
        }

        if (!anonymous && (!name || !email)) {
            return NextResponse.json(
                {error: 'Name and email are required for non-anonymous feedback'},
                {status: 400}
            );
        }

        // Validate email format if provided
        if (!anonymous && email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                return NextResponse.json(
                    {error: 'Invalid email format'},
                    {status: 400}
                );
            }
        }

        // Create feedback data object
        const feedbackData = {
            name,
            email,
            feedbackType,
            subject,
            message,
            rating,
            anonymous,
            userTier,
            userId,
            timestamp
        };

        // Send feedback email to team
        const emailTemplate = createFeedbackEmailTemplate(feedbackData);

        await emailService.sendEmail(
            'privacy@docbearscomfort.kitchen',
            `[FEEDBACK] ${feedbackType.toUpperCase()}: ${subject}`,
            emailTemplate.html,
            emailTemplate.text
        );

        // Send confirmation email to user (only if not anonymous)
        if (!anonymous && email) {
            const confirmationTemplate = createFeedbackConfirmationTemplate();
            await emailService.sendEmail(
                email,
                'Feedback Received - Thank You! - Doc Bear\'s Comfort Kitchen',
                confirmationTemplate.html,
                confirmationTemplate.text
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Feedback submitted successfully',
            anonymous: anonymous
        });

    } catch (error) {
        console.error('Feedback submission error:', error);
        return NextResponse.json(
            { error: 'Failed to submit feedback. Please try again.' },
            { status: 500 }
        );
    }
}