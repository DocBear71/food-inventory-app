// file: /src/lib/email.js v1

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

// Email templates
const getShoppingListEmailTemplate = ({
                                          senderName,
                                          recipientName,
                                          shoppingList,
                                          personalMessage,
                                          context, // 'recipe', 'recipes', 'meal-plan'
                                          contextName, // recipe name or meal plan name
                                          appUrl
                                      }) => {
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    // Normalize shopping list structure
    const normalizedList = normalizeShoppingListForEmail(shoppingList);

    // Generate HTML content
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Shopping List from ${senderName}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px 20px;
            border-radius: 8px;
            text-align: center;
            margin-bottom: 30px;
        }
        .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 600;
        }
        .header p {
            margin: 10px 0 0 0;
            opacity: 0.9;
            font-size: 16px;
        }
        .personal-message {
            background: #f8f9fa;
            border-left: 4px solid #4f46e5;
            padding: 20px;
            margin-bottom: 30px;
            border-radius: 0 8px 8px 0;
        }
        .personal-message h3 {
            margin: 0 0 10px 0;
            color: #4f46e5;
            font-size: 18px;
        }
        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
            gap: 15px;
            margin-bottom: 30px;
        }
        .stat-card {
            text-align: center;
            padding: 20px;
            border-radius: 8px;
            border: 2px solid #e5e7eb;
        }
        .stat-card.total { border-color: #3b82f6; background: #eff6ff; }
        .stat-card.need { border-color: #f59e0b; background: #fffbeb; }
        .stat-card.have { border-color: #10b981; background: #ecfdf5; }
        .stat-number {
            font-size: 32px;
            font-weight: bold;
            margin-bottom: 5px;
        }
        .stat-card.total .stat-number { color: #3b82f6; }
        .stat-card.need .stat-number { color: #f59e0b; }
        .stat-card.have .stat-number { color: #10b981; }
        .stat-label {
            font-size: 14px;
            font-weight: 500;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .category {
            margin-bottom: 30px;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            overflow: hidden;
        }
        .category-header {
            background: #f9fafb;
            padding: 15px 20px;
            border-bottom: 1px solid #e5e7eb;
            font-weight: 600;
            font-size: 18px;
            color: #374151;
        }
        .category-items {
            padding: 0;
        }
        .item {
            padding: 15px 20px;
            border-bottom: 1px solid #f3f4f6;
            display: flex;
            align-items: flex-start;
            gap: 15px;
        }
        .item:last-child {
            border-bottom: none;
        }
        .item.in-inventory {
            background: #f0f9ff;
            border-left: 4px solid #0ea5e9;
        }
        .checkbox {
            width: 20px;
            height: 20px;
            border: 2px solid #6b7280;
            border-radius: 4px;
            margin-top: 2px;
            flex-shrink: 0;
        }
        .item-content {
            flex: 1;
        }
        .item-name {
            font-weight: 500;
            font-size: 16px;
            margin-bottom: 4px;
        }
        .item-details {
            font-size: 14px;
            color: #6b7280;
        }
        .inventory-note {
            color: #0ea5e9;
            font-weight: 500;
            font-size: 14px;
            margin-top: 4px;
        }
        .footer {
            margin-top: 40px;
            padding: 20px;
            background: #f9fafb;
            border-radius: 8px;
            text-align: center;
            border: 1px solid #e5e7eb;
        }
        .footer-text {
            font-size: 14px;
            color: #6b7280;
            margin-bottom: 10px;
        }
        .app-link {
            color: #4f46e5;
            text-decoration: none;
            font-weight: 500;
        }
        .app-link:hover {
            text-decoration: underline;
        }
        @media (max-width: 600px) {
            body { padding: 10px; }
            .stats { grid-template-columns: 1fr 1fr; }
            .stat-card { padding: 15px; }
            .stat-number { font-size: 24px; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🛒 Shopping List</h1>
        <p>From ${senderName} • ${dateStr}</p>
        ${context === 'meal-plan' ? `<p>📅 ${contextName}</p>` :
        context === 'recipe' ? `<p>🍳 ${contextName}</p>` :
            `<p>🍳 Selected Recipes</p>`}
    </div>

    ${personalMessage ? `
    <div class="personal-message">
        <h3>📝 Personal Message</h3>
        <p>${personalMessage}</p>
    </div>
    ` : ''}

    <div class="stats">
        <div class="stat-card total">
            <div class="stat-number">${normalizedList.stats.totalItems}</div>
            <div class="stat-label">Total Items</div>
        </div>
        <div class="stat-card need">
            <div class="stat-number">${normalizedList.stats.needToBuy}</div>
            <div class="stat-label">Need to Buy</div>
        </div>
        <div class="stat-card have">
            <div class="stat-number">${normalizedList.stats.inInventory}</div>
            <div class="stat-label">In Inventory</div>
        </div>
    </div>

    ${Object.entries(normalizedList.itemsByCategory).map(([category, items]) => `
    <div class="category">
        <div class="category-header">
            ${getCategoryDisplayName(category)} (${items.length} items)
        </div>
        <div class="category-items">
            ${items.map(item => `
            <div class="item${item.inInventory ? ' in-inventory' : ''}">
                <div class="checkbox"></div>
                <div class="item-content">
                    <div class="item-name">${item.name}</div>
                    ${item.amount ? `<div class="item-details">Amount: ${item.amount}</div>` : ''}
                    ${item.recipes && item.recipes.length > 0 ? `<div class="item-details">Used in: ${item.recipes.join(', ')}</div>` : ''}
                    ${item.inInventory ? '<div class="inventory-note">✓ Already in inventory</div>' : ''}
                </div>
            </div>
            `).join('')}
        </div>
    </div>
    `).join('')}

    <div class="footer">
        <p class="footer-text">
            This shopping list was generated by ${process.env.APP_NAME || 'Food Inventory App'}
        </p>
        <p class="footer-text">
            <a href="${appUrl}" class="app-link">Get your own Food Inventory App</a>
        </p>
    </div>
</body>
</html>`;

    // Generate plain text version
    const textContent = generatePlainTextEmail({
        senderName,
        recipientName,
        normalizedList,
        personalMessage,
        context,
        contextName,
        dateStr
    });

    return { htmlContent, textContent };
};

// Normalize different shopping list formats
const normalizeShoppingListForEmail = (shoppingList) => {
    let items = [];
    let stats = { totalItems: 0, needToBuy: 0, inInventory: 0 };

    // Handle different shopping list structures
    if (shoppingList.items) {
        if (typeof shoppingList.items === 'object' && !Array.isArray(shoppingList.items)) {
            // Categorized format: { items: { Pantry: [...], Produce: [...] } }
            Object.entries(shoppingList.items).forEach(([category, categoryItems]) => {
                if (Array.isArray(categoryItems)) {
                    categoryItems.forEach(item => {
                        items.push({
                            name: item.name || item.ingredient,
                            amount: item.amount || '',
                            category: category.toLowerCase(),
                            recipes: item.recipes || [],
                            inInventory: item.inInventory || item.haveAmount > 0,
                            originalName: item.originalName
                        });
                    });
                }
            });
        } else if (Array.isArray(shoppingList.items)) {
            // Array format
            items = shoppingList.items.map(item => ({
                name: item.name || item.ingredient,
                amount: item.amount || '',
                category: item.category || 'other',
                recipes: item.recipes || [],
                inInventory: item.inInventory || false,
                originalName: item.originalName
            }));
        }
    }

    // Use provided stats or calculate them
    if (shoppingList.stats || shoppingList.summary) {
        const providedStats = shoppingList.stats || shoppingList.summary;
        stats = {
            totalItems: providedStats.totalItems || items.length,
            needToBuy: providedStats.needToBuy || items.filter(item => !item.inInventory).length,
            inInventory: providedStats.inInventory || providedStats.alreadyHave || items.filter(item => item.inInventory).length
        };
    } else {
        stats = {
            totalItems: items.length,
            needToBuy: items.filter(item => !item.inInventory).length,
            inInventory: items.filter(item => item.inInventory).length
        };
    }

    // Group items by category
    const itemsByCategory = {};
    items.forEach(item => {
        const category = item.category || 'other';
        if (!itemsByCategory[category]) {
            itemsByCategory[category] = [];
        }
        itemsByCategory[category].push(item);
    });

    return { items, stats, itemsByCategory };
};

// Generate plain text version
const generatePlainTextEmail = ({ senderName, normalizedList, personalMessage, context, contextName, dateStr }) => {
    let text = `SHOPPING LIST\n`;
    text += `From: ${senderName}\n`;
    text += `Date: ${dateStr}\n`;

    if (context === 'meal-plan') {
        text += `Meal Plan: ${contextName}\n`;
    } else if (context === 'recipe') {
        text += `Recipe: ${contextName}\n`;
    } else {
        text += `Selected Recipes\n`;
    }

    text += `${'='.repeat(50)}\n\n`;

    if (personalMessage) {
        text += `PERSONAL MESSAGE:\n${personalMessage}\n\n`;
    }

    text += `SUMMARY:\n`;
    text += `Total Items: ${normalizedList.stats.totalItems}\n`;
    text += `Need to Buy: ${normalizedList.stats.needToBuy}\n`;
    text += `In Inventory: ${normalizedList.stats.inInventory}\n\n`;

    Object.entries(normalizedList.itemsByCategory).forEach(([category, items]) => {
        text += `${getCategoryDisplayName(category).toUpperCase()} (${items.length} items)\n`;
        text += `${'-'.repeat(30)}\n`;

        items.forEach(item => {
            text += `☐ ${item.name}`;
            if (item.amount) {
                text += ` - ${item.amount}`;
            }
            if (item.inInventory) {
                text += ` [IN INVENTORY]`;
            }
            text += `\n`;
            if (item.recipes && item.recipes.length > 0) {
                text += `  Used in: ${item.recipes.join(', ')}\n`;
            }
        });
        text += `\n`;
    });

    text += `Generated by ${process.env.APP_NAME || 'Food Inventory App'}\n`;
    text += `${process.env.APP_URL || 'http://localhost:3000'}\n`;

    return text;
};

// Get category display names
const getCategoryDisplayName = (category) => {
    const names = {
        produce: '🥬 Produce',
        grains: '🌾 Grains',
        pantry: '🥫 Pantry & Dry Goods',
        condiments: '🫙 Condiments',
        dairy: '🥛 Dairy & Eggs',
        meat: '🥩 Meat & Seafood',
        frozen: '🧊 Frozen Foods',
        bakery: '🍞 Bakery',
        other: '📦 Other Items'
    };
    return names[category.toLowerCase()] || `📦 ${category}`;
};

// Main email sending function
export const sendShoppingListEmail = async ({
                                                toEmails,
                                                senderName,
                                                senderEmail,
                                                shoppingList,
                                                personalMessage = '',
                                                context = 'recipes', // 'recipe', 'recipes', 'meal-plan'
                                                contextName = 'Selected Recipes'
                                            }) => {
    try {
        // Validate inputs
        if (!toEmails || toEmails.length === 0) {
            throw new Error('At least one recipient email is required');
        }

        if (!shoppingList) {
            throw new Error('Shopping list is required');
        }

        // Generate email content
        const { htmlContent, textContent } = getShoppingListEmailTemplate({
            senderName,
            recipientName: 'there', // Generic greeting for multiple recipients
            shoppingList,
            personalMessage,
            context,
            contextName,
            appUrl: process.env.APP_URL || 'http://localhost:3000'
        });

        // Prepare email data
        const emailData = {
            from: process.env.FROM_EMAIL || 'noreply@localhost',
            to: toEmails,
            subject: `🛒 Shopping List from ${senderName}${contextName ? ` - ${contextName}` : ''}`,
            html: htmlContent,
            text: textContent,
            replyTo: senderEmail
        };

        // Send email
        const result = await resend.emails.send(emailData);

        return {
            success: true,
            messageId: result.id,
            recipientCount: toEmails.length
        };

    } catch (error) {
        console.error('Email sending error:', error);
        throw new Error(`Failed to send email: ${error.message}`);
    }
};

// Validate email addresses
export const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

// Validate multiple emails
export const validateEmails = (emails) => {
    return emails.every(email => validateEmail(email.trim()));
};