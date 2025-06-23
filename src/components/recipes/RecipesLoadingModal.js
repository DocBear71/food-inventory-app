'use client';
// file: /src/components/recipes/RecipesLoadingModal.js v1 - Enhanced flashy loading modal for recipes page

import { useEffect, useState } from 'react';

const RecipesLoadingModal = ({
                                 isOpen,
                                 activeTab = 'my-recipes',
                                 myRecipesCount = 0,
                                 publicRecipesCount = 0,
                                 savedRecipesCount = 0,
                                 collectionsCount = 0
                             }) => {
    const [progress, setProgress] = useState(0);
    const [currentTask, setCurrentTask] = useState('');

    useEffect(() => {
        if (!isOpen) {
            setProgress(0);
            return;
        }

        // Simulate loading progress with different phases
        const phases = [
            { progress: 20, task: '🔍 Loading your recipe collection...', delay: 300 },
            { progress: 45, task: '📚 Organizing your culinary library...', delay: 500 },
            { progress: 70, task: '🍽️ Preparing your kitchen dashboard...', delay: 400 },
            { progress: 90, task: '✨ Adding finishing touches...', delay: 300 },
            { progress: 100, task: '🎉 Your recipes are ready!', delay: 200 }
        ];

        let currentPhase = 0;

        const runPhase = () => {
            if (currentPhase < phases.length) {
                const phase = phases[currentPhase];

                setTimeout(() => {
                    setProgress(phase.progress);
                    setCurrentTask(phase.task);
                    currentPhase++;
                    runPhase();
                }, phase.delay);
            }
        };

        runPhase();
    }, [isOpen]);

    if (!isOpen) return null;

    const getLoadingEmoji = () => {
        if (progress < 25) return "📋";
        if (progress < 50) return "📚";
        if (progress < 75) return "🍽️";
        if (progress < 100) return "✨";
        return "🎉";
    };

    const getProgressMessage = () => {
        if (progress < 25) return "📋 Gathering your recipes...";
        if (progress < 50) return "📚 Sorting by categories...";
        if (progress < 75) return "🍽️ Loading delicious details...";
        if (progress < 100) return "✨ Almost ready to cook...";
        return "🎉 Welcome to your kitchen!";
    };

    const getTabStats = () => {
        switch (activeTab) {
            case 'my-recipes':
                return {
                    primary: { count: myRecipesCount, label: 'My Recipes', icon: '📝' },
                    secondary: { count: collectionsCount, label: 'Collections', icon: '📁' }
                };
            case 'public-recipes':
                return {
                    primary: { count: publicRecipesCount, label: 'Public Recipes', icon: '🌍' },
                    secondary: { count: savedRecipesCount, label: 'Saved', icon: '📚' }
                };
            case 'saved-recipes':
                return {
                    primary: { count: savedRecipesCount, label: 'Saved Recipes', icon: '📚' },
                    secondary: { count: myRecipesCount, label: 'My Recipes', icon: '📝' }
                };
            case 'collections':
                return {
                    primary: { count: collectionsCount, label: 'Collections', icon: '📁' },
                    secondary: { count: myRecipesCount, label: 'My Recipes', icon: '📝' }
                };
            default:
                return {
                    primary: { count: myRecipesCount, label: 'My Recipes', icon: '📝' },
                    secondary: { count: publicRecipesCount, label: 'Public', icon: '🌍' }
                };
        }
    };

    const tabStats = getTabStats();

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-md flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 shadow-xl border border-gray-100">

                {/* Main Loading Spinner */}
                <div className="flex justify-center mb-6">
                    <div className="relative">
                        {/* Outer spinning ring */}
                        <div className="w-20 h-20 border-4 border-gray-200 border-t-indigo-600 rounded-full animate-spin"></div>

                        {/* Center emoji */}
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-12 h-12 bg-indigo-600 rounded-full flex items-center justify-center shadow-lg animate-pulse">
                                <span className="text-white text-xl">{getLoadingEmoji()}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Title */}
                <h3 className="text-2xl font-bold text-center text-gray-900 mb-2">
                    👨‍🍳 Doc Bear's Recipe Kitchen
                </h3>

                {/* Current Task */}
                <div className="text-center mb-6">
                    <p className="text-gray-700 font-medium text-lg mb-2">{currentTask}</p>
                    <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
                        <span>🍴</span>
                        <span>Organizing your culinary collection</span>
                        <span>🍴</span>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-gray-200 rounded-full h-3 mb-4 overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${progress}%` }}
                    ></div>
                </div>

                {/* Progress Percentage */}
                <div className="text-center mb-6">
                    <div className="text-3xl font-bold text-gray-900 mb-1">
                        {Math.round(progress)}%
                    </div>
                    <div className="text-sm text-gray-600 font-medium">
                        {progress === 100 ? "🎊 Kitchen Ready!" : "Preparing..."}
                    </div>
                </div>

                {/* Tab-Specific Stats Grid */}
                <div className="grid grid-cols-2 gap-4 p-4 bg-gradient-to-br from-gray-50 to-indigo-50 rounded-lg border border-gray-200 mb-4">
                    <div className="text-center">
                        <div className="text-2xl font-bold text-indigo-600 mb-1 flex items-center justify-center gap-1">
                            <span className="text-lg">{tabStats.primary.icon}</span>
                            <span>{tabStats.primary.count}</span>
                        </div>
                        <div className="text-xs text-gray-600 font-medium">{tabStats.primary.label}</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600 mb-1 flex items-center justify-center gap-1">
                            <span className="text-lg">{tabStats.secondary.icon}</span>
                            <span>{tabStats.secondary.count}</span>
                        </div>
                        <div className="text-xs text-gray-600 font-medium">{tabStats.secondary.label}</div>
                    </div>
                </div>

                {/* Progress Message */}
                <div className="text-center">
                    <div className="text-sm text-gray-600 font-medium">
                        {getProgressMessage()}
                    </div>
                </div>

                {/* Fun Recipe Fact (when progress > 50%) */}
                {progress > 50 && (
                    <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <div className="text-center">
                            <div className="text-xs text-yellow-700 font-medium mb-1">
                                🧑‍🍳 Chef's Tip
                            </div>
                            <div className="text-xs text-yellow-600">
                                {progress > 90
                                    ? "A recipe is a story that ends with a good meal!"
                                    : "The best recipes are made with love and fresh ingredients!"
                                }
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RecipesLoadingModal;