// file: /src/app/api/shopping/budget-suggestions/route.js

import { NextResponse } from 'next/server';
import { getEnhancedSession } from '@/lib/api-auth';
import { auth } from '@/lib/auth';
import connectDB from '@/lib/mongodb';

export async function POST(request) {
    try {
        const session = await getEnhancedSession(auth);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { shoppingList, budget } = await request.json();
        const currentTotal = shoppingList.reduce((sum, item) => sum + (item.estimatedPrice * item.quantity), 0);

        const suggestions = [];

        // Only generate suggestions if over budget
        if (currentTotal <= budget) {
            return NextResponse.json({ suggestions: [] });
        }

        const overage = currentTotal - budget;

        // Suggestion 1: Remove non-essential items
        const nonEssentialItems = shoppingList.filter(item =>
            item.category && ['Snacks', 'Beverages', 'Desserts'].includes(item.category)
        );

        if (nonEssentialItems.length > 0) {
            const savings = nonEssentialItems.reduce((sum, item) => sum + (item.estimatedPrice * item.quantity), 0);
            suggestions.push({
                id: 'remove-nonessential',
                icon: '🗑️',
                title: 'Remove Non-Essential Items',
                description: `Remove ${nonEssentialItems.length} snacks and beverages`,
                savings: savings,
                action: { type: 'remove', items: nonEssentialItems.map(item => item.id) }
            });
        }

        // Suggestion 2: Reduce quantities
        const highQuantityItems = shoppingList.filter(item => item.quantity > 2);
        if (highQuantityItems.length > 0) {
            const savings = highQuantityItems.reduce((sum, item) => sum + (item.estimatedPrice * Math.floor(item.quantity / 2)), 0);
            suggestions.push({
                id: 'reduce-quantities',
                icon: '📉',
                title: 'Reduce Quantities',
                description: `Reduce quantities on ${highQuantityItems.length} items`,
                savings: savings,
                action: { type: 'reduce_quantity', items: highQuantityItems.map(item => item.id) }
            });
        }

        // Suggestion 3: Switch to store brands
        const brandedItems = shoppingList.filter(item =>
            item.brand && !item.brand.toLowerCase().includes('store') && !item.brand.toLowerCase().includes('generic')
        );

        if (brandedItems.length > 0) {
            const savings = brandedItems.reduce((sum, item) => sum + (item.estimatedPrice * 0.3), 0); // Assume 30% savings
            suggestions.push({
                id: 'switch-store-brands',
                icon: '🏪',
                title: 'Switch to Store Brands',
                description: `Switch ${brandedItems.length} items to store brands`,
                savings: savings,
                action: { type: 'switch_brand', items: brandedItems.map(item => item.id) }
            });
        }

        // Suggestion 4: Remove most expensive items
        const sortedByPrice = [...shoppingList].sort((a, b) => (b.estimatedPrice * b.quantity) - (a.estimatedPrice * a.quantity));
        const expensiveItems = sortedByPrice.slice(0, Math.min(3, Math.ceil(shoppingList.length * 0.2)));

        if (expensiveItems.length > 0) {
            const savings = expensiveItems.reduce((sum, item) => sum + (item.estimatedPrice * item.quantity), 0);
            suggestions.push({
                id: 'remove-expensive',
                icon: '💸',
                title: 'Remove Most Expensive Items',
                description: `Remove ${expensiveItems.length} most expensive items`,
                savings: savings,
                action: { type: 'remove', items: expensiveItems.map(item => item.id) }
            });
        }

        // Sort suggestions by savings (highest first)
        suggestions.sort((a, b) => b.savings - a.savings);

        return NextResponse.json({ suggestions: suggestions.slice(0, 3) }); // Return top 3 suggestions

    } catch (error) {
        console.error('Error generating budget suggestions:', error);
        return NextResponse.json({ error: 'Failed to generate suggestions' }, { status: 500 });
    }
}