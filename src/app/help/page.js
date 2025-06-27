'use client';

// file: src/app/help/page.js v1 - Help Center with FAQs

import { useState } from 'react';
import { TouchEnhancedButton } from '@/components/mobile/TouchEnhancedButton';
import MobileOptimizedLayout from '@/components/layout/MobileOptimizedLayout';
import Footer from '@/components/legal/Footer';
import ContactSupportModal from '@/components/support/ContactSupportModal';
import { useSafeSession } from '@/hooks/useSafeSession';
import { useSubscription } from '@/hooks/useSubscription';

export default function HelpCenterPage() {
    const { data: session } = useSafeSession();
    const subscription = useSubscription();
    const [showContactModal, setShowContactModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [expandedFAQ, setExpandedFAQ] = useState(null);

    const categories = [
        { id: 'all', name: 'All Topics', icon: '📚' },
        { id: 'getting-started', name: 'Getting Started', icon: '🚀' },
        { id: 'inventory', name: 'Inventory Management', icon: '📦' },
        { id: 'recipes', name: 'Recipes & Cooking', icon: '👨‍🍳' },
        { id: 'meal-planning', name: 'Meal Planning', icon: '📅' },
        { id: 'shopping', name: 'Shopping Lists', icon: '🛒' },
        { id: 'nutrition', name: 'Nutrition & Health', icon: '🥗' },
        { id: 'account', name: 'Account & Billing', icon: '⚙️' },
        { id: 'technical', name: 'Technical Issues', icon: '🔧' }
    ];

    const faqs = [
        // Getting Started
        {
            id: 1,
            category: 'getting-started',
            question: 'How do I create an account and get started?',
            answer: 'Creating an account is simple! Click the "Sign Up" button on our homepage, enter your email and create a password. Once registered, you can start adding items to your inventory immediately. We recommend starting with our "Common Items Wizard" to quickly populate your pantry basics.'
        },
        {
            id: 2,
            category: 'getting-started',
            question: 'What are the different subscription tiers?',
            answer: 'We offer three tiers: Free (basic inventory tracking for up to 50 items), Gold ($4.99/month or $49.99/year with up to 250 items, meal planning, and email sharing), and Platinum ($9.99/month or $99.99/year with unlimited items, advanced features, and priority support). Annual plans save you 17%! You can upgrade anytime from your account page.'
        },
        {
            id: 3,
            category: 'getting-started',
            question: 'Do you offer free trials?',
            answer: 'Yes! Both Gold and Platinum tiers include a 7-day free trial with full access to all features. No credit card is required to start your trial. You can cancel anytime during the trial period with no charges.'
        },
        {
            id: 4,
            category: 'getting-started',
            question: 'Can I save money with annual billing?',
            answer: 'Absolutely! Annual plans save you 17% compared to monthly billing. Gold is $49.99/year (vs $59.88 monthly) and Platinum is $99.99/year (vs $119.88 monthly). You can switch between monthly and annual billing in your account settings.'
        },

        {
            id: 5,
            category: 'getting-started',
            question: 'Can I use the app on my phone?',
            answer: 'Yes! Doc Bear\'s Comfort Kitchen is a Progressive Web App (PWA) that works great on mobile devices. You can add it to your phone\'s home screen for an app-like experience. Native mobile apps for iOS and Android are coming soon!'
        },

        // Inventory Management
        {
            id: 6,
            category: 'inventory',
            question: 'How do I add items to my inventory?',
            answer: 'There are several ways to add items: 1) Use the UPC scanner to scan barcodes, 2) Search our UPC database by product name, 3) Use the "Common Items Wizard" for pantry staples, or 4) Manually add custom items. You can edit items after adding to include expiration dates, quantities, and storage locations.'
        },
        {
            id: 7,
            category: 'inventory',
            question: 'How does expiration date tracking work?',
            answer: 'When you add expiration dates to items, our system will automatically track them and send email notifications (for Gold+ subscribers) when items are expiring soon. You can view all expiring items on your inventory page and get suggestions for recipes to use them up before they spoil.'
        },
        {
            id: 8,
            category: 'inventory',
            question: 'What happens when I use ingredients in recipes?',
            answer: 'When you mark a recipe as "cooked" or track consumption, the app automatically updates your inventory quantities. This helps keep your inventory accurate and ensures recipe suggestions remain relevant to what you actually have available.'
        },

        // Recipes & Cooking
        {
            id: 9,
            category: 'recipes',
            question: 'Where do the recipes come from?',
            answer: 'Our recipe database includes over 650 recipes, primarily from the "Doc Bear\'s Comfort Food Survival Guide" cookbook series. All recipes are tested and curated for quality. You can also add your own custom recipes to your personal collection.'
        },
        {
            id: 10,
            category: 'recipes',
            question: 'How does "What Can I Make?" work?',
            answer: 'This feature analyzes your current inventory and finds recipes you can make with available ingredients. It shows percentage matches (how many ingredients you have) and suggests recipes where you\'re only missing a few items. It\'s perfect for using up ingredients before they expire!'
        },
        {
            id: 11,
            category: 'recipes',
            question: 'Can I save and organize recipes?',
            answer: 'Yes! You can save recipes to custom collections. Free users can save up to 10 recipes total in 2 collections, Gold subscribers can save up to 200 recipes in 10 collections, and Platinum users have unlimited recipe collections with unlimited saved recipes. You can also rate recipes and add personal notes.'
        },

        // Meal Planning
        {
            id: 12,
            category: 'meal-planning',
            question: 'How do I create a meal plan?',
            answer: 'Go to the Meal Planning section and select your planning period (1-4 weeks). You can add specific recipes or create simple meals using inventory items. The planner helps you organize breakfast, lunch, dinner, and snacks. Meal planning is available for Gold+ subscribers.'
        },
        {
            id: 13,
            category: 'meal-planning',
            question: 'Can I plan meals around my dietary restrictions?',
            answer: 'Absolutely! Set your dietary preferences and restrictions in your profile settings. The meal planner and recipe suggestions will automatically filter options based on your needs, including allergies, vegetarian/vegan diets, and other dietary requirements.'
        },
        {
            id: 14,
            category: 'meal-planning',
            question: 'What is meal prep planning?',
            answer: 'Meal prep planning helps you organize ingredient preparation in advance. Create weekly prep lists that show what can be chopped, cooked, or prepared ahead of time. This feature saves time during busy weekdays and ensures fresh, home-cooked meals.'
        },

        // Shopping Lists
        {
            id: 15,
            category: 'shopping',
            question: 'How do I create shopping lists?',
            answer: 'Shopping lists can be generated from individual recipes, meal plans, or custom recipe selections. The app automatically organizes items by category (produce, pantry, etc.) and checks against your inventory to only include items you need to buy.'
        },
        {
            id: 16,
            category: 'shopping',
            question: 'Can I share shopping lists with family?',
            answer: 'Yes! Gold and Platinum subscribers can email shopping lists to family members and friends. The lists include all recipe details and are formatted for easy shopping. This makes it simple for anyone to pick up ingredients while you\'re meal planning.'
        },
        {
            id: 17,
            category: 'shopping',
            question: 'Why are some items marked as "already in inventory"?',
            answer: 'The app cross-references your current inventory when generating shopping lists. Items you already have are marked separately so you don\'t buy duplicates. This feature helps reduce food waste and saves money by using what you already own.'
        },

        // Nutrition & Health
        {
            id: 18,
            category: 'nutrition',
            question: 'How accurate is the nutritional information?',
            answer: 'Nutritional data comes from reliable databases and is generally accurate for standard ingredients. However, actual values may vary based on brands, preparation methods, and portion sizes. Always consult healthcare professionals for specific dietary advice.'
        },
        {
            id: 19,
            category: 'nutrition',
            question: 'Can I track nutrition goals?',
            answer: 'Yes! Set personal nutrition goals in your profile and track progress through meal planning and recipe selection. The app provides nutritional breakdowns for recipes and can help you plan balanced meals that meet your dietary objectives.'
        },
        {
            id: 20,
            category: 'nutrition',
            question: 'How do I handle food allergies and restrictions?',
            answer: 'Update your profile with all allergies and dietary restrictions. The app will flag potentially problematic ingredients and filter recipe suggestions accordingly. Always double-check ingredient lists, as we cannot guarantee 100% accuracy for allergy-related concerns.'
        },

        // Account & Billing
        {
            id: 21,
            category: 'account',
            question: 'How do I upgrade or downgrade my subscription?',
            answer: 'Visit your Account page and click "Manage Subscription" to change your plan. Upgrades take effect immediately, while downgrades apply at your next billing cycle. You\'ll retain access to premium features until the end of your current billing period. Remember, annual plans save you 17% compared to monthly billing!'
        },
        {
            id: 22,
            category: 'account',
            question: 'What happens to my data if I cancel?',
            answer: 'Your data remains accessible during any remaining subscription period. After cancellation, you\'ll have limited access based on the free tier limits. We retain your data for 90 days in case you decide to resubscribe, after which it may be permanently deleted.'
        },
        {
            id: 23,
            category: 'account',
            question: 'How do I delete my account?',
            answer: 'Account deletion can be requested through your account settings or by contacting support. This action is permanent and will delete all your data including recipes, meal plans, and inventory. Please download any data you want to keep before deletion.'
        },

        // Technical Issues
        {
            id: 24,
            category: 'technical',
            question: 'The app isn\'t loading properly. What should I do?',
            answer: 'Try these steps: 1) Refresh your browser, 2) Clear your browser cache and cookies, 3) Check your internet connection, 4) Try a different browser, 5) Disable browser extensions temporarily. If issues persist, contact support with details about your browser and device.'
        },
        {
            id: 25,
            category: 'technical',
            question: 'Why isn\'t the UPC scanner working?',
            answer: 'The UPC scanner requires camera permissions and good lighting. Make sure you\'ve allowed camera access in your browser settings. Position the barcode clearly in the scanner frame and ensure adequate lighting. If scanning fails, you can manually enter the UPC number.'
        },
        {
            id: 26,
            category: 'technical',
            question: 'Can I export my data?',
            answer: 'Yes! You can export your inventory, recipes, and meal plans in various formats (CSV, PDF) from your account settings. This is useful for backups or if you want to use your data elsewhere. Data export is available for all subscription tiers.'
        }
    ];

    const filteredFAQs = faqs.filter(faq => {
        const matchesCategory = selectedCategory === 'all' || faq.category === selectedCategory;
        const matchesSearch = searchQuery === '' ||
            faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
            faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    const toggleFAQ = (faqId) => {
        setExpandedFAQ(expandedFAQ === faqId ? null : faqId);
    };

    return (
        <MobileOptimizedLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="bg-white shadow rounded-lg p-6">
                    <div className="text-center">
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">Help Center</h1>
                        <p className="text-gray-600 text-lg">
                            Find answers to common questions about Doc Bear's Comfort Kitchen
                        </p>
                    </div>
                </div>

                {/* Search and Quick Actions */}
                <div className="bg-white shadow rounded-lg p-6">
                    <div className="space-y-4">
                        {/* Search Bar */}
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                            <input
                                type="text"
                                placeholder="Search help articles..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>

                        {/* Quick Action Buttons */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <TouchEnhancedButton
                                onClick={() => setShowContactModal(true)}
                                className="p-4 border-2 border-blue-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 text-center transition-colors"
                            >
                                <div className="text-2xl mb-2">💬</div>
                                <div className="font-medium text-gray-900">Contact Support</div>
                                <div className="text-sm text-gray-600">Get personalized help</div>
                            </TouchEnhancedButton>

                            <TouchEnhancedButton
                                onClick={() => window.open('/feedback', '_blank')}
                                className="p-4 border-2 border-green-200 rounded-lg hover:border-green-300 hover:bg-green-50 text-center transition-colors"
                            >
                                <div className="text-2xl mb-2">💡</div>
                                <div className="font-medium text-gray-900">Send Feedback</div>
                                <div className="text-sm text-gray-600">Share your ideas</div>
                            </TouchEnhancedButton>

                            <TouchEnhancedButton
                                onClick={() => setSelectedCategory('getting-started')}
                                className="p-4 border-2 border-purple-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 text-center transition-colors"
                            >
                                <div className="text-2xl mb-2">🚀</div>
                                <div className="font-medium text-gray-900">Getting Started</div>
                                <div className="text-sm text-gray-600">New user guide</div>
                            </TouchEnhancedButton>
                        </div>
                    </div>
                </div>

                {/* MANUAL: Inline CSS grid to bypass Tailwind issues */}
                <div className="bg-white shadow rounded-lg p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-6">Browse by Category</h2>

                    {/* MANUAL CSS: Force the grid behavior */}
                    <div
                        style={{
                            display: 'grid',
                            gap: '1rem',
                            gridTemplateColumns: window.innerWidth < 640 ? '1fr' :
                                window.innerWidth < 768 ? 'repeat(2, 1fr)' :
                                    window.innerWidth < 1024 ? 'repeat(3, 1fr)' :
                                        'repeat(4, 1fr)'
                        }}
                        className="gap-4"
                    >
                        {categories.map(category => (
                            <TouchEnhancedButton
                                key={category.id}
                                onClick={() => setSelectedCategory(category.id)}
                                className={`p-4 rounded-lg border-2 text-center transition-colors min-h-[100px] flex flex-col justify-center ${
                                    selectedCategory === category.id
                                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                }`}
                            >
                                <div className="text-2xl mb-2">{category.icon}</div>
                                <div className="text-sm font-medium leading-tight">{category.name}</div>
                            </TouchEnhancedButton>
                        ))}
                    </div>
                </div>

                {/* FAQ Section */}
                <div className="bg-white shadow rounded-lg p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-semibold text-gray-900">
                            Frequently Asked Questions
                        </h2>
                        <div className="text-sm text-gray-600">
                            {filteredFAQs.length} article{filteredFAQs.length !== 1 ? 's' : ''} found
                        </div>
                    </div>

                    {filteredFAQs.length === 0 ? (
                        <div className="text-center py-8">
                            <div className="text-4xl mb-4">🔍</div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">No articles found</h3>
                            <p className="text-gray-600 mb-4">
                                Try adjusting your search terms or browse a different category.
                            </p>
                            <TouchEnhancedButton
                                onClick={() => {
                                    setSearchQuery('');
                                    setSelectedCategory('all');
                                }}
                                className="text-blue-600 hover:text-blue-700 font-medium"
                            >
                                Clear filters
                            </TouchEnhancedButton>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {filteredFAQs.map(faq => (
                                <div key={faq.id} className="border border-gray-200 rounded-lg">
                                    <button
                                        onClick={() => toggleFAQ(faq.id)}
                                        className="w-full p-4 text-left hover:bg-gray-50 transition-colors rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <div className="flex items-center justify-between">
                                            <h3 className="font-medium text-gray-900 pr-4">
                                                {faq.question}
                                            </h3>
                                            <div className="flex-shrink-0">
                                                <svg
                                                    className={`w-5 h-5 text-gray-500 transition-transform ${
                                                        expandedFAQ === faq.id ? 'rotate-180' : ''
                                                    }`}
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                </svg>
                                            </div>
                                        </div>
                                    </button>

                                    {expandedFAQ === faq.id && (
                                        <div className="px-4 pb-4">
                                            <div className="pt-2 border-t border-gray-100">
                                                <p className="text-gray-700 leading-relaxed">
                                                    {faq.answer}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Still Need Help Section */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
                    <div className="text-center">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Still need help?</h3>
                        <p className="text-gray-600 mb-4">
                            Can't find what you're looking for? Our support team is here to help!
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-md mx-auto">
                            <TouchEnhancedButton
                                onClick={() => setShowContactModal(true)}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                            >
                                Contact Support
                            </TouchEnhancedButton>

                            <TouchEnhancedButton
                                onClick={() => window.open('/feedback', '_blank')}
                                className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 px-6 py-3 rounded-lg font-medium transition-colors"
                            >
                                Send Feedback
                            </TouchEnhancedButton>
                        </div>

                        {subscription?.tier && (
                            <div className="mt-4 p-3 bg-white rounded-lg border border-blue-200">
                                <p className="text-sm text-blue-700">
                                    <span className="font-medium">
                                        {subscription.tier === 'platinum' && '⚡ Platinum Priority Support: '}
                                        {subscription.tier === 'gold' && '🥇 Gold Enhanced Support: '}
                                        {(!subscription.tier || subscription.tier === 'free') && '📧 Standard Support: '}
                                    </span>
                                    {subscription.tier === 'platinum' && 'Response within 2-4 hours'}
                                    {subscription.tier === 'gold' && 'Response within 4-8 hours'}
                                    {(!subscription.tier || subscription.tier === 'free') && 'Response within 24-48 hours'}
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                <Footer />
            </div>

            {/* Contact Support Modal */}
            <ContactSupportModal
                isOpen={showContactModal}
                onClose={() => setShowContactModal(false)}
                userSubscription={subscription}
            />
        </MobileOptimizedLayout>
    );
}