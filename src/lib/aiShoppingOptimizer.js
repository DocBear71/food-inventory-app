// file: /src/lib/aiShoppingOptimizer.js - AI-Powered Shopping Route Optimization (COMPLETE)

import { StoreLayoutUtils } from '@/lib/storeLayouts';

/**
 * AI Shopping Optimization System - Phase 3 Implementation
 * Integrates with existing /api/shopping/optimize endpoint for intelligent route planning
 */

// 🤖 AI OPTIMIZATION CONFIGURATION
export const AI_OPTIMIZATION_CONFIG = {
    // Learning parameters
    LEARNING_RATE: 0.1,
    MIN_DATA_POINTS: 5,
    CONFIDENCE_THRESHOLD: 0.7,

    // Optimization weights
    WEIGHTS: {
        foodSafety: 0.35,      // Highest priority - keep cold foods cold
        timeEfficiency: 0.25,   // Second priority - minimize shopping time
        itemAvailability: 0.15, // Product availability and freshness
        userPreferences: 0.15,  // Personal shopping patterns
        storeTraffic: 0.10      // Store congestion patterns
    },

    // Route optimization parameters
    ROUTE_OPTIMIZATION: {
        maxBacktracking: 2,     // Maximum times to revisit same section
        parallelSections: true, // Can shop multiple nearby sections
        crowdAvoidance: true,   // Adjust route based on store traffic
        seasonalAdjustments: true // Account for seasonal product placement
    }
};

// 🧠 USER BEHAVIOR LEARNING ENGINE
class ShoppingBehaviorAnalyzer {
    constructor(userId) {
        this.userId = userId;
        this.behaviorData = this.loadBehaviorData();
    }

    /**
     * Load user's shopping behavior data from localStorage and API
     */
    loadBehaviorData() {
        try {
            const localData = localStorage.getItem(`shopping-behavior-${this.userId}`);
            return localData ? JSON.parse(localData) : this.getDefaultBehaviorData();
        } catch (error) {
            console.error('Error loading behavior data:', error);
            return this.getDefaultBehaviorData();
        }
    }

    getDefaultBehaviorData() {
        return {
            preferredStores: {},
            shoppingPatterns: {
                averageItems: 25,
                averageTime: 45,
                preferredDays: ['Saturday', 'Sunday'],
                preferredTimes: ['10:00-14:00']
            },
            itemPreferences: {
                organicPreference: 0.3,
                bulkBuying: 0.2,
                brandLoyalty: 0.5
            },
            routePreferences: {
                prioritizeSpeed: 0.6,
                avoidCrowds: 0.8,
                minimizeBacktracking: 0.9
            },
            categoryBehavior: {},
            shoppingHistory: [],
            lastUpdated: new Date().toISOString()
        };
    }

    /**
     * Analyze and learn from completed shopping trip
     */
    async learnFromShoppingTrip(tripData) {
        const {
            store,
            items,
            route,
            timeSpent,
            actualOrder,
            userSatisfaction,
            completionTime
        } = tripData;

        // Update shopping patterns
        this.updateShoppingPatterns(items.length, timeSpent);

        // Learn route preferences
        this.updateRoutePreferences(route, actualOrder, userSatisfaction);

        // Update item preferences
        this.updateItemPreferences(items);

        // Learn store preferences
        this.updateStorePreferences(store, userSatisfaction);

        // Save updated behavior data
        this.saveBehaviorData();

        console.log(`🧠 Learned from shopping trip: ${items.length} items, ${timeSpent}min, satisfaction: ${userSatisfaction}/5`);
    }

    updateShoppingPatterns(itemCount, timeSpent) {
        const patterns = this.behaviorData.shoppingPatterns;

        // Rolling average with decay factor
        const decayFactor = 0.8;
        patterns.averageItems = Math.round(patterns.averageItems * decayFactor + itemCount * (1 - decayFactor));
        patterns.averageTime = Math.round(patterns.averageTime * decayFactor + timeSpent * (1 - decayFactor));

        // Track current shopping time
        const now = new Date();
        const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' });
        const hour = now.getHours();
        const timeSlot = this.getTimeSlot(hour);

        if (!patterns.dayFrequency) patterns.dayFrequency = {};
        if (!patterns.timeFrequency) patterns.timeFrequency = {};

        patterns.dayFrequency[dayOfWeek] = (patterns.dayFrequency[dayOfWeek] || 0) + 1;
        patterns.timeFrequency[timeSlot] = (patterns.timeFrequency[timeSlot] || 0) + 1;
    }

    updateRoutePreferences(recommendedRoute, actualRoute, satisfaction) {
        if (!actualRoute || satisfaction < 3) return;

        const preferences = this.behaviorData.routePreferences;

        // Compare recommended vs actual route
        const routeDeviation = this.calculateRouteDeviation(recommendedRoute, actualRoute);

        if (routeDeviation < 0.2 && satisfaction >= 4) {
            // User followed route and was satisfied
            preferences.trustRecommendations = Math.min(1, (preferences.trustRecommendations || 0.5) + 0.1);
        } else if (routeDeviation > 0.5 && satisfaction >= 4) {
            // User deviated but was still satisfied
            preferences.prioritizeSpeed = Math.max(0, preferences.prioritizeSpeed - 0.05);
            preferences.flexibility = Math.min(1, (preferences.flexibility || 0.5) + 0.1);
        }
    }

    updateItemPreferences(items) {
        const prefs = this.behaviorData.itemPreferences;

        let organicCount = 0;
        let bulkCount = 0;

        items.forEach(item => {
            if (item.isOrganic) organicCount++;
            if (item.isBulk || (item.amount && parseFloat(item.amount) > 5)) bulkCount++;

            // Track category preferences
            if (!this.behaviorData.categoryBehavior[item.category]) {
                this.behaviorData.categoryBehavior[item.category] = {
                    frequency: 0,
                    averageQuantity: 0,
                    preferredBrands: {}
                };
            }

            const categoryData = this.behaviorData.categoryBehavior[item.category];
            categoryData.frequency++;

            if (item.brand) {
                categoryData.preferredBrands[item.brand] = (categoryData.preferredBrands[item.brand] || 0) + 1;
            }
        });

        // Update preferences with decay
        const decayFactor = 0.9;
        prefs.organicPreference = prefs.organicPreference * decayFactor +
            (organicCount / items.length) * (1 - decayFactor);
        prefs.bulkBuying = prefs.bulkBuying * decayFactor +
            (bulkCount / items.length) * (1 - decayFactor);
    }

    updateStorePreferences(store, satisfaction) {
        if (!this.behaviorData.preferredStores[store]) {
            this.behaviorData.preferredStores[store] = {
                visitCount: 0,
                averageSatisfaction: 3,
                preferredSections: {},
                avoidanceTimes: []
            };
        }

        const storeData = this.behaviorData.preferredStores[store];
        storeData.visitCount++;

        // Update satisfaction with rolling average
        storeData.averageSatisfaction =
            (storeData.averageSatisfaction * 0.8) + (satisfaction * 0.2);
    }

    getTimeSlot(hour) {
        if (hour < 6) return 'early-morning';
        if (hour < 10) return 'morning';
        if (hour < 14) return 'midday';
        if (hour < 18) return 'afternoon';
        if (hour < 21) return 'evening';
        return 'night';
    }

    calculateRouteDeviation(recommended, actual) {
        if (!recommended || !actual) return 1;

        const recSections = recommended.map(r => r.section);
        const actSections = actual.map(a => a.section);

        let deviations = 0;
        for (let i = 0; i < Math.min(recSections.length, actSections.length); i++) {
            if (recSections[i] !== actSections[i]) deviations++;
        }

        return deviations / Math.max(recSections.length, actSections.length);
    }

    saveBehaviorData() {
        try {
            this.behaviorData.lastUpdated = new Date().toISOString();
            localStorage.setItem(`shopping-behavior-${this.userId}`, JSON.stringify(this.behaviorData));
        } catch (error) {
            console.error('Error saving behavior data:', error);
        }
    }

    /**
     * Get personalized recommendations based on learned behavior
     */
    getPersonalizedRecommendations(shoppingList, store) {
        const recommendations = {
            routeAdjustments: [],
            itemSuggestions: [],
            timingAdvice: [],
            storeSpecificTips: []
        };

        // Route adjustments based on preferences
        if (this.behaviorData.routePreferences.prioritizeSpeed > 0.7) {
            recommendations.routeAdjustments.push({
                type: 'speed-optimization',
                message: 'Optimizing for fastest route based on your preferences',
                adjustment: 'minimize-sections'
            });
        }

        if (this.behaviorData.routePreferences.avoidCrowds > 0.7) {
            recommendations.routeAdjustments.push({
                type: 'crowd-avoidance',
                message: 'Adjusting route to avoid busy sections',
                adjustment: 'off-peak-sections'
            });
        }

        // Item suggestions based on behavior
        this.generateItemSuggestions(shoppingList, recommendations);

        // Timing advice
        this.generateTimingAdvice(recommendations);

        // Store-specific tips
        this.generateStoreSpecificTips(store, recommendations);

        return recommendations;
    }

    generateItemSuggestions(shoppingList, recommendations) {
        const itemPrefs = this.behaviorData.itemPreferences;

        // Suggest organic alternatives if user prefers organic
        if (itemPrefs.organicPreference > 0.5) {
            recommendations.itemSuggestions.push({
                type: 'organic-alternative',
                message: 'Consider organic versions of produce items',
                confidence: itemPrefs.organicPreference
            });
        }

        // Suggest bulk buying opportunities
        if (itemPrefs.bulkBuying > 0.4) {
            recommendations.itemSuggestions.push({
                type: 'bulk-opportunity',
                message: 'Bulk options available for non-perishables',
                confidence: itemPrefs.bulkBuying
            });
        }

        // Missing staples based on history
        this.suggestMissingStaples(shoppingList, recommendations);
    }

    suggestMissingStaples(shoppingList, recommendations) {
        const categoryFreq = this.behaviorData.categoryBehavior;
        const currentCategories = new Set(Object.keys(shoppingList));

        Object.entries(categoryFreq).forEach(([category, data]) => {
            if (data.frequency > 10 && !currentCategories.has(category)) {
                recommendations.itemSuggestions.push({
                    type: 'missing-staple',
                    message: `You usually buy ${category} items - anything missing?`,
                    category: category,
                    confidence: Math.min(1, data.frequency / 20)
                });
            }
        });
    }

    generateTimingAdvice(recommendations) {
        const patterns = this.behaviorData.shoppingPatterns;
        const now = new Date();
        const currentHour = now.getHours();

        // Check if shopping at optimal time
        if (patterns.timeFrequency) {
            const currentSlot = this.getTimeSlot(currentHour);
            const preferredSlots = Object.entries(patterns.timeFrequency)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 2)
                .map(([slot]) => slot);

            if (!preferredSlots.includes(currentSlot)) {
                recommendations.timingAdvice.push({
                    type: 'suboptimal-time',
                    message: `You usually shop during ${preferredSlots.join(' or ')}`,
                    suggestion: 'Consider shopping during your usual preferred times for better experience'
                });
            }
        }
    }

    generateStoreSpecificTips(store, recommendations) {
        const storeData = this.behaviorData.preferredStores[store];

        if (storeData && storeData.visitCount > 3) {
            if (storeData.averageSatisfaction < 3.5) {
                recommendations.storeSpecificTips.push({
                    type: 'store-satisfaction',
                    message: 'Your satisfaction with this store has been lower recently',
                    suggestion: 'Consider trying alternative stores or shopping at different times'
                });
            }

            if (storeData.preferredSections) {
                const topSections = Object.entries(storeData.preferredSections)
                    .sort(([,a], [,b]) => b - a)
                    .slice(0, 2)
                    .map(([section]) => section);

                if (topSections.length > 0) {
                    recommendations.storeSpecificTips.push({
                        type: 'preferred-sections',
                        message: `You typically have good experiences in ${topSections.join(' and ')} sections`,
                        suggestion: 'Start with these sections for the best selection'
                    });
                }
            }
        }
    }

    // Get learning status for UI display
    getLearningStatus() {
        const totalTrips = Object.values(this.behaviorData.preferredStores)
            .reduce((sum, store) => sum + store.visitCount, 0);

        let level = 'Beginner';
        let nextMilestone = 'Complete 5 shopping trips';

        if (totalTrips >= 20) {
            level = 'Expert';
            nextMilestone = 'Keep using AI for optimal results';
        } else if (totalTrips >= 10) {
            level = 'Advanced';
            nextMilestone = `${20 - totalTrips} trips to Expert level`;
        } else if (totalTrips >= 5) {
            level = 'Intermediate';
            nextMilestone = `${10 - totalTrips} trips to Advanced level`;
        } else {
            nextMilestone = `${5 - totalTrips} trips to Intermediate level`;
        }

        return {
            learningLevel: level,
            totalTrips,
            nextMilestone,
            dataQuality: Math.min(1, totalTrips / 10)
        };
    }
}

// 📈 STORE TRAFFIC PREDICTION ENGINE
class StoreTrafficPredictor {
    async predictStoreTraffic(store) {
        const now = new Date();
        const hour = now.getHours();
        const day = now.getDay(); // 0 = Sunday

        // Base traffic patterns (0-1 scale)
        let overallTraffic = 0.3; // Base level

        // Day of week adjustments
        if (day === 0 || day === 6) { // Weekend
            overallTraffic += 0.3;
        }

        // Hour of day adjustments
        if (hour >= 8 && hour <= 10) { // Morning rush
            overallTraffic += 0.2;
        } else if (hour >= 11 && hour <= 14) { // Lunch time
            overallTraffic += 0.4;
        } else if (hour >= 17 && hour <= 19) { // Evening rush
            overallTraffic += 0.5;
        } else if (hour >= 20 && hour <= 21) { // After work
            overallTraffic += 0.3;
        }

        // Store-specific adjustments
        if (store.toLowerCase().includes('costco')) {
            if (day === 0 || day === 6) overallTraffic += 0.2; // Costco busier on weekends
        }

        // Section-specific traffic
        const sectionCongestion = {
            'Produce': overallTraffic + 0.1, // Usually busier
            'Meat': overallTraffic + 0.05,
            'Dairy': overallTraffic,
            'Frozen': overallTraffic - 0.1, // Usually less crowded
            'Pantry': overallTraffic - 0.05
        };

        // Generate recommendations
        const recommendations = [];
        if (overallTraffic > 0.7) {
            recommendations.push({
                type: 'timing',
                message: 'Store is likely busy right now. Consider shopping early morning or late evening.',
                urgency: 'high'
            });
        }

        if (hour >= 17 && hour <= 19) {
            recommendations.push({
                type: 'section-timing',
                message: 'Produce and meat sections will be crowded. Shop these first or save for last.',
                urgency: 'medium'
            });
        }

        return {
            overallTraffic: Math.min(0.9, overallTraffic),
            sectionCongestion,
            recommendations,
            lastUpdated: now.toISOString()
        };
    }
}

// 🚀 AI ROUTE OPTIMIZATION ENGINE
class AIRouteOptimizer {
    constructor(behaviorAnalyzer) {
        this.behaviorAnalyzer = behaviorAnalyzer;
        this.trafficPredictor = new StoreTrafficPredictor();
    }

    /**
     * Generate AI-optimized shopping route
     */
    async optimizeShoppingRoute(shoppingList, store, userPreferences = {}) {
        console.log('🤖 Starting AI route optimization...');

        // Get base store layout
        const baseLayout = StoreLayoutUtils.applyStoreLayout(shoppingList, store);

        // Get user behavior insights
        const personalizedRecs = this.behaviorAnalyzer.getPersonalizedRecommendations(shoppingList, store);

        // Predict store traffic
        const trafficPrediction = await this.trafficPredictor.predictStoreTraffic(store);

        // Generate optimized route
        const optimizedRoute = await this.generateOptimizedRoute({
            baseLayout,
            shoppingList,
            store,
            personalizedRecs,
            trafficPrediction,
            userPreferences
        });

        // Calculate confidence score
        const confidenceScore = this.calculateConfidenceScore(optimizedRoute);

        return {
            optimizedRoute,
            aiInsights: {
                confidenceScore,
                estimatedTimeSavings: this.calculateTimeSavings(optimizedRoute, baseLayout.sections),
                improvementReasons: this.getImprovementReasons(optimizedRoute, baseLayout.sections)
            },
            smartSuggestions: personalizedRecs,
            trafficInfo: trafficPrediction,
            metadata: {
                generatedAt: new Date().toISOString(),
                algorithm: 'AI-Enhanced',
                userBehaviorVersion: this.behaviorAnalyzer.behaviorData.lastUpdated
            }
        };
    }

    /**
     * Generate optimized route using AI algorithms
     */
    async generateOptimizedRoute({
                                     baseLayout,
                                     shoppingList,
                                     store,
                                     personalizedRecs,
                                     trafficPrediction,
                                     userPreferences
                                 }) {
        // Start with food safety optimized base route
        let route = [...baseLayout.sections];

        // Apply user behavior optimizations
        route = this.applyBehaviorOptimizations(route, personalizedRecs);

        // Apply traffic-based optimizations
        route = this.applyTrafficOptimizations(route, trafficPrediction);

        // Apply dynamic route improvements
        route = this.applyDynamicOptimizations(route, shoppingList);

        // Add AI-generated insights
        route = this.addAIInsights(route, store, userPreferences);

        return route;
    }

    applyBehaviorOptimizations(route, personalizedRecs) {
        const behaviorData = this.behaviorAnalyzer.behaviorData;

        // Speed optimization
        if (behaviorData.routePreferences.prioritizeSpeed > 0.7) {
            route = this.optimizeForSpeed(route);
        }

        // Crowd avoidance
        if (behaviorData.routePreferences.avoidCrowds > 0.8) {
            route = this.optimizeForCrowdAvoidance(route);
        }

        // Minimize backtracking
        if (behaviorData.routePreferences.minimizeBacktracking > 0.8) {
            route = this.minimizeBacktracking(route);
        }

        return route;
    }

    applyTrafficOptimizations(route, trafficPrediction) {
        if (!trafficPrediction.sectionCongestion) return route;

        // Reorder sections based on predicted traffic
        return route.sort((a, b) => {
            const trafficA = trafficPrediction.sectionCongestion[a.name] || 0.5;
            const trafficB = trafficPrediction.sectionCongestion[b.name] || 0.5;

            // Prioritize less congested sections, but maintain food safety order
            const foodSafetyA = StoreLayoutUtils.getFoodSafetyPriority(a.categories[0] || 'Other');
            const foodSafetyB = StoreLayoutUtils.getFoodSafetyPriority(b.categories[0] || 'Other');

            // Food safety takes priority, then traffic
            if (foodSafetyA !== foodSafetyB) {
                return foodSafetyA - foodSafetyB;
            }

            return trafficA - trafficB;
        });
    }

    applyDynamicOptimizations(route, shoppingList) {
        // Group nearby sections
        route = this.groupNearbySections(route);

        // Optimize for item density
        route = this.optimizeForItemDensity(route, shoppingList);

        // Add strategic breaks for large shopping lists
        if (Object.values(shoppingList).flat().length > 50) {
            route = this.addStrategicBreaks(route);
        }

        return route;
    }

    addAIInsights(route, store, userPreferences) {
        return route.map((section, index) => ({
            ...section,
            aiInsights: {
                optimalTime: this.calculateOptimalSectionTime(section),
                crowdLevel: this.predictSectionCrowd(section, store),
                efficiencyTips: this.generateEfficiencyTips(section),
                personalizedNotes: this.getPersonalizedSectionNotes(section)
            },
            sectionOrder: index + 1,
            estimatedWaitTime: this.estimateWaitTime(section, store)
        }));
    }

    optimizeForSpeed(route) {
        // Combine compatible sections
        const combinedSections = [];
        let currentGroup = null;

        route.forEach(section => {
            if (this.canCombineSections(currentGroup, section)) {
                currentGroup.categories.push(...section.categories);
                currentGroup.items = currentGroup.items || [];
                currentGroup.items.push(...(section.items || []));
                currentGroup.itemCount += section.itemCount || 0;
            } else {
                if (currentGroup) combinedSections.push(currentGroup);
                currentGroup = { ...section };
            }
        });

        if (currentGroup) combinedSections.push(currentGroup);

        return combinedSections;
    }

    optimizeForCrowdAvoidance(route) {
        // Add time-based routing suggestions
        return route.map(section => ({
            ...section,
            crowdAvoidance: {
                recommendedTime: this.getOptimalSectionTime(section.name),
                alternativeOrder: this.getAlternativeOrder(section),
                skipIfCrowded: this.canSkipSection(section)
            }
        }));
    }

    minimizeBacktracking(route) {
        // Use traveling salesman-like optimization for section order
        const optimizedOrder = this.solveTSP(route);
        return optimizedOrder;
    }

    groupNearbySections(route) {
        // Group sections that are physically close in the store
        const grouped = [];
        const processed = new Set();

        route.forEach((section, index) => {
            if (processed.has(index)) return;

            const group = [section];
            processed.add(index);

            // Find nearby sections
            route.forEach((otherSection, otherIndex) => {
                if (otherIndex !== index && !processed.has(otherIndex)) {
                    if (this.areSectionsNearby(section.name, otherSection.name)) {
                        group.push(otherSection);
                        processed.add(otherIndex);
                    }
                }
            });

            if (group.length > 1) {
                grouped.push({
                    name: `${group[0].name} Area`,
                    emoji: '🏪',
                    categories: group.flatMap(g => g.categories),
                    items: group.flatMap(g => g.items || []),
                    itemCount: group.reduce((sum, g) => sum + (g.itemCount || 0), 0),
                    estimatedTime: group.reduce((sum, g) => sum + (g.estimatedTime || 0), 0),
                    subSections: group
                });
            } else {
                grouped.push(section);
            }
        });

        return grouped;
    }

    optimizeForItemDensity(route, shoppingList) {
        // Prioritize sections with more items
        return route.sort((a, b) => {
            const itemsA = a.itemCount || 0;
            const itemsB = b.itemCount || 0;

            // Maintain food safety order as primary sort
            const priorityA = StoreLayoutUtils.getFoodSafetyPriority(a.categories?.[0] || 'Other');
            const priorityB = StoreLayoutUtils.getFoodSafetyPriority(b.categories?.[0] || 'Other');

            if (priorityA !== priorityB) {
                return priorityA - priorityB;
            }

            // Secondary sort by item count (more items first within same priority)
            return itemsB - itemsA;
        });
    }

    addStrategicBreaks(route) {
        // Add rest points for large shopping trips
        const routeWithBreaks = [];

        route.forEach((section, index) => {
            routeWithBreaks.push(section);

            // Add break after every 3 sections
            if ((index + 1) % 3 === 0 && index < route.length - 1) {
                routeWithBreaks.push({
                    name: 'Strategic Break',
                    emoji: '☕',
                    categories: [],
                    items: [],
                    itemCount: 0,
                    estimatedTime: 2,
                    isBreak: true,
                    breakTips: [
                        'Check your list and cart organization',
                        'Grab a drink if needed',
                        'Review remaining sections'
                    ]
                });
            }
        });

        return routeWithBreaks;
    }

    calculateConfidenceScore(optimizedRoute) {
        const behaviorData = this.behaviorAnalyzer.behaviorData;
        const totalTrips = Object.values(behaviorData.preferredStores).reduce((sum, store) => sum + store.visitCount, 0);

        // Base confidence on amount of user data
        let confidence = Math.min(0.9, totalTrips / 20);

        // Increase confidence for food safety compliance
        confidence += 0.1;

        // Adjust for route complexity
        if (optimizedRoute.length > 10) confidence -= 0.05;
        if (optimizedRoute.length < 5) confidence += 0.05;

        return Math.max(0.3, Math.min(0.95, confidence));
    }

    getImprovementReasons(optimizedRoute, baseRoute) {
        const reasons = [];

        if (optimizedRoute.length < baseRoute.length) {
            reasons.push('Reduced number of shopping sections by combining nearby areas');
        }

        reasons.push('Applied food safety optimization for optimal freshness');
        reasons.push('Incorporated personal shopping preferences');

        if (this.behaviorAnalyzer.behaviorData.routePreferences.avoidCrowds > 0.7) {
            reasons.push('Adjusted route to avoid predicted crowd hotspots');
        }

        return reasons;
    }

    calculateTimeSavings(optimizedRoute, baseRoute) {
        const optimizedTime = optimizedRoute.reduce((sum, section) => sum + (section.estimatedTime || 5), 0);
        const baseTime = baseRoute.reduce((sum, section) => sum + (section.estimatedTime || 5), 0);

        return Math.max(0, baseTime - optimizedTime);
    }

    // Helper methods
    canCombineSections(section1, section2) {
        if (!section1 || !section2) return false;

        const foodSafety1 = StoreLayoutUtils.getFoodSafetyPriority(section1.categories?.[0] || 'Other');
        const foodSafety2 = StoreLayoutUtils.getFoodSafetyPriority(section2.categories?.[0] || 'Other');

        return foodSafety1 === foodSafety2 && this.areSectionsNearby(section1.name, section2.name);
    }

    areSectionsNearby(section1, section2) {
        const nearbyGroups = [
            ['Pantry', 'Canned Goods', 'Dry Goods'],
            ['Dairy', 'Meat', 'Seafood'],
            ['Frozen', 'Ice Cream'],
            ['Produce', 'Floral', 'Organic']
        ];

        return nearbyGroups.some(group =>
            group.some(g => section1.includes(g)) && group.some(g => section2.includes(g))
        );
    }

    solveTSP(sections) {
        // Simplified TSP solver for section ordering
        if (sections.length <= 3) return sections;

        let bestRoute = sections;
        let bestDistance = this.calculateRouteDistance(sections);

        // Try a few random permutations
        for (let i = 0; i < Math.min(10, sections.length * 2); i++) {
            const permutation = this.shuffleArray([...sections]);
            const distance = this.calculateRouteDistance(permutation);

            if (distance < bestDistance) {
                bestRoute = permutation;
                bestDistance = distance;
            }
        }

        return bestRoute;
    }

    calculateRouteDistance(sections) {
        // Simple distance calculation based on section transitions
        let distance = 0;
        for (let i = 0; i < sections.length - 1; i++) {
            distance += this.getSectionDistance(sections[i].name, sections[i + 1].name);
        }
        return distance;
    }

    getSectionDistance(section1, section2) {
        // Simplified distance matrix
        const distances = {
            'Pantry-Dairy': 3,
            'Dairy-Meat': 2,
            'Meat-Frozen': 2,
            'Frozen-Produce': 4,
            'Pantry-Frozen': 5,
            'Pantry-Produce': 6
        };

        const key = `${section1}-${section2}`;
        const reverseKey = `${section2}-${section1}`;

        return distances[key] || distances[reverseKey] || 3;
    }

    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    // Additional helper methods for AI insights
    calculateOptimalSectionTime(section) {
        const hour = new Date().getHours();
        if (section.name?.includes('Produce')) {
            return hour < 10 ? 'Morning (freshest selection)' : 'Avoid peak hours 5-7pm';
        }
        if (section.name?.includes('Meat')) {
            return hour < 14 ? 'Before 2pm (best selection)' : 'Selection may be limited';
        }
        return 'Flexible timing';
    }

    predictSectionCrowd(section, store) {
        const hour = new Date().getHours();
        const day = new Date().getDay();

        // Weekend + afternoon = higher crowds
        let crowdLevel = 0.3;
        if (day === 0 || day === 6) crowdLevel += 0.2; // Weekend
        if (hour >= 10 && hour <= 14) crowdLevel += 0.3; // Peak hours
        if (hour >= 17 && hour <= 19) crowdLevel += 0.4; // Evening rush

        if (section.name?.includes('Produce')) crowdLevel += 0.1; // Popular section

        return Math.min(0.9, crowdLevel);
    }

    generateEfficiencyTips(section) {
        const tips = [];

        if (section.name?.includes('Produce')) {
            tips.push('Bring your own bags for bulk items');
            tips.push('Check for weekly specials first');
        }

        if (section.name?.includes('Meat')) {
            tips.push('Ask for specific cuts if not displayed');
            tips.push('Check sell-by dates carefully');
        }

        if (section.name?.includes('Frozen')) {
            tips.push('Shop this section last to minimize thaw time');
            tips.push('Group frozen items together in cart');
        }

        return tips;
    }

    getPersonalizedSectionNotes(section) {
        const behaviorData = this.behaviorAnalyzer.behaviorData;
        const categoryBehavior = behaviorData.categoryBehavior;

        const notes = [];

        section.categories?.forEach(category => {
            const behavior = categoryBehavior[category];
            if (behavior && behavior.frequency > 5) {
                if (behavior.preferredBrands) {
                    const topBrand = Object.entries(behavior.preferredBrands)
                        .sort(([,a], [,b]) => b - a)[0];
                    if (topBrand) {
                        notes.push(`You usually prefer ${topBrand[0]} brand for ${category}`);
                    }
                }
            }
        });

        return notes;
    }

    estimateWaitTime(section, store) {
        // Simple wait time estimation
        const crowdLevel = this.predictSectionCrowd(section, store);
        return Math.round(crowdLevel * 5); // 0-5 minute wait
    }

    getOptimalSectionTime(sectionName) {
        const timeRecommendations = {
            'Produce': 'Early morning for best selection',
            'Meat': 'Before 2pm for freshest cuts',
            'Dairy': 'Any time - well stocked',
            'Frozen': 'Last stop to minimize thaw time',
            'Bakery': 'Morning for fresh items'
        };

        return Object.keys(timeRecommendations).find(key =>
            sectionName?.includes(key)
        ) ? timeRecommendations[Object.keys(timeRecommendations).find(key =>
            sectionName?.includes(key)
        )] : 'Flexible timing';
    }

    getAlternativeOrder(section) {
        // Provide alternative ordering suggestions
        return {
            early: 'Shop during off-peak hours for better experience',
            late: 'Consider shopping this section last if crowded',
            skip: 'Items may be available in other sections'
        };
    }

    canSkipSection(section) {
        // Determine if section can be skipped when crowded
        return !section.name?.includes('Produce') && !section.name?.includes('Meat');
    }
}

// 🌐 MAIN AI SHOPPING SYSTEM
export function createAIShoppingSystem(userId) {
    const behaviorAnalyzer = new ShoppingBehaviorAnalyzer(userId);
    const routeOptimizer = new AIRouteOptimizer(behaviorAnalyzer);

    return {
        behaviorAnalyzer,
        routeOptimizer,

        // Quick access methods
        getLearningStatus: () => behaviorAnalyzer.getLearningStatus(),
        getPersonalizedRecommendations: (shoppingList, store) =>
            behaviorAnalyzer.getPersonalizedRecommendations(shoppingList, store),
        optimizeRoute: (shoppingList, store, preferences) =>
            routeOptimizer.optimizeShoppingRoute(shoppingList, store, preferences),
        learnFromTrip: (tripData) =>
            behaviorAnalyzer.learnFromShoppingTrip(tripData)
    };
}

// 🚀 PUBLIC API FUNCTIONS
export async function getAIOptimizedRoute(shoppingList, store, userId, userPreferences = {}) {
    try {
        const aiSystem = createAIShoppingSystem(userId);
        return await aiSystem.optimizeRoute(shoppingList, store, userPreferences);
    } catch (error) {
        console.error('AI optimization error:', error);

        // Fallback to basic store layout
        const fallbackLayout = StoreLayoutUtils.applyStoreLayout(shoppingList, store);
        return {
            optimizedRoute: fallbackLayout.sections,
            aiInsights: {
                confidenceScore: 0.3,
                estimatedTimeSavings: 0,
                improvementReasons: ['Using basic store layout due to AI optimization error']
            },
            smartSuggestions: {
                itemSuggestions: [],
                routeAdjustments: [],
                timingAdvice: [],
                storeSpecificTips: []
            },
            trafficInfo: {
                overallTraffic: 0.5,
                recommendations: []
            },
            metadata: {
                generatedAt: new Date().toISOString(),
                algorithm: 'Fallback',
                error: error.message
            }
        };
    }
}

export async function provideLearningFeedback(userId, tripData) {
    try {
        const aiSystem = createAIShoppingSystem(userId);
        await aiSystem.learnFromTrip(tripData);

        console.log('🧠 Learning feedback processed successfully');
        return { success: true };
    } catch (error) {
        console.error('Learning feedback error:', error);
        return { success: false, error: error.message };
    }
}

export function getAIShoppingSuggestions(shoppingList, store, userId) {
    try {
        const aiSystem = createAIShoppingSystem(userId);
        return aiSystem.getPersonalizedRecommendations(shoppingList, store);
    } catch (error) {
        console.error('AI suggestions error:', error);
        return {
            itemSuggestions: [],
            routeAdjustments: [],
            timingAdvice: [],
            storeSpecificTips: []
        };
    }
}

// 📊 ANALYTICS AND REPORTING
export function getShoppingAnalytics(userId) {
    try {
        const aiSystem = createAIShoppingSystem(userId);
        const status = aiSystem.getLearningStatus();
        const behaviorData = aiSystem.behaviorAnalyzer.behaviorData;

        return {
            learningStatus: status,
            shoppingPatterns: behaviorData.shoppingPatterns,
            preferredStores: behaviorData.preferredStores,
            itemPreferences: behaviorData.itemPreferences,
            routePreferences: behaviorData.routePreferences,
            totalDataPoints: status.totalTrips,
            lastUpdated: behaviorData.lastUpdated
        };
    } catch (error) {
        console.error('Analytics error:', error);
        return null;
    }
}

// 🔄 DATA MANAGEMENT
export function exportAIData(userId) {
    try {
        const aiSystem = createAIShoppingSystem(userId);
        return {
            version: '1.0',
            exportedAt: new Date().toISOString(),
            userId: userId,
            behaviorData: aiSystem.behaviorAnalyzer.behaviorData
        };
    } catch (error) {
        console.error('Export error:', error);
        return null;
    }
}

export async function importAIData(userId, importData) {
    try {
        if (importData.userId !== userId) {
            const {NativeDialog} = await import('@/components/mobile/NativeDialog');
            await NativeDialog.showError({
                title: 'ID Mismatch',
                message: 'User ID mismatch'
            });
            return;
        }

        localStorage.setItem(`shopping-behavior-${userId}`, JSON.stringify(importData.behaviorData));
        console.log('🔄 AI data imported successfully');
        return {success: true};
    } catch (error) {
        console.error('Import error:', error);
        return {success: false, error: error.message};
    }
}

export function resetAIData(userId) {
    try {
        localStorage.removeItem(`shopping-behavior-${userId}`);
        console.log('🔄 AI data reset successfully');
        return { success: true };
    } catch (error) {
        console.error('Reset error:', error);
        return { success: false, error: error.message };
    }
}

// 🎯 UTILITY FUNCTIONS
export const AIShoppingUtils = {
    createAIShoppingSystem,
    getAIOptimizedRoute,
    provideLearningFeedback,
    getAIShoppingSuggestions,
    getShoppingAnalytics,
    exportAIData,
    importAIData,
    resetAIData,

    // Configuration
    config: AI_OPTIMIZATION_CONFIG,

    // Classes for advanced usage
    ShoppingBehaviorAnalyzer,
    StoreTrafficPredictor,
    AIRouteOptimizer
};