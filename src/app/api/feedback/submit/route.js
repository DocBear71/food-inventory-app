// file: src/app/api/feedback/submit/route.js v1 - API route for feedback submission

import {NextResponse} from 'next/server';
import {getServerSession} from 'next-auth';
import {authOptions} from '@/lib/auth';
import emailService from '@/lib/email';

export async function POST(request) {
    try {
        const session = await getServerSession(authOptions);
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

        // Create feedback email template
        const createFeedbackEmailTemplate = () => {
            const currentYear = new Date().getFullYear();
            const submissionTime = new Date(timestamp).toLocaleString('en-US', {
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
    <title>User Feedback - Doc Bear's Comfort Kitchen</title>
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

    return {html, text};
}
        // Send feedback email to team
        const emailTemplate = createFeedbackEmailTemplate();

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

// Confirmation email template for user (non-anonymous feedback)
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