'use client';
// file: /src/components/inventory/UPCLookup.js - v9 Enhanced with usage limits and display

import {useState, useCallback, useRef, useEffect} from 'react';
import BarcodeScanner from './BarcodeScanner';
import {TouchEnhancedButton} from '@/components/mobile/TouchEnhancedButton';
import {getApiUrl} from "@/lib/api-config";
import {useSubscription} from '@/hooks/useSubscription';
import {FEATURE_GATES} from '@/lib/subscription-config';

// Helper function for Nutri-Score colors
function getNutriScoreColor(score) {
    const colors = {
        'a': '#038c3e',
        'b': '#85bb2f',
        'c': '#f9c000',
        'd': '#f79100',
        'e': '#e63312'
    };
    return colors[score.toLowerCase()] || '#gray';
}

// Helper function to convert your API nutrition format to standardized format
function standardizeNutritionData(nutrition) {
    if (!nutrition) return null;

    return {
        calories: {
            value: nutrition.energy_100g || 0,
            unit: 'kcal',
            name: 'Calories'
        },
        protein: {
            value: nutrition.proteins_100g || 0,
            unit: 'g',
            name: 'Protein'
        },
        fat: {
            value: nutrition.fat_100g || 0,
            unit: 'g',
            name: 'Fat'
        },
        carbs: {
            value: nutrition.carbohydrates_100g || 0,
            unit: 'g',
            name: 'Carbohydrates'
        },
        fiber: {
            value: nutrition.fiber_100g || 0,
            unit: 'g',
            name: 'Fiber'
        },
        sugars: {
            value: nutrition.sugars_100g || 0,
            unit: 'g',
            name: 'Sugars'
        },
        sodium: {
            value: (nutrition.salt_100g || 0) * 400, // Convert salt to sodium (rough approximation)
            unit: 'mg',
            name: 'Sodium'
        }
    };
}

export default function UPCLookup({onProductFound, onUPCChange, currentUPC = ''}) {
    const [activeTab, setActiveTab] = useState('upc'); // 'upc' or 'search'
    const [isLooking, setIsLooking] = useState(false);
    const [lookupResult, setLookupResult] = useState(null);
    const [showScanner, setShowScanner] = useState(false);
    const [cameraAvailable, setCameraAvailable] = useState(true);
    const [showNutrition, setShowNutrition] = useState(false);

    // FIXED: Add local UPC state to ensure input works properly
    const [localUPC, setLocalUPC] = useState(currentUPC);
    const [optimisticUsage, setOptimisticUsage] = useState(null);
    const [isUpdatingUsage, setIsUpdatingUsage] = useState(false);
    const usageUpdateTimeoutRef = useRef(null);

    // Text search specific state
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searchPage, setSearchPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [isSearching, setIsSearching] = useState(false);
    const [autocompleteResults, setAutocompleteResults] = useState([]);
    const [showAutocomplete, setShowAutocomplete] = useState(false);
    const searchTimeoutRef = useRef(null);
    const autocompleteTimeoutRef = useRef(null);
    const searchInputRef = useRef(null);
    const autocompleteRef = useRef(null);

    // NEW: Usage tracking state
    const subscription = useSubscription();
    const [usageInfo, setUsageInfo] = useState(null);
    const [isLoadingUsage, setIsLoadingUsage] = useState(true);

    // FIXED: Sync local UPC state with prop changes
    useEffect(() => {
        setLocalUPC(currentUPC);
    }, [currentUPC]);

    // NEW: Load usage information on component mount
    useEffect(() => {
        loadUsageInfo();
    }, []);

    // 2. SIMPLIFIED: Immediate usage update function (now just for initial optimistic update)
    const updateUsageImmediately = (incrementBy = 1) => {
        if (!usageInfo) return;

        // Immediate optimistic update (will be made permanent if API succeeds)
        const newUsage = {
            ...usageInfo,
            currentMonth: usageInfo.currentMonth + incrementBy,
            remaining: usageInfo.monthlyLimit === 'unlimited'
                ? 'unlimited'
                : Math.max(0, usageInfo.remaining - incrementBy),
            canScan: usageInfo.monthlyLimit === 'unlimited'
                ? true
                : (usageInfo.currentMonth + incrementBy) < usageInfo.monthlyLimit
        };

        setOptimisticUsage(newUsage);
        setIsUpdatingUsage(true);

        console.log('📊 Immediate UI update (optimistic):', {
            from: usageInfo.currentMonth,
            to: newUsage.currentMonth,
            remaining: newUsage.remaining,
            canScan: newUsage.canScan
        });

        // Note: No server refresh timeout here - we'll make it permanent if API succeeds
        // or revert it if API fails
    };


// 3. ENHANCED: Usage check with immediate feedback
    const checkUsageLimitsWithImmediateUpdate = async () => {
        const currentUsageData = optimisticUsage || usageInfo;

        if (isUpdatingUsage && !currentUsageData) {
            alert('⏳ Please wait while we check your scan limits...');
            return false;
        }

        if (!currentUsageData) {
            alert('❌ Unable to check scan limits. Please refresh the page and try again.');
            return false;
        }

        if (!currentUsageData.canScan) {
            const limitMessage = currentUsageData.monthlyLimit === 'unlimited'
                ? 'Unexpected limit reached'
                : `You've reached your monthly limit of ${currentUsageData.monthlyLimit} UPC scans. Used: ${currentUsageData.currentMonth}/${currentUsageData.monthlyLimit}`;

            alert(`❌ ${limitMessage}\n\nUpgrade to Gold for unlimited UPC scanning!`);

            // Redirect to pricing
            window.location.href = `/pricing?source=upc-limit&feature=upc-scanning&required=gold`;
            return false;
        }

        return true;
    };

// 4. ENHANCED: UPC lookup with immediate UI update
    const handleUPCLookupWithImmediateUpdate = async (upc) => {
        if (!upc || upc.length < 8) return;

        // Check usage limits with optimistic data
        if (!(await checkUsageLimitsWithImmediateUpdate())) {
            return;
        }

        // Immediate UI update BEFORE API call
        updateUsageImmediately(1);

        setIsLooking(true);
        setLookupResult(null);

        try {
            console.log('🔍 Starting UPC lookup for:', upc);
            const response = await fetch(getApiUrl(`/api/upc/lookup?upc=${encodeURIComponent(upc)}`));
            const data = await response.json();

            console.log('🔍 UPC lookup response:', {
                success: data.success,
                found: data.product?.found,
                usageIncremented: data.usageIncremented  // Log if the API tells us usage was incremented
            });

            if (data.success && data.product.found) {
                const standardizedNutrition = standardizeNutritionData(data.product.nutrition);
                const enhancedProduct = {
                    ...data.product,
                    nutrition: standardizedNutrition
                };

                setLookupResult({success: true, product: enhancedProduct});
                onProductFound(enhancedProduct);

                // FIXED: Since UPC lookup was successful, make the optimistic update permanent
                console.log('✅ UPC lookup successful - making usage update permanent');

                // Update real usage state immediately (don't wait for server)
                setUsageInfo(prev => {
                    if (!prev) return prev;

                    const newUsage = {
                        ...prev,
                        currentMonth: prev.currentMonth + 1,
                        remaining: prev.monthlyLimit === 'unlimited'
                            ? 'unlimited'
                            : Math.max(0, prev.remaining - 1),
                        canScan: prev.monthlyLimit === 'unlimited'
                            ? true
                            : (prev.currentMonth + 1) < prev.monthlyLimit
                    };

                    console.log('🎯 Updated real usage state:', {
                        from: prev.currentMonth,
                        to: newUsage.currentMonth,
                        remaining: newUsage.remaining
                    });

                    return newUsage;
                });

                // Clear optimistic update since we updated the real state
                setOptimisticUsage(null);
                setIsUpdatingUsage(false);

                // Cancel any pending server refresh
                if (usageUpdateTimeoutRef.current) {
                    clearTimeout(usageUpdateTimeoutRef.current);
                }

            } else {
                setLookupResult({
                    success: false,
                    message: data.message || 'Product not found'
                });

                // If lookup failed, revert the optimistic update
                console.log('❌ UPC lookup failed, reverting optimistic update');
                setOptimisticUsage(null);
                setIsUpdatingUsage(false);
                if (usageUpdateTimeoutRef.current) {
                    clearTimeout(usageUpdateTimeoutRef.current);
                }
            }
        } catch (error) {
            console.error('UPC lookup error:', error);
            setLookupResult({
                success: false,
                message: 'Error looking up product'
            });

            // If API fails, revert the optimistic update immediately
            console.log('❌ API failed, reverting optimistic update');
            setOptimisticUsage(null);
            setIsUpdatingUsage(false);
            if (usageUpdateTimeoutRef.current) {
                clearTimeout(usageUpdateTimeoutRef.current);
            }
        } finally {
            setIsLooking(false);
        }
    };

// 5. ENHANCED: Text search with immediate UI update
    const performTextSearchWithImmediateUpdate = async (query, page = 1) => {
        if (!query.trim()) {
            setSearchResults([]);
            setTotalPages(0);
            return;
        }

        // Check usage limits with optimistic data
        if (!(await checkUsageLimitsWithImmediateUpdate())) {
            return;
        }

        // Immediate UI update BEFORE API call
        updateUsageImmediately(1);

        setIsSearching(true);
        setShowAutocomplete(false);

        try {
            const searchUrl = getApiUrl(`/api/upc/search?query=${encodeURIComponent(query)}&page=${page}&page_size=15`);
            const response = await fetch(searchUrl);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || `Search API returned ${response.status}`);
            }

            if (data.success) {
                const results = data.results || [];
                setSearchResults(results);
                // FIXED: Handle missing pagination data gracefully
                setTotalPages(data.pagination?.totalPages || Math.ceil(results.length / 15) || 1);

                // FIXED: Search was successful, make the usage update permanent
                console.log('✅ Search successful - making usage update permanent');

                // Update real usage state immediately
                setUsageInfo(prev => {
                    if (!prev) return prev;

                    const newUsage = {
                        ...prev,
                        currentMonth: prev.currentMonth + 1,
                        remaining: prev.monthlyLimit === 'unlimited'
                            ? 'unlimited'
                            : Math.max(0, prev.remaining - 1),
                        canScan: prev.monthlyLimit === 'unlimited'
                            ? true
                            : (prev.currentMonth + 1) < prev.monthlyLimit
                    };

                    return newUsage;
                });

                // Clear optimistic update since we updated the real state
                setOptimisticUsage(null);
                setIsUpdatingUsage(false);

                // Cancel any pending server refresh
                if (usageUpdateTimeoutRef.current) {
                    clearTimeout(usageUpdateTimeoutRef.current);
                }

            } else {
                throw new Error(data.error || 'Search failed');
            }

        } catch (error) {
            console.error('Text search error:', error);
            setSearchResults([]);
            setTotalPages(0);

            // If API fails, revert the optimistic update
            console.log('❌ Search API failed, reverting optimistic update');
            setOptimisticUsage(null);
            setIsUpdatingUsage(false);
            if (usageUpdateTimeoutRef.current) {
                clearTimeout(usageUpdateTimeoutRef.current);
            }

            if (error.message.includes('429') || error.message.includes('Rate limit')) {
                alert('Search service is busy. Please wait a moment before searching again.');
            } else if (error.message.includes('timeout')) {
                alert('Search is taking longer than usual. Please try again.');
            }
        } finally {
            setIsSearching(false);
        }
    };

// 6. ENHANCED: Barcode detected with immediate UI update
    const handleBarcodeDetectedWithImmediateUpdate = async (barcode) => {
        console.log('Barcode scanned:', barcode);

        // Update both local and parent state
        setLocalUPC(barcode);
        if (onUPCChange) {
            onUPCChange(barcode);
        }

        setShowScanner(false);

        // ENHANCED: Scroll to UPC input after scanner closes
        setTimeout(() => {
            const upcInput = document.querySelector('input[name="upc"]') ||
                document.querySelector('input[id="upc"]') ||
                document.querySelector('#upc');

            if (upcInput) {
                console.log('📍 Scrolling to UPC input after scan');
                upcInput.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center',
                    inline: 'nearest'
                });
                // Optional: Focus the input to show the scanned value
                upcInput.focus();
            }
        }, 500); // Wait for scanner to close and UPC to be filled

        // Auto-lookup the scanned barcode with immediate UI update
        await handleUPCLookupWithImmediateUpdate(barcode);
    };

// 7. ENHANCED: Display current usage (optimistic or real)
    const getCurrentUsageDisplay = () => {
        const currentUsageData = optimisticUsage || usageInfo;

        if (!currentUsageData) return null;

        return (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h4 className="text-sm font-medium text-blue-900">
                            📊 UPC Scan Usage
                            {isUpdatingUsage && (
                                <span className="ml-2 text-xs text-blue-600">(Updating...)</span>
                            )}
                        </h4>
                        <p className="text-sm text-blue-700">
                            {currentUsageData.monthlyLimit === 'unlimited' ? (
                                <span className="font-medium text-green-700">✨ Unlimited scans available</span>
                            ) : (
                                <>
                                    <strong>{currentUsageData.remaining} scans remaining</strong> this month
                                    <span className="text-blue-600 ml-2">
                                    (Used: {currentUsageData.currentMonth}/{currentUsageData.monthlyLimit})
                                </span>
                                    {optimisticUsage && (
                                        <span className="ml-2 text-xs text-blue-500">(Live update)</span>
                                    )}
                                </>
                            )}
                        </p>
                    </div>
                    {currentUsageData.monthlyLimit !== 'unlimited' && currentUsageData.remaining <= 2 && (
                        <TouchEnhancedButton
                            onClick={() => window.location.href = '/pricing?source=upc-low&feature=upc-scanning'}
                            className="px-3 py-1 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700"
                        >
                            Upgrade
                        </TouchEnhancedButton>
                    )}
                </div>
            </div>
        );
    };

// 8. CLEANUP: Add cleanup for timeout
    useEffect(() => {
        return () => {
            if (usageUpdateTimeoutRef.current) {
                clearTimeout(usageUpdateTimeoutRef.current);
            }
        };
    }, []);

// 9. REPLACE: Update your function calls to use the immediate update versions
// Replace your usage display with getCurrentUsageDisplay()
// NEW: Function to load current usage information
    const loadUsageInfo = async () => {
        try {
            setIsLoadingUsage(true);
            console.log('📊 Loading UPC usage information...');

            const response = await fetch(getApiUrl('/api/upc/usage'), {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
                // Force fresh data, no cache
                cache: 'no-cache'
            });

            if (response.ok) {
                const data = await response.json();

                // FIXED: Update usageInfo state immediately
                setUsageInfo(data);

                console.log('📊 UPC usage loaded:', {
                    remaining: data.remaining,
                    used: data.currentMonth,
                    limit: data.monthlyLimit,
                    canScan: data.canScan
                });

                return data; // Return the data for immediate use
            } else {
                console.error('Failed to load UPC usage:', response.status);
                // Don't reset usageInfo on error, keep showing last known values
                return null;
            }
        } catch (error) {
            console.error('Failed to load UPC usage info:', error);
            // Don't reset usageInfo on error, keep showing last known values
            return null;
        } finally {
            setIsLoadingUsage(false);
        }
    };

// NEW: Function to check usage limits before any UPC operation
    const checkUsageLimits = async () => {
        if (isLoadingUsage) {
            alert('⏳ Please wait while we check your scan limits...');
            return false;
        }

        if (!usageInfo) {
            alert('❌ Unable to check scan limits. Please refresh the page and try again.');
            return false;
        }

        if (!usageInfo.canScan) {
            const limitMessage = usageInfo.monthlyLimit === 'unlimited'
                ? 'Unexpected limit reached'
                : `You've reached your monthly limit of ${usageInfo.monthlyLimit} UPC scans. Used: ${usageInfo.currentMonth}/${usageInfo.monthlyLimit}`;

            alert(`❌ ${limitMessage}\n\nUpgrade to Gold for unlimited UPC scanning!`);

            // Redirect to pricing
            window.location.href = `/pricing?source=upc-limit&feature=upc-scanning&required=gold`;
            return false;
        }

        return true;
    };

// Handle clicks outside autocomplete to close it
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (autocompleteRef.current && !autocompleteRef.current.contains(event.target) &&
                searchInputRef.current && !searchInputRef.current.contains(event.target)) {
                setShowAutocomplete(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

// Close autocomplete when search results are displayed
    useEffect(() => {
        if (searchResults.length > 0) {
            setShowAutocomplete(false);
        }
    }, [searchResults]);

// Check if camera is available
    const checkCameraAvailability = () => {
        console.log('🔍 Checking camera availability...');

        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            console.log('❌ Camera API not supported');
            setCameraAvailable(false);
            return false;
        }

        console.log('✅ Camera API supported');
        setCameraAvailable(true);
        return true;
    };

// ENHANCED: Scanner click with usage check
    const handleScannerClick = async () => {
        if (!checkCameraAvailability()) {
            alert('Camera not available on this device. Please enter UPC manually.');
            return;
        }

        // Check usage limits before opening scanner
        if (!(await checkUsageLimits())) {
            return;
        }

        console.log('🔄 Opening barcode scanner...');
        setShowScanner(true);
    };

// Autocomplete functionality with rate limiting protection
    const performAutocomplete = async (query) => {
        if (!query.trim() || query.length < 3) {
            setAutocompleteResults([]);
            setShowAutocomplete(false);
            return;
        }

        try {
            // Use our API endpoint with smaller page size for autocomplete
            const searchUrl = `/api/upc/search?query=${encodeURIComponent(query)}&page=1&page_size=3`;

            const response = await fetch(searchUrl);
            const data = await response.json();

            if (response.ok && data.success) {
                const suggestions = data.results?.slice(0, 3).map(product => ({
                    name: product.name,
                    brand: product.brand,
                    image: product.image,
                })) || [];

                setAutocompleteResults(suggestions);
                setShowAutocomplete(suggestions.length > 0);
            } else {
                // Don't show errors for autocomplete - just silently fail
                setAutocompleteResults([]);
                setShowAutocomplete(false);
            }

        } catch (error) {
            // Silently handle autocomplete errors to avoid user disruption
            console.log('Autocomplete skipped due to rate limiting or network issue');
            setAutocompleteResults([]);
            setShowAutocomplete(false);
        }
    };

// Handle search input changes with better rate limiting
    const handleSearchInputChange = (e) => {
        const query = e.target.value;
        setSearchQuery(query);

        // Clear existing timeouts
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }
        if (autocompleteTimeoutRef.current) {
            clearTimeout(autocompleteTimeoutRef.current);
        }

        // Debounced autocomplete with longer delay to avoid rate limiting
        if (query.length >= 3) {
            autocompleteTimeoutRef.current = setTimeout(() => {
                performAutocomplete(query);
            }, 800);
        } else {
            setShowAutocomplete(false);
            setAutocompleteResults([]);
        }

        // Debounced search with longer delay
        if (query.trim() && query.length >= 3) {
            searchTimeoutRef.current = setTimeout(() => {
                setSearchPage(1);
                performTextSearchWithImmediateUpdate(query, 1);
            }, 1200);
        } else {
            setSearchResults([]);
            setTotalPages(0);
            setShowAutocomplete(false);
            setAutocompleteResults([]);
        }
    };

// Handle autocomplete selection
    const handleAutocompleteSelect = (suggestion) => {
        setSearchQuery(suggestion.name);
        setShowAutocomplete(false);
        setAutocompleteResults([]);
        setSearchPage(1);
        performTextSearchWithImmediateUpdate(suggestion.name, 1);
    };

// Handle search result selection
    const handleSearchResultSelect = async (product) => {
        setLookupResult({success: true, product});
        onProductFound(product);

        // Update UPC field with the selected product's UPC
        if (product.upc) {
            setLocalUPC(product.upc);
            if (onUPCChange) {
                onUPCChange(product.upc);
            }
        }

        // Clear search results to show the selected product
        setSearchResults([]);
        setSearchQuery('');
        setShowAutocomplete(false);
        setAutocompleteResults([]);

        // FIXED: Refresh usage after search result selection
        console.log('🔄 Refreshing usage info after search result selection...');
        await loadUsageInfo();
    };

// Handle pagination
    const handlePageChange = (newPage) => {
        setSearchPage(newPage);
        performTextSearchWithImmediateUpdate(searchQuery, newPage);
    };

// Manual close function for autocomplete
    const handleCloseAutocomplete = () => {
        setShowAutocomplete(false);
        setAutocompleteResults([]);
    };

// Handle input focus to show autocomplete again if there are results
    const handleSearchInputFocus = () => {
        if (autocompleteResults.length > 0 && searchQuery.length >= 3) {
            setShowAutocomplete(true);
        }
    };

// ENHANCED: UPC input handler with usage check
    const handleUPCInput = (e) => {
        const upc = e.target.value;

        // Update local state immediately for responsive typing
        setLocalUPC(upc);

        // Also update parent component
        if (onUPCChange) {
            onUPCChange(upc);
        }

        // Auto-lookup when UPC looks complete
        if (upc.length >= 12 && upc.length <= 14) {
            handleUPCLookupWithImmediateUpdate(upc);
        }
    };

    const handleManualLookup = () => {
        const upcToLookup = localUPC || currentUPC;
        if (upcToLookup) {
            handleUPCLookupWithImmediateUpdate(upcToLookup);
        }
    };

    const handleScannerClose = () => {
        setShowScanner(false);
    };

// Handle nutrition display toggle
    const handleToggleNutrition = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setShowNutrition(!showNutrition);
    };

// Check if nutrition data is available
    const hasNutrition = lookupResult?.success && lookupResult.product.nutrition &&
        Object.values(lookupResult.product.nutrition).some(n => n.value > 0);

    return (
        <div className="space-y-4">
            {/* FIXED: Usage Display - Call the function properly */}
            {getCurrentUsageDisplay()}

            {/* Tab Navigation */}
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                    <TouchEnhancedButton
                        type="button"
                        onClick={() => {
                            setActiveTab('upc');
                            setLookupResult(null);
                            setSearchResults([]);
                            setSearchQuery('');
                            setShowAutocomplete(false);
                            setAutocompleteResults([]);
                        }}
                        className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                            activeTab === 'upc'
                                ? 'border-indigo-500 text-indigo-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                        📷 UPC/Barcode
                    </TouchEnhancedButton>
                    <TouchEnhancedButton
                        type="button"
                        onClick={() => {
                            setActiveTab('search');
                            setLookupResult(null);
                            // FIXED: Don't clear local UPC when switching tabs
                            setShowAutocomplete(false);
                            setAutocompleteResults([]);
                        }}
                        className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                            activeTab === 'search'
                                ? 'border-indigo-500 text-indigo-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                        🔍 Search by Name
                    </TouchEnhancedButton>
                </nav>
            </div>

            {/* Search Tab Content */}
            {activeTab === 'search' && (
                <div className="space-y-4">
                    <div>
                        <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
                            Search by Product Name
                        </label>
                        <div className="relative">
                            <input
                                ref={searchInputRef}
                                type="text"
                                id="search"
                                value={searchQuery}
                                onChange={handleSearchInputChange}
                                onFocus={handleSearchInputFocus}
                                placeholder="Type product name (e.g., 'Cheerios', 'Campbell's Soup')"
                                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            />

                            {/* Autocomplete dropdown */}
                            {showAutocomplete && autocompleteResults.length > 0 && (
                                <div
                                    ref={autocompleteRef}
                                    className="absolute z-50 w-full bg-white border border-gray-300 rounded-md shadow-lg mt-1 max-h-48 overflow-y-auto"
                                >
                                    {/* Header with close button */}
                                    <div
                                        className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-200">
                                        <span className="text-xs font-medium text-gray-600">Quick suggestions</span>
                                        <TouchEnhancedButton
                                            type="button"
                                            onClick={handleCloseAutocomplete}
                                            className="text-gray-400 hover:text-gray-600 focus:outline-none"
                                            title="Close suggestions"
                                        >
                                            <span className="text-sm">✕</span>
                                        </TouchEnhancedButton>
                                    </div>

                                    {/* Autocomplete results */}
                                    {autocompleteResults.map((suggestion, index) => (
                                        <TouchEnhancedButton
                                            key={index}
                                            type="button"
                                            onClick={() => handleAutocompleteSelect(suggestion)}
                                            className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center space-x-2 border-b border-gray-100 last:border-b-0"
                                        >
                                            {suggestion.image && (
                                                <img
                                                    src={suggestion.image}
                                                    alt=""
                                                    className="w-8 h-8 object-cover rounded flex-shrink-0"
                                                />
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm font-medium text-gray-900 truncate">
                                                    {suggestion.name}
                                                </div>
                                                {suggestion.brand && (
                                                    <div className="text-xs text-gray-500 truncate">
                                                        {suggestion.brand}
                                                    </div>
                                                )}
                                            </div>
                                        </TouchEnhancedButton>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Help text */}
                        <div className="mt-2 text-xs text-gray-500 space-y-1">
                            <div>💡 <strong>Search Tips:</strong></div>
                            <div>• Type at least 3 characters to start searching</div>
                            <div>• Try brand + product name (e.g., "Campbell's Tomato Soup")</div>
                            <div>• Use specific terms (e.g., "Honey Nut Cheerios" vs "cereal")</div>
                            <div>• Results prioritize products with images for easy identification</div>
                            <div>• Wait between searches to avoid rate limits</div>
                        </div>
                    </div>

                    {/* Search loading */}
                    {isSearching && (
                        <div className="flex items-center justify-center p-4 bg-blue-50 rounded-lg">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                            <span className="ml-2 text-blue-700">Searching products...</span>
                        </div>
                    )}

                    {/* Search Results */}
                    {searchResults.length > 0 && (
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-4">
                                <h4 className="text-lg font-medium text-gray-900">
                                    Search Results ({searchResults.length} found)
                                </h4>
                                {totalPages > 1 && (
                                    <div className="text-sm text-gray-500">
                                        Page {searchPage} of {totalPages}
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {searchResults.map((product, index) => (
                                    <TouchEnhancedButton
                                        key={index}
                                        type="button"
                                        onClick={() => handleSearchResultSelect(product)}
                                        className="text-left bg-white border border-gray-200 rounded-lg p-3 hover:border-indigo-300 hover:shadow-md transition-all"
                                    >
                                        <div className="flex items-start space-x-3">
                                            {product.image ? (
                                                <img
                                                    src={product.image}
                                                    alt={product.name}
                                                    className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                                                />
                                            ) : (
                                                <div
                                                    className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
                                                    <span className="text-gray-400 text-xs">No Image</span>
                                                </div>
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <h5 className="font-medium text-gray-900 text-sm leading-tight mb-1">
                                                    {product.name}
                                                </h5>
                                                {product.brand && (
                                                    <p className="text-xs text-gray-600 mb-1">{product.brand}</p>
                                                )}
                                                <p className="text-xs text-gray-500">{product.category}</p>
                                                {product.scores?.nutriscore && (
                                                    <div className="mt-1">
                                                        <span
                                                            className="inline-block px-1 py-0.5 text-xs font-bold text-white rounded"
                                                            style={{backgroundColor: getNutriScoreColor(product.scores.nutriscore)}}>
                                                            {product.scores.nutriscore.toUpperCase()}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </TouchEnhancedButton>
                                ))}
                            </div>

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="flex justify-center items-center space-x-2 mt-4">
                                    <TouchEnhancedButton
                                        type="button"
                                        onClick={() => handlePageChange(searchPage - 1)}
                                        disabled={searchPage <= 1}
                                        className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400"
                                    >
                                        Previous
                                    </TouchEnhancedButton>

                                    <span className="text-sm text-gray-600">
                                        Page {searchPage} of {totalPages}
                                    </span>

                                    <TouchEnhancedButton
                                        type="button"
                                        onClick={() => handlePageChange(searchPage + 1)}
                                        disabled={searchPage >= totalPages}
                                        className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400"
                                    >
                                        Next
                                    </TouchEnhancedButton>
                                </div>
                            )}
                        </div>
                    )}

                    {/* No results message */}
                    {searchQuery && !isSearching && searchResults.length === 0 && (
                        <div className="text-center p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <div className="text-yellow-600 font-medium">No products found for "{searchQuery}"</div>
                            <div className="text-sm text-yellow-600 mt-1">
                                Try different search terms or check spelling
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* UPC Tab Content */}
            {activeTab === 'upc' && (
                <div className="space-y-4">
                    <div>
                        <label htmlFor="upc" className="block text-sm font-medium text-gray-700 mb-2">
                            UPC/Barcode
                        </label>
                        <div className="flex space-x-2">
                            <input
                                type="text"
                                id="upc"
                                name="upc"
                                value={localUPC}
                                onChange={handleUPCInput}
                                placeholder="Enter or scan UPC code"
                                className="flex-1 mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            />
                            <TouchEnhancedButton
                                type="button"
                                onClick={handleScannerClick}
                                disabled={isLooking}
                                className={`px-4 py-2 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-400 ${
                                    cameraAvailable ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-500 cursor-not-allowed'
                                }`}
                                title={cameraAvailable ? 'Scan barcode with camera' : 'Camera not available on this device'}
                            >
                                📷 {cameraAvailable ? 'Scan' : 'No Camera'}
                            </TouchEnhancedButton>
                            <TouchEnhancedButton
                                type="button"
                                onClick={handleManualLookup}
                                disabled={!localUPC || isLooking}
                                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-400"
                            >
                                {isLooking ? '🔍' : '🔍'} Lookup
                            </TouchEnhancedButton>
                        </div>
                    </div>

                    {/* Scanner Component */}
                    <BarcodeScanner
                        isActive={showScanner}
                        onBarcodeDetected={handleBarcodeDetectedWithImmediateUpdate}
                        onClose={() => {
                            console.log('🔄 Closing barcode scanner...');
                            setShowScanner(false);
                        }}
                    />
                </div>
            )}

            {/* Loading State for UPC */}
            {isLooking && (
                <div className="flex items-center justify-center p-4 bg-blue-50 rounded-lg">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    <span className="ml-2 text-blue-700">Looking up product...</span>
                </div>
            )}

            {/* Lookup Results (shared between UPC and search) */}
            {lookupResult && (
                <div className={`p-4 rounded-lg ${
                    lookupResult.success ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'
                }`}>
                    {lookupResult.success ? (
                        <div>
                            <div className="flex items-center mb-3">
                                <span className="text-green-600 font-medium">✅ Product Found!</span>
                                {hasNutrition && (
                                    <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                                        🥗 Nutrition Available
                                    </span>
                                )}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2 text-sm">
                                    <div><strong>Name:</strong> {lookupResult.product.name}</div>
                                    {lookupResult.product.brand && (
                                        <div><strong>Brand:</strong> {lookupResult.product.brand}</div>
                                    )}
                                    <div><strong>Category:</strong> {lookupResult.product.category}</div>
                                    {lookupResult.product.quantity && (
                                        <div><strong>Size:</strong> {lookupResult.product.quantity}</div>
                                    )}
                                    {lookupResult.product.scores && lookupResult.product.scores.nutriscore && (
                                        <div><strong>Nutri-Score:</strong>
                                            <span className="ml-1 px-2 py-1 text-xs font-bold text-white rounded"
                                                  style={{backgroundColor: getNutriScoreColor(lookupResult.product.scores.nutriscore)}}>
                                                {lookupResult.product.scores.nutriscore.toUpperCase()}
                                            </span>
                                        </div>
                                    )}
                                    {lookupResult.product.scores && lookupResult.product.scores.nova_group && (
                                        <div><strong>NOVA Group:</strong>
                                            <span className={`ml-1 px-2 py-1 text-xs font-bold text-white rounded ${
                                                lookupResult.product.scores.nova_group === 1 ? 'bg-green-500' :
                                                    lookupResult.product.scores.nova_group === 2 ? 'bg-yellow-500' :
                                                        lookupResult.product.scores.nova_group === 3 ? 'bg-orange-500' :
                                                            'bg-red-500'
                                            }`}>
                                                {lookupResult.product.scores.nova_group}
                                            </span>
                                        </div>
                                    )}
                                </div>
                                {lookupResult.product.image && (
                                    <div className="flex justify-center">
                                        <img
                                            src={lookupResult.product.image}
                                            alt={lookupResult.product.name}
                                            className="w-24 h-24 object-cover rounded-lg shadow-sm"
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Nutrition Section */}
                            {hasNutrition && (
                                <div className="mt-4 pt-4 border-t border-green-200">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-green-800 font-medium">🥗 Nutrition Information</span>
                                        <TouchEnhancedButton
                                            type="button"
                                            onClick={handleToggleNutrition}
                                            className="text-sm text-green-600 hover:text-green-800 underline focus:outline-none"
                                        >
                                            {showNutrition ? 'Hide' : 'Show'} Details
                                        </TouchEnhancedButton>
                                    </div>

                                    {/* Quick Nutrition Preview */}
                                    {!showNutrition && (
                                        <div className="grid grid-cols-4 gap-2 text-xs text-green-700">
                                            {lookupResult.product.nutrition.calories?.value > 0 && (
                                                <div className="text-center bg-green-100 p-2 rounded">
                                                    <div
                                                        className="font-medium">{Math.round(lookupResult.product.nutrition.calories.value)}</div>
                                                    <div>calories</div>
                                                </div>
                                            )}
                                            {lookupResult.product.nutrition.protein?.value > 0 && (
                                                <div className="text-center bg-green-100 p-2 rounded">
                                                    <div
                                                        className="font-medium">{lookupResult.product.nutrition.protein.value.toFixed(1)}g
                                                    </div>
                                                    <div>protein</div>
                                                </div>
                                            )}
                                            {lookupResult.product.nutrition.carbs?.value > 0 && (
                                                <div className="text-center bg-green-100 p-2 rounded">
                                                    <div
                                                        className="font-medium">{lookupResult.product.nutrition.carbs.value.toFixed(1)}g
                                                    </div>
                                                    <div>carbs</div>
                                                </div>
                                            )}
                                            {lookupResult.product.nutrition.fat?.value > 0 && (
                                                <div className="text-center bg-green-100 p-2 rounded">
                                                    <div
                                                        className="font-medium">{lookupResult.product.nutrition.fat.value.toFixed(1)}g
                                                    </div>
                                                    <div>fat</div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Detailed Nutrition Display */}
                                    {showNutrition && (
                                        <div className="bg-white border border-green-200 rounded-lg p-4">
                                            <div className="text-sm font-medium text-gray-900 mb-3">Nutrition Facts (per
                                                100g)
                                            </div>
                                            <div className="grid grid-cols-2 gap-4 text-sm">
                                                {Object.entries(lookupResult.product.nutrition).map(([key, nutrient]) => {
                                                    if (!nutrient || nutrient.value <= 0) return null;
                                                    return (
                                                        <div key={key} className="flex justify-between">
                                                            <span className="text-gray-700">{nutrient.name}:</span>
                                                            <span className="font-medium">
                                                                {nutrient.value < 1 ? nutrient.value.toFixed(1) : Math.round(nutrient.value)}
                                                                {nutrient.unit}
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                            <div className="mt-3 text-xs text-gray-500">
                                                * Nutrition data from Open Food Facts community database
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Additional Product Information */}
                            {(lookupResult.product.ingredients || lookupResult.product.allergens?.length > 0) && (
                                <div className="mt-4 pt-4 border-t border-green-200">
                                    {lookupResult.product.ingredients && (
                                        <div className="mb-3">
                                            <div className="text-sm font-medium text-green-900 mb-1">Ingredients:</div>
                                            <div className="text-xs text-green-700 max-h-20 overflow-y-auto">
                                                {lookupResult.product.ingredients}
                                            </div>
                                        </div>
                                    )}
                                    {lookupResult.product.allergens && lookupResult.product.allergens.length > 0 && (
                                        <div>
                                            <div className="text-sm font-medium text-orange-900 mb-1">⚠️ Allergens:
                                            </div>
                                            <div className="text-xs text-orange-700">
                                                {lookupResult.product.allergens.map(allergen =>
                                                    allergen.replace('en:', '').replace('-', ' ')
                                                ).join(', ')}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="mt-3 text-xs text-gray-500">
                                <a
                                    href={lookupResult.product.openFoodFactsUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:text-blue-800"
                                >
                                    View on Open Food Facts →
                                </a>
                            </div>
                        </div>
                    ) : (
                        <div>
                            <div className="flex items-center mb-2">
                                <span className="text-yellow-600 font-medium">⚠️ {lookupResult.message}</span>
                            </div>
                            <div className="text-sm text-gray-600">
                                You can still add this item manually by filling out the form below, or try a different
                                search.
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Usage Tips - Enhanced */}
            <div className="text-xs text-gray-500 space-y-1">
                <div>💡 <strong>Tips:</strong></div>
                {activeTab === 'upc' ? (
                    <>
                        <div>• UPC codes are usually 12-14 digits long</div>
                        <div>• Camera scanning works best in good lighting</div>
                        <div>• Hold your device steady when scanning</div>
                    </>
                ) : (
                    <>
                        <div>• Try specific product names for better results</div>
                        <div>• Include brand names when known (e.g., "Campbell's Soup")</div>
                        <div>• Results with images appear first for easier identification</div>
                    </>
                )}
                <div>• Data comes from Open Food Facts community database</div>
                <div>• Nutrition information included when available</div>
                <div>• If not found, you can still add the item manually</div>
            </div>
        </div>
    );
}