// file: /src/app/api/email/send-shopping-list/route.js v1

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import { User, EmailLog } from '@/lib/models';
import { sendShoppingListEmail, validateEmails } from '@/lib/email';

export async function POST(request) {
    try {
        console.log('=== Email Shopping List API v1 ===');

        // Check authentication
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const {
            recipients,           // Array of email addresses
            personalMessage,      // Optional personal message
            shoppingList,        // Shopping list data
            context,             // 'recipe', 'recipes', 'meal-plan'
            contextName          // Recipe name or meal plan name
        } = await request.json();

        console.log('Email request:', {
            recipientCount: recipients?.length,
            context,
            contextName,
            hasShoppingList: !!shoppingList,
            hasPersonalMessage: !!personalMessage
        });

        // Validation
        if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
            return NextResponse.json({
                error: 'At least one recipient email is required'
            }, { status: 400 });
        }

        if (recipients.length > 10) {
            return NextResponse.json({
                error: 'Maximum 10 recipients allowed per email'
            }, { status: 400 });
        }

        // Clean and validate email addresses
        const cleanedEmails = recipients
            .map(email => email.trim().toLowerCase())
            .filter(email => email.length > 0);

        if (!validateEmails(cleanedEmails)) {
            return NextResponse.json({
                error: 'One or more email addresses are invalid'
            }, { status: 400 });
        }

        if (!shoppingList) {
            return NextResponse.json({
                error: 'Shopping list data is required'
            }, { status: 400 });
        }

        // Get user info
        await connectDB();
        const user = await User.findById(session.user.id);
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Rate limiting check (max 20 emails per hour per user)
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const recentEmailCount = await EmailLog.countDocuments({
            userId: session.user.id,
            sentAt: { $gte: oneHourAgo }
        });

        if (recentEmailCount >= 20) {
            return NextResponse.json({
                error: 'Rate limit exceeded. Maximum 20 emails per hour.'
            }, { status: 429 });
        }

        console.log('Sending email with details:', {
            senderName: user.name,
            senderEmail: user.email,
            recipientCount: cleanedEmails.length,
            context,
            contextName
        });

        // Send email
        const emailResult = await sendShoppingListEmail({
            toEmails: cleanedEmails,
            senderName: user.name,
            senderEmail: user.email,
            shoppingList,
            personalMessage: personalMessage || '',
            context: context || 'recipes',
            contextName: contextName || 'Selected Recipes'
        });

        console.log('Email sent successfully:', emailResult);

        // Log the email
        const emailLog = new EmailLog({
            userId: session.user.id,
            recipients: cleanedEmails.map(email => ({ email, name: email })),
            subject: `🛒 Shopping List from ${user.name}${contextName ? ` - ${contextName}` : ''}`,
            emailType: 'shopping-list',
            content: {
                personalMessage: personalMessage || '',
                contextName: contextName || '',
                // Note: Not storing full shopping list to save space
            },
            messageId: emailResult.messageId,
            status: 'sent'
        });

        await emailLog.save();

        return NextResponse.json({
            success: true,
            message: `Shopping list sent successfully to ${cleanedEmails.length} recipient${cleanedEmails.length > 1 ? 's' : ''}`,
            emailId: emailLog._id,
            recipientCount: cleanedEmails.length,
            messageId: emailResult.messageId
        });

    } catch (error) {
        console.error('Email sending error:', error);

        // Log failed email attempt
        try {
            const session = await getServerSession(authOptions);
            if (session?.user?.id) {
                const failedLog = new EmailLog({
                    userId: session.user.id,
                    recipients: [],
                    subject: 'Failed Email Attempt',
                    emailType: 'shopping-list',
                    status: 'failed',
                    error: error.message
                });
                await failedLog.save();
            }
        } catch (logError) {
            console.error('Failed to log email error:', logError);
        }

        return NextResponse.json({
            error: error.message || 'Failed to send email',
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }, { status: 500 });
    }
}