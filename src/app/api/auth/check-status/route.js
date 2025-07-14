// file: /src/app/api/auth/check-status/route.js
// API endpoint to check if user account is suspended or banned

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
// authOptions no longer needed in NextAuth v5
import { checkUserStatus } from '@/middleware/checkUserStatus';

export async function GET(request) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            );
        }

        const statusCheck = await checkUserStatus(session.user.id);

        if (!statusCheck.isValid) {
            const statusCode = statusCheck.reason === 'suspended' ? 423 : // Locked
                statusCheck.reason === 'banned' ? 403 :    // Forbidden
                    401; // Unauthorized

            return NextResponse.json({
                error: 'Account access restricted',
                reason: statusCheck.reason,
                details: statusCheck.suspensionInfo || statusCheck.banInfo || null
            }, { status: statusCode });
        }

        return NextResponse.json({
            isValid: true,
            status: 'active',
            wasAutoUnsuspended: statusCheck.wasAutoUnsuspended || false
        });

    } catch (error) {
        console.error('❌ Check status API error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}