// file: /src/app/api/shopping/saved/[id]/load/route.js v1

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import { SavedShoppingList, UserInventory } from '@/lib/models';

// Helper function to find inventory matches
function findInventoryMatch(ingredient, inventory) {
    if (!inventory || !Array.isArray(inventory)) return null;

    const normalizedIngredient = ingredient.toLowerCase().trim();

    return inventory.find(item => {
        const itemName = item.name.toLowerCase().trim();
        return itemName.includes(normalizedIngredient) ||
            normalizedIngredient.includes(itemName) ||
            itemName === normalizedIngredient;
    });
}

// Helper function to capitalize first letter
function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

// POST - Load a saved shopping list (converts to active shopping list format)
export async function POST(request, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = params;
        const {
            resetPurchased = true,
            updateInventoryStatus = true,
            startShoppingSession = false
        } = await request.json();

        await connectDB();

        const savedList = await SavedShoppingList.findOne({
            _id: id,
            userId: session.user.id
        })
            .populate('sourceRecipeIds', 'title')
            .populate('sourceMealPlanId', 'name');

        if (!savedList) {
            return NextResponse.json({ error: 'Shopping list not found' }, { status: 404 });
        }

        // Mark as loaded
        await savedList.markAsLoaded();

        // Start shopping session if requested
        if (startShoppingSession) {
            await savedList.startShoppingSession();
        }

        // Prepare shopping list in the format expected by components
        let items = savedList.items.map(item => ({
            ingredient: item.ingredient,
            amount: item.amount,
            category: item.category,
            inInventory: updateInventoryStatus ? false : item.inInventory, // Will be updated by inventory check
            purchased: resetPurchased ? false : item.purchased,
            recipes: item.recipes,
            originalName: item.originalName,
            needAmount: item.needAmount,
            haveAmount: item.haveAmount,
            itemKey: item.itemKey,
            notes: item.notes
        }));

        // If requested, check current inventory status
        if (updateInventoryStatus) {
            try {
                // Get current user inventory
                const userInventory = await UserInventory.findOne({ userId: session.user.id });
                const inventory = userInventory ? userInventory.items : [];

                // Update inventory status for each item
                items = items.map(item => {
                    const inventoryMatch = findInventoryMatch(item.ingredient, inventory);
                    return {
                        ...item,
                        inInventory: !!inventoryMatch,
                        haveAmount: inventoryMatch ? `${inventoryMatch.quantity} ${inventoryMatch.unit}` : item.haveAmount
                    };
                });
            } catch (error) {
                console.warn('Could not update inventory status:', error);
                // Continue without inventory update
            }
        }

        // Group items by category for the shopping list format
        const itemsByCategory = {};
        items.forEach(item => {
            const category = capitalizeFirstLetter(item.category);
            if (!itemsByCategory[category]) {
                itemsByCategory[category] = [];
            }
            itemsByCategory[category].push({
                name: item.ingredient,
                ingredient: item.ingredient,
                amount: item.amount,
                originalName: item.originalName,
                needAmount: item.needAmount,
                haveAmount: item.haveAmount || '0',
                inInventory: item.inInventory,
                purchased: item.purchased,
                recipes: item.recipes,
                itemKey: item.itemKey
            });
        });

        // Calculate stats
        const stats = {
            totalItems: items.length,
            needToBuy: items.filter(item => !item.inInventory && !item.purchased).length,
            inInventory: items.filter(item => item.inInventory).length,
            alreadyHave: items.filter(item => item.inInventory).length,
            purchased: items.filter(item => item.purchased).length,
            categories: Object.keys(itemsByCategory).length
        };

        // Format as shopping list response
        const shoppingListResponse = {
            items: itemsByCategory,
            recipes: savedList.listType === 'recipe' ? [savedList.contextName] :
                savedList.listType === 'recipes' ? savedList.sourceRecipeIds.map(r => r.title) :
                    savedList.listType === 'meal-plan' ? [savedList.sourceMealPlan?.name || savedList.contextName] :
                        [savedList.name],
            summary: stats,
            metadata: {
                savedListId: savedList._id,
                savedListName: savedList.name,
                listType: savedList.listType,
                contextName: savedList.contextName,
                lastModified: savedList.updatedAt,
                isLoaded: true
            },
            generatedAt: new Date().toISOString(),
            source: 'saved_list'
        };

        return NextResponse.json({
            success: true,
            message: `Shopping list "${savedList.name}" loaded successfully`,
            shoppingList: shoppingListResponse,
            savedListInfo: {
                id: savedList._id,
                name: savedList.name,
                description: savedList.description,
                listType: savedList.listType,
                contextName: savedList.contextName,
                tags: savedList.tags,
                color: savedList.color,
                usage: savedList.usage,
                isTemplate: savedList.isTemplate
            }
        });

    } catch (error) {
        console.error('Error loading saved shopping list:', error);
        return NextResponse.json({
            error: 'Failed to load shopping list',
            details: error.message
        }, { status: 500 });
    }
}