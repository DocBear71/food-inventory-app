// file: /src/app/api/receipt-issue-report/route.js - v2 Receipt issue reporting with Resend - Fixed variable ordering

import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request) {
    try {
        const formData = await request.formData();

        const issue = formData.get('issue');
        const description = formData.get('description');
        const userEmail = formData.get('email');
        const receiptImage = formData.get('receiptImage');

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

        // FIXED: Calculate attachment info BEFORE using it in email template
        const additionalFileCount = Array.from(formData.keys())
            .filter(key => key.startsWith('additionalFile_')).length;

        // FIXED: Prepare attachments BEFORE email template
        const attachments = [];

        // Add receipt image if available
        if (receiptImage) {
            const buffer = Buffer.from(await receiptImage.arrayBuffer());
            attachments.push({
                filename: `receipt-${Date.now()}.jpg`,
                content: buffer,
                contentType: 'image/jpeg'
            });
        }

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

        // Prepare email content
        const issueTypeMap = {
            'camera-not-working': '📷 Camera Not Working',
            'ocr-poor-accuracy': '🔍 Poor Text Recognition',
            'wrong-items-detected': '❌ Wrong Items Detected',
            'missing-items': '👻 Items Not Detected',
            'categories-wrong': '📂 Wrong Categories Assigned',
            'upc-lookup-failed': '🔍 UPC Lookup Failed',
            'app-crash': '💥 App Crashed/Froze',
            'other': '🔧 Other Issue'
        };

        const issueTitle = issueTypeMap[issue] || issue;

        // Create email HTML content (NOW with properly defined variables)
        const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #4f46e5;">🧾 Receipt Scanner Issue Report</h2>
                
                <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="margin-top: 0; color: #374151;">Issue Details</h3>
                    <p><strong>Issue Type:</strong> ${issueTitle}</p>
                    <p><strong>Reported:</strong> ${timestamp}</p>
                    <p><strong>User Email:</strong> ${userEmail || 'Not provided'}</p>
                </div>

                <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="margin-top: 0; color: #991b1b;">Description</h3>
                    <p style="white-space: pre-wrap;">${description}</p>
                </div>

                <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="margin-top: 0; color: #0c4a6e;">Technical Information</h3>
                    <p><strong>User Agent:</strong> ${userAgent}</p>
                    <p><strong>Receipt Image:</strong> ${receiptImage ? 'Attached ✅' : 'Not provided ❌'}</p>
                    <p><strong>Additional Screenshots:</strong> ${additionalFileCount > 0 ? `${additionalFileCount} files attached ✅` : 'None provided ❌'}</p>
                    <p><strong>Total Attachments:</strong> ${attachments.length}</p>
                </div>

                ${attachments.length > 0 ? '<p><strong>Files are attached to this email.</strong></p>' : ''}
                
                <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
                <p style="color: #6b7280; font-size: 14px;">
                    This report was automatically generated from your food inventory app's receipt scanner.
                </p>
            </div>
        `;

        // Send email via Resend
        const emailData = {
            from: 'Receipt Scanner <noreply@docbearscomfort.kitchen>',
            to: ['edward@doctormckeown.com'],
            subject: `🧾 Receipt Scanner Issue: ${issueTitle}`,
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

        console.log(`Receipt issue report sent successfully. Email ID: ${data.id}`);

        return NextResponse.json({
            success: true,
            message: 'Issue report sent successfully',
            emailId: data.id,
            attachmentCount: attachments.length
        });

    } catch (error) {
        console.error('Receipt issue report error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}