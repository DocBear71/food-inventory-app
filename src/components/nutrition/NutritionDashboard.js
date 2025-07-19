'use client';

// file: /src/components/nutrition/NutritionDashboard.js v1 - Unified nutrition dashboard

import React, { useState, useEffect } from 'react';
import { TouchEnhancedButton } from '@/components/mobile/TouchEnhancedButton';
import { NutritionOverview } from '@/components/integrations/NutritionOverview';
import { InventoryNutritionSummary } from "@/components/integrations/InventoryNutritionSummary";
import {MealPlanNutritionSummary} from "@/components/integrations/MealPlanNutritionSummary.js";
import {NutritionGoalsTracking} from "@/components/integrations/NutritionGoalsTracking.js";

export default function NutritionDashboard({ userId }) {
    const [dashboardData, setDashboardData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');

    useEffect(() => {
        loadDashboardData();
    }, [userId]);

    const loadDashboardData = async () => {
        try {
            setLoading(true);

            const response = await fetch(`/api/nutrition/dashboard/${userId}`);
            const data = await response.json();

            if (data.success) {
                setDashboardData(data);
            }
        } catch (error) {
            console.error('Error loading nutrition dashboard:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!dashboardData) {
        return (
            <div className="text-center py-12">
                <div className="text-4xl mb-4">📊</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Nutrition Dashboard</h3>
                <p className="text-gray-600">No nutrition data available yet.</p>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto p-6">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">🍎 Nutrition Dashboard</h1>
                <p className="text-gray-600">
                    Your complete nutrition overview from inventory to meal plans
                </p>
            </div>

            {/* Tab Navigation */}
            <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-6">
                {[
                    { id: 'overview', label: '📊 Overview', icon: '📊' },
                    { id: 'inventory', label: '🥫 Inventory', icon: '🥫' },
                    { id: 'mealplans', label: '📅 Meal Plans', icon: '📅' },
                    { id: 'goals', label: '🎯 Goals', icon: '🎯' }
                ].map(tab => (
                    <TouchEnhancedButton
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                            activeTab === tab.id
                                ? 'bg-white text-blue-600 shadow-sm'
                                : 'text-gray-600 hover:text-gray-900'
                        }`}
                    >
                        {tab.icon} {tab.label}
                    </TouchEnhancedButton>
                ))}
            </div>

            {/* Tab Content */}
            <div className="space-y-6">
                {activeTab === 'overview' && (
                    <NutritionOverview data={dashboardData.overview} />
                )}
                {activeTab === 'inventory' && (
                    <InventoryNutritionSummary data={dashboardData.inventory} />
                )}
                {activeTab === 'mealplans' && (
                    <MealPlanNutritionSummary data={dashboardData.mealPlans} />
                )}
                {activeTab === 'goals' && (
                    <NutritionGoalsTracking data={dashboardData.goals} />
                )}
            </div>
        </div>
    );
}