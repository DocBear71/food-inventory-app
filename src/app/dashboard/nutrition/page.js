'use client';

// file: /src/app/dashboard/nutrition/page.js v4 - Fixed double scrollbar issue

import { useSafeSession } from '@/hooks/useSafeSession';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import MobileOptimizedLayout from '@/components/layout/MobileOptimizedLayout';
import Footer from '@/components/legal/Footer';

// Import the full-featured nutrition dashboard component
import NutritionDashboard from '@/components/integrations/NutritionDashboard';
import NutritionModal from '@/components/nutrition/NutritionModal';
import NativeNavigation from "@/components/mobile/NativeNavigation.js";

export default function NutritionDashboardPage() {
    const { data: session, status } = useSafeSession();
    const router = useRouter();

    // Modal state for nutrition display
    const [showNutritionModal, setShowNutritionModal] = useState(false);
    const [modalNutritionData, setModalNutritionData] = useState(null);
    const [modalRecipeTitle, setModalRecipeTitle] = useState('');

    useEffect(() => {
        if (status === 'unauthenticated') {
            NativeNavigation.routerPush(router, '/auth/signin');
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
            {/* FIXED: Remove dashboard-container class and overflow settings to prevent double scroll */}
            <div className="w-full">
                {/* Pass modal controls to NutritionDashboard */}
                <NutritionDashboard
                    // Pass modal control functions as props
                    onShowNutritionModal={(nutrition, title) => {
                        setModalNutritionData(nutrition);
                        setModalRecipeTitle(title);
                        setShowNutritionModal(true);
                    }}
                />
                <Footer />
            </div>

            {/* Nutrition Modal - placed at page level for proper z-index */}
            {showNutritionModal && (
                <NutritionModal
                    nutrition={modalNutritionData}
                    isOpen={showNutritionModal}
                    onClose={() => {
                        setShowNutritionModal(false);
                        setModalNutritionData(null);
                        setModalRecipeTitle('');
                    }}
                    servings={1}
                    recipeTitle={modalRecipeTitle}
                    isVoiceAnalysis={true}
                />
            )}
        </MobileOptimizedLayout>
    );
}