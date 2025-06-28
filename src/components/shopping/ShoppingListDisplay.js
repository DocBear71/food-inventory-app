'use client';
// file: /src/components/shopping/ShoppingListDisplay.js v10 - Updated to use unified shopping list modal

import UnifiedShoppingListModal from '@/components/shopping/UnifiedShoppingListModal';

export default function ShoppingListDisplay({
                                                shoppingList,
                                                onClose,
                                                onRefresh = null,
                                                title = null,
                                                subtitle = null,
                                                sourceRecipeIds = [],
                                                sourceMealPlanId = null
                                            }) {
    // This component now simply wraps the UnifiedShoppingListModal
    // for backward compatibility with existing code

    return (
        <UnifiedShoppingListModal
            isOpen={!!shoppingList}
            onClose={onClose}
            shoppingList={shoppingList}
            title={title || '🛒 Shopping List'}
            subtitle={subtitle}
            sourceRecipeIds={sourceRecipeIds}
            sourceMealPlanId={sourceMealPlanId}
            onRefresh={onRefresh}
            showRefresh={!!onRefresh}
        />
    );
}