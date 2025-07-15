'use client';
// file: /src/app/inventory/page.js - v12

import {useSafeSession} from '@/hooks/useSafeSession';
import {useEffect, useState, Suspense} from 'react';
import {useSearchParams} from 'next/navigation';
import UPCLookup from '@/components/inventory/UPCLookup';
import InventoryConsumption from '@/components/inventory/InventoryConsumption';
import ConsumptionHistory from '@/components/inventory/ConsumptionHistory';
import CommonItemsWizard from '@/components/inventory/CommonItemsWizard';
import {redirect} from 'next/navigation';
import {TouchEnhancedButton} from '@/components/mobile/TouchEnhancedButton';
import MobileOptimizedLayout from '@/components/layout/MobileOptimizedLayout';
import Footer from '@/components/legal/Footer';
import {useSubscription} from '@/hooks/useSubscription';
import {FEATURE_GATES} from '@/lib/subscription-config';
import FeatureGate from '@/components/subscription/FeatureGate';
import { apiPut, apiGet, apiPost, apiDelete } from '@/lib/api-config';
import AddToShoppingListModal from '@/components/shopping/AddToShoppingListModal';


// Import smart display utilities
import {
    formatInventoryDisplayText,
    getPrimaryDisplayText,
    getSecondaryDisplayText,
    hasDualUnits,
    getShortDisplayText
} from '@/lib/inventoryDisplayUtils';


// Helper function to parse quantity/serving size and extract size info
function parseProductSize(product) {
    if (!product) {
        return { quantity: null, unit: null };
    }

    // Try multiple fields in order of preference
    const possibleSizeFields = [
        product.quantity,
        product.serving_size,
        product.serving_size_imported,
        product.packaging,
        product.product_quantity
    ];

    for (const sizeString of possibleSizeFields) {
        if (sizeString && typeof sizeString === 'string' && sizeString.trim()) {
            const parsed = parseSizeString(sizeString);
            if (parsed.quantity && parsed.unit) {
                return parsed;
            }
        }
    }

    return { quantity: null, unit: null };
}

// Helper function to parse individual size strings
function parseSizeString(sizeString) {
    if (!sizeString || typeof sizeString !== 'string') {
        return { quantity: null, unit: null };
    }

    // Remove content in parentheses first, then clean up
    let cleanString = sizeString.replace(/\([^)]*\)/g, '').trim();

    // Remove common prefixes and suffixes
    cleanString = cleanString.replace(/^(net\s+weight|net\s+wt|contents|size|volume)[:;,\s]*/i, '');
    cleanString = cleanString.replace(/[,;]\s*(approx|approximate|about).*$/i, '');

    // Handle multiple formats like "15 ml, 1 Tbsp" - take the first measurement
    const parts = cleanString.split(/[,;]/);
    if (parts.length > 1) {
        // Try each part to find the best match
        for (const part of parts) {
            const parsed = extractNumberAndUnit(part.trim());
            if (parsed.quantity && parsed.unit) {
                return parsed;
            }
        }
    }

    return extractNumberAndUnit(cleanString);
}

// Helper function to extract number and unit from a string
function extractNumberAndUnit(text) {
    // Enhanced pattern to handle various formats
    const patterns = [
        // Standard formats: "500 ml", "2.5 lbs", "16 oz"
        /(\d+(?:\.\d+)?)\s*(oz|ounces?|fl\s*oz|fluid\s*ounces?|lb|lbs?|pounds?|g|grams?|kg|kilograms?|ml|milliliters?|l|liters?|cup|cups?|tbsp|tablespoons?|tsp|teaspoons?|qt|quarts?|pt|pints?|gal|gallons?|can|cans?|package|packages?|pkg|box|boxes?|bag|bags?|bottle|bottles?)\b/i,

        // Compact formats: "500ml", "16oz"
        /(\d+(?:\.\d+)?)(oz|fl\s*oz|lb|lbs|g|kg|ml|l)\b/i,

        // With 'x' multiplier: "12 x 16 oz" -> take the individual size
        /\d+\s*x\s*(\d+(?:\.\d+)?)\s*(oz|ounces?|fl\s*oz|lb|lbs?|g|grams?|kg|ml|l|liters?|can|cans?|bottle|bottles?)\b/i
    ];

    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
            const quantity = parseFloat(match[1]);
            const rawUnit = match[2].toLowerCase().replace(/\s+/g, '');

            // Map to your dropdown options
            const unitMap = {
                'oz': 'oz',
                'ounce': 'oz',
                'ounces': 'oz',
                'floz': 'oz',
                'fluidounce': 'oz',
                'fluidounces': 'oz',
                'lb': 'lbs',
                'lbs': 'lbs',
                'pound': 'lbs',
                'pounds': 'lbs',
                'g': 'g',
                'gram': 'g',
                'grams': 'g',
                'kg': 'kg',
                'kilogram': 'kg',
                'kilograms': 'kg',
                'ml': 'ml',
                'milliliter': 'ml',
                'milliliters': 'ml',
                'l': 'l',
                'liter': 'l',
                'liters': 'l',
                'cup': 'cup',
                'cups': 'cup',
                'tbsp': 'tbsp',
                'tablespoon': 'tbsp',
                'tablespoons': 'tbsp',
                'tsp': 'tsp',
                'teaspoon': 'tsp',
                'teaspoons': 'tsp',
                'qt': 'l', // Convert quarts to liters (approximate)
                'quart': 'l',
                'quarts': 'l',
                'pt': 'ml', // Convert pints to ml (approximate)
                'pint': 'ml',
                'pints': 'ml',
                'gal': 'l', // Convert gallons to liters (approximate)
                'gallon': 'l',
                'gallons': 'l',
                'can': 'can',
                'cans': 'can',
                'package': 'package',
                'packages': 'package',
                'pkg': 'package',
                'box': 'package',
                'boxes': 'package',
                'bag': 'package',
                'bags': 'package',
                'bottle': 'package',
                'bottles': 'package'
            };

            const mappedUnit = unitMap[rawUnit];

            if (mappedUnit && quantity > 0) {
                return { quantity, unit: mappedUnit };
            }
        }
    }

    return { quantity: null, unit: null };
}

// Separate component for search params to wrap in Suspense
function InventoryContent() {
    const {data: session, status, update} = useSafeSession();
    const searchParams = useSearchParams();
    const shouldShowAddForm = searchParams.get('action') === 'add';

    const [inventory, setInventory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(shouldShowAddForm);
    const [editingItem, setEditingItem] = useState(null);
    const [consumingItem, setConsumingItem] = useState(null);
    const [showConsumptionHistory, setShowConsumptionHistory] = useState(false);
    const [showCommonItemsWizard, setShowCommonItemsWizard] = useState(false);
    const [mergeDuplicates, setMergeDuplicates] = useState(true);
    const [showShoppingListModal, setShowShoppingListModal] = useState(false);
    const [selectedItemForShopping, setSelectedItemForShopping] = useState(null);
    const [trackingPriceForItem, setTrackingPriceForItem] = useState(null); // 🆕 ADD THIS
    const [priceTrackingModal, setPriceTrackingModal] = useState(false); // 🆕 ADD THIS
    const [stores, setStores] = useState([]); // 🆕 ADD THIS

    const subscription = useSubscription();

    const [userPreferences, setUserPreferences] = useState({
        defaultSortBy: 'expiration',
        defaultFilterStatus: 'all',
        defaultFilterLocation: 'all',
        showQuickFilters: true,
        itemsPerPage: 'all',
        compactView: false
    });

    // Advanced filtering and search
    const [filterStatus, setFilterStatus] = useState('all'); // Will be updated from preferences
    const [filterLocation, setFilterLocation] = useState('all'); // Will be updated from preferences
    const [filterCategory, setFilterCategory] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState('expiration'); // Will be updated from preferences
    const [formData, setFormData] = useState({
        name: '',
        brand: '',
        category: '',
        quantity: 1,
        unit: 'item',
        // Dual unit fields
        secondaryQuantity: '',
        secondaryUnit: '',
        location: 'pantry',
        expirationDate: '',
        upc: ''
    });

    const showToast = (message, type = 'success') => {
        const toast = document.createElement('div');
        const bgColor = type === 'success' ? 'bg-green-500' :
            type === 'error' ? 'bg-red-500' :
                type === 'warning' ? 'bg-orange-500' : 'bg-blue-500';

        toast.className = `fixed top-4 right-4 ${bgColor} text-white px-6 py-3 rounded-lg shadow-lg z-50 transition-all duration-300 transform translate-x-full opacity-0`;
        toast.innerHTML = `
        <div class="flex items-center space-x-2">
            <span>${message}</span>
        </div>
    `;

        document.body.appendChild(toast);

        // Animate in
        setTimeout(() => {
            toast.classList.remove('translate-x-full', 'opacity-0');
        }, 100);

        // Animate out and remove
        setTimeout(() => {
            toast.classList.add('translate-x-full', 'opacity-0');
            setTimeout(() => {
                if (document.body.contains(toast)) {
                    document.body.removeChild(toast);
                }
            }, 300);
        }, 3000);
    };

    useEffect(() => {
        if (status === 'unauthenticated') {
            redirect('/auth/signin');
        }
    }, [status]);

    useEffect(() => {
        if (session) {
            fetchInventory();
            fetchUserPreferences(); // NEW: Load user preferences
        }
    }, [session]);

    useEffect(() => {
        if (userPreferences.defaultSortBy !== 'expiration') { // Only save if not default
            savePreferencesToProfile(userPreferences);
        }
    }, [userPreferences]);

    useEffect(() => {
        const shouldOpenWizard = searchParams.get('wizard') === 'true';
        if (shouldOpenWizard) {
            setShowCommonItemsWizard(true);
        }
    }, [searchParams]);

    useEffect(() => {
        const handleKeyDown = (event) => {
            // Ctrl/Cmd + K to focus search
            if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
                event.preventDefault();
                const searchInput = document.getElementById('search');
                if (searchInput) {
                    searchInput.focus();
                    searchInput.select();
                }
            }

            // Escape to clear search
            if (event.key === 'Escape' && searchQuery) {
                setSearchQuery('');
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [searchQuery]);

    // Add this useEffect to listen for inventory updates
    useEffect(() => {
        const handleInventoryUpdate = () => {
            fetchInventory();
        };

        window.addEventListener('inventoryUpdated', handleInventoryUpdate);

        return () => {
            window.removeEventListener('inventoryUpdated', handleInventoryUpdate);
        };
    }, []);

    useEffect(() => {
        console.log('🔍 SUBSCRIPTION HOOK STATUS:', {
            tier: subscription.tier,
            isAdmin: subscription.isAdmin,
            loading: subscription.loading,
            error: subscription.error,
            timestamp: new Date().toISOString()
        });
    }, [subscription.tier, subscription.isAdmin, subscription.loading, subscription.error]);

    // Add this new useEffect to handle auto-scrolling from dashboard
    useEffect(() => {
        const shouldAutoScroll = searchParams.get('scroll') === 'form';

        if (shouldAutoScroll && showAddForm) {
            console.log('📍 Auto-scrolling to form from dashboard link');

            // Wait a bit longer to ensure the form is fully rendered
            const scrollTimeout = setTimeout(() => {
                const scrollToForm = () => {
                    // Try multiple selectors to find the form
                    const formElement = document.querySelector('form') ||
                        document.querySelector('[data-section="add-form"]') ||
                        document.querySelector('.add-item-form') ||
                        document.querySelector('input[name="upc"]')?.closest('div') ||
                        document.querySelector('label[for="upc"]')?.closest('div');

                    if (formElement) {
                        console.log('✅ Found form element, scrolling...');
                        formElement.scrollIntoView({
                            behavior: 'smooth',
                            block: 'start',
                            inline: 'nearest'
                        });

                        // Optional: Focus the first input in the form
                        const firstInput = formElement.querySelector('input[type="text"]');
                        if (firstInput) {
                            setTimeout(() => firstInput.focus(), 500);
                        }
                    } else {
                        console.log('❌ Form element not found for auto-scroll');
                        // Fallback: scroll to bottom of page where form likely is
                        window.scrollTo({
                            top: document.body.scrollHeight,
                            behavior: 'smooth'
                        });
                    }
                };

                scrollToForm();

                // Retry after a longer delay if first attempt didn't work
                setTimeout(() => {
                    if (document.querySelector('form')) {
                        scrollToForm();
                    }
                }, 1000);

            }, 300); // Wait for form to be rendered

            return () => clearTimeout(scrollTimeout);
        }
    }, [searchParams, showAddForm]);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        let originalViewportHeight = window.visualViewport?.height || window.innerHeight;
        let activeInput = null;

        const handleFocusIn = (event) => {
            activeInput = event.target;

            // Only handle input and textarea elements
            if (!['INPUT', 'TEXTAREA', 'SELECT'].includes(activeInput.tagName)) {
                return;
            }

            console.log('📱 Input focused, setting up keyboard handling');

            // Wait for keyboard to appear
            setTimeout(() => {
                const currentHeight = window.visualViewport?.height || window.innerHeight;
                const keyboardHeight = originalViewportHeight - currentHeight;

                if (keyboardHeight > 100) { // Keyboard is likely open
                    console.log(`⌨️ Keyboard detected (${keyboardHeight}px), scrolling to input`);

                    // Get the position of the focused element
                    const rect = activeInput.getBoundingClientRect();
                    const viewportHeight = window.innerHeight;

                    // Calculate if input is hidden by keyboard
                    const hiddenByKeyboard = rect.bottom > (viewportHeight - keyboardHeight - 20);

                    if (hiddenByKeyboard) {
                        // Scroll the input into view above the keyboard
                        const scrollOffset = rect.top - (viewportHeight - keyboardHeight - rect.height - 60);

                        window.scrollBy({
                            top: scrollOffset,
                            behavior: 'smooth'
                        });

                        // Alternative: scroll element into view
                        setTimeout(() => {
                            activeInput.scrollIntoView({
                                behavior: 'smooth',
                                block: 'center',
                                inline: 'nearest'
                            });
                        }, 100);
                    }
                }
            }, 300); // Wait for keyboard animation
        };

        const handleFocusOut = (event) => {
            activeInput = null;
            console.log('📱 Input unfocused');
        };

        const handleViewportResize = () => {
            const currentHeight = window.visualViewport?.height || window.innerHeight;
            const keyboardHeight = originalViewportHeight - currentHeight;

            if (keyboardHeight < 100 && activeInput) {
                // Keyboard likely closed, scroll back to a reasonable position
                console.log('⌨️ Keyboard closed, adjusting scroll');
                setTimeout(() => {
                    if (activeInput) {
                        activeInput.scrollIntoView({
                            behavior: 'smooth',
                            block: 'center'
                        });
                    }
                }, 100);
            }
        };

        // Add event listeners
        document.addEventListener('focusin', handleFocusIn);
        document.addEventListener('focusout', handleFocusOut);

        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', handleViewportResize);
        } else {
            window.addEventListener('resize', handleViewportResize);
        }

        return () => {
            document.removeEventListener('focusin', handleFocusIn);
            document.removeEventListener('focusout', handleFocusOut);

            if (window.visualViewport) {
                window.visualViewport.removeEventListener('resize', handleViewportResize);
            } else {
                window.removeEventListener('resize', handleViewportResize);
            }
        };
    }, []);

    const fetchUserPreferences = async () => {
        try {
            const response = await apiGet('/api/user/profile');
            const data = await response.json();

            if (data.success && data.user?.inventoryPreferences) {
                const prefs = data.user.inventoryPreferences;
                setUserPreferences(prefs);

                // Apply preferences to current filters
                setFilterStatus(prefs.defaultFilterStatus);
                setFilterLocation(prefs.defaultFilterLocation);
                setSortBy(prefs.defaultSortBy);

                console.log('✅ Applied user inventory preferences:', prefs);
            }
        } catch (error) {
            console.log('Could not load user preferences, using defaults');
        }
    };

    const savePreferencesToProfile = async (newPreferences) => {
        try {
            await apiPut('/api/user/profile', {
                inventoryPreferences: newPreferences
            });
            console.log('✅ Saved inventory preferences');
        } catch (error) {
            console.log('Could not save preferences:', error);
        }
    };

    const getUsageInfo = () => {
        if (!subscription || subscription.loading) {
            return {current: 0, limit: '...', isUnlimited: false, tier: 'free'};
        }

        const tier = subscription.tier || 'free';
        return {
            current: inventory.length,
            limit: tier === 'free' ? 50 :
                tier === 'gold' ? 250 :
                    tier === 'admin' ? 'unlimited' :
                        'unlimited',
            isUnlimited: tier === 'platinum' || tier === 'admin',
            tier
        };
    };

    // Add limit checking functions
    const getUsageColor = (isActive = false) => {
        if (subscription.loading) {
            return isActive ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-200 text-gray-600';
        }

        const usage = getUsageInfo();
        const percentage = usage.isUnlimited ? 0 : (usage.current / (typeof usage.limit === 'number' ? usage.limit : 999999)) * 100;

        if (isActive) {
            if (percentage >= 100) return 'bg-red-100 text-red-600';
            if (percentage >= 80) return 'bg-orange-100 text-orange-600';
            return 'bg-indigo-100 text-indigo-600';
        } else {
            if (percentage >= 100) return 'bg-red-200 text-red-700';
            if (percentage >= 80) return 'bg-orange-200 text-orange-700';
            return 'bg-gray-200 text-gray-600';
        }
    };


    const fetchInventory = async () => {
        try {
            const response = await apiGet('/api/inventory');
            const data = await response.json();

            if (data.success) {
                setInventory(data.inventory);
            }
        } catch (error) {
            console.error('Error fetching inventory:', error);
        } finally {
            setLoading(false);
        }
    };

    // Handle Common Items Wizard completion
    const handleCommonItemsComplete = async (result) => {
        if (result.success) {
            // Show success message
            showToast(`🎉 Successfully added ${result.itemsAdded} common items to your inventory!`);

            // Refresh inventory to show new items
            await fetchInventory();
        }
        setShowCommonItemsWizard(false);
    };

    // Enhanced consumption handler with dual unit support
    const handleConsumption = async (consumptionData, mode = 'single') => {
        try {
            console.log('Handling consumption:', {consumptionData, mode});

            const response = await apiPost('/api/inventory/consume', {
                consumptions: consumptionData,
                mode
            });

            const result = await response.json();

            if (result.success) {
                // Refresh inventory
                await fetchInventory();

                // Show success message
                const {summary} = result;
                let message = 'Inventory updated successfully!';

                if (summary.itemsRemoved.length > 0) {
                    message += ` Removed: ${summary.itemsRemoved.join(', ')}.`;
                }
                if (summary.itemsUpdated.length > 0) {
                    message += ` Updated quantities for ${summary.itemsUpdated.length} items.`;
                }

                showToast(message);
            } else {
                throw new Error(result.error || 'Failed to update inventory');
            }
        } catch (error) {
            console.error('Error consuming items:', error);
            showToast('Error updating inventory: ' + error.message);
            throw error;
        }
    };

    // Get expiration status for an item
    const getExpirationStatus = (expirationDate) => {
        if (!expirationDate) return {
            status: 'no-date',
            color: 'gray',
            bgColor: 'bg-gray-50',
            textColor: 'text-gray-600',
            label: 'No expiration date'
        };

        const expDate = new Date(expirationDate);
        const today = new Date();
        const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const expDateStart = new Date(expDate.getFullYear(), expDate.getMonth(), expDate.getDate());
        const daysUntil = Math.ceil((expDateStart - todayStart) / (1000 * 60 * 60 * 24));

        if (daysUntil < 0) {
            return {
                status: 'expired',
                color: 'red',
                bgColor: 'bg-red-50',
                textColor: 'text-red-600',
                label: `Expired ${Math.abs(daysUntil)} day${Math.abs(daysUntil) !== 1 ? 's' : ''} ago`,
                icon: '🚨'
            };
        } else if (daysUntil === 0) {
            return {
                status: 'expires-today',
                color: 'orange',
                bgColor: 'bg-orange-50',
                textColor: 'text-orange-600',
                label: 'Expires today',
                icon: '⚠️'
            };
        } else if (daysUntil <= 3) {
            return {
                status: 'expires-soon',
                color: 'orange',
                bgColor: 'bg-orange-50',
                textColor: 'text-orange-600',
                label: `Expires in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}`,
                icon: '⏰'
            };
        } else if (daysUntil <= 7) {
            return {
                status: 'expires-week',
                color: 'yellow',
                bgColor: 'bg-yellow-50',
                textColor: 'text-yellow-600',
                label: `Expires in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}`,
                icon: '📅'
            };
        } else {
            return {
                status: 'fresh',
                color: 'green',
                bgColor: 'bg-green-50',
                textColor: 'text-green-600',
                label: `Fresh (${daysUntil} days left)`,
                icon: '✅'
            };
        }
    };

    const handleAddToShoppingList = (item) => {
        setSelectedItemForShopping(item);
        setShowShoppingListModal(true);
    };

    const handleAddToNewList = async ({ item, listName }) => {
        try {
            console.log('Creating new shopping list:', listName, 'with item:', item.name);

            const itemToAdd = {
                name: item.name,
                category: item.category || 'Other',
                unit: item.unit,
                amount: '1', // Default amount, user can modify later
                brand: item.brand || '',
                notes: `From inventory - ${item.location}`,
                source: 'inventory'
            };

            const response = await fetch('/api/shopping/custom', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: listName,
                    items: [itemToAdd],
                    listType: 'custom',
                    description: `Shopping list created from inventory item: ${item.name}`
                })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to create shopping list');
            }

            showToast(`✅ Created new shopping list: "${listName}" with ${item.name}`, 'success');

            // Optionally show a link to view the shopping list
            setTimeout(() => {
                if (confirm(`Shopping list created! Would you like to view it now?`)) {
                    window.location.href = '/shopping/saved';
                }
            }, 1000);

        } catch (error) {
            console.error('Error creating shopping list:', error);
            showToast(`❌ Error creating shopping list: ${error.message}`, 'error');
            throw error;
        }
    };

    const handleAddToExistingList = async ({ item, listId }) => {
        try {
            console.log('Adding to existing list:', listId, 'with item:', item.name);

            const itemToAdd = {
                name: item.name,
                category: item.category || 'Other',
                unit: item.unit,
                amount: '1', // Default amount
                brand: item.brand || '',
                notes: `From inventory - ${item.location}`,
                source: 'inventory'
            };

            const response = await fetch('/api/shopping/custom', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    listId: listId,
                    items: [itemToAdd],
                    mode: 'add'
                })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to add item to shopping list');
            }

            showToast(`✅ Added ${item.name} to existing shopping list`, 'success');

            // Optionally show a link to view the shopping list
            setTimeout(() => {
                if (confirm(`Item added to shopping list! Would you like to view it now?`)) {
                    window.location.href = '/shopping/saved';
                }
            }, 1000);

        } catch (error) {
            console.error('Error adding to shopping list:', error);
            showToast(`❌ Error adding to shopping list: ${error.message}`, 'error');
            throw error;
        }
    };

    // Advanced filter and sort inventory with search
    const getFilteredAndSortedInventory = () => {
        let filtered = [...inventory];

        // ENHANCED: Apply search filter with better matching
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(item => {
                // Existing search fields
                const nameMatch = item.name.toLowerCase().includes(query);
                const brandMatch = item.brand && item.brand.toLowerCase().includes(query);
                const categoryMatch = item.category && item.category.toLowerCase().includes(query);
                const upcMatch = item.upc && item.upc.includes(query);

                // NEW: Enhanced search fields
                const locationMatch = item.location.toLowerCase().includes(query);
                const unitMatch = item.unit && item.unit.toLowerCase().includes(query);

                // NEW: Smart partial matching for better results
                const smartMatch = (
                    item.name.toLowerCase().startsWith(query) ||
                    (item.brand && item.brand.toLowerCase().startsWith(query)) ||
                    query.split(' ').every(word =>
                        item.name.toLowerCase().includes(word) ||
                        (item.brand && item.brand.toLowerCase().includes(word))
                    )
                );

                return nameMatch || brandMatch || categoryMatch || upcMatch ||
                    locationMatch || unitMatch || smartMatch;
            });
        }

        // Apply status filter (your existing code)
        if (filterStatus !== 'all') {
            filtered = filtered.filter(item => {
                const status = getExpirationStatus(item.expirationDate);
                switch (filterStatus) {
                    case 'expired':
                        return status.status === 'expired';
                    case 'expiring':
                        return ['expires-today', 'expires-soon', 'expires-week'].includes(status.status);
                    case 'fresh':
                        return status.status === 'fresh' || status.status === 'no-date';
                    default:
                        return true;
                }
            });
        }

        // Apply location filter (your existing code)
        if (filterLocation !== 'all') {
            filtered = filtered.filter(item => item.location === filterLocation);
        }

        // Apply category filter (your existing code)
        if (filterCategory !== 'all') {
            filtered = filtered.filter(item =>
                filterCategory === 'uncategorized'
                    ? (!item.category || item.category === '')
                    : item.category === filterCategory
            );
        }

        // ENHANCED: Apply sorting with new options
        filtered.sort((a, b) => {
            switch (sortBy) {
                case 'expiration':
                    // Your existing expiration sorting logic
                    if (!a.expirationDate && !b.expirationDate) return 0;
                    if (!a.expirationDate) return 1;
                    if (!b.expirationDate) return -1;

                    const aStatus = getExpirationStatus(a.expirationDate);
                    const bStatus = getExpirationStatus(b.expirationDate);

                    const priorityOrder = ['expired', 'expires-today', 'expires-soon', 'expires-week', 'fresh', 'no-date'];
                    const aPriority = priorityOrder.indexOf(aStatus.status);
                    const bPriority = priorityOrder.indexOf(bStatus.status);

                    if (aPriority !== bPriority) {
                        return aPriority - bPriority;
                    }

                    return new Date(a.expirationDate) - new Date(b.expirationDate);

                case 'name':
                    return a.name.localeCompare(b.name);
                case 'category':
                    return (a.category || 'Other').localeCompare(b.category || 'Other');
                case 'location':
                    return a.location.localeCompare(b.location);
                case 'quantity':
                    return b.quantity - a.quantity; // Highest quantity first
                case 'date-added':
                    return new Date(b.addedDate || 0) - new Date(a.addedDate || 0); // Newest first
                // NEW: Additional sorting options
                case 'brand':
                    return (a.brand || '').localeCompare(b.brand || '');
                case 'expiration-date':
                    // Sort by actual expiration date (not status)
                    if (!a.expirationDate && !b.expirationDate) return 0;
                    if (!a.expirationDate) return 1;
                    if (!b.expirationDate) return -1;
                    return new Date(a.expirationDate) - new Date(b.expirationDate);
                default:
                    return 0;
            }
        });

        return filtered;
    };

    // Get unique values for filter dropdowns
    const getUniqueLocations = () => {
        const locations = [...new Set(inventory.map(item => item.location))].sort();
        return locations;
    };

    const getUniqueCategories = () => {
        const categories = [...new Set(inventory.map(item => item.category || '').filter(Boolean))].sort();
        return categories;
    };

    // Clear all filters
    const clearAllFilters = () => {
        setSearchQuery('');
        setFilterStatus('all');
        setFilterLocation('all');
        setFilterCategory('all');
        setSortBy('expiration');
    };

    // Quick filter presets
    const applyQuickFilter = (type) => {
        clearAllFilters();
        switch (type) {
            case 'expired':
                setFilterStatus('expired');
                break;
            case 'expiring-soon':
                setFilterStatus('expiring');
                break;
            case 'pantry':
                setFilterLocation('pantry');
                break;
            case 'fridge':
                setFilterLocation('fridge');
                break;
            case 'fridge freezer':
                setFilterLocation('fridge freezer');
                break;
            case 'deep/standup freezer':
                setFilterLocation('deep/standup freezer');
                break;
            case 'kitchen':
                setFilterLocation('kitchen');
                break;
            default:
                break;
        }
    };

    // Form submission handler
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        console.log('🔍 CLIENT: Starting form submission');
        console.log('🔍 CLIENT: Form data:', formData);

        if (!session?.user?.id) {
            alert('Session expired. Please sign in again.');
            setLoading(false);
            return;
        }

        try {
            const body = editingItem
                ? {itemId: editingItem._id, ...formData}
                : {...formData, mergeDuplicates};

            console.log('🔍 CLIENT: Request body:', JSON.stringify(body, null, 2));

            let response;

            if (editingItem) {
                // For editing, use PUT
                response = await apiPut('/api/inventory', body);
            } else {
                // For adding new items, use POST
                response = await apiPost('/api/inventory', body);
            }

            console.log('🔍 CLIENT: Response status:', response.status);
            console.log('🔍 CLIENT: Response headers:', Object.fromEntries(response.headers.entries()));

            // Check if response is actually JSON
            const contentType = response.headers.get('content-type');
            console.log('🔍 CLIENT: Content-Type:', contentType);

            if (!contentType || !contentType.includes('application/json')) {
                const textResponse = await response.text();
                console.error('❌ CLIENT: Non-JSON response:', textResponse);
                throw new Error('Server returned non-JSON response: ' + textResponse.substring(0, 200));
            }

            const data = await response.json();
            console.log('🔍 CLIENT: Response data:', data);

            if (data.success) {
                console.log('✅ CLIENT: Success! Refreshing inventory...');
                await fetchInventory();

                // Show different messages based on whether item was merged or added
                if (data.merged) {
                    showToast(`✅ Item merged successfully!\n\nAdded ${data.addedQuantity} ${data.item.unit} to existing "${data.item.name}"\nNew total: ${data.item.quantity} ${data.item.unit}${data.item.secondaryQuantity ? ` (${data.item.secondaryQuantity} ${data.item.secondaryUnit})` : ''}`);
                } else {
                    // Normal success message for new items
                    showToast('✅ Item added successfully!');
                }

                // Reset form
                setFormData({
                    name: '',
                    brand: '',
                    category: '',
                    quantity: 1,
                    unit: 'item',
                    secondaryQuantity: '',
                    secondaryUnit: '',
                    location: 'pantry',
                    expirationDate: '',
                    upc: ''
                });
                setShowAddForm(false);
                setEditingItem(null);
            } else {
                console.error('❌ CLIENT: Server returned error:', data);
                if (response.status === 401) {
                    alert('Session expired. Please refresh the page and sign in again.');
                } else {
                    alert(data.error || 'Failed to save item');
                }
            }
        } catch (error) {
            console.error('❌ CLIENT: Fetch error:', error);
            alert('Error saving item: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    // Handle edit with auto-scroll to form
    const handleEdit = (item) => {
        setEditingItem(item);
        setFormData({
            name: item.name,
            brand: item.brand || '',
            category: item.category || '',
            quantity: item.quantity,
            unit: item.unit,
            // Include secondary unit data
            secondaryQuantity: item.secondaryQuantity || '',
            secondaryUnit: item.secondaryUnit || '',
            location: item.location,
            expirationDate: item.expirationDate ? item.expirationDate.split('T')[0] : '',
            upc: item.upc || ''
        });
        setShowAddForm(true);

        // ENHANCED: Auto-scroll to the UPC/form section
        setTimeout(() => {
            // Try multiple selectors to find the form section
            const formElement = document.querySelector('form') ||
                document.querySelector('[data-section="add-form"]') ||
                document.querySelector('.add-item-form') ||
                // Look for UPC input specifically
                document.querySelector('input[name="upc"]')?.closest('form') ||
                // Look for the form container
                document.querySelector('.space-y-6');

            if (formElement) {
                console.log('📍 Scrolling to edit form');
                formElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start',
                    inline: 'nearest'
                });
            } else {
                // Fallback: scroll to UPC lookup section specifically
                const upcSection = document.querySelector('label[for="upc"]')?.closest('div');
                if (upcSection) {
                    console.log('📍 Scrolling to UPC section (fallback)');
                    upcSection.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            }
        }, 150); // Slightly longer delay to ensure form is rendered
    };

    const handleDelete = async (itemId) => {
        if (!confirm('Are you sure you want to delete this item?')) return;

        try {
            const response = await apiDelete(`/api/inventory?itemId=${itemId}`);

            const data = await response.json();

            if (data.success) {
                await fetchInventory();
            } else {
                alert(data.error || 'Failed to delete item');
            }
        } catch (error) {
            console.error('Error deleting item:', error);
            alert('Error deleting item');
        }
    };

    const handleChange = (e) => {
        const {name, value} = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleProductFound = (product) => {
        // Parse size information from the product using enhanced logic
        const sizeInfo = parseProductSize(product);

        // Check if we should ask about secondary quantity conflict
        const hasExistingSecondary = formData.secondaryQuantity && formData.secondaryQuantity !== '';
        const hasNewSizeInfo = sizeInfo.quantity && sizeInfo.unit;

        if (hasExistingSecondary && hasNewSizeInfo) {
            // Ask user about conflict
            const shouldOverwrite = confirm(
                `The scanned product shows a size of ${sizeInfo.quantity} ${sizeInfo.unit}, ` +
                `but you already have ${formData.secondaryQuantity} ${formData.secondaryUnit} entered. ` +
                `\n\nWould you like to use the scanned size information?`
            );

            if (!shouldOverwrite) {
                // Don't update secondary quantity, just update other fields
                setFormData(prev => ({
                    ...prev,
                    name: product.name || prev.name,
                    brand: product.brand || prev.brand,
                    category: product.category || prev.category,
                    upc: product.upc || prev.upc
                }));
                return;
            }
        }

        // Update form data including secondary quantity if available
        setFormData(prev => ({
            ...prev,
            name: product.name || prev.name,
            brand: product.brand || prev.brand,
            category: product.category || prev.category,
            upc: product.upc || prev.upc,
            // Add secondary quantity from parsed size info
            secondaryQuantity: hasNewSizeInfo ? sizeInfo.quantity : prev.secondaryQuantity,
            secondaryUnit: hasNewSizeInfo ? sizeInfo.unit : prev.secondaryUnit
        }));
    };

    const handleUPCChange = (upc) => {
        setFormData(prev => ({
            ...prev,
            upc: upc
        }));
    };

    // Reset form to include secondary units
    const resetForm = () => {
        setFormData({
            name: '',
            brand: '',
            category: '',
            quantity: 1,
            unit: 'item',
            secondaryQuantity: '',
            secondaryUnit: '',
            location: 'pantry',
            expirationDate: '',
            upc: ''
        });
        setShowAddForm(false);
        setEditingItem(null);

        // FIXED: Clear any lookup results to prevent carryover
        setLookupResult(null);

        // FIXED: Dispatch event to clear barcode memory in UPCLookup
        window.dispatchEvent(new CustomEvent('clearBarcodeMemory'));
    };

    const fetchStores = async () => {
        try {
            const response = await fetch('/api/stores');
            const data = await response.json();
            if (data.success) {
                setStores(data.stores || []);
            }
        } catch (error) {
            console.error('Error fetching stores:', error);
        }
    };

// Handle opening price tracking modal
    const handleOpenPriceTracking = (item) => {
        console.log('Opening price tracking for:', item.name);
        setTrackingPriceForItem(item);
        setPriceTrackingModal(true);

        // Fetch stores when modal opens
        fetchStores();
    };

// Handle closing price tracking modal
    const handleClosePriceTracking = () => {
        setTrackingPriceForItem(null);
        setPriceTrackingModal(false);
    };

// Handle price added successfully
    const handlePriceAdded = (priceData) => {
        console.log('Price added successfully:', priceData);

        // Update the item in the inventory list with new price data
        setInventoryItems(prevItems =>
            prevItems.map(item =>
                item._id === trackingPriceForItem._id
                    ? {
                        ...item,
                        currentBestPrice: priceData.currentBestPrice,
                        averagePrice: priceData.averagePrice
                    }
                    : item
            )
        );

        // Show success message
        setSuccessMessage('Price added successfully!');
        setTimeout(() => setSuccessMessage(''), 3000);
    };

    // Handle bulk consumption for expired items
    const handleBulkConsumeExpired = () => {
        const expiredItems = inventory.filter(item => {
            const status = getExpirationStatus(item.expirationDate);
            return status.status === 'expired';
        });

        if (expiredItems.length === 0) {
            showToast('No expired items found');
            return;
        }

        if (confirm(`Remove ${expiredItems.length} expired items from inventory?`)) {
            const consumptions = expiredItems.map(item => ({
                itemId: item._id,
                reason: 'expired',
                quantity: item.quantity,
                unit: item.unit,
                notes: 'Bulk removal of expired items',
                removeCompletely: true
            }));

            Promise.all(consumptions.map(consumption =>
                handleConsumption(consumption, 'single')
            )).then(() => {
                showToast(`Successfully removed ${expiredItems.length} expired items`);
            }).catch(error => {
                console.error('Error removing expired items:', error);
            });
        }
    };

    if (status === 'loading') {
        return (
            <MobileOptimizedLayout>
                <div className="min-h-screen flex items-center justify-center">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                        <div className="text-lg text-gray-600">Loading dashboard...</div>
                    </div>
                </div>
            </MobileOptimizedLayout>
        );
    }

    if (!session) {
        return null;
    }

    const filteredInventory = getFilteredAndSortedInventory();
    const expiredCount = inventory.filter(item => getExpirationStatus(item.expirationDate).status === 'expired').length;

    const usageInfo = getUsageInfo();
    const isAtLimit = !usageInfo.isUnlimited && usageInfo.tier !== 'admin' && (typeof usageInfo.limit === 'number' ? usageInfo.limit : 999999);
    const isNearLimit = !usageInfo.isUnlimited && usageInfo.tier !== 'admin' && ((typeof usageInfo.limit === 'number' ? usageInfo.limit : 999999) * 0.8);

    usageInfo.isAtLimit = isAtLimit;
    usageInfo.isNearLimit = isNearLimit;

    return (
        <MobileOptimizedLayout>
            <div className="space-y-6">
                {/* Header - WITH COMMON ITEMS WIZARD BUTTON */}
                <div className="space-y-4">
                    {/* Title Row */}
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Doc Bear's Comfort Kitchen</h1>
                    </div>

                    {/* Usage Info Header */}
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-3">
                                📦 Inventory ({(() => {
                                const usage = getUsageInfo(); // Call the function to get the object
                                if (usage.isUnlimited || usage.tier === 'admin') {
                                    return `${usage.current}`;
                                }
                                return `${usage.current}/${usage.limit}`; // Fixed the syntax here
                            })()})
                            </h2>

                            {!subscription.loading && (
                                <p className="text-sm text-gray-600 mt-1">
                                    {(() => {
                                        const usage = getUsageInfo(); // Get usage info consistently
                                        if (usage.isUnlimited || usage.tier === 'admin') {
                                            return `Unlimited inventory on ${usage.tier} plan`;
                                        } else if (usage.current >= usage.limit) {
                                            return (
                                                <span className="text-red-600 font-medium">
                        You've reached your {usage.tier} plan limit
                    </span>
                                            );
                                        } else if (usage.current >= (usage.limit * 0.8)) {
                                            return (
                                                <span className="text-orange-600">
                        {usage.limit - usage.current} item{(usage.limit - usage.current) !== 1 ? 's' : ''} remaining
                    </span>
                                            );
                                        } else {
                                            return `${usage.limit - usage.current} item${(usage.limit - usage.current) !== 1 ? 's' : ''} remaining on ${usage.tier} plan`;
                                        }
                                    })()}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Usage Warning for Near Limit */}
                    {(() => {
                        const usage = getUsageInfo();
                        const isAtLimit = !usage.isUnlimited && usage.current >= usage.limit;
                        const isNearLimit = !usage.isUnlimited && usage.current >= (usage.limit * 0.8);

                        if (isAtLimit) {
                            return (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                    <div className="flex items-start">
                                        <div className="text-red-500 mr-3 mt-0.5">
                                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd"
                                                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                                                      clipRule="evenodd"/>
                                            </svg>
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="text-sm font-medium text-red-800">
                                                Inventory Limit Reached
                                            </h3>
                                            <p className="text-sm text-red-700 mt-1">
                                                You've reached your {usage.tier} plan limit of {usage.limit} inventory
                                                items.
                                                {usage.tier === 'free' && ' Upgrade to Gold for 250 items or Platinum for unlimited.'}
                                                {usage.tier === 'gold' && ' Upgrade to Platinum for unlimited inventory items.'}
                                            </p>
                                                <TouchEnhancedButton
                                                    onClick={() => window.location.href = '/pricing'}
                                                    className="mt-2 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 text-sm"
                                                >
                                                    🚀 Upgrade Now
                                                </TouchEnhancedButton>
                                        </div>
                                    </div>
                                </div>
                            );
                        } else if (isNearLimit) {
                            return (
                                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                                    <div className="flex items-start">
                                        <div className="text-orange-500 mr-3 mt-0.5">
                                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd"
                                                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                                                      clipRule="evenodd"/>
                                            </svg>
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="text-sm font-medium text-orange-800">
                                                Approaching Inventory Limit
                                            </h3>
                                            <p className="text-sm text-orange-700 mt-1">
                                                You have {usage.limit - usage.current} inventory item slots remaining on
                                                your {usage.tier} plan.
                                                {usage.tier === 'free' && ' Consider upgrading to Gold for 250 items or Platinum for unlimited.'}
                                                {usage.tier === 'gold' && ' Consider upgrading to Platinum for unlimited inventory items.'}
                                            </p>
                                            <TouchEnhancedButton
                                                onClick={() => window.location.href = `/pricing?source=inventory-warning&tier=${usage.tier}`}
                                                className="mt-2 text-orange-600 hover:text-orange-800 underline text-sm"
                                            >
                                                View Upgrade Options
                                            </TouchEnhancedButton>
                                        </div>
                                    </div>
                                </div>
                            );
                        }
                        return null;
                    })()}


                    {/* Action Buttons Row - Mobile Responsive */}
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                        {/* Left side buttons */}
                        <div className="flex gap-2 flex-1">
                            {/* Common Items Wizard Button - Priority placement for new users */}
                            {inventory.length === 0 && (
                                <FeatureGate
                                    feature={FEATURE_GATES.COMMON_ITEMS_WIZARD}
                                    fallback={
                                        <TouchEnhancedButton
                                            onClick={() => window.location.href = '/pricing?source=common-items-wizard'}
                                            className="flex-1 sm:flex-initial inline-flex items-center justify-center px-3 py-2 border border-indigo-300 text-sm font-medium rounded-md shadow-sm text-indigo-700 bg-indigo-50 hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                        >
                                            <span className="hidden sm:inline">🔒 Quick Start (Gold)</span>
                                            <span className="sm:hidden">🔒 Start</span>
                                        </TouchEnhancedButton>
                                    }
                                >
                                    <TouchEnhancedButton
                                        onClick={() => setShowCommonItemsWizard(true)}
                                        className="flex-1 sm:flex-initial inline-flex items-center justify-center px-3 py-2 border border-indigo-300 text-sm font-medium rounded-md shadow-sm text-indigo-700 bg-indigo-50 hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                    >
                                        <span className="hidden sm:inline">🏠 Quick Start</span>
                                        <span className="sm:hidden">🏠 Start</span>
                                    </TouchEnhancedButton>
                                </FeatureGate>
                            )}

                            {/* Common Items Wizard Button - For existing users */}
                            {inventory.length > 0 && (
                                <FeatureGate
                                    feature={FEATURE_GATES.COMMON_ITEMS_WIZARD}
                                    fallback={
                                        <TouchEnhancedButton
                                            onClick={() => window.location.href = '/pricing?source=common-items-wizard'}
                                            className="flex-1 sm:flex-initial inline-flex items-center justify-center px-3 py-2 border border-green-300 text-sm font-medium rounded-md shadow-sm text-green-700 bg-green-50 hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                                        >
                                            <span className="hidden sm:inline">🔒 Common Items (Gold)</span>
                                            <span className="sm:hidden">🔒 Common</span>
                                        </TouchEnhancedButton>
                                    }
                                >
                                    <TouchEnhancedButton
                                        onClick={() => setShowCommonItemsWizard(true)}
                                        className="flex-1 sm:flex-initial inline-flex items-center justify-center px-3 py-2 border border-green-300 text-sm font-medium rounded-md shadow-sm text-green-700 bg-green-50 hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                                    >
                                        <span className="hidden sm:inline">🏠 Add Common Items</span>
                                        <span className="sm:hidden">🏠 Common</span>
                                    </TouchEnhancedButton>
                                </FeatureGate>
                            )}

                            <FeatureGate
                                feature={FEATURE_GATES.CONSUMPTION_HISTORY}
                                fallback={
                                    <TouchEnhancedButton
                                        onClick={() => window.location.href = '/pricing?source=consumption-history'}
                                        className="flex-1 sm:flex-initial inline-flex items-center justify-center px-3 py-2 border border-blue-300 text-sm font-medium rounded-md shadow-sm text-blue-700 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                    >
                                        <span className="hidden sm:inline">🔒 History (Gold)</span>
                                        <span className="sm:hidden">🔒 History</span>
                                    </TouchEnhancedButton>
                                }
                            >
                                <TouchEnhancedButton
                                    onClick={() => setShowConsumptionHistory(true)}
                                    className="flex-1 sm:flex-initial inline-flex items-center justify-center px-3 py-2 border border-blue-300 text-sm font-medium rounded-md shadow-sm text-blue-700 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                >
                                    <span className="hidden sm:inline">📊 View History</span>
                                    <span className="sm:hidden">📊 History</span>
                                </TouchEnhancedButton>
                            </FeatureGate>

                            {expiredCount > 0 && (
                                <TouchEnhancedButton
                                    onClick={handleBulkConsumeExpired}
                                    className="flex-1 sm:flex-initial inline-flex items-center justify-center px-3 py-2 border border-red-300 text-sm font-medium rounded-md shadow-sm text-red-700 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                                >
                                    <span className="hidden sm:inline">🗑️ Remove {expiredCount} Expired</span>
                                    <span className="sm:hidden">🗑️ Remove {expiredCount}</span>
                                </TouchEnhancedButton>
                            )}
                        </div>

                        {/* Add/Cancel button - Always visible */}
                        <FeatureGate
                            feature={FEATURE_GATES.INVENTORY_LIMIT}
                            currentCount={inventory.length}
                            fallback={
                                <TouchEnhancedButton
                                    onClick={() => window.location.href = `/pricing?source=inventory-add-item&tier=${getUsageInfo().tier}`}
                                    className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                                >
                                    🔒 Upgrade to Add More
                                </TouchEnhancedButton>
                            }
                        >
                            <TouchEnhancedButton
                                onClick={() => {
                                    const newShowAddForm = !showAddForm;
                                    setShowAddForm(newShowAddForm);

                                    // If opening the form, scroll to it
                                    if (newShowAddForm) {
                                        console.log('📍 Opening add form and scrolling');

                                        // Use a longer timeout to ensure form is rendered
                                        const scrollTimeout = setTimeout(() => {
                                            const scrollToForm = () => {
                                                const formElement = document.querySelector('form') ||
                                                    document.querySelector('[data-section="add-form"]') ||
                                                    document.querySelector('input[name="upc"]')?.closest('div') ||
                                                    document.querySelector('label[for="upc"]')?.closest('div');

                                                if (formElement) {
                                                    formElement.scrollIntoView({
                                                        behavior: 'smooth',
                                                        block: 'start',
                                                        inline: 'nearest'
                                                    });
                                                }
                                            };

                                            scrollToForm();

                                            // Retry if needed
                                            setTimeout(scrollToForm, 500);
                                        }, 150);

                                        // Cleanup timeout if component unmounts
                                        return () => clearTimeout(scrollTimeout);
                                    }
                                }}
                                className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            >
                                {showAddForm ? 'Cancel' : 'Add Item'}
                            </TouchEnhancedButton>
                        </FeatureGate>
                    </div>
                </div>

                {/* Inventory Info Box */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start">
                        <div className="text-blue-600 mr-3 mt-0.5">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd"
                                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                                      clipRule="evenodd"/>
                            </svg>
                        </div>
                        <div className="flex-1">
                            <h3 className="text-sm font-medium text-blue-800">Your Kitchen Inventory</h3>
                            <p className="text-sm text-blue-700 mt-1">
                                Track your food and ingredients to reduce waste and always know what you have on hand.
                            </p>
                            {!subscription.loading && (
                                <div className="mt-2 text-xs text-purple-600">
                                    {(() => {
                                        const usage = getUsageInfo('inventory');
                                        if (usage.isUnlimited || usage.tier === 'admin') {
                                            return `${usage.current} saved • Unlimited on ${usage.tier} plan`;
                                        }
                                        const remaining = Math.max(0, (typeof usage.limit === 'number' ? usage.limit : 0) - usage.current);
                                        return `${usage.current} items stored • ${remaining} remaining on ${usage.tier} plan`;
                                    })()}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Enhanced Search and Filtering */}
                <div className="bg-white shadow rounded-lg p-4 space-y-4">
                    {/* Search Bar */}
                    <div>
                        <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
                            🔍 Search Inventory
                        </label>
                        <div className="relative">
                            <input
                                type="text"
                                id="search"
                                placeholder="Search by name, brand, category, location, or UPC..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            />
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <span className="text-gray-400">🔍</span>
                            </div>
                            {searchQuery && (
                                <TouchEnhancedButton
                                    onClick={() => setSearchQuery('')}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                                >
                                    ✕
                                </TouchEnhancedButton>
                            )}
                        </div>
                    </div>

                    {/* Quick Filter Buttons - CONDITIONAL based on user preference */}
                    {userPreferences.showQuickFilters && (
                        <div>
                            <div className="text-sm font-medium text-gray-700 mb-2">⚡ Quick Filters</div>
                            <div className="flex flex-wrap gap-2">
                                <TouchEnhancedButton
                                    onClick={() => applyQuickFilter('expired')}
                                    className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded-full hover:bg-red-200 border border-red-300"
                                >
                                    🚨 Expired
                                </TouchEnhancedButton>
                                <TouchEnhancedButton
                                    onClick={() => applyQuickFilter('expiring-soon')}
                                    className="px-3 py-1 text-xs bg-orange-100 text-orange-700 rounded-full hover:bg-orange-200 border border-orange-300"
                                >
                                    ⏰ Expiring Soon
                                </TouchEnhancedButton>
                                <TouchEnhancedButton
                                    onClick={() => applyQuickFilter('pantry')}
                                    className="px-3 py-1 text-xs bg-yellow-100 text-yellow-700 rounded-full hover:bg-yellow-200 border border-yellow-300"
                                >
                                    🏠 Pantry
                                </TouchEnhancedButton>
                                <TouchEnhancedButton
                                    onClick={() => applyQuickFilter('kitchen')}
                                    className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded-full hover:bg-green-200 border border-green-300"
                                >
                                    🚪 Kitchen
                                </TouchEnhancedButton>
                                <TouchEnhancedButton
                                    onClick={() => applyQuickFilter('fridge')}
                                    className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 border border-blue-300"
                                >
                                    ❄️ Fridge
                                </TouchEnhancedButton>
                                <TouchEnhancedButton
                                    onClick={() => applyQuickFilter('fridge-freezer')}
                                    className="px-3 py-1 text-xs bg-cyan-100 text-cyan-700 rounded-full hover:bg-cyan-200 border border-cyan-300"
                                >
                                    🧊 Fridge Freezer
                                </TouchEnhancedButton>

                                <TouchEnhancedButton
                                    onClick={() => applyQuickFilter('deep-freezer')}
                                    className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 border border-blue-300"
                                >
                                    ❄️ Deep Freezer
                                </TouchEnhancedButton>
                                <TouchEnhancedButton
                                    onClick={clearAllFilters}
                                    className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 border border-gray-300"
                                >
                                    🔄 Clear All
                                </TouchEnhancedButton>
                            </div>
                        </div>
                    )}

                    {/* Advanced Filters */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">📊 Status</label>
                            <select
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            >
                                <option value="all">📦 All Items ({inventory.length})</option>
                                <option value="expired">🚨 Expired ({inventory.filter(item => getExpirationStatus(item.expirationDate).status === 'expired').length})</option>
                                <option value="expiring">⏰ Expiring Soon ({inventory.filter(item => ['expires-today', 'expires-soon', 'expires-week'].includes(getExpirationStatus(item.expirationDate).status)).length})</option>
                                <option value="fresh">✅ Fresh ({inventory.filter(item => ['fresh', 'no-date'].includes(getExpirationStatus(item.expirationDate).status)).length})</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">📍 Location</label>
                            <select
                                value={filterLocation}
                                onChange={(e) => setFilterLocation(e.target.value)}
                                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            >
                                <option value="all">All Locations</option>
                                {getUniqueLocations().map(location => (
                                    <option key={location} value={location}>
                                        {location.charAt(0).toUpperCase() + location.slice(1)} ({inventory.filter(item => item.location === location).length})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">🏷️ Category</label>
                            <select
                                value={filterCategory}
                                onChange={(e) => setFilterCategory(e.target.value)}
                                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            >
                                <option value="all">All Categories</option>
                                {getUniqueCategories().map(category => (
                                    <option key={category} value={category}>
                                        {category} ({inventory.filter(item => item.category === category).length})
                                    </option>
                                ))}
                                {inventory.filter(item => !item.category || item.category === '').length > 0 && (
                                    <option value="uncategorized">
                                        Uncategorized
                                        ({inventory.filter(item => !item.category || item.category === '').length})
                                    </option>
                                )}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">🔃 Sort By</label>
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            >
                                <option value="expiration">⚠️ Priority (Expiring First)</option>
                                <option value="expiration-date">📅 Expiration Date</option>
                                <option value="name">🔤 Name (A-Z)</option>
                                <option value="brand">🏷️ Brand (A-Z)</option>
                                <option value="category">📂 Category</option>
                                <option value="location">📍 Location</option>
                                <option value="quantity">📊 Quantity (High to Low)</option>
                                <option value="date-added">🕒 Recently Added</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Add/Edit Item Form */}
                {showAddForm && (
                    <div className="bg-white shadow rounded-lg" data-section="add-form">
                        <div className="px-4 py-5 sm:p-6">
                            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                                {editingItem ? 'Edit Item' : 'Add New Item'}
                            </h3>
                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    id="mergeDuplicates"
                                    checked={mergeDuplicates}
                                    onChange={(e) => setMergeDuplicates(e.target.checked)}
                                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                />
                                <label htmlFor="mergeDuplicates" className="ml-2 block text-sm text-gray-700">
                                    Merge with existing items (recommended for barcode scanning)
                                </label>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                {/* UPC Lookup Section - FIXED PROP NAME */}
                                <div>
                                    <UPCLookup
                                        onProductFound={handleProductFound}
                                        onUPCChange={handleUPCChange}
                                        currentUPC={formData.upc}
                                    />
                                </div>

                                {/* Basic Item Information */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                                            Item Name *
                                        </label>
                                        <input
                                            type="text"
                                            id="name"
                                            name="name"
                                            required
                                            value={formData.name}
                                            onChange={handleChange}
                                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                            placeholder="e.g., Organic Bananas"
                                        />
                                    </div>

                                    <div>
                                        <label htmlFor="brand" className="block text-sm font-medium text-gray-700">
                                            Brand
                                        </label>
                                        <input
                                            type="text"
                                            id="brand"
                                            name="brand"
                                            value={formData.brand}
                                            onChange={handleChange}
                                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                            placeholder="e.g., Dole"
                                        />
                                    </div>

                                    <div>
                                        <label htmlFor="category" className="block text-sm font-medium text-gray-700">
                                            Category
                                        </label>
                                        <select
                                            id="category"
                                            name="category"
                                            value={formData.category}
                                            onChange={handleChange}
                                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                        >
                                            <option value="">Select category</option>
                                            <option value="Baking & Cooking Ingredients">Baking & Cooking Ingredients</option>
                                            <option value="Beans">Beans</option>
                                            <option value="Beverages">Beverages</option>
                                            <option value="Bouillon">Bouillon</option>
                                            <option value="Boxed Meals">Boxed Meals</option>
                                            <option value="Breads">Breads</option>
                                            <option value="Canned Beans">Canned/Jarred Beans</option>
                                            <option value="Canned Fruit">Canned/Jarred Fruit</option>
                                            <option value="Canned Meals">Canned/Jarred Meals</option>
                                            <option value="Canned Meat">Canned/Jarred Meat</option>
                                            <option value="Canned Sauces">Canned/Jarred Sauces</option>
                                            <option value="Canned Tomatoes">Canned/Jarred Tomatoes</option>
                                            <option value="Canned Vegetables">Canned/Jarred Vegetables</option>
                                            <option value="Cheese">Cheese</option>
                                            <option value="Condiments">Condiments</option>
                                            <option value="Dairy">Dairy</option>
                                            <option value="Eggs">Eggs</option>
                                            <option value="Fresh Fruits">Fresh Fruits</option>
                                            <option value="Fresh Spices">Fresh Spices</option>
                                            <option value="Fresh Vegetables">Fresh Vegetables</option>
                                            <option value="Fresh/Frozen Beef">Fresh/Frozen Beef</option>
                                            <option value="Fresh/Frozen Fish & Seafood">Fresh/Frozen Fish & Seafood</option>
                                            <option value="Fresh/Frozen Lamb">Fresh/Frozen Lamb</option>
                                            <option value="Fresh/Frozen Pork">Fresh/Frozen Pork</option>
                                            <option value="Fresh/Frozen Poultry">Fresh/Frozen Poultry</option>
                                            <option value="Fresh/Frozen Rabbit">Fresh/Frozen Rabbit</option>
                                            <option value="Fresh/Frozen Venison">Fresh/Frozen Venison</option>
                                            <option value="Frozen Fruit">Frozen Fruit</option>
                                            <option value="Frozen Meals">Frozen Meals</option>
                                            <option value="Frozen Other Items">Frozen Other Items</option>
                                            <option value="Frozen Vegetables">Frozen Vegetables</option>
                                            <option value="Grains">Grains</option>
                                            <option value="Other">Other</option>
                                            <option value="Pasta">Pasta</option>
                                            <option value="Seasonings">Seasonings</option>
                                            <option value="Snacks">Snacks</option>
                                            <option value="Soups & Soup Mixes">Soups & Soup Mixes</option>
                                            <option value="Spices">Spices</option>
                                            <option value="Stock/Broth">Stock/Broth</option>
                                            <option value="Stuffing & Sides">Stuffing & Sides</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label htmlFor="location" className="block text-sm font-medium text-gray-700">
                                            Storage Location *
                                        </label>
                                        <select
                                            id="location"
                                            name="location"
                                            required
                                            value={formData.location}
                                            onChange={handleChange}
                                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                        >
                                            <option value="pantry">Pantry</option>
                                            <option value="kitchen">Kitchen Cabinets</option>
                                            <option value="fridge">Fridge</option>
                                            <option value="fridge-freezer">Fridge Freezer</option>
                                            <option value="deep-freezer">Deep/Stand-up Freezer</option>
                                            <option value="garage">Garage/Storage</option>
                                            <option value="other">Other</option>

                                        </select>
                                    </div>
                                </div>

                                {/* Dual Quantity Input Section */}
                                <div className="md:col-span-2">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* Primary Quantity */}
                                        <div>
                                            <label htmlFor="quantity"
                                                   className="block text-sm font-medium text-gray-700">
                                                Primary Quantity *
                                            </label>
                                            <div className="mt-1 flex rounded-md shadow-sm">
                                                <input
                                                    type="number"
                                                    id="quantity"
                                                    name="quantity"
                                                    min="0"
                                                    step="0.01"
                                                    required
                                                    value={formData.quantity}
                                                    onChange={handleChange}
                                                    className="flex-1 block w-full border-gray-300 rounded-l-md focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                                />
                                                <select
                                                    name="unit"
                                                    value={formData.unit}
                                                    onChange={handleChange}
                                                    className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-gray-300 bg-gray-50 text-gray-500 sm:text-sm"
                                                >
                                                    <option value="can">Can(s)</option>
                                                    <option value="cup">Cup(s)</option>
                                                    <option value="each">Each</option>
                                                    <option value="g">Grams</option>
                                                    <option value="item">Item(s)</option>
                                                    <option value="kg">Kilograms</option>
                                                    <option value="l">Liters</option>
                                                    <option value="ml">Milliliters</option>
                                                    <option value="oz">Ounces</option>
                                                    <option value="package">Package(s)</option>
                                                    <option value="lbs">Pounds</option>
                                                    <option value="tbsp">Tablespoon(s)</option>
                                                    <option value="tsp">Teaspoon(s)</option>
                                                </select>
                                            </div>
                                        </div>

                                        {/* Secondary Quantity (Optional) */}
                                        <div>
                                            <label htmlFor="secondaryQuantity"
                                                   className="block text-sm font-medium text-gray-700">
                                                Secondary Quantity <span className="text-gray-500">(Optional)</span>
                                            </label>
                                            <div className="mt-1 flex rounded-md shadow-sm">
                                                <input
                                                    type="number"
                                                    id="secondaryQuantity"
                                                    name="secondaryQuantity"
                                                    min="0"
                                                    step="0.01"
                                                    value={formData.secondaryQuantity}
                                                    onChange={handleChange}
                                                    placeholder="0"
                                                    className="flex-1 block w-full border-gray-300 rounded-l-md focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                                />
                                                <select
                                                    name="secondaryUnit"
                                                    value={formData.secondaryUnit}
                                                    onChange={handleChange}
                                                    className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-gray-300 bg-gray-50 text-gray-500 sm:text-sm"
                                                >
                                                    <option value="">Select unit</option>
                                                    <option value="can">Can(s)</option>
                                                    <option value="cup">Cup(s)</option>
                                                    <option value="each">Each</option>
                                                    <option value="g">Grams</option>
                                                    <option value="item">Item(s)</option>
                                                    <option value="kg">Kilograms</option>
                                                    <option value="l">Liters</option>
                                                    <option value="ml">Milliliters</option>
                                                    <option value="oz">Ounces</option>
                                                    <option value="package">Package(s)</option>
                                                    <option value="lbs">Pounds</option>
                                                    <option value="tbsp">Tablespoon(s)</option>
                                                    <option value="tsp">Teaspoon(s)</option>
                                                </select>
                                            </div>
                                            <p className="mt-1 text-xs text-gray-500">
                                                Add an alternative unit for tracking (e.g., "2 lbs" and "6 tomatoes")
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label htmlFor="expirationDate" className="block text-sm font-medium text-gray-700">
                                        Expiration Date
                                        <span
                                            className="text-sm text-gray-500 ml-1">(Important for tracking freshness)</span>
                                    </label>
                                    <input
                                        type="date"
                                        id="expirationDate"
                                        name="expirationDate"
                                        value={formData.expirationDate}
                                        onChange={handleChange}
                                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                    />
                                    <p className="mt-1 text-xs text-gray-500">
                                        Setting expiration dates helps track freshness and prevents food waste
                                    </p>
                                </div>

                                <div className="flex justify-end space-x-3">
                                    <TouchEnhancedButton
                                        type="button"
                                        onClick={resetForm}
                                        className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                    >
                                        Cancel
                                    </TouchEnhancedButton>
                                    <TouchEnhancedButton
                                        type="submit"
                                        disabled={loading}
                                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400"
                                    >
                                        {loading ? 'Saving...' : editingItem ? 'Update Item' : 'Add Item'}
                                    </TouchEnhancedButton>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {filteredInventory.length !== inventory.length && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                        <div className="text-sm text-blue-800">
                            {searchQuery && (
                                <span>🔍 Found {filteredInventory.length} items matching "{searchQuery}"</span>
                            )}
                            {(filterStatus !== 'all' || filterLocation !== 'all' || filterCategory !== 'all') && (
                                <span>
                    {searchQuery ? ' with applied filters' : `📋 Showing ${filteredInventory.length} filtered items`}
                </span>
                            )}
                            {filteredInventory.length === 0 && (
                                <div className="mt-2">
                                    <TouchEnhancedButton
                                        onClick={clearAllFilters}
                                        className="text-blue-600 hover:text-blue-800 underline text-sm"
                                    >
                                        Clear all filters
                                    </TouchEnhancedButton>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Inventory Grid Display with Smart Units */}
                <div className="bg-white shadow rounded-lg">
                    <div className="px-4 py-5 sm:p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg leading-6 font-medium text-gray-900">
                                Current Inventory ({filteredInventory.length} items)
                            </h3>

                            {/* ADD: View Toggle */}
                            <div className="flex items-center space-x-2">
                                <span className="text-sm text-gray-600">View:</span>
                                <TouchEnhancedButton
                                    onClick={() => setUserPreferences(prev => ({...prev, compactView: false}))}
                                    className={`px-3 py-1 text-xs rounded ${
                                        !userPreferences.compactView
                                            ? 'bg-indigo-600 text-white'
                                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                    }`}
                                >
                                    📋 Standard
                                </TouchEnhancedButton>
                                <TouchEnhancedButton
                                    onClick={() => setUserPreferences(prev => ({...prev, compactView: true}))}
                                    className={`px-3 py-1 text-xs rounded ${
                                        userPreferences.compactView
                                            ? 'bg-indigo-600 text-white'
                                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                    }`}
                                >
                                    📄 Compact
                                </TouchEnhancedButton>
                            </div>
                        </div>

                        {loading ? (
                            <div className="text-center py-8">
                                <div className="text-gray-500">Loading inventory...</div>
                            </div>
                        ) : filteredInventory.length === 0 ? (
                            <div className="text-center py-8">
                                <div className="text-gray-500 mb-4">
                                    {inventory.length === 0 ? 'No items in your inventory yet' : 'No items match your filters'}
                                </div>
                                {/* In the empty inventory section, replace the existing content with: */}
                                {inventory.length === 0 && (
                                    <div className="text-center py-8">
                                        <div className="text-gray-500 mb-4">
                                            {getUsageInfo().tier === 'free' ? (
                                                <>
                                                    <div className="text-gray-500 mb-4">No items in your inventory yet
                                                    </div>
                                                    <div
                                                        className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                                                        <div className="text-sm text-blue-800">
                                                            <strong>📦 Inventory Limits:</strong>
                                                            <ul className="mt-2 space-y-1 text-left">
                                                                <li>• <strong>Free:</strong> Store up to 50 items</li>
                                                                <li>• <strong>Gold:</strong> Store up to 250 items</li>
                                                                <li>• <strong>Platinum:</strong> Unlimited inventory
                                                                </li>
                                                                <li>• Track expiration dates</li>
                                                                <li>• Monitor food waste</li>
                                                            </ul>
                                                        </div>
                                                    </div>
                                                </>
                                            ) : (
                                                'No items in your inventory yet'
                                            )}
                                        </div>
                                        <FeatureGate
                                            feature={FEATURE_GATES.INVENTORY_LIMIT}
                                            currentCount={0}
                                            fallback={
                                                <TouchEnhancedButton
                                                    onClick={() => window.location.href = '/pricing?source=inventory-empty'}
                                                    className="bg-gradient-to-r from-blue-400 to-indigo-500 text-white px-6 py-3 rounded-md font-medium hover:from-blue-500 hover:to-indigo-600"
                                                >
                                                    🚀 Upgrade to Add Items
                                                </TouchEnhancedButton>
                                            }
                                        >
                                            <TouchEnhancedButton
                                                onClick={() => setShowAddForm(true)}
                                                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-600 bg-indigo-100 hover:bg-indigo-200"
                                            >
                                                Add your first item
                                            </TouchEnhancedButton>
                                        </FeatureGate>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className={`grid gap-4 ${
                                userPreferences.compactView
                                    ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
                                    : 'grid-cols-1 sm:grid-cols-2'
                            }`}>
                                {filteredInventory.map((item) => {
                                    const expirationInfo = getExpirationStatus(item.expirationDate);

                                    return (
                                        <div
                                            key={item._id}
                                            className={`border rounded-lg ${expirationInfo.bgColor} hover:shadow-md transition-shadow relative ${
                                                userPreferences.compactView ? 'p-3' : 'p-4'
                                            }`}
                                            style={{
                                                borderLeftColor: expirationInfo.color === 'red' ? '#ef4444' :
                                                    expirationInfo.color === 'orange' ? '#f97316' :
                                                        expirationInfo.color === 'yellow' ? '#eab308' :
                                                            expirationInfo.color === 'green' ? '#22c55e' : '#6b7280',
                                                borderLeftWidth: '4px'
                                            }}
                                        >
                                            {/* Status Icon - Top Right */}
                                            <div className={`absolute ${userPreferences.compactView ? 'top-1 right-1' : 'top-2 right-2'} text-lg`}>
                                                {expirationInfo.icon || '📦'}
                                            </div>

                                            {/* Item Name and Brand */}
                                            <div className={`${userPreferences.compactView ? 'mb-2 pr-6' : 'mb-3 pr-8'}`}>
                                                <h4 className={`font-semibold text-gray-900 leading-tight mb-1 ${
                                                    userPreferences.compactView ? 'text-sm' : 'text-sm'
                                                }`}>
                                                    {item.name}
                                                </h4>
                                                {item.brand && (
                                                    <p className={`text-gray-600 ${userPreferences.compactView ? 'text-xs' : 'text-xs'}`}>
                                                        {item.brand}
                                                    </p>
                                                )}
                                            </div>

                                            {/* 🆕 PRICE INFORMATION DISPLAY - SAFE VERSION */}
                                            {item.currentBestPrice?.price && (
                                                <div className="text-xs text-gray-600 mb-2">
                                                    <div className="flex justify-between">
                                                        <span>Best Price:</span>
                                                        <span className="font-medium">
                                    ${(Number(item.currentBestPrice.price) || 0).toFixed(2)}
                                                            {item.currentBestPrice.store && ` at ${item.currentBestPrice.store}`}
                                </span>
                                                    </div>
                                                    {item.averagePrice && (
                                                        <div className="flex justify-between">
                                                            <span>Avg Price:</span>
                                                            <span>${(Number(item.averagePrice) || 0).toFixed(2)}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Smart Quantity Display */}
                                            <div className={`flex justify-between items-center ${userPreferences.compactView ? 'mb-2' : 'mb-3'}`}>
                                                <div className={`font-medium text-gray-900 ${userPreferences.compactView ? 'text-sm' : 'text-sm'}`}>
                                                    {formatInventoryDisplayText(item)}
                                                </div>
                                                <span
                                                    className={`inline-flex items-center rounded-full font-medium bg-gray-100 text-gray-800 capitalize ${
                                                        userPreferences.compactView ? 'px-2 py-0.5 text-xs' : 'px-2 py-1 text-xs'
                                                    }`}>
                            {item.location}
                        </span>
                                            </div>

                                            {/* Category - Only show in standard view or if no brand */}
                                            {(!userPreferences.compactView || !item.brand) && (
                                                <div className={`text-gray-500 ${userPreferences.compactView ? 'text-xs mb-2' : 'text-xs mb-3'}`}>
                                                    {item.category || 'No category'}
                                                </div>
                                            )}

                                            {/* Expiration Status */}
                                            <div className={`font-medium ${expirationInfo.textColor} ${userPreferences.compactView ? 'text-xs mb-2' : 'text-xs mb-3'}`}>
                                                {item.expirationDate ? (
                                                    <div>
                                                        {!userPreferences.compactView && (
                                                            <div>{new Date(item.expirationDate).toLocaleDateString()}</div>
                                                        )}
                                                        <div>{expirationInfo.label}</div>
                                                    </div>
                                                ) : (
                                                    'No expiration set'
                                                )}
                                            </div>

                                            {/* 🆕 ENHANCED ACTION BUTTONS WITH PRICE TRACKING */}
                                            <div className={`flex ${userPreferences.compactView ? 'gap-0.5' : 'gap-1'}`}>
                                                <TouchEnhancedButton
                                                    onClick={() => handleAddToShoppingList(item)}
                                                    className={`flex-1 text-green-700 font-medium rounded border transition-colors ${
                                                        userPreferences.compactView ? 'text-xs py-1 px-1' : 'text-xs py-1.5 px-2'
                                                    } ${
                                                        expirationInfo.status === 'fresh' || expirationInfo.status === 'no-date'
                                                            ? 'bg-white border-green-300 hover:bg-green-50 shadow-sm'
                                                            : 'bg-green-50 border-green-200 hover:bg-green-100'
                                                    }`}
                                                    title="Add to Shopping List"
                                                >
                                                    {userPreferences.compactView ? '🛒' : '🛒 Add'}
                                                </TouchEnhancedButton>

                                                {/* 🆕 PRICE TRACKING BUTTON */}
                                                <TouchEnhancedButton
                                                    onClick={() => handleOpenPriceTracking(item)}
                                                    className={`flex-1 bg-yellow-50 text-yellow-700 font-medium rounded hover:bg-yellow-100 border border-yellow-200 ${
                                                        userPreferences.compactView ? 'text-xs py-1 px-1' : 'text-xs py-1.5 px-2'
                                                    }`}
                                                    title="Track Prices"
                                                >
                                                    {userPreferences.compactView ? '💰' : '💰 Price'}
                                                </TouchEnhancedButton>

                                                <TouchEnhancedButton
                                                    onClick={() => setConsumingItem(item)}
                                                    className={`flex-1 bg-blue-50 text-blue-700 font-medium rounded hover:bg-blue-100 border border-blue-200 ${
                                                        userPreferences.compactView ? 'text-xs py-1 px-1' : 'text-xs py-1.5 px-2'
                                                    }`}
                                                    title="Use/Consume Item"
                                                >
                                                    {userPreferences.compactView ? '📦' : '📦 Use'}
                                                </TouchEnhancedButton>

                                                <TouchEnhancedButton
                                                    onClick={() => handleEdit(item)}
                                                    className={`flex-1 bg-indigo-50 text-indigo-700 font-medium rounded hover:bg-indigo-100 border border-indigo-200 ${
                                                        userPreferences.compactView ? 'text-xs py-1 px-1' : 'text-xs py-1.5 px-2'
                                                    }`}
                                                >
                                                    {userPreferences.compactView ? '✏️' : '✏️ Edit'}
                                                </TouchEnhancedButton>

                                                <TouchEnhancedButton
                                                    onClick={() => handleDelete(item._id)}
                                                    className={`bg-red-50 text-red-700 font-medium rounded hover:bg-red-100 border border-red-200 ${
                                                        userPreferences.compactView ? 'text-xs py-1 px-1' : 'text-xs py-1.5 px-2'
                                                    }`}
                                                >
                                                    🗑️
                                                </TouchEnhancedButton>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Common Items Wizard Modal */}
                <CommonItemsWizard
                    isOpen={showCommonItemsWizard}
                    onClose={() => setShowCommonItemsWizard(false)}
                    onComplete={handleCommonItemsComplete}
                />

                {/* Consumption Modal */}
                {consumingItem && (
                    <InventoryConsumption
                        item={consumingItem}
                        onConsume={handleConsumption}
                        onClose={() => setConsumingItem(null)}
                        mode="single"
                    />
                )}

                {/* Consumption History Modal */}
                {showConsumptionHistory && (
                    <ConsumptionHistory
                        onClose={() => setShowConsumptionHistory(false)}
                    />
                )}

                {/* Add to Shopping List Modal */}
                <AddToShoppingListModal
                    isOpen={showShoppingListModal}
                    onClose={() => {
                        setShowShoppingListModal(false);
                        setSelectedItemForShopping(null);
                    }}
                    item={selectedItemForShopping}
                    onAddToNew={handleAddToNewList}
                    onAddToExisting={handleAddToExistingList}
                />

                {priceTrackingModal && trackingPriceForItem && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                        <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
                            <div className="p-6">
                                <div className="flex justify-between items-center mb-4">
                                    <h2 className="text-lg font-semibold">💰 Track Price: {trackingPriceForItem.name}</h2>
                                    <TouchEnhancedButton
                                        onClick={handleClosePriceTracking}
                                        className="text-gray-400 hover:text-gray-600"
                                    >
                                        ✕
                                    </TouchEnhancedButton>
                                </div>

                                <PriceTrackingForm
                                    item={trackingPriceForItem}
                                    stores={stores}
                                    onPriceAdded={handlePriceAdded}
                                    onClose={handleClosePriceTracking}
                                />
                            </div>
                        </div>
                    </div>
                )}

                <Footer/>
            </div>
        </MobileOptimizedLayout>
    );
}

function PriceTrackingForm({ item, stores, onPriceAdded, onClose }) {
    const [formData, setFormData] = useState({
        price: '',
        store: '',
        size: '',
        unit: '',
        isOnSale: false,
        notes: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await fetch(`/api/inventory/${item._id}/prices`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (data.success) {
                onPriceAdded(data.data);
                onClose();
            } else {
                setError(data.error || 'Failed to add price');
            }
        } catch (error) {
            console.error('Error adding price:', error);
            setError('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded text-sm">
                    {error}
                </div>
            )}

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Price *
                </label>
                <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2">$</span>
                    <input
                        type="number"
                        step="0.01"
                        min="0"
                        required
                        value={formData.price}
                        onChange={(e) => setFormData(prev => ({...prev, price: e.target.value}))}
                        className="pl-6 w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                        style={{fontSize: '16px'}}
                        placeholder="0.00"
                    />
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Store *
                </label>
                <select
                    required
                    value={formData.store}
                    onChange={(e) => setFormData(prev => ({...prev, store: e.target.value}))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                    style={{fontSize: '16px'}}
                >
                    <option value="">Select store</option>
                    {stores.map(store => (
                        <option key={store._id} value={store.name}>
                            {store.name} {store.chain && `(${store.chain})`}
                        </option>
                    ))}
                    <option value="Walmart">Walmart</option>
                    <option value="Target">Target</option>
                    <option value="Kroger">Kroger</option>
                    <option value="Safeway">Safeway</option>
                    <option value="Other">Other</option>
                </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Size
                    </label>
                    <input
                        type="text"
                        value={formData.size}
                        onChange={(e) => setFormData(prev => ({...prev, size: e.target.value}))}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                        style={{fontSize: '16px'}}
                        placeholder="12 oz"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Unit
                    </label>
                    <select
                        value={formData.unit}
                        onChange={(e) => setFormData(prev => ({...prev, unit: e.target.value}))}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                        style={{fontSize: '16px'}}
                    >
                        <option value="">Select unit</option>
                        <option value="oz">Ounces</option>
                        <option value="lb">Pounds</option>
                        <option value="g">Grams</option>
                        <option value="kg">Kilograms</option>
                        <option value="ml">Milliliters</option>
                        <option value="l">Liters</option>
                        <option value="each">Each</option>
                    </select>
                </div>
            </div>

            <div className="flex items-center">
                <input
                    type="checkbox"
                    id="isOnSale"
                    checked={formData.isOnSale}
                    onChange={(e) => setFormData(prev => ({...prev, isOnSale: e.target.checked}))}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label htmlFor="isOnSale" className="ml-2 block text-sm text-gray-700">
                    This item was on sale
                </label>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                </label>
                <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({...prev, notes: e.target.value}))}
                    rows={2}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                    style={{fontSize: '16px'}}
                    placeholder="Optional notes..."
                />
            </div>

            <div className="flex gap-3">
                <TouchEnhancedButton
                    type="button"
                    onClick={onClose}
                    className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 py-2 px-4 rounded-md font-medium"
                >
                    Cancel
                </TouchEnhancedButton>
                <TouchEnhancedButton
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 disabled:bg-indigo-400 font-medium"
                >
                    {loading ? 'Adding...' : 'Add Price'}
                </TouchEnhancedButton>
            </div>
        </form>
    );
}

// Main component wrapped with Suspense
export default function Inventory() {
    return (
        <Suspense fallback={
            <MobileOptimizedLayout>
                <div className="min-h-screen flex items-center justify-center">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                        <div className="text-lg text-gray-600">Loading...</div>
                    </div>
                </div>
            </MobileOptimizedLayout>
        }>
            <InventoryContent />
        </Suspense>
    );
}