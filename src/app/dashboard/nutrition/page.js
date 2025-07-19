// file: /src/app/dashboard/nutrition/page.js (NEW)
'use client';

import { useSafeSession } from '@/hooks/useSafeSession';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import MobileOptimizedLayout from '@/components/layout/MobileOptimizedLayout';
import Footer from '@/components/legal/Footer';
import {apiGet, apiPost} from '@/lib/api-config';

// Import your nutrition dashboard components
import { NutritionOverview } from '@/components/integrations/NutritionOverview';
import { InventoryNutritionSummary } from '@/components/integrations/InventoryNutritionSummary';
import { MealPlanNutritionSummary } from '@/components/integrations/MealPlanNutritionSummary';
import { NutritionGoalsTracking } from '@/components/integrations/NutritionGoalsTracking';
import { IntegrationStatus } from '@/components/integrations/IntegrationStatus';

export default function NutritionDashboard() {
    const { data: session, status } = useSafeSession();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState('overview');
    const [dashboardData, setDashboardData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [healthStatus, setHealthStatus] = useState(null);

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/auth/signin');
        }
    }, [status, router]);

    useEffect(() => {
        if (session) {
            fetchNutritionData();
        }
    }, [session]);

    const fetchNutritionData = async () => {
        try {
            setLoading(true);

            if (typeof apiGet !== 'function') {
                console.error('apiGet is not a function, using fetch instead');
                const response = await fetch('/api/integrations/nutrition-integration');
                const data = await response.json();
                if (data.success) {
                    setDashboardData(data.data);
                }
                return;
            }

            // Fetch nutrition dashboard data
            const response = await apiGet('/api/integrations/nutrition-integration');
            const data = await response.json();

            if (data.success) {
                setDashboardData(data.data);
            } else {
                console.error('Failed to fetch nutrition data:', data.error);
            }
        } catch (error) {
            console.error('Error fetching nutrition data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAnalyze = async () => {
        try {
            setLoading(true);

            // Trigger nutrition analysis
            const response = await apiPost('/api/integrations/nutrition-analysis', {
               analysisLevel: 'comprehensive'
            });

            if (response.ok) {
                // Refresh data after analysis
                await fetchNutritionData();
            }
        } catch (error) {
            console.error('Error running nutrition analysis:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleHealthCheck = (isHealthy) => {
        setHealthStatus(isHealthy);
    };

    const handleGoalsUpdate = () => {
        // Refresh nutrition data when goals are updated
        fetchNutritionData();
    };

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
            <div className="space-y-6 dashboard-container">
                {/* Header */}
                <div className="bg-white overflow-hidden shadow rounded-lg">
                    <div className="px-4 py-5 sm:p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">
                                    🔬 Nutrition Dashboard
                                </h1>
                                <p className="mt-1 text-sm text-gray-500">
                                    AI-powered nutrition analysis and insights
                                </p>
                            </div>
                            {healthStatus !== null && (
                                <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                                    healthStatus ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                }`}>
                                    {healthStatus ? '✅ Systems Online' : '❌ Service Issues'}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="bg-white rounded-lg shadow">
                    <div className="border-b border-gray-200">
                        <nav className="-mb-px flex space-x-8 px-4" aria-label="Tabs">
                            {[
                                { id: 'overview', label: '📊 Overview', icon: '📊' },
                                { id: 'inventory', label: '📦 Inventory', icon: '📦' },
                                { id: 'mealplans', label: '📅 Meal Plans', icon: '📅' },
                                { id: 'goals', label: '🎯 Goals', icon: '🎯' },
                                { id: 'status', label: '🔧 Status', icon: '🔧' }
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                                        activeTab === tab.id
                                            ? 'border-indigo-500 text-indigo-600'
                                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }`}
                                >
                                    <span className="hidden sm:inline">{tab.label}</span>
                                    <span className="sm:hidden text-lg">{tab.icon}</span>
                                </button>
                            ))}
                        </nav>
                    </div>
                </div>

                {/* Tab Content */}
                <div className="min-h-[400px]">
                    {activeTab === 'overview' && (
                        <NutritionOverview
                            data={dashboardData}
                            loading={loading}
                            onAnalyze={handleAnalyze}
                        />
                    )}

                    {activeTab === 'inventory' && (
                        <InventoryNutritionSummary
                            data={dashboardData}
                            loading={loading}
                            onAnalyze={handleAnalyze}
                        />
                    )}

                    {activeTab === 'mealplans' && (
                        <MealPlanNutritionSummary
                            data={dashboardData}
                            loading={loading}
                            onRefresh={fetchNutritionData}
                        />
                    )}

                    {activeTab === 'goals' && (
                        <NutritionGoalsTracking
                            data={dashboardData}
                            loading={loading}
                            onGoalsUpdate={handleGoalsUpdate}
                        />
                    )}

                    {activeTab === 'status' && (
                        <IntegrationStatus
                            onHealthCheck={handleHealthCheck}
                        />
                    )}
                </div>

                <Footer />
            </div>
        </MobileOptimizedLayout>
    );
}
