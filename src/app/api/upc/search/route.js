// file: /src/app/api/inventory/route.js v5 - FIXED: Use correct feature gate for inventory limits

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import { UserInventory, User } from '@/lib/models';
import { FEATURE_GATES, checkUsageLimit, getUpgradeMessage, getRequiredTier } from '@/lib/subscription-config';

// GET - Fetch user's inventory
export async function GET(request) {
    try {
        const session = await getServerSession(authOptions);

        console.log('GET /api/inventory - Session:', session);

        if (!session?.user?.id) {
            console.log('No session or user ID found');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectDB();

        let inventory = await UserInventory.findOne({ userId: session.user.id });

        if (!inventory) {
            // Create empty inventory if doesn't exist
            inventory = new UserInventory({
                userId: session.user.id,
                items: []
            });
            await inventory.save();
        }

        return NextResponse.json({
            success: true,
            inventory: inventory.items
        });

    } catch (error) {
        console.error('GET inventory error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch inventory' },
            { status: 500 }
        );
    }
}

// POST - Add item to inventory (with subscription limits)
export async function POST(request) {
    try {
        const session = await getServerSession(authOptions);

        console.log('POST /api/inventory - Session:', session);

        if (!session?.user?.id) {
            console.log('No session or user ID found');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const {
            name, brand, category, quantity, unit, location, upc, expirationDate, nutrition,
            // Add support for secondary units
            secondaryQuantity, secondaryUnit
        } = body;

        console.log('POST /api/inventory - Body:', body);

        if (!name) {
            return NextResponse.json(
                { error: 'Item name is required' },
                { status: 400 }
            );
        }

        await connectDB();

        // Get user and check subscription limits
        const user = await User.findById(session.user.id);
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Get current inventory count
        let inventory = await UserInventory.findOne({ userId: session.user.id });
        if (!inventory) {
            inventory = new UserInventory({
                userId: session.user.id,
                items: []
            });
        }

        const currentItemCount = inventory.items.length;

        // Check subscription limits
        const userSubscription = {
            tier: user.getEffectiveTier(),
            status: user.subscription?.status || 'free'
        };

        // FIXED: Use INVENTORY_LIMIT feature gate, not ADD_INVENTORY_ITEM
        const hasCapacity = checkUsageLimit(userSubscription, FEATURE_GATES.INVENTORY_LIMIT, currentItemCount);

        if (!hasCapacity) {
            const requiredTier = getRequiredTier(FEATURE_GATES.INVENTORY_LIMIT);

            // FIXED: Better error message for inventory limits
            let errorMessage;
            if (userSubscription.tier === 'free') {
                errorMessage = `You've reached the free plan limit of 50 inventory items. Upgrade to Gold for 250 items or Platinum for unlimited items.`;
            } else if (userSubscription.tier === 'gold') {
                errorMessage = `You've reached the Gold plan limit of 250 inventory items. Upgrade to Platinum for unlimited items.`;
            } else {
                errorMessage = getUpgradeMessage(FEATURE_GATES.INVENTORY_LIMIT, requiredTier);
            }

            return NextResponse.json({
                error: errorMessage,
                code: 'INVENTORY_LIMIT_EXCEEDED',
                feature: FEATURE_GATES.INVENTORY_LIMIT,
                currentCount: currentItemCount,
                currentTier: userSubscription.tier,
                requiredTier: requiredTier,
                upgradeUrl: `/pricing?source=inventory-limit&feature=inventory&required=${requiredTier}`
            }, { status: 403 });
        }

        const newItem = {
            name,
            brand: brand || '',
            category: category || '',
            quantity: quantity || 1,
            unit: unit || 'item',

            // Add secondary unit support
            secondaryQuantity: secondaryQuantity && secondaryQuantity !== '' ?
                Math.max(parseFloat(secondaryQuantity), 0.1) : null,
            secondaryUnit: secondaryQuantity && secondaryQuantity !== '' ?
                secondaryUnit : null,

            location: location || 'pantry',
            upc: upc || '',
            expirationDate: expirationDate ? new Date(expirationDate) : null,
            addedDate: new Date(),
            // Add nutrition data if provided
            nutrition: nutrition || null
        };

        inventory.items.push(newItem);
        inventory.lastUpdated = new Date();

        await inventory.save();

        // Update user's usage tracking
        if (!user.usageTracking) {
            user.usageTracking = {};
        }
        user.usageTracking.totalInventoryItems = inventory.items.length;
        user.usageTracking.lastUpdated = new Date();

        // FIXED: Use updateOne to avoid validation issues
        await User.updateOne(
            { _id: session.user.id },
            {
                $set: {
                    'usageTracking.totalInventoryItems': inventory.items.length,
                    'usageTracking.lastUpdated': new Date()
                }
            },
            { runValidators: false }
        );

        console.log('Item added successfully:', newItem);

        // FIXED: Calculate remaining based on correct limits
        let remainingItems;
        if (userSubscription.tier === 'free') {
            remainingItems = Math.max(0, 50 - inventory.items.length);
        } else if (userSubscription.tier === 'gold') {
            remainingItems = Math.max(0, 250 - inventory.items.length);
        } else {
            remainingItems = 'Unlimited';
        }

        return NextResponse.json({
            success: true,
            item: newItem,
            message: 'Item added successfully',
            remainingItems: remainingItems,
            currentItemCount: inventory.items.length
        });

    } catch (error) {
        console.error('POST inventory error:', error);
        return NextResponse.json(
            { error: 'Failed to add item' },
            { status: 500 }
        );
    }
}

// PUT - Update inventory item
export async function PUT(request) {
    try {
        const session = await getServerSession(authOptions);

        console.log('PUT /api/inventory - Session:', session);

        if (!session?.user?.id) {
            console.log('PUT: No session or user ID found');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { itemId, ...updateData } = body;

        console.log('PUT /api/inventory - Body:', body);

        if (!itemId) {
            return NextResponse.json(
                { error: 'Item ID is required' },
                { status: 400 }
            );
        }

        await connectDB();

        const inventory = await UserInventory.findOne({ userId: session.user.id });

        if (!inventory) {
            return NextResponse.json(
                { error: 'Inventory not found' },
                { status: 404 }
            );
        }

        const itemIndex = inventory.items.findIndex(
            item => item._id.toString() === itemId
        );

        if (itemIndex === -1) {
            return NextResponse.json(
                { error: 'Item not found' },
                { status: 404 }
            );
        }

        // Update the item (including secondary unit data if provided)
        Object.keys(updateData).forEach(key => {
            if (updateData[key] !== undefined) {
                // Handle secondary quantity specially
                if (key === 'secondaryQuantity') {
                    inventory.items[itemIndex][key] = updateData[key] && updateData[key] !== '' ?
                        Math.max(parseFloat(updateData[key]), 0.1) : null;
                } else if (key === 'secondaryUnit') {
                    inventory.items[itemIndex][key] = updateData[key] && updateData[key] !== '' ?
                        updateData[key] : null;
                } else {
                    inventory.items[itemIndex][key] = updateData[key];
                }
            }
        });

        inventory.lastUpdated = new Date();
        await inventory.save();

        console.log('PUT: Item updated successfully:', inventory.items[itemIndex]);

        return NextResponse.json({
            success: true,
            item: inventory.items[itemIndex],
            message: 'Item updated successfully'
        });

    } catch (error) {
        console.error('PUT inventory error:', error);
        return NextResponse.json(
            { error: 'Failed to update item' },
            { status: 500 }
        );
    }
}

// DELETE - Remove item from inventory
export async function DELETE(request) {
    try {
        const session = await getServerSession(authOptions);

        console.log('DELETE /api/inventory - Session:', session);

        if (!session?.user?.id) {
            console.log('DELETE: No session or user ID found');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const itemId = searchParams.get('itemId');

        console.log('DELETE /api/inventory - ItemId:', itemId);

        if (!itemId) {
            return NextResponse.json(
                { error: 'Item ID is required' },
                { status: 400 }
            );
        }

        await connectDB();

        const inventory = await UserInventory.findOne({ userId: session.user.id });

        if (!inventory) {
            return NextResponse.json(
                { error: 'Inventory not found' },
                { status: 404 }
            );
        }

        const initialLength = inventory.items.length;
        inventory.items = inventory.items.filter(
            item => item._id.toString() !== itemId
        );

        if (inventory.items.length === initialLength) {
            return NextResponse.json(
                { error: 'Item not found' },
                { status: 404 }
            );
        }

        inventory.lastUpdated = new Date();
        await inventory.save();

        // Update user's usage tracking
        const user = await User.findById(session.user.id);
        if (user) {
            // FIXED: Use updateOne to avoid validation issues
            await User.updateOne(
                { _id: session.user.id },
                {
                    $set: {
                        'usageTracking.totalInventoryItems': inventory.items.length,
                        'usageTracking.lastUpdated': new Date()
                    }
                },
                { runValidators: false }
            );
        }

        console.log('DELETE: Item removed successfully');

        return NextResponse.json({
            success: true,
            message: 'Item removed successfully'
        });

    } catch (error) {
        console.error('DELETE inventory error:', error);
        return NextResponse.json(
            { error: 'Failed to remove item' },
            { status: 500 }
        );
    }
}

// Helper function to map Open Food Facts categories to our detailed categories
// This matches the same function in your UPC lookup route
function mapCategory(categoriesTags) {
    if (!categoriesTags || !Array.isArray(categoriesTags)) return 'Other';

    const categoryMap = {
        // Baking and cooking ingredients
        'Baking & Cooking Ingredients': ['en:baking-ingredients', 'en:cooking-ingredients', 'en:flour', 'en:sugar', 'en:brown-sugar', 'en:baking-powder', 'en:baking-soda', 'en:yeast', 'en:vanilla-extract', 'en:extracts', 'en:oils', 'en:cooking-oils', 'en:olive-oil', 'en:vegetable-oil', 'en:vinegar', 'en:breadcrumbs', 'en:panko', 'en:cornstarch', 'en:lard', 'en:shortening', 'en:honey', 'en:maple-syrup', 'en:molasses', 'en:cocoa-powder', 'en:chocolate-chips', 'en:food-coloring', 'en:cooking-wine'],

        // Dry goods
        'Beans': ['en:beans', 'en:dried-beans', 'en:red-beans', 'en:pinto-beans', 'en:kidney-beans', 'en:black-beans', 'en:navy-beans', 'en:lima-beans', 'en:black-eyed-peas', 'en:chickpeas', 'en:lentils', 'en:split-peas'],

        // Other categories
        'Beverages': ['en:beverages', 'en:drinks', 'en:sodas', 'en:juices', 'en:water', 'en:coffee', 'en:tea', 'en:energy-drinks'],

        'Bouillon': ['en:bouillon', 'en:bouillon-cubes', 'en:stock-cubes', 'en:broth-cubes'],

        'Boxed Meals': ['en:meal-kits', 'en:hamburger-helper', 'en:boxed-dinners', 'en:mac-and-cheese', 'en:instant-meals'],

        // Pantry staples
        'Breads': ['en:bread', 'en:sandwich-bread', 'en:white-bread', 'en:wheat-bread', 'en:hotdog-buns', 'en:hamburger-buns', 'en:baguettes', 'en:french-bread', 'en:pita', 'en:pita-bread', 'en:tortillas', 'en:flour-tortillas', 'en:corn-tortillas', 'en:bagels', 'en:rolls', 'en:croissants'],

        // Canned items
        'Canned Beans': ['en:canned-beans', 'en:black-beans', 'en:kidney-beans', 'en:chickpeas', 'en:pinto-beans', 'en:navy-beans', 'en:baked-beans'],
        'Canned Fruit': ['en:canned-fruits', 'en:canned-peaches', 'en:canned-pears', 'en:fruit-cocktail', 'en:canned-pineapple'],
        'Canned Meals': ['en:canned-meals', 'en:canned-soup', 'en:canned-chili', 'en:canned-stew', 'en:ravioli', 'en:spaghetti'],
        'Canned Meat': ['en:canned-meat', 'en:canned-chicken', 'en:canned-beef', 'en:canned-fish', 'en:tuna', 'en:salmon', 'en:sardines', 'en:spam'],
        'Canned Sauces': ['en:canned-sauces', 'en:pasta-sauces', 'en:marinara', 'en:alfredo'],
        'Canned Tomatoes': ['en:canned-tomatoes', 'en:tomato-sauce', 'en:tomato-paste', 'en:diced-tomatoes', 'en:crushed-tomatoes', 'en:tomato-puree'],
        'Canned Vegetables': ['en:canned-vegetables', 'en:canned-corn', 'en:canned-peas', 'en:canned-carrots', 'en:canned-green-beans'],

        // Dairy and eggs
        'Cheese': ['en:cheese', 'en:cheeses', 'en:cheddar', 'en:mozzarella', 'en:parmesan', 'en:cream-cheese'],

        'Condiments': ['en:condiments', 'en:ketchup', 'en:mustard', 'en:mayonnaise', 'en:salad-dressings'],

        'Dairy': ['en:dairy', 'en:milk', 'en:yogurt', 'en:butter', 'en:cream', 'en:sour-cream'],

        'Eggs': ['en:eggs', 'en:chicken-eggs', 'en:egg-products'],

        // Fresh produce
        'Fresh Fruits': ['en:fruits', 'en:fresh-fruits', 'en:apples', 'en:bananas', 'en:oranges', 'en:berries', 'en:citrus', 'en:tropical-fruits', 'en:stone-fruits'],
        'Fresh Spices': ['en:fresh-herbs', 'en:fresh-spices', 'en:basil', 'en:cilantro', 'en:parsley', 'en:mint', 'en:ginger'],
        'Fresh Vegetables': ['en:vegetables', 'en:fresh-vegetables', 'en:leafy-vegetables', 'en:root-vegetables', 'en:tomatoes', 'en:onions', 'en:carrots', 'en:potatoes', 'en:peppers', 'en:lettuce', 'en:spinach', 'en:broccoli', 'en:cauliflower'],

        // Fresh/Frozen meats
        'Fresh/Frozen Beef': ['en:beef', 'en:beef-meat', 'en:ground-beef', 'en:steaks', 'en:roasts'],
        'Fresh/Frozen Fish & Seafood': ['en:fish', 'en:seafood', 'en:salmon', 'en:tuna', 'en:cod', 'en:tilapia', 'en:shrimp', 'en:crab', 'en:lobster', 'en:scallops', 'en:mussels', 'en:clams', 'en:fresh-fish', 'en:frozen-fish'],
        'Fresh/Frozen Lamb': ['en:lamb', 'en:lamb-meat', 'en:mutton'],
        'Fresh/Frozen Pork': ['en:pork', 'en:pork-meat', 'en:bacon', 'en:ham', 'en:sausages', 'en:ground-pork'],
        'Fresh/Frozen Poultry': ['en:chicken', 'en:poultry', 'en:turkey', 'en:duck', 'en:chicken-meat', 'en:turkey-meat'],
        'Fresh/Frozen Rabbit': ['en:rabbit', 'en:rabbit-meat'],
        'Fresh/Frozen Venison': ['en:venison', 'en:deer', 'en:game-meat'],

        // Frozen items
        'Frozen Fruit': ['en:frozen-fruits', 'en:frozen-berries', 'en:frozen-strawberries', 'en:frozen-mango'],
        'Frozen Vegetables': ['en:frozen-vegetables', 'en:frozen-peas', 'en:frozen-corn', 'en:frozen-broccoli', 'en:frozen-spinach'],

        'Grains': ['en:cereals', 'en:rice', 'en:quinoa', 'en:oats', 'en:barley', 'en:bulgur', 'en:rice-mixes', 'en:rice-a-roni'],

        'Pasta': ['en:pasta', 'en:noodles', 'en:spaghetti', 'en:macaroni', 'en:penne', 'en:linguine', 'en:fettuccine', 'en:ravioli', 'en:lasagna'],

        'Seasonings': ['en:seasonings', 'en:salt', 'en:pepper', 'en:garlic-powder', 'en:onion-powder', 'en:seasoning-mixes'],

        'Snacks': ['en:snacks', 'en:chips', 'en:crackers', 'en:cookies', 'en:nuts', 'en:pretzels', 'en:popcorn'],

        // New category for soups
        'Soups & Soup Mixes': ['en:soups', 'en:soup-mixes', 'en:canned-soup', 'en:instant-soup', 'en:soup-packets', 'en:ramen', 'en:instant-noodles', 'en:chicken-soup', 'en:vegetable-soup', 'en:tomato-soup', 'en:beef-soup', 'en:minestrone', 'en:cream-soups', 'en:bisque'],

        'Spices': ['en:spices', 'en:cinnamon', 'en:paprika', 'en:cumin', 'en:oregano', 'en:thyme', 'en:rosemary', 'en:bay-leaves'],

        'Stock/Broth': ['en:broth', 'en:stock', 'en:chicken-broth', 'en:beef-broth', 'en:vegetable-broth', 'en:bone-broth'],

        'Stuffing & Sides': ['en:stuffing', 'en:stuffing-mix', 'en:instant-mashed-potatoes', 'en:mashed-potato-mix', 'en:au-gratin-potatoes', 'en:scalloped-potatoes', 'en:cornbread-mix', 'en:biscuit-mix', 'en:gravy-mix', 'en:side-dishes'],
    };

    // Check each category mapping with priority order (most specific first)
    const categoryKeys = Object.keys(categoryMap);

    for (const ourCategory of categoryKeys) {
        const tags = categoryMap[ourCategory];
        if (categoriesTags.some(tag =>
            tags.some(mappedTag => tag.toLowerCase().includes(mappedTag.replace('en:', '')))
        )) {
            return ourCategory;
        }
    }

    // Fallback for generic categories if no specific match found
    const fallbackMap = {
        'Dairy': ['en:dairy'],
        'Fresh/Frozen Beef': ['en:meat', 'en:beef'],
        'Fresh/Frozen Pork': ['en:pork'],
        'Fresh/Frozen Poultry': ['en:chicken'],
        'Fresh/Frozen Fish & Seafood': ['en:fish', 'en:seafood'],
        'Beans': ['en:beans', 'en:legumes'],
        'Pasta': ['en:pasta', 'en:noodles'],
        'Grains': ['en:grains', 'en:rice'],
        'Fresh Vegetables': ['en:vegetables'],
        'Fresh Fruits': ['en:fruits'],
        'Beverages': ['en:beverages'],
        'Snacks': ['en:snacks'],
    };

    for (const [ourCategory, tags] of Object.entries(fallbackMap)) {
        if (categoriesTags.some(tag =>
            tags.some(mappedTag => tag.toLowerCase().includes(mappedTag.replace('en:', '')))
        )) {
            return ourCategory;
        }
    }

    return 'Other';
}