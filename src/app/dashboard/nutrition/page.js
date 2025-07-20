// file: /src/app/dashboard/nutrition/page.js v2 - Updated to use full NutritionDashboard component

'use client';

import { useSafeSession } from '@/hooks/useSafeSession';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MobileOptimizedLayout from '@/components/layout/MobileOptimizedLayout';
import Footer from '@/components/legal/Footer';

// Import the full-featured nutrition dashboard component
import NutritionDashboard from '@/components/integrations/NutritionDashboard';

export default function NutritionDashboardPage() {
    const { data: session, status } = useSafeSession();
    const router = useRouter();

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/auth/signin');
        }
    }, [status, router]);

    if (status === 'loading') {
        return (
            <MobileOptimizedLayout>
                <div className="min-h-screen flex items-center justify-center">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                        <div className="text-lg text-gray-600">Loading nutrition dashboard...</div>
                    </div>
                </div>
            </MobileOptimizedLayout>
        );
    }

    if (!session) {
        return null;
    }

    return (
        <MobileOptimizedLayout>
            <div className="dashboard-container">
                {/* Use the full-featured NutritionDashboard component */}
                <NutritionDashboard />
                <Footer />
            </div>
        </MobileOptimizedLayout>
    );
}