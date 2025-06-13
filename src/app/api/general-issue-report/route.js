// file: /src/app/api/general-issue-report/route.js - General issue reporting with Resend and file attachments

import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request) {
    try {
        const formData = await request.formData();

        const issue = formData.get('issue');
        const description = formData.get('description');
        const userEmail = formData.get('email');
        const context = formData.get('context') || 'general';
        const pageUrl = formData.get('pageUrl') || 'Unknown';

        // Validate required fields
        if (!issue || !description) {
            return NextResponse.json(
                { error: 'Issue type and description are required' },
                { status: 400 }
            );
        }

        // Get user agent and other debugging info
        const userAgent = request.headers.get('user-agent') || 'Unknown';
        const timestamp = new Date().toISOString();

        // Count additional files
        const additionalFileCount = Array.from(formData.keys())
            .filter(key => key.startsWith('additionalFile_')).length;

        // Prepare email content
        const issueTypeMap = {
            'page-not-loading': '🚫 Page Not Loading',
            'feature-not-working': '⚙️ Feature Not Working',
            'data-not-saving': '💾 Data Not Saving',
            'ui-layout-broken': '🎨 Layout/Design Broken',
            'slow-performance': '🐌 Slow Performance',
            'error-message': '⚠️ Error Message',
            'login-issues': '🔐 Login/Authentication Issues',
            'mobile-issues': '📱 Mobile App Issues',
            'feature-request': '✨ Feature Request',
            'other': '🔧 Other Issue'
        };

        const issueTitle = issueTypeMap[issue] || issue;

        // Create email HTML content
        const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #dc2626;">🐛 General Issue Report</h2>
                
                <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="margin-top: 0; color: #374151;">Issue Details</h3>
                    <p><strong>Issue Type:</strong> ${issueTitle}</p>
                    <p><strong>Reported:</strong> ${timestamp}</p>
                    <p><strong>User Email:</strong> ${userEmail || 'Not provided'}</p>
                    <p><strong>Context:</strong> ${context}</p>
                    <p><strong>Page URL:</strong> <a href="${pageUrl}">${pageUrl}</a></p>
                </div>

                <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="margin-top: 0; color: #991b1b;">Description</h3>
                    <p style="white-space: pre-wrap;">${description}</p>
                </div>

                <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="margin-top: 0; color: #0c4a6e;">Technical Information</h3>
                    <p><strong>User Agent:</strong> ${userAgent}</p>
                    <p><strong>Screenshots:</strong> ${additionalFileCount > 0 ? `${additionalFileCount} files attached ✅` : 'None provided ❌'}</p>
                    <p><strong>Report Context:</strong> ${context}</p>
                    <p><strong>Total Attachments:</strong> ${additionalFileCount}</p>
                </div>

                ${additionalFileCount > 0 ? '<p><strong>Screenshots are attached to this email.</strong></p>' : ''}
                
                <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
                <p style="color: #6b7280; font-size: 14px;">
                    This report was automatically generated from your food inventory app.
                </p>
            </div>
        `;

        // Prepare attachments
        const attachments = [];

        // Add additional files
        for (let i = 0; i < additionalFileCount; i++) {
            const file = formData.get(`additionalFile_${i}`);
            if (file && file.size > 0) {
                const buffer = Buffer.from(await file.arrayBuffer());
                const fileExtension = file.name.split('.').pop() || 'jpg';
                const contentType = file.type || 'image/jpeg';

                attachments.push({
                    filename: `screenshot-${i + 1}-${Date.now()}.${fileExtension}`,
                    content: buffer,
                    contentType: contentType
                });
            }
        }

        // Send email via Resend
        const emailData = {
            from: 'Issue Reporter <noreply@yourdomain.com>', // Replace with your verified Resend domain
            to: ['your.email@example.com'], // Replace with your email address
            subject: `🐛 General Issue Report: ${issueTitle}`,
            html: emailHtml,
            ...(attachments.length > 0 && { attachments })
        };

        const { data, error } = await resend.emails.send(emailData);

        if (error) {
            console.error('Resend error:', error);
            return NextResponse.json(
                { error: 'Failed to send email report' },
                { status: 500 }
            );
        }

        console.log(`General issue report sent successfully. Email ID: ${data.id}`);

        return NextResponse.json({
            success: true,
            message: 'Issue report sent successfully',
            emailId: data.id,
            attachmentCount: attachments.length
        });

    } catch (error) {
        console.error('General issue report error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}