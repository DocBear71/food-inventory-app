'use client';
// file: /src/components/shopping/ShoppingListDisplay.js v11 - Updated to use enhanced AI shopping modal with category management

import EnhancedAIShoppingListModal from '@/components/shopping/EnhancedAIShoppingListModal';

export default function ShoppingListDisplay({
                                                shoppingList,
                                                onClose,
                                                onRefresh = null,
                                                title = null,
                                                subtitle = null,
                                                sourceRecipeIds = [],
                                                sourceMealPlanId = null
                                            }) {
    // This component now uses the enhanced AI shopping modal with category management
    // for backward compatibility with existing code

    return (
        <EnhancedAIShoppingListModal
            isOpen={!!shoppingList}
            onClose={onClose}
            shoppingList={shoppingList}
            title={title || '🛒 Smart Shopping List'}
            subtitle={subtitle}
            sourceRecipeIds={sourceRecipeIds}
            sourceMealPlanId={sourceMealPlanId}
            onRefresh={onRefresh}
            showRefresh={!!onRefresh}
        />
    );
}