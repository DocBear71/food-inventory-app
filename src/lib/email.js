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

class EmailService {
    constructor() {
        this.fromEmail = process.env.FROM_EMAIL || 'noreply@docbearscomfortkitchen.com';
        this.fromName = process.env.FROM_NAME || "Doc Bear's Comfort Kitchen";
        this.baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    }

    getFromAddress() {
        return `${this.fromName} <${this.fromEmail}>`;
    }

    async sendEmail(to, subject, htmlContent, textContent = null) {
        try {
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
    <!--[if mso]>
    <noscript>
        <xml>
            <o:OfficeDocumentSettings>
                <o:PixelsPerInch>96</o:PixelsPerInch>
            </o:OfficeDocumentSettings>
        </xml>
    </noscript>
    <![endif]-->
    <style>
        /* Reset styles */
        body, table, td, p, a, li, blockquote {
            -webkit-text-size-adjust: 100%;
            -ms-text-size-adjust: 100%;
        }
        table, td {
            mso-table-lspace: 0;
            mso-table-rspace: 0;
        }
        img {
            -ms-interpolation-mode: bicubic;
        }

        /* Base styles */
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
        
        .security-info {
            background-color: #fef5e7;
            border: 1px solid #f6ad55;
            border-radius: 8px;
            padding: 20px;
            margin: 25px 0;
        }
        
        .security-info h4 {
            margin: 0 0 10px 0;
            color: #c05621;
            font-size: 16px;
            font-weight: 600;
        }
        
        .security-info ul {
            margin: 10px 0 0 0;
            padding-left: 20px;
            color: #9c4221;
        }
        
        .security-info li {
            margin: 5px 0;
        }
        
        .link-backup {
            background-color: #f7fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 20px;
            margin: 25px 0;
            word-break: break-all;
        }
        
        .link-backup p {
            margin: 0 0 10px 0;
            font-weight: 600;
            color: #2d3748;
        }
        
        .link-backup a {
            color: #667eea;
            text-decoration: none;
            font-size: 14px;
        }
        
        .tips {
            background-color: #e6fffa;
            border: 1px solid #38b2ac;
            border-radius: 8px;
            padding: 20px;
            margin: 25px 0;
        }
        
        .tips h4 {
            margin: 0 0 10px 0;
            color: #234e52;
            font-size: 16px;
            font-weight: 600;
        }
        
        .tips ul {
            margin: 10px 0 0 0;
            padding-left: 20px;
            color: #285e61;
        }
        
        .tips li {
            margin: 5px 0;
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
            .content,
            .header,
            .footer {
                padding: 25px 20px !important;
            }
            
            .title {
                font-size: 20px !important;
            }
            
            .reset-button {
                width: calc(100% - 40px) !important;
                margin: 25px 20px !important;
            }
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
            
            <div class="link-backup">
                <p>Having trouble with the button? Copy and paste this link:</p>
                <a href="${resetUrl}">${resetUrl}</a>
            </div>
            
            <div class="security-info">
                <h4>⚠️ Important Security Information</h4>
                <ul>
                    <li>This link will expire in <strong>${expiryMinutes} minutes</strong></li>
                    <li>This link can only be used once</li>
                    <li>If you didn't request this reset, please ignore this email</li>
                    <li>Your password won't change unless you click the link above</li>
                </ul>
            </div>
            
            <div class="tips">
                <h4>🔒 Password Security Tips</h4>
                <ul>
                    <li>Use at least 8 characters with letters, numbers, and symbols</li>
                    <li>Don't reuse passwords from other accounts</li>
                    <li>Consider using a password manager</li>
                    <li>Never share your password with anyone</li>
                </ul>
            </div>
            
            <div class="message">
                <p>If you didn't request a password reset, you can safely ignore this email. Your account remains secure.</p>
                
                <p>Need help? Contact our support team - we're here to help!</p>
            </div>
        </div>
        
        <div class="footer">
            <p>This email was sent from Doc Bear's Comfort Kitchen</p>
            <p>If you have questions, please contact our support team</p>
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

IMPORTANT SECURITY INFORMATION:
- This link will expire in ${expiryMinutes} minutes
- This link can only be used once
- If you didn't request this reset, please ignore this email
- Your password won't change unless you click the link above

PASSWORD SECURITY TIPS:
- Use at least 8 characters with letters, numbers, and symbols
- Don't reuse passwords from other accounts
- Consider using a password manager
- Never share your password with anyone

If you didn't request a password reset, you can safely ignore this email. Your account remains secure.

Need help? Contact our support team - we're here to help!

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
        
        .success-badge {
            background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);
            color: white;
            padding: 20px;
            border-radius: 12px;
            text-align: center;
            margin-bottom: 30px;
        }
        
        .success-badge h2 {
            margin: 0;
            font-size: 20px;
            font-weight: 600;
        }
        
        .info-box {
            background-color: #e6fffa;
            border: 1px solid #38b2ac;
            border-radius: 8px;
            padding: 20px;
            margin: 25px 0;
        }
        
        .info-box h4 {
            margin: 0 0 10px 0;
            color: #234e52;
            font-size: 16px;
            font-weight: 600;
        }
        
        .info-box ul {
            margin: 10px 0 0 0;
            padding-left: 20px;
            color: #285e61;
        }
        
        .info-box li {
            margin: 5px 0;
        }
        
        .warning-box {
            background-color: #fed7d7;
            border: 1px solid #fc8181;
            border-radius: 8px;
            padding: 20px;
            margin: 25px 0;
        }
        
        .warning-box h4 {
            margin: 0 0 10px 0;
            color: #c53030;
            font-size: 16px;
            font-weight: 600;
        }
        
        .warning-box p {
            margin: 0;
            color: #c53030;
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
            .content,
            .header,
            .footer {
                padding: 25px 20px !important;
            }
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
            <div class="success-badge">
                <h2>✅ Password Successfully Changed!</h2>
            </div>
            
            <p>Hello,</p>
            
            <p>This email confirms that the password for your account <strong>${userEmail}</strong> was successfully changed on:</p>
            
            <p style="text-align: center; font-size: 18px; font-weight: 600; color: #2d3748; background-color: #f7fafc; padding: 15px; border-radius: 8px;">
                ${changeTime}
            </p>

            <div class="info-box">
                <h4>🔒 What this means:</h4>
                <ul>
                    <li>Your account is now secured with your new password</li>
                    <li>You'll need to use your new password for future sign-ins</li>
                    <li>Any active sessions on other devices will remain logged in</li>
                    <li>This change was logged for security purposes</li>
                </ul>
            </div>
            
            <div class="warning-box">
                <h4>🚨 Didn't make this change?</h4>
                <p>If you didn't change your password, someone else may have access to your account. Please contact our support team immediately and consider changing your password again.</p>
            </div>
            
            <p><strong>For your security, we recommend:</strong></p>
            <ul>
                <li>Using a unique password that you don't use elsewhere</li>
                <li>Regularly reviewing your account activity</li>
                <li>Keeping your contact information up to date</li>
                <li>Never sharing your password with anyone</li>
            </ul>
            
            <p>Thank you for keeping your Doc Bear's Comfort Kitchen account secure!</p>
        </div>
        
        <div class="footer">
            <p>This email was sent from Doc Bear's Comfort Kitchen</p>
            <p>If you have questions or concerns, please contact our support team</p>
            <p class="copyright">© ${currentYear} Doc Bear's Comfort Kitchen. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`;

        const text = `
Password Successfully Changed - Doc Bear's Comfort Kitchen

Hello,

This email confirms that the password for your account ${userEmail} was successfully changed on ${changeTime}.

WHAT THIS MEANS:
- Your account is now secured with your new password
- You'll need to use your new password for future sign-ins
- Any active sessions on other devices will remain logged in
- This change was logged for security purposes

DIDN'T MAKE THIS CHANGE?
If you didn't change your password, someone else may have access to your account. Please contact our support team immediately and consider changing your password again.

For your security, we recommend:
- Using a unique password that you don't use elsewhere
- Regularly reviewing your account activity
- Keeping your contact information up to date
- Never sharing your password with anyone

Thank you for keeping your Doc Bear's Comfort Kitchen account secure!

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
            background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%);
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
            color: #d1d5db;
            font-size: 16px;
            margin: 0;
        }
        
        .content {
            padding: 40px 30px;
        }
        
        .deletion-badge {
            background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%);
            color: white;
            padding: 20px;
            border-radius: 12px;
            text-align: center;
            margin-bottom: 30px;
        }
        
        .deletion-badge h2 {
            margin: 0;
            font-size: 20px;
            font-weight: 600;
        }
        
        .info-box {
            background-color: #f3f4f6;
            border: 1px solid #d1d5db;
            border-radius: 8px;
            padding: 20px;
            margin: 25px 0;
        }
        
        .info-box h4 {
            margin: 0 0 10px 0;
            color: #374151;
            font-size: 16px;
            font-weight: 600;
        }
        
        .info-box ul {
            margin: 10px 0 0 0;
            padding-left: 20px;
            color: #4b5563;
        }
        
        .info-box li {
            margin: 5px 0;
        }
        
        .comeback-box {
            background-color: #fef3c7;
            border: 1px solid #f59e0b;
            border-radius: 8px;
            padding: 20px;
            margin: 25px 0;
            text-align: center;
        }
        
        .comeback-box h4 {
            margin: 0 0 10px 0;
            color: #92400e;
            font-size: 16px;
            font-weight: 600;
        }
        
        .comeback-box p {
            margin: 10px 0 0 0;
            color: #92400e;
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
            .content,
            .header,
            .footer {
                padding: 25px 20px !important;
            }
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
            <div class="deletion-badge">
                <h2>🗑️ Account Successfully Deleted</h2>
            </div>
            
            <p>Hello ${userName || 'there'},</p>
            
            <p>This email confirms that your Doc Bear's Comfort Kitchen account (<strong>${userEmail}</strong>) and all associated data were permanently deleted on:</p>
            
            <p style="text-align: center; font-size: 18px; font-weight: 600; color: #2d3748; background-color: #f7fafc; padding: 15px; border-radius: 8px;">
                ${deletionTime}
            </p>

            <div class="info-box">
                <h4>🔒 What was deleted:</h4>
                <ul>
                    <li>Your personal profile and account information</li>
                    <li>All saved recipes and meal plans</li>
                    <li>Food inventory and shopping lists</li>
                    <li>Nutrition logs and preferences</li>
                    <li>Contacts and email sharing history</li>
                    <li>All app settings and preferences</li>
                </ul>
            </div>
            
            <div class="info-box">
                <h4>📋 Important notes:</h4>
                <ul>
                    <li>This deletion is <strong>permanent and cannot be undone</strong></li>
                    <li>Any shared recipes that were public have been anonymized</li>
                    <li>You have been removed from any shared shopping lists</li>
                    <li>All email notifications have been stopped</li>
                    <li>This email address can be used to create a new account in the future</li>
                </ul>
            </div>
            
            <div class="comeback-box">
                <h4>👋 We'll miss you!</h4>
                <p>Thank you for being part of the Doc Bear's Comfort Kitchen community. If you ever decide to return, you're always welcome to create a new account with the same email address.</p>
            </div>
            
            <p>If you have any questions about this deletion or need assistance, please contact our support team.</p>
            
            <p>Best wishes in all your culinary adventures!</p>
            
            <p style="margin-top: 30px; font-style: italic; color: #6b7280;">
                The Doc Bear's Comfort Kitchen Team
            </p>
        </div>
        
        <div class="footer">
            <p>This email was sent to confirm your account deletion</p>
            <p>If you didn't request this deletion, please contact our support team immediately</p>
            <p class="copyright">© ${currentYear} Doc Bear's Comfort Kitchen. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`;

        const text = `
Account Successfully Deleted - Doc Bear's Comfort Kitchen

Hello ${userName || 'there'},

This email confirms that your Doc Bear's Comfort Kitchen account (${userEmail}) and all associated data were permanently deleted on ${deletionTime}.

WHAT WAS DELETED:
- Your personal profile and account information
- All saved recipes and meal plans
- Food inventory and shopping lists
- Nutrition logs and preferences
- Contacts and email sharing history
- All app settings and preferences

IMPORTANT NOTES:
- This deletion is permanent and cannot be undone
- Any shared recipes that were public have been anonymized
- You have been removed from any shared shopping lists
- All email notifications have been stopped
- This email address can be used to create a new account in the future

WE'LL MISS YOU!
Thank you for being part of the Doc Bear's Comfort Kitchen community. If you ever decide to return, you're always welcome to create a new account with the same email address.

If you have any questions about this deletion or need assistance, please contact our support team.

Best wishes in all your culinary adventures!

The Doc Bear's Comfort Kitchen Team

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
        
        .welcome-badge {
            background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);
            color: white;
            padding: 20px;
            border-radius: 12px;
            text-align: center;
            margin-bottom: 30px;
        }
        
        .welcome-badge h2 {
            margin: 0;
            font-size: 20px;
            font-weight: 600;
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
            transition: all 0.2s;
        }
        
        .verify-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(72, 187, 120, 0.4);
        }
        
        .info-box {
            background-color: #e6fffa;
            border: 1px solid #38b2ac;
            border-radius: 8px;
            padding: 20px;
            margin: 25px 0;
        }
        
        .info-box h4 {
            margin: 0 0 10px 0;
            color: #234e52;
            font-size: 16px;
            font-weight: 600;
        }
        
        .info-box ul {
            margin: 10px 0 0 0;
            padding-left: 20px;
            color: #285e61;
        }
        
        .info-box li {
            margin: 5px 0;
        }
        
        .link-backup {
            background-color: #f7fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 20px;
            margin: 25px 0;
            word-break: break-all;
        }
        
        .link-backup p {
            margin: 0 0 10px 0;
            font-weight: 600;
            color: #2d3748;
        }
        
        .link-backup a {
            color: #48bb78;
            text-decoration: none;
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
            .content,
            .header,
            .footer {
                padding: 25px 20px !important;
            }
            
            .verify-button {
                width: calc(100% - 40px) !important;
                margin: 25px 20px !important;
            }
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
            <div class="welcome-badge">
                <h2>🎉 Welcome to Doc Bear's Comfort Kitchen!</h2>
            </div>
            
            <p>Hello ${userName},</p>
            
            <p>Thank you for creating your account with Doc Bear's Comfort Kitchen! We're excited to help you manage your food inventory and discover amazing recipes.</p>
            
            <p>To get started and access all features, please verify your email address by clicking the button below:</p>
            
            <a href="${verificationUrl}" class="verify-button">Verify My Email Address</a>
            
            <div class="link-backup">
                <p>Having trouble with the button? Copy and paste this link:</p>
                <a href="${verificationUrl}">${verificationUrl}</a>
            </div>
            
            <div class="info-box">
                <h4>🔒 Important Information</h4>
                <ul>
                    <li>This verification link will expire in <strong>24 hours</strong></li>
                    <li>You must verify your email to access app features</li>
                    <li>This link can only be used once</li>
                    <li>If you didn't create this account, please ignore this email</li>
                </ul>
            </div>
            
            <div class="info-box">
                <h4>🍳 What's Next?</h4>
                <ul>
                    <li>Start building your food inventory</li>
                    <li>Explore hundreds of comfort food recipes</li>
                    <li>Plan your meals for the week</li>
                    <li>Generate smart shopping lists</li>
                    <li>Never waste food again!</li>
                </ul>
            </div>
            
            <p>If you have any questions or need assistance, our support team is here to help!</p>
            
            <p style="margin-top: 30px;">
                Welcome to the family!<br>
                <em>The Doc Bear's Comfort Kitchen Team</em>
            </p>
        </div>
        
        <div class="footer">
            <p>This email was sent to verify your account creation</p>
            <p>If you didn't create an account, please ignore this email</p>
            <p class="copyright">© ${currentYear} Doc Bear's Comfort Kitchen. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`;

        const text = `
Welcome to Doc Bear's Comfort Kitchen!

Hello ${userName},

Thank you for creating your account with Doc Bear's Comfort Kitchen! We're excited to help you manage your food inventory and discover amazing recipes.

To get started and access all features, please verify your email address by clicking this link:

${verificationUrl}

IMPORTANT INFORMATION:
- This verification link will expire in 24 hours
- You must verify your email to access app features
- This link can only be used once
- If you didn't create this account, please ignore this email

WHAT'S NEXT?
- Start building your food inventory
- Explore hundreds of comfort food recipes
- Plan your meals for the week
- Generate smart shopping lists
- Never waste food again!

If you have any questions or need assistance, our support team is here to help!

Welcome to the family!
The Doc Bear's Comfort Kitchen Team

© ${currentYear} Doc Bear's Comfort Kitchen. All rights reserved.
    `;

        return { html, text };
    }
}

// Add this helper function to your existing email.js file:
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

export async function testEmailConfiguration() {
    return await emailService.testConnection();
}

// Add this helper function to the bottom of your /src/lib/email.js file:

export async function sendAccountDeletionConfirmationEmail(email, userName) {
    const template = EmailTemplates.getAccountDeletionConfirmationTemplate(email, userName);

    return await emailService.sendEmail(
        email,
        'Account Deleted - Doc Bear\'s Comfort Kitchen',
        template.html,
        template.text
    );
}


