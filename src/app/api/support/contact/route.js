// file: src/app/api/support/contact/route.js v1 - API route for contact support

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
// authOptions no longer needed in NextAuth v5
import emailService from '@/lib/email';

export async function POST(request) {
    try {
        const session = await auth();
        const body = await request.json();

        const {
            name,
            email,
            subject,
            category,
            priority,
            message,
            userTier,
            timestamp
        } = body;

        // Validate required fields
        if (!name || !email || !subject || !message || !category) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return NextResponse.json(
                { error: 'Invalid email format' },
                { status: 400 }
            );
        }

        // Determine priority level and response time
        const getPriorityInfo = (tier, priority) => {
            if (tier === 'platinum' && priority === 'urgent') {
                return { level: 'URGENT', responseTime: '2-4 hours', color: '#dc2626' };
            } else if (tier === 'platinum' && priority === 'high') {
                return { level: 'HIGH', responseTime: '2-4 hours', color: '#ea580c' };
            } else if (tier === 'gold' && priority === 'high') {
                return { level: 'HIGH', responseTime: '4-8 hours', color: '#d97706' };
            } else if (priority === 'normal') {
                return { level: 'NORMAL', responseTime: '24-48 hours', color: '#059669' };
            } else {
                return { level: 'LOW', responseTime: '48-72 hours', color: '#6b7280' };
            }
        };

        const priorityInfo = getPriorityInfo(userTier, priority);

        // Create support ticket email template
        const createSupportEmailTemplate = () => {
            const currentYear = new Date().getFullYear();
            const requestTime = new Date(timestamp).toLocaleString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                timeZoneName: 'short'
            });

            const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Support Request - Doc Bear's Comfort Kitchen</title>
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
            background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
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
            color: #dbeafe;
            font-size: 16px;
            margin: 0;
        }
        
        .content {
            padding: 40px 30px;
        }
        
        .priority-badge {
            display: inline-block;
            padding: 8px 16px;
            border-radius: 20px;
            font-weight: 600;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 20px;
            background-color: ${priorityInfo.color};
            color: white;
        }
        
        .info-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin: 20px 0;
        }
        
        .info-item {
            background: #f8fafc;
            padding: 15px;
            border-radius: 8px;
            border-left: 4px solid #3b82f6;
        }
        
        .info-label {
            font-weight: 600;
            color: #374151;
            font-size: 14px;
            margin-bottom: 5px;
        }
        
        .info-value {
            color: #6b7280;
            font-size: 14px;
        }
        
        .message-section {
            background: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
        }
        
        .message-section h3 {
            margin: 0 0 15px 0;
            color: #374151;
            font-size: 18px;
        }
        
        .message-content {
            white-space: pre-wrap;
            line-height: 1.6;
            color: #4b5563;
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
            <p class="header-subtitle">Support Request Received</p>
        </div>
        
        <div class="content">
            <div class="priority-badge">
                ${priorityInfo.level} Priority - Response Expected: ${priorityInfo.responseTime}
            </div>
            
            <h2 style="color: #1f2937; margin: 0 0 20px 0;">New Support Request</h2>
            
            <div class="info-grid">
                <div class="info-item">
                    <div class="info-label">Customer Name</div>
                    <div class="info-value">${name}</div>
                </div>
                
                <div class="info-item">
                    <div class="info-label">Email Address</div>
                    <div class="info-value">${email}</div>
                </div>
                
                <div class="info-item">
                    <div class="info-label">Subscription Tier</div>
                    <div class="info-value">${userTier ? userTier.charAt(0).toUpperCase() + userTier.slice(1) : 'Free'}</div>
                </div>
                
                <div class="info-item">
                    <div class="info-label">Category</div>
                    <div class="info-value">${category.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}</div>
                </div>
                
                <div class="info-item">
                    <div class="info-label">Priority Level</div>
                    <div class="info-value">${priorityInfo.level}</div>
                </div>
                
                <div class="info-item">
                    <div class="info-label">Request Time</div>
                    <div class="info-value">${requestTime}</div>
                </div>
            </div>
            
            <div class="info-item" style="margin: 20px 0;">
                <div class="info-label">Subject</div>
                <div class="info-value" style="font-size: 16px; font-weight: 500; color: #374151;">${subject}</div>
            </div>
            
            <div class="message-section">
                <h3>Customer Message</h3>
                <div class="message-content">${message}</div>
            </div>
            
            ${session?.user ? `
            <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 15px; margin: 20px 0;">
                <h4 style="margin: 0 0 10px 0; color: #1e40af;">User Account Information</h4>
                <p style="margin: 0; font-size: 14px; color: #3730a3;">
                    <strong>User ID:</strong> ${session.user.id}<br>
                    <strong>Registered Email:</strong> ${session.user.email}<br>
                    <strong>Account Created:</strong> ${session.user.createdAt ? new Date(session.user.createdAt).toLocaleDateString() : 'Unknown'}
                </p>
            </div>
            ` : ''}
        </div>
        
        <div class="footer">
            <p><strong>Action Required:</strong> Please respond to this support request within ${priorityInfo.responseTime}</p>
            <p>Reply directly to this email to respond to the customer: ${email}</p>
            <p class="copyright">© ${currentYear} Doc Bear's Comfort Kitchen. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`;

            const text = `
Support Request - Doc Bear's Comfort Kitchen

Priority: ${priorityInfo.level} (Response Expected: ${priorityInfo.responseTime})

Customer Information:
- Name: ${name}
- Email: ${email}
- Subscription: ${userTier ? userTier.charAt(0).toUpperCase() + userTier.slice(1) : 'Free'}
- Category: ${category.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
- Request Time: ${requestTime}

Subject: ${subject}

Message:
${message}

${session?.user ? `
User Account Information:
- User ID: ${session.user.id}
- Registered Email: ${session.user.email}
- Account Created: ${session.user.createdAt ? new Date(session.user.createdAt).toLocaleDateString() : 'Unknown'}
` : ''}

Action Required: Please respond to this support request within ${priorityInfo.responseTime}
Reply directly to this email to respond to the customer: ${email}

© ${currentYear} Doc Bear's Comfort Kitchen. All rights reserved.
            `;

            return { html, text };
        };

        // Send support email
        const emailTemplate = createSupportEmailTemplate();

        await emailService.sendEmail(
            'privacy@docbearscomfort.kitchen',
            `[${priorityInfo.level}] Support Request: ${subject}`,
            emailTemplate.html,
            emailTemplate.text
        );

        // Send confirmation email to user
        const confirmationTemplate = createConfirmationEmailTemplate();
        await emailService.sendEmail(
            email,
            'Support Request Received - Doc Bear\'s Comfort Kitchen',
            confirmationTemplate.html,
            confirmationTemplate.text
        );

        return NextResponse.json({
            success: true,
            message: 'Support request submitted successfully',
            expectedResponse: priorityInfo.responseTime
        });

    } catch (error) {
        console.error('Support request error:', error);
        return NextResponse.json(
            { error: 'Failed to submit support request. Please try again.' },
            { status: 500 }
        );
    }
}

// Confirmation email template for user
function createConfirmationEmailTemplate() {
    const currentYear = new Date().getFullYear();

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Support Request Received - Doc Bear's Comfort Kitchen</title>
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
        
        .header-subtitle {
            color: #d1fae5;
            font-size: 16px;
            margin: 0;
        }
        
        .content {
            padding: 40px 30px;
        }
        
        .success-icon {
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
            <p class="header-subtitle">Support Request Confirmation</p>
        </div>
        
        <div class="content">
            <div class="success-icon">✅</div>
            
            <h2 style="color: #1f2937; text-align: center; margin: 0 0 20px 0;">We've Received Your Support Request!</h2>
            
            <p>Thank you for contacting Doc Bear's Comfort Kitchen support. We've successfully received your request and our team will review it promptly.</p>
            
            <div style="background: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <h3 style="color: #0c4a6e; margin: 0 0 10px 0;">What happens next?</h3>
                <ul style="color: #0c4a6e; margin: 10px 0; padding-left: 20px;">
                    <li>Our support team will review your request</li>
                    <li>We'll respond within the timeframe based on your subscription tier</li>
                    <li>You'll receive a detailed response via email</li>
                    <li>If needed, we may follow up with additional questions</li>
                </ul>
            </div>
            
            <p>In the meantime, you might find answers to common questions in our <a href="${process.env.APP_URL || 'https://docbearscomfort.kitchen'}/help" style="color: #3b82f6;">Help Center</a>.</p>
            
            <p>If you have any additional information that might help us resolve your issue faster, simply reply to this email.</p>
            
            <p>Thank you for using Doc Bear's Comfort Kitchen!</p>
        </div>
        
        <div class="footer">
            <p>This confirmation was sent from Doc Bear's Comfort Kitchen</p>
            <p>You can visit your <a href="${process.env.APP_URL || 'https://docbearscomfort.kitchen'}/account" style="color: #4f46e5;">account page</a> anytime to manage your settings</p>
            <p class="copyright">© ${currentYear} Doc Bear's Comfort Kitchen. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`;

    const text = `
Support Request Received - Doc Bear's Comfort Kitchen

✅ We've Received Your Support Request!

Thank you for contacting Doc Bear's Comfort Kitchen support. We've successfully received your request and our team will review it promptly.

What happens next?
• Our support team will review your request
• We'll respond within the timeframe based on your subscription tier
• You'll receive a detailed response via email
• If needed, we may follow up with additional questions

In the meantime, you might find answers to common questions in our Help Center: ${process.env.APP_URL || 'https://docbearscomfort.kitchen'}/help

If you have any additional information that might help us resolve your issue faster, simply reply to this email.

Thank you for using Doc Bear's Comfort Kitchen!

© ${currentYear} Doc Bear's Comfort Kitchen. All rights reserved.
    `;

    return { html, text };
}