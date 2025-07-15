// file: src/lib/email-service.js

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

// Email templates (same as before, just updated sending function)
export const emailTemplates = {
    priceAlert: (data) => ({
        subject: `🚨 Price Alert: ${data.itemName} dropped to $${data.newPrice}`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center;">
                    <h1 style="margin: 0; font-size: 24px;">💰 Price Alert!</h1>
                    <p style="margin: 10px 0 0 0; opacity: 0.9;">Your target price has been reached</p>
                </div>
                
                <div style="padding: 30px; background: white;">
                    <div style="background: #f8fafc; border-left: 4px solid #10b981; padding: 20px; margin-bottom: 20px;">
                        <h2 style="margin: 0 0 10px 0; color: #1f2937; font-size: 20px;">${data.itemName}</h2>
                        <p style="margin: 0; color: #6b7280; font-size: 14px;">${data.category}</p>
                    </div>
                    
                    <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
                        <div style="text-align: center; flex: 1;">
                            <div style="font-size: 24px; font-weight: bold; color: #10b981;">$${data.newPrice}</div>
                            <div style="font-size: 12px; color: #6b7280;">Current Price</div>
                        </div>
                        <div style="text-align: center; flex: 1;">
                            <div style="font-size: 18px; color: #6b7280; text-decoration: line-through;">$${data.previousPrice}</div>
                            <div style="font-size: 12px; color: #6b7280;">Previous Price</div>
                        </div>
                        <div style="text-align: center; flex: 1;">
                            <div style="font-size: 18px; font-weight: bold; color: #dc2626;">-$${(data.previousPrice - data.newPrice).toFixed(2)}</div>
                            <div style="font-size: 12px; color: #6b7280;">You Save</div>
                        </div>
                    </div>
                    
                    <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
                        <div style="color: #92400e; font-weight: bold; margin-bottom: 5px;">🏪 Available at: ${data.store}</div>
                        ${data.saleEndDate ? `<div style="color: #92400e; font-size: 14px;">⏰ Sale ends: ${new Date(data.saleEndDate).toLocaleDateString()}</div>` : ''}
                    </div>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${process.env.NEXTAUTH_URL}/inventory?highlight=${data.itemId}" 
                           style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                            View in Inventory
                        </a>
                    </div>
                    
                    <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; font-size: 12px; color: #6b7280;">
                        <p>You're receiving this because you set a price alert for this item.</p>
                        <p><a href="${process.env.NEXTAUTH_URL}/account/notifications" style="color: #3b82f6;">Manage your alerts</a> | 
                           <a href="${process.env.NEXTAUTH_URL}/account/notifications?unsubscribe=price-alerts" style="color: #6b7280;">Unsubscribe from price alerts</a></p>
                    </div>
                </div>
            </div>
        `,
        text: `
            Price Alert: ${data.itemName}
            
            Great news! The price has dropped to $${data.newPrice} (was $${data.previousPrice}).
            You save $${(data.previousPrice - data.newPrice).toFixed(2)}!
            
            Available at: ${data.store}
            ${data.saleEndDate ? `Sale ends: ${new Date(data.saleEndDate).toLocaleDateString()}` : ''}
            
            View in your inventory: ${process.env.NEXTAUTH_URL}/inventory?highlight=${data.itemId}
        `
    }),

    weeklyPriceSummary: (data) => ({
        subject: `📊 Weekly Price Summary - ${data.weekOf}`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center;">
                    <h1 style="margin: 0; font-size: 24px;">📊 Weekly Price Summary</h1>
                    <p style="margin: 10px 0 0 0; opacity: 0.9;">Week of ${data.weekOf}</p>
                </div>
                
                <div style="padding: 30px; background: white;">
                    <h2 style="color: #1f2937; margin-bottom: 20px;">🎯 This Week's Highlights</h2>
                    
                    ${data.newDeals.length > 0 ? `
                    <div style="background: #ecfdf5; border: 1px solid #10b981; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
                        <h3 style="color: #065f46; margin: 0 0 10px 0;">🔥 New Deals Found</h3>
                        ${data.newDeals.map(deal => `
                            <div style="margin-bottom: 10px;">
                                <strong>${deal.itemName}</strong> - $${deal.price} at ${deal.store}
                                <div style="font-size: 12px; color: #059669;">Save $${deal.savings.toFixed(2)} vs average</div>
                            </div>
                        `).join('')}
                    </div>
                    ` : ''}
                    
                    <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
                        <div style="text-align: center; flex: 1;">
                            <div style="font-size: 24px; font-weight: bold; color: #3b82f6;">${data.pricesTracked}</div>
                            <div style="font-size: 12px; color: #6b7280;">Prices Tracked</div>
                        </div>
                        <div style="text-align: center; flex: 1;">
                            <div style="font-size: 24px; font-weight: bold; color: #10b981;">$${data.totalSavings.toFixed(2)}</div>
                            <div style="font-size: 12px; color: #6b7280;">Potential Savings</div>
                        </div>
                        <div style="text-align: center; flex: 1;">
                            <div style="font-size: 24px; font-weight: bold; color: #f59e0b;">${data.alertsTriggered}</div>
                            <div style="font-size: 12px; color: #6b7280;">Alerts This Week</div>
                        </div>
                    </div>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${process.env.NEXTAUTH_URL}/inventory?tab=analytics" 
                           style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                            View Full Analytics
                        </a>
                    </div>
                </div>
            </div>
        `,
        text: `Weekly Price Summary - ${data.weekOf}
        
        This week's highlights:
        - ${data.pricesTracked} prices tracked
        - $${data.totalSavings.toFixed(2)} in potential savings
        - ${data.alertsTriggered} alerts triggered
        
        ${data.newDeals.length > 0 ? `New deals found:
        ${data.newDeals.map(deal => `- ${deal.itemName}: $${deal.price} at ${deal.store} (save $${deal.savings.toFixed(2)})`).join('\n')}` : ''}
        
        View full analytics: ${process.env.NEXTAUTH_URL}/inventory?tab=analytics
        `
    })
};

// Updated sendEmail function for Resend
export async function sendEmail({ to, subject, html, text }) {
    try {
        const emailData = {
            from: 'Doc Bear\'s Comfort Kitchen <noreply@yourdomain.com>', // Replace with your verified domain
            to: [to],
            subject,
            html,
            text
        };

        const result = await resend.emails.send(emailData);

        console.log('Email sent successfully via Resend:', result.data?.id);
        return { success: true, messageId: result.data?.id };
    } catch (error) {
        console.error('Resend email sending failed:', error);
        return { success: false, error: error.message };
    }
}

// Test function to verify Resend setup
export async function testResendConnection() {
    try {
        const result = await resend.emails.send({
            from: 'Doc Bear\'s Comfort Kitchen <noreply@yourdomain.com>',
            to: ['test@example.com'],
            subject: 'Test Email',
            html: '<p>This is a test email to verify Resend integration.</p>',
            text: 'This is a test email to verify Resend integration.'
        });

        console.log('Resend test successful:', result);
        return { success: true, result };
    } catch (error) {
        console.error('Resend test failed:', error);
        return { success: false, error };
    }
}