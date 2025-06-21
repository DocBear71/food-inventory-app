// file: /src/lib/email.js v3 - Added expiration notification template and subscription gates

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
            This shopping list was generated by ${process.env.APP_NAME || 'Doc Bear\'s Comfort Kitchen App'}
        </p>
        <p class="footer-text">
            <a href="${appUrl}" class="app-link">Get your own Doc Bear's Comfort Kitchen App</a>
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

// NEW: Get expiration notification email template
const getExpirationNotificationTemplate = ({
                                               userName,
                                               expiringItems,
                                               totalCount,
                                               appUrl
                                           }) => {
    const currentYear = new Date().getFullYear();
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    // Organize items by expiration status
    const expiredItems = expiringItems.filter(item => item.status === 'expired');
    const expiringToday = expiringItems.filter(item => item.status === 'expires-today');
    const expiringSoon = expiringItems.filter(item => item.status === 'expires-soon');
    const expiringThisWeek = expiringItems.filter(item => item.status === 'expires-week');

    const getStatusIcon = (status) => {
        switch (status) {
            case 'expired': return '🚨';
            case 'expires-today': return '⚠️';
            case 'expires-soon': return '⏰';
            case 'expires-week': return '📅';
            default: return '📦';
        }
    };

    const getStatusLabel = (status, daysUntil) => {
        switch (status) {
            case 'expired': return `Expired ${Math.abs(daysUntil)} day${Math.abs(daysUntil) !== 1 ? 's' : ''} ago`;
            case 'expires-today': return 'Expires today';
            case 'expires-soon': return `Expires in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}`;
            case 'expires-week': return `Expires in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}`;
            default: return 'Check expiration';
        }
    };

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Food Expiration Alert - Doc Bear's Comfort Kitchen</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            line-height: 1.6;
            color: #333333;
            background-color: #f8fafc;
        }
        
        .email-container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
        }
        
        .header {
            background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
            padding: 40px 30px;
            text-align: center;
        }
        
        .logo {
            font-size: 28px;
            font-weight: bold;
            color: #ffffff;
            margin-bottom: 8px;
        }
        
        .header-subtitle {
            color: #fef3c7;
            font-size: 16px;
            margin: 0;
        }
        
        .content {
            padding: 40px 30px;
        }
        
        .alert-badge {
            background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
            color: white;
            padding: 20px;
            border-radius: 12px;
            text-align: center;
            margin-bottom: 30px;
        }
        
        .alert-badge h2 {
            margin: 0;
            font-size: 20px;
            font-weight: 600;
        }
        
        .summary-stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
            gap: 15px;
            margin-bottom: 30px;
        }
        
        .stat-card {
            text-align: center;
            padding: 15px;
            border-radius: 8px;
            border: 2px solid #e5e7eb;
        }
        
        .stat-card.expired { border-color: #dc2626; background: #fef2f2; }
        .stat-card.today { border-color: #ea580c; background: #fff7ed; }
        .stat-card.soon { border-color: #d97706; background: #fffbeb; }
        .stat-card.week { border-color: #ca8a04; background: #fefce8; }
        
        .stat-number {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 5px;
        }
        
        .stat-card.expired .stat-number { color: #dc2626; }
        .stat-card.today .stat-number { color: #ea580c; }
        .stat-card.soon .stat-number { color: #d97706; }
        .stat-card.week .stat-number { color: #ca8a04; }
        
        .stat-label {
            font-size: 12px;
            font-weight: 500;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .items-section {
            margin-bottom: 30px;
        }
        
        .section-header {
            font-weight: 600;
            font-size: 16px;
            margin-bottom: 15px;
            padding-bottom: 8px;
            border-bottom: 2px solid #e5e7eb;
        }
        
        .item {
            display: flex;
            align-items: center;
            padding: 12px 15px;
            border-radius: 8px;
            margin-bottom: 8px;
        }
        
        .item.expired { background: #fef2f2; border-left: 4px solid #dc2626; }
        .item.expires-today { background: #fff7ed; border-left: 4px solid #ea580c; }
        .item.expires-soon { background: #fffbeb; border-left: 4px solid #d97706; }
        .item.expires-week { background: #fefce8; border-left: 4px solid #ca8a04; }
        
        .item-icon {
            font-size: 20px;
            margin-right: 12px;
        }
        
        .item-details {
            flex: 1;
        }
        
        .item-name {
            font-weight: 500;
            font-size: 14px;
            margin-bottom: 2px;
        }
        
        .item-info {
            font-size: 12px;
            color: #6b7280;
        }
        
        .item-status {
            font-size: 12px;
            font-weight: 500;
            text-align: right;
        }
        
        .action-section {
            background: #f0f9ff;
            border: 1px solid #0ea5e9;
            border-radius: 12px;
            padding: 20px;
            margin: 25px 0;
            text-align: center;
        }
        
        .action-section h4 {
            margin: 0 0 10px 0;
            color: #0c4a6e;
            font-size: 16px;
            font-weight: 600;
        }
        
        .action-button {
            display: inline-block;
            padding: 12px 24px;
            background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);
            color: #ffffff;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            font-size: 14px;
            margin: 10px 5px;
        }
        
        .action-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(14, 165, 233, 0.4);
        }
        
        .tips-section {
            background: #f0fdf4;
            border: 1px solid #22c55e;
            border-radius: 8px;
            padding: 20px;
            margin: 25px 0;
        }
        
        .tips-section h4 {
            margin: 0 0 10px 0;
            color: #166534;
            font-size: 16px;
            font-weight: 600;
        }
        
        .tips-section ul {
            margin: 10px 0 0 0;
            padding-left: 20px;
            color: #15803d;
        }
        
        .tips-section li {
            margin: 5px 0;
            font-size: 14px;
        }
        
        .footer {
            background-color: #f7fafc;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e2e8f0;
        }
        
        .footer p {
            margin: 0 0 10px 0;
            color: #718096;
            font-size: 14px;
        }
        
        .footer .copyright {
            font-size: 12px;
            color: #a0aec0;
            margin-top: 20px;
        }
        
        /* Mobile responsive */
        @media only screen and (max-width: 600px) {
            .content, .header, .footer {
                padding: 25px 20px !important;
            }
            
            .summary-stats {
                grid-template-columns: 1fr 1fr !important;
            }
            
            .stat-card {
                padding: 12px !important;
            }
            
            .stat-number {
                font-size: 20px !important;
            }
            
            .action-button {
                width: calc(100% - 20px) !important;
                margin: 10px 10px !important;
            }
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <div class="logo">🐻 Doc Bear's Comfort Kitchen</div>
            <p class="header-subtitle">Food Expiration Alert</p>
        </div>
        
        <div class="content">
            <div class="alert-badge">
                <h2>⏰ ${totalCount} Item${totalCount !== 1 ? 's' : ''} Need${totalCount === 1 ? 's' : ''} Your Attention!</h2>
            </div>
            
            <p>Hello ${userName},</p>
            
            <p>We're helping you reduce food waste by alerting you about items in your inventory that are expiring soon or have already expired.</p>
            
            <div class="summary-stats">
                ${expiredItems.length > 0 ? `
                <div class="stat-card expired">
                    <div class="stat-number">${expiredItems.length}</div>
                    <div class="stat-label">Expired</div>
                </div>
                ` : ''}
                ${expiringToday.length > 0 ? `
                <div class="stat-card today">
                    <div class="stat-number">${expiringToday.length}</div>
                    <div class="stat-label">Today</div>
                </div>
                ` : ''}
                ${expiringSoon.length > 0 ? `
                <div class="stat-card soon">
                    <div class="stat-number">${expiringSoon.length}</div>
                    <div class="stat-label">1-3 Days</div>
                </div>
                ` : ''}
                ${expiringThisWeek.length > 0 ? `
                <div class="stat-card week">
                    <div class="stat-number">${expiringThisWeek.length}</div>
                    <div class="stat-label">This Week</div>
                </div>
                ` : ''}
            </div>

            ${expiredItems.length > 0 ? `
            <div class="items-section">
                <div class="section-header" style="color: #dc2626;">🚨 Already Expired</div>
                ${expiredItems.map(item => `
                <div class="item expired">
                    <div class="item-icon">${getStatusIcon(item.status)}</div>
                    <div class="item-details">
                        <div class="item-name">${item.name}${item.brand ? ` (${item.brand})` : ''}</div>
                        <div class="item-info">${item.quantity} ${item.unit} • ${item.location} • Exp: ${new Date(item.expirationDate).toLocaleDateString()}</div>
                    </div>
                    <div class="item-status" style="color: #dc2626;">
                        ${getStatusLabel(item.status, item.daysUntil)}
                    </div>
                </div>
                `).join('')}
            </div>
            ` : ''}

            ${expiringToday.length > 0 ? `
            <div class="items-section">
                <div class="section-header" style="color: #ea580c;">⚠️ Expires Today</div>
                ${expiringToday.map(item => `
                <div class="item expires-today">
                    <div class="item-icon">${getStatusIcon(item.status)}</div>
                    <div class="item-details">
                        <div class="item-name">${item.name}${item.brand ? ` (${item.brand})` : ''}</div>
                        <div class="item-info">${item.quantity} ${item.unit} • ${item.location} • Exp: ${new Date(item.expirationDate).toLocaleDateString()}</div>
                    </div>
                    <div class="item-status" style="color: #ea580c;">
                        ${getStatusLabel(item.status, item.daysUntil)}
                    </div>
                </div>
                `).join('')}
            </div>
            ` : ''}

            ${expiringSoon.length > 0 ? `
            <div class="items-section">
                <div class="section-header" style="color: #d97706;">⏰ Expires Soon (1-3 Days)</div>
                ${expiringSoon.map(item => `
                <div class="item expires-soon">
                    <div class="item-icon">${getStatusIcon(item.status)}</div>
                    <div class="item-details">
                        <div class="item-name">${item.name}${item.brand ? ` (${item.brand})` : ''}</div>
                        <div class="item-info">${item.quantity} ${item.unit} • ${item.location} • Exp: ${new Date(item.expirationDate).toLocaleDateString()}</div>
                    </div>
                    <div class="item-status" style="color: #d97706;">
                        ${getStatusLabel(item.status, item.daysUntil)}
                    </div>
                </div>
                `).join('')}
            </div>
            ` : ''}

            ${expiringThisWeek.length > 0 ? `
            <div class="items-section">
                <div class="section-header" style="color: #ca8a04;">📅 Expires This Week</div>
                ${expiringThisWeek.map(item => `
                <div class="item expires-week">
                    <div class="item-icon">${getStatusIcon(item.status)}</div>
                    <div class="item-details">
                        <div class="item-name">${item.name}${item.brand ? ` (${item.brand})` : ''}</div>
                        <div class="item-info">${item.quantity} ${item.unit} • ${item.location} • Exp: ${new Date(item.expirationDate).toLocaleDateString()}</div>
                    </div>
                    <div class="item-status" style="color: #ca8a04;">
                        ${getStatusLabel(item.status, item.daysUntil)}
                    </div>
                </div>
                `).join('')}
            </div>
            ` : ''}
            
            <div class="action-section">
                <h4>🍳 Take Action Now</h4>
                <p style="margin: 0 0 15px 0; color: #0c4a6e;">Don't let good food go to waste! Here's what you can do:</p>
                <a href="${appUrl}/inventory" class="action-button">View My Inventory</a>
                <a href="${appUrl}/recipes?search=use-expiring" class="action-button">Find Quick Recipes</a>
            </div>
            
            <div class="tips-section">
                <h4>💡 Food Waste Prevention Tips</h4>
                <ul>
                    <li><strong>Use the "First In, First Out" rule:</strong> Use older items before newer ones</li>
                    <li><strong>Cook in batches:</strong> Prepare meals using expiring ingredients and freeze portions</li>
                    <li><strong>Get creative:</strong> Overripe fruits are perfect for smoothies or baking</li>
                    <li><strong>Store properly:</strong> Keep items in optimal conditions to extend freshness</li>
                    <li><strong>Share with neighbors:</strong> If you can't use something, consider sharing</li>
                </ul>
            </div>
            
            <p>Remember, these dates are often "best by" rather than "unsafe after" dates. Use your senses - smell, look, and taste (when safe) to determine if food is still good.</p>
            
            <p style="margin-top: 30px;">
                Happy cooking and reducing waste!<br>
                <em>The Doc Bear's Comfort Kitchen Team</em>
            </p>
        </div>
        
        <div class="footer">
            <p>This expiration alert was sent from Doc Bear's Comfort Kitchen</p>
            <p>You can adjust your notification preferences in your <a href="${appUrl}/profile" style="color: #4f46e5;">profile settings</a></p>
            <p class="copyright">© ${currentYear} Doc Bear's Comfort Kitchen. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`;

    const text = `
Food Expiration Alert - Doc Bear's Comfort Kitchen

Hello ${userName},

We're helping you reduce food waste by alerting you about ${totalCount} item${totalCount !== 1 ? 's' : ''} in your inventory that need${totalCount === 1 ? 's' : ''} your attention.

SUMMARY:
${expiredItems.length > 0 ? `- ${expiredItems.length} item${expiredItems.length !== 1 ? 's' : ''} already expired` : ''}
${expiringToday.length > 0 ? `- ${expiringToday.length} item${expiringToday.length !== 1 ? 's' : ''} expire${expiringToday.length === 1 ? 's' : ''} today` : ''}
${expiringSoon.length > 0 ? `- ${expiringSoon.length} item${expiringSoon.length !== 1 ? 's' : ''} expire${expiringSoon.length === 1 ? 's' : ''} in 1-3 days` : ''}
${expiringThisWeek.length > 0 ? `- ${expiringThisWeek.length} item${expiringThisWeek.length !== 1 ? 's' : ''} expire${expiringThisWeek.length === 1 ? 's' : ''} this week` : ''}

ITEM DETAILS:
${expiringItems.map(item => `
${getStatusIcon(item.status)} ${item.name}${item.brand ? ` (${item.brand})` : ''}
   ${item.quantity} ${item.unit} • ${item.location}
   Expires: ${new Date(item.expirationDate).toLocaleDateString()}
   Status: ${getStatusLabel(item.status, item.daysUntil)}
`).join('')}

TAKE ACTION:
• View your inventory: ${appUrl}/inventory
• Find recipes to use expiring items: ${appUrl}/recipes

FOOD WASTE PREVENTION TIPS:
• Use the "First In, First Out" rule - use older items first
• Cook in batches and freeze portions
• Get creative - overripe fruits are perfect for smoothies
• Store items properly to extend freshness
• Share with neighbors if you can't use something

Remember, these dates are often "best by" rather than "unsafe after" dates. Use your senses to determine if food is still good.

Happy cooking and reducing waste!
The Doc Bear's Comfort Kitchen Team

© ${currentYear} Doc Bear's Comfort Kitchen. All rights reserved.
    `;

    return { html, text };
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

    text += `Generated by ${process.env.APP_NAME || 'Doc Bear\'s Comfort Kitchen App'}\n`;
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

// UPDATED: Main email sending function with subscription validation
export const sendShoppingListEmail = async ({
                                                toEmails,
                                                senderName,
                                                senderEmail,
                                                shoppingList,
                                                personalMessage = '',
                                                context = 'recipes', // 'recipe', 'recipes', 'meal-plan'
                                                contextName = 'Selected Recipes',
                                                userSubscription = null,
                                                userId = null
                                            }) => {
    try {
        // SUBSCRIPTION VALIDATION - Check if user has email sharing access
        if (userSubscription) {
            const { checkFeatureAccess, checkUsageLimit } = require('./subscription-config');

            // Check feature access
            if (!checkFeatureAccess(userSubscription, 'EMAIL_SHARING')) {
                throw new Error('Email sharing is a Gold feature. Please upgrade your subscription to share shopping lists via email.');
            }

            // Check usage limits for Gold users (50 emails/month)
            if (userId) {
                const { User } = require('./models');
                const user = await User.findById(userId).select('usageTracking');

                if (user && user.usageTracking) {
                    const currentMonth = new Date().getMonth();
                    const currentYear = new Date().getFullYear();

                    // Reset monthly counter if new month
                    if (user.usageTracking.currentMonth !== currentMonth ||
                        user.usageTracking.currentYear !== currentYear) {
                        user.usageTracking.currentMonth = currentMonth;
                        user.usageTracking.currentYear = currentYear;
                        user.usageTracking.monthlyEmailShares = 0;
                    }

                    const currentUsage = user.usageTracking.monthlyEmailShares || 0;

                    if (!checkUsageLimit(userSubscription, 'emailSharesPerMonth', currentUsage)) {
                        const { getUsageLimit } = require('./subscription-config');
                        const limit = getUsageLimit(userSubscription, 'emailSharesPerMonth');
                        throw new Error(`You've reached your monthly email sharing limit (${limit} emails). Upgrade to Platinum for unlimited email sharing.`);
                    }

                    // Track this usage
                    user.usageTracking.monthlyEmailShares = currentUsage + 1;
                    user.usageTracking.lastUpdated = new Date();
                    await user.save();
                }
            }
        }

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

// NEW: Send expiration notification email with subscription validation
export const sendExpirationNotificationEmail = async ({
                                                          toEmail,
                                                          userName,
                                                          expiringItems,
                                                          userSubscription = null,
                                                          userId = null
                                                      }) => {
    try {
        // SUBSCRIPTION VALIDATION - Check if user has email notifications access
        if (userSubscription) {
            const { checkFeatureAccess, checkUsageLimit } = require('./subscription-config');

            // Check feature access
            if (!checkFeatureAccess(userSubscription, 'EMAIL_NOTIFICATIONS')) {
                console.log('User does not have email notifications access, skipping expiration email');
                return {
                    success: false,
                    reason: 'Email notifications require a Gold+ subscription'
                };
            }

            // Check usage limits for Gold users (100 emails/month)
            if (userId) {
                const { User } = require('./models');
                const user = await User.findById(userId).select('usageTracking');

                if (user && user.usageTracking) {
                    const currentMonth = new Date().getMonth();
                    const currentYear = new Date().getFullYear();

                    // Reset monthly counter if new month
                    if (user.usageTracking.currentMonth !== currentMonth ||
                        user.usageTracking.currentYear !== currentYear) {
                        user.usageTracking.currentMonth = currentMonth;
                        user.usageTracking.currentYear = currentYear;
                        user.usageTracking.monthlyEmailNotifications = 0;
                    }

                    const currentUsage = user.usageTracking.monthlyEmailNotifications || 0;

                    if (!checkUsageLimit(userSubscription, 'emailNotificationsPerMonth', currentUsage)) {
                        console.log('User has reached email notification limit');
                        return {
                            success: false,
                            reason: 'Monthly email notification limit reached'
                        };
                    }

                    // Track this usage
                    user.usageTracking.monthlyEmailNotifications = currentUsage + 1;
                    user.usageTracking.lastUpdated = new Date();
                    await user.save();
                }
            }
        }

        // Validate inputs
        if (!toEmail) {
            throw new Error('Recipient email is required');
        }

        if (!expiringItems || expiringItems.length === 0) {
            throw new Error('No expiring items provided');
        }

        // Generate email content
        const { html, text } = getExpirationNotificationTemplate({
            userName,
            expiringItems,
            totalCount: expiringItems.length,
            appUrl: process.env.APP_URL || 'http://localhost:3000'
        });

        // Prepare email data
        const emailData = {
            from: process.env.FROM_EMAIL || 'noreply@docbearscomfortkitchen.com',
            to: [toEmail],
            subject: `⏰ Food Expiration Alert - ${expiringItems.length} Item${expiringItems.length !== 1 ? 's' : ''} Need Your Attention`,
            html,
            text
        };

        // Send email
        const result = await resend.emails.send(emailData);

        return {
            success: true,
            messageId: result.id,
            itemCount: expiringItems.length
        };

    } catch (error) {
        console.error('Expiration notification email error:', error);
        throw new Error(`Failed to send expiration notification: ${error.message}`);
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

class EmailService {
    constructor() {
        this.fromEmail = process.env.FROM_EMAIL || 'noreply@docbearscomfortkitchen.com';
        this.fromName = process.env.FROM_NAME || "Doc Bear's Comfort Kitchen";
        this.baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    }

    getFromAddress() {
        return `${this.fromName} <${this.fromEmail}>`;
    }

    // UPDATED: Email sending with subscription validation
    async sendEmail(to, subject, htmlContent, textContent = null, userSubscription = null, userId = null) {
        try {
            // SUBSCRIPTION VALIDATION for general email sending
            if (userSubscription) {
                const { checkFeatureAccess } = require('./subscription-config');

                if (!checkFeatureAccess(userSubscription, 'EMAIL_SHARING')) {
                    throw new Error('Email features require a Gold subscription.');
                }
            }

            // Validate configuration
            if (!process.env.RESEND_API_KEY) {
                throw new Error('RESEND_API_KEY is not configured');
            }

            const result = await resend.emails.send({
                from: this.getFromAddress(),
                to,
                subject,
                html: htmlContent,
                text: textContent || this.stripHtml(htmlContent)
            });

            if (result.error) {
                throw new Error(`Resend API error: ${result.error.message}`);
            }

            console.log(`Email sent successfully to ${to} via Resend:`, result.data.id);
            return {
                success: true,
                messageId: result.data.id,
                provider: 'resend'
            };

        } catch (error) {
            console.error('Email sending failed:', error);
            throw new Error(`Failed to send email via Resend: ${error.message}`);
        }
    }

    stripHtml(html) {
        return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    }

    // Test Resend configuration
    async testConnection() {
        try {
            if (!process.env.RESEND_API_KEY) {
                return {
                    success: false,
                    error: 'RESEND_API_KEY environment variable is not set'
                };
            }

            // Try to get domains (this will validate the API key)
            const domains = await resend.domains.list();

            return {
                success: true,
                message: 'Resend API key is valid',
                domains: domains.data?.data || []
            };
        } catch (error) {
            return {
                success: false,
                error: `Resend connection failed: ${error.message}`
            };
        }
    }
}

// Email templates optimized for Resend
export class EmailTemplates {
    static getPasswordResetTemplate(resetUrl, userEmail, expiryMinutes = 10) {
        const currentYear = new Date().getFullYear();

        const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Reset - Doc Bear's Comfort Kitchen</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            line-height: 1.6;
            color: #333333;
            background-color: #f8fafc;
        }
        
        .email-container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
        }
        
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 40px 30px;
            text-align: center;
        }
        
        .logo {
            font-size: 28px;
            font-weight: bold;
            color: #ffffff;
            margin-bottom: 8px;
        }
        
        .header-subtitle {
            color: #e2e8f0;
            font-size: 16px;
            margin: 0;
        }
        
        .content {
            padding: 40px 30px;
        }
        
        .title {
            font-size: 24px;
            font-weight: 600;
            color: #1a202c;
            margin: 0 0 20px 0;
            text-align: center;
        }
        
        .message {
            font-size: 16px;
            line-height: 1.6;
            color: #4a5568;
            margin-bottom: 30px;
        }
        
        .reset-button {
            display: block;
            width: fit-content;
            margin: 30px auto;
            padding: 16px 32px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #ffffff;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            font-size: 16px;
            text-align: center;
            transition: all 0.2s;
        }
        
        .reset-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }
        
        .footer {
            background-color: #f7fafc;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e2e8f0;
        }
        
        .footer p {
            margin: 0 0 10px 0;
            color: #718096;
            font-size: 14px;
        }
        
        .footer .copyright {
            font-size: 12px;
            color: #a0aec0;
            margin-top: 20px;
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <div class="logo">🐻 Doc Bear's Comfort Kitchen</div>
            <p class="header-subtitle">Your culinary companion</p>
        </div>
        
        <div class="content">
            <h1 class="title">Password Reset Request</h1>
            
            <div class="message">
                <p>Hello,</p>
                <p>We received a request to reset the password for your account associated with <strong>${userEmail}</strong>.</p>
                <p>If you requested this password reset, click the button below to create a new password:</p>
            </div>
            
            <a href="${resetUrl}" class="reset-button">Reset My Password</a>
            
            <div class="message">
                <p>This link will expire in <strong>${expiryMinutes} minutes</strong> and can only be used once.</p>
                <p>If you didn't request a password reset, you can safely ignore this email.</p>
            </div>
        </div>
        
        <div class="footer">
            <p>This email was sent from Doc Bear's Comfort Kitchen</p>
            <p class="copyright">© ${currentYear} Doc Bear's Comfort Kitchen. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`;

        const text = `
Password Reset Request - Doc Bear's Comfort Kitchen

Hello,

We received a request to reset the password for your account associated with ${userEmail}.

If you requested this password reset, click the link below to create a new password:

${resetUrl}

This link will expire in ${expiryMinutes} minutes and can only be used once.

If you didn't request a password reset, you can safely ignore this email.

© ${currentYear} Doc Bear's Comfort Kitchen. All rights reserved.
        `;

        return { html, text };
    }

    static getPasswordChangeConfirmationTemplate(userEmail) {
        const currentYear = new Date().getFullYear();
        const changeTime = new Date().toLocaleString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            timeZoneName: 'short'
        });

        const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Changed - Doc Bear's Comfort Kitchen</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            line-height: 1.6;
            color: #333333;
            background-color: #f8fafc;
        }
        
        .email-container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
        }
        
        .header {
            background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);
            padding: 40px 30px;
            text-align: center;
        }
        
        .logo {
            font-size: 28px;
            font-weight: bold;
            color: #ffffff;
            margin-bottom: 8px;
        }
        
        .header-subtitle {
            color: #c6f6d5;
            font-size: 16px;
            margin: 0;
        }
        
        .content {
            padding: 40px 30px;
        }
        
        .footer {
            background-color: #f7fafc;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e2e8f0;
        }
        
        .footer p {
            margin: 0 0 10px 0;
            color: #718096;
            font-size: 14px;
        }
        
        .footer .copyright {
            font-size: 12px;
            color: #a0aec0;
            margin-top: 20px;
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <div class="logo">🐻 Doc Bear's Comfort Kitchen</div>
            <p class="header-subtitle">Your culinary companion</p>
        </div>
        
        <div class="content">
            <h2>✅ Password Successfully Changed!</h2>
            
            <p>Hello,</p>
            
            <p>This email confirms that the password for your account <strong>${userEmail}</strong> was successfully changed on ${changeTime}.</p>
            
            <p>If you didn't make this change, please contact our support team immediately.</p>
            
            <p>Thank you for keeping your Doc Bear's Comfort Kitchen account secure!</p>
        </div>
        
        <div class="footer">
            <p>This email was sent from Doc Bear's Comfort Kitchen</p>
            <p class="copyright">© ${currentYear} Doc Bear's Comfort Kitchen. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`;

        const text = `
Password Successfully Changed - Doc Bear's Comfort Kitchen

Hello,

This email confirms that the password for your account ${userEmail} was successfully changed on ${changeTime}.

If you didn't make this change, please contact our support team immediately.

Thank you for keeping your Doc Bear's Comfort Kitchen account secure!

© ${currentYear} Doc Bear's Comfort Kitchen. All rights reserved.
        `;

        return { html, text };
    }

    static getEmailVerificationTemplate(verificationUrl, userEmail, userName) {
        const currentYear = new Date().getFullYear();

        const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verify Your Email - Doc Bear's Comfort Kitchen</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            line-height: 1.6;
            color: #333333;
            background-color: #f8fafc;
        }
        
        .email-container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
        }
        
        .header {
            background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);
            padding: 40px 30px;
            text-align: center;
        }
        
        .logo {
            font-size: 28px;
            font-weight: bold;
            color: #ffffff;
            margin-bottom: 8px;
        }
        
        .header-subtitle {
            color: #c6f6d5;
            font-size: 16px;
            margin: 0;
        }
        
        .content {
            padding: 40px 30px;
        }
        
        .verify-button {
            display: block;
            width: fit-content;
            margin: 30px auto;
            padding: 16px 32px;
            background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);
            color: #ffffff;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            font-size: 16px;
            text-align: center;
        }
        
        .footer {
            background-color: #f7fafc;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e2e8f0;
        }
        
        .footer p {
            margin: 0 0 10px 0;
            color: #718096;
            font-size: 14px;
        }
        
        .footer .copyright {
            font-size: 12px;
            color: #a0aec0;
            margin-top: 20px;
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <div class="logo">🐻 Doc Bear's Comfort Kitchen</div>
            <p class="header-subtitle">Your culinary companion</p>
        </div>
        
        <div class="content">
            <h2>🎉 Welcome to Doc Bear's Comfort Kitchen!</h2>
            
            <p>Hello ${userName},</p>
            
            <p>Thank you for creating your account! To get started, please verify your email address:</p>
            
            <a href="${verificationUrl}" class="verify-button">Verify My Email Address</a>
            
            <p>This verification link will expire in 24 hours.</p>
            
            <p>Welcome to the family!</p>
        </div>
        
        <div class="footer">
            <p>This email was sent to verify your account creation</p>
            <p class="copyright">© ${currentYear} Doc Bear's Comfort Kitchen. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`;

        const text = `
Welcome to Doc Bear's Comfort Kitchen!

Hello ${userName},

Thank you for creating your account! To get started, please verify your email address by clicking this link:

${verificationUrl}

This verification link will expire in 24 hours.

Welcome to the family!

© ${currentYear} Doc Bear's Comfort Kitchen. All rights reserved.
    `;

        return { html, text };
    }

    static getAccountDeletionConfirmationTemplate(userEmail, userName) {
        const currentYear = new Date().getFullYear();
        const deletionTime = new Date().toLocaleString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            timeZoneName: 'short'
        });

        const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Account Deleted - Doc Bear's Comfort Kitchen</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            line-height: 1.6;
            color: #333333;
            background-color: #f8fafc;
        }
        
        .email-container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
        }
        
        .header {
            background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
            padding: 40px 30px;
            text-align: center;
        }
        
        .logo {
            font-size: 28px;
            font-weight: bold;
            color: #ffffff;
            margin-bottom: 8px;
        }
        
        .header-subtitle {
            color: #fecaca;
            font-size: 16px;
            margin: 0;
        }
        
        .content {
            padding: 40px 30px;
        }
        
        .title {
            font-size: 24px;
            font-weight: 600;
            color: #1a202c;
            margin: 0 0 20px 0;
            text-align: center;
        }
        
        .deletion-confirmation {
            background: #fef2f2;
            border: 1px solid #fecaca;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
        }
        
        .deletion-confirmation h3 {
            color: #dc2626;
            margin: 0 0 10px 0;
            font-size: 18px;
        }
        
        .footer {
            background-color: #f7fafc;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e2e8f0;
        }
        
        .footer p {
            margin: 0 0 10px 0;
            color: #718096;
            font-size: 14px;
        }
        
        .footer .copyright {
            font-size: 12px;
            color: #a0aec0;
            margin-top: 20px;
        }
        
        .data-notice {
            background: #f0f9ff;
            border: 1px solid #0ea5e9;
            border-radius: 8px;
            padding: 15px;
            margin: 20px 0;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <div class="logo">🐻 Doc Bear's Comfort Kitchen</div>
            <p class="header-subtitle">Account Deletion Confirmation</p>
        </div>
        
        <div class="content">
            <h1 class="title">Account Successfully Deleted</h1>
            
            <p>Hello ${userName},</p>
            
            <div class="deletion-confirmation">
                <h3>✅ Your account has been permanently deleted</h3>
                <p><strong>Account:</strong> ${userEmail}</p>
                <p><strong>Deletion Date:</strong> ${deletionTime}</p>
            </div>
            
            <p>We have successfully processed your account deletion request. All of your personal data, including:</p>
            
            <ul>
                <li>Profile information and preferences</li>
                <li>Inventory items and tracking data</li>
                <li>Personal recipes and meal plans</li>
                <li>Shopping lists and templates</li>
                <li>Nutrition logs and goals</li>
                <li>Account settings and preferences</li>
            </ul>
            
            <p>...has been permanently removed from our systems.</p>
            
            <div class="data-notice">
                <strong>Note about public recipes:</strong> Any recipes you previously made public have been anonymized but remain available to the community. This helps preserve valuable content while protecting your privacy.
            </div>
            
            <p>Thank you for being part of the Doc Bear's Comfort Kitchen community. We're sorry to see you go, and we hope our paths cross again in the future.</p>
            
            <p>If you have any questions about this deletion or need assistance, please contact our support team.</p>
            
            <p>Best wishes,<br>
            The Doc Bear's Comfort Kitchen Team</p>
        </div>
        
        <div class="footer">
            <p>This is a confirmation email for account deletion</p>
            <p class="copyright">© ${currentYear} Doc Bear's Comfort Kitchen. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`;

        const text = `
Account Successfully Deleted - Doc Bear's Comfort Kitchen

Hello ${userName},

Your account has been permanently deleted.

Account: ${userEmail}
Deletion Date: ${deletionTime}

We have successfully processed your account deletion request. All of your personal data has been permanently removed from our systems, including:

- Profile information and preferences
- Inventory items and tracking data
- Personal recipes and meal plans
- Shopping lists and templates
- Nutrition logs and goals
- Account settings and preferences

Note about public recipes: Any recipes you previously made public have been anonymized but remain available to the community. This helps preserve valuable content while protecting your privacy.

Thank you for being part of the Doc Bear's Comfort Kitchen community. We're sorry to see you go, and we hope our paths cross again in the future.

If you have any questions about this deletion or need assistance, please contact our support team.

Best wishes,
The Doc Bear's Comfort Kitchen Team

© ${currentYear} Doc Bear's Comfort Kitchen. All rights reserved.
    `;

        return { html, text };
    }
}

// Create singleton instance
const emailService = new EmailService();

export default emailService;

// Helper functions for easy use
export async function sendPasswordResetEmail(email, resetToken) {
    const resetUrl = `${emailService.baseUrl}/auth/reset-password?token=${resetToken}`;
    const template = EmailTemplates.getPasswordResetTemplate(resetUrl, email);

    return await emailService.sendEmail(
        email,
        'Reset Your Password - Doc Bear\'s Comfort Kitchen',
        template.html,
        template.text
    );
}

export async function sendPasswordChangeConfirmationEmail(email) {
    const template = EmailTemplates.getPasswordChangeConfirmationTemplate(email);

    return await emailService.sendEmail(
        email,
        'Password Changed Successfully - Doc Bear\'s Comfort Kitchen',
        template.html,
        template.text
    );
}

export async function sendEmailVerificationEmail(email, verificationToken, userName) {
    const verificationUrl = `${emailService.baseUrl}/auth/verify-email?token=${verificationToken}`;
    const template = EmailTemplates.getEmailVerificationTemplate(verificationUrl, email, userName);

    return await emailService.sendEmail(
        email,
        'Verify Your Email Address - Doc Bear\'s Comfort Kitchen',
        template.html,
        template.text
    );
}

export async function sendAccountDeletionConfirmationEmail(email, userName) {
    const template = EmailTemplates.getAccountDeletionConfirmationTemplate(email, userName);

    return await emailService.sendEmail(
        email,
        'Account Deleted Successfully - Doc Bear\'s Comfort Kitchen',
        template.html,
        template.text
    );
}

export async function testEmailConfiguration() {
    return await emailService.testConnection();
}