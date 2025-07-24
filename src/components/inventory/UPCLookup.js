'use client';
// file: /src/components/inventory/UPCLookup.js - v14 Enhanced with international support and regional context

import {useState, useCallback, useRef, useEffect} from 'react';
import BarcodeScanner from './BarcodeScanner';
import {TouchEnhancedButton} from '@/components/mobile/TouchEnhancedButton';
import {apiGet, apiPost} from '@/lib/api-config';
import {useSubscription} from '@/hooks/useSubscription';
import {KeyboardOptimizedInput} from '@/components/forms/KeyboardOptimizedInput';

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

// 🆕 NEW: International currency formatting helper
function formatPrice(amount, currencyInfo) {
    if (!amount || !currencyInfo) return '';

    const symbol = currencyInfo.currencySymbol || '$';
    const position = currencyInfo.currencyPosition || 'before';
    const decimals = currencyInfo.decimalPlaces || 2;

    const formattedAmount = Number(amount).toFixed(decimals);

    return position === 'before'
        ? `${symbol}${formattedAmount}`
        : `${formattedAmount}${symbol}`;
}

// 🆕 NEW: Regional barcode analysis component
function BarcodeAnalysisDisplay({barcodeInfo, userCurrency}) {
    if (!barcodeInfo) return null;

    return (
        <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="text-sm font-medium text-blue-900 mb-2">
                🌍 Barcode Analysis
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                    <span className="text-blue-700">Format:</span>
                    <span className="ml-1 font-medium">{barcodeInfo.format}</span>
                </div>
                {barcodeInfo.country && (
                    <div>
                        <span className="text-blue-700">Origin:</span>
                        <span className="ml-1 font-medium">{barcodeInfo.country}</span>
                    </div>
                )}
                {barcodeInfo.description && (
                    <div className="col-span-2">
                        <span className="text-blue-700">Type:</span>
                        <span className="ml-1">{barcodeInfo.description}</span>
                    </div>
                )}
            </div>

            {/* Regional hints */}
            {barcodeInfo.regionalHints && barcodeInfo.regionalHints.length > 0 && (
                <div className="mt-2 space-y-1">
                    {barcodeInfo.regionalHints.map((hint, i) => (
                        <div key={i} className={`text-xs p-2 rounded ${
                            hint.type === 'warning' ? 'bg-orange-100 text-orange-700' :
                                hint.type === 'error' ? 'bg-red-100 text-red-700' :
                                    'bg-blue-100 text-blue-700'
                        }`}>
                            {hint.message}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// 🆕 NEW: International context display component
function InternationalContextDisplay({internationalContext, dataSource}) {
    if (!internationalContext) return null;

    return (
        <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="text-sm font-medium text-gray-900 mb-2">
                🌐 International Context
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div>
                    <span className="text-gray-600">User Region:</span>
                    <span className="ml-1 font-medium">{internationalContext.userRegion}</span>
                </div>
                {internationalContext.barcodeOrigin && (
                    <div>
                        <span className="text-gray-600">Product Origin:</span>
                        <span className="ml-1 font-medium">{internationalContext.barcodeOrigin}</span>
                    </div>
                )}
                <div>
                    <span className="text-gray-600">Database:</span>
                    <span className="ml-1 font-medium">{dataSource}</span>
                </div>
                {internationalContext.regionalOptimization && (
                    <div className="sm:col-span-2">
                        <span
                            className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            ✅ Regional optimization applied
                        </span>
                    </div>
                )}
            </div>

            {/* Suggestions */}
            {internationalContext.suggestions && internationalContext.suggestions.length > 0 && (
                <div className="mt-2">
                    <div className="text-xs font-medium text-gray-700 mb-1">💡 Suggestions:</div>
                    <div className="space-y-1">
                        {internationalContext.suggestions.map((suggestion, i) => (
                            <div key={i} className="text-xs text-gray-600 bg-yellow-50 p-2 rounded">
                                {suggestion}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export default function UPCLookup({onProductFound, onUPCChange, currentUPC = ''}) {
    const [activeTab, setActiveTab] = useState('upc'); // 'upc' or 'search'
    const [isLooking, setIsLooking] = useState(false);
    const [lookupResult, setLookupResult] = useState(null);
    const [showScanner, setShowScanner] = useState(false);
    const [cameraAvailable, setCameraAvailable] = useState(true);
    const [showNutrition, setShowNutrition] = useState(false);
    const [aiClassification, setAiClassification] = useState(null);
    const [isAiClassifying, setIsAiClassifying] = useState(false);

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
    const processingBarcodeRef = useRef(false);
    const lastProcessedBarcodeRef = useRef(null);
    const lastProcessedTimeRef = useRef(0);

    // NEW: Usage tracking state
    const subscription = useSubscription();
    const [usageInfo, setUsageInfo] = useState(null);
    const [isLoadingUsage, setIsLoadingUsage] = useState(true);

    // 🆕 NEW: International context state
    const [userCurrencyInfo, setUserCurrencyInfo] = useState(null);
    const [isLoadingCurrency, setIsLoadingCurrency] = useState(true);

    // FIXED: Sync local UPC state with prop changes
    useEffect(() => {
        setLocalUPC(currentUPC);
    }, [currentUPC]);

    // NEW: Load usage information on component mount
    useEffect(() => {
        loadUsageInfo();
        loadUserCurrencyInfo();
    }, []);

    // 🆕 NEW: Load user currency preferences for international context
    const loadUserCurrencyInfo = async () => {
        try {
            setIsLoadingCurrency(true);
            console.log('💰 Loading user currency preferences...');

            const response = await apiGet('/api/user/profile');

            if (response.ok) {
                const data = await response.json();
                if (data.success && data.user?.currencyPreferences) {
                    setUserCurrencyInfo(data.user.currencyPreferences);
                    console.log('💰 Currency preferences loaded:', data.user.currencyPreferences);
                } else {
                    // Default currency preferences
                    setUserCurrencyInfo({
                        currency: 'USD',
                        currencySymbol: '$',
                        currencyPosition: 'before',
                        decimalPlaces: 2
                    });
                }
            }
        } catch (error) {
            console.error('Failed to load currency preferences:', error);
            // Set default currency preferences on error
            setUserCurrencyInfo({
                currency: 'USD',
                currencySymbol: '$',
                currencyPosition: 'before',
                decimalPlaces: 2
            });
        } finally {
            setIsLoadingCurrency(false);
        }
    };

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

    // 3. ENHANCED: Usage check with immediate feedback - FIXED for timing issues
    const checkUsageLimitsWithImmediateUpdate = async () => {
        // If we're still loading usage info, just proceed
        // The server-side check will handle limits properly
        if (isLoadingUsage) {
            console.log('⏳ Usage still loading, proceeding with optimistic check');
            return true; // Let the server handle the actual limit check
        }

        const currentUsageData = optimisticUsage || usageInfo;

        // If no usage data, proceed anyway - server will handle it
        if (!currentUsageData) {
            console.log('⚠️ No usage data available, proceeding (server will check)');
            return true;
        }

        // Only block if we're definitely over limit
        if (currentUsageData.canScan === false) {
            const limitMessage = currentUsageData.monthlyLimit === 'unlimited'
                ? 'Unexpected limit reached'
                : `You've reached your monthly limit of ${currentUsageData.monthlyLimit} UPC scans.`;

            alert(`❌ ${limitMessage}\n\nUpgrade to Gold for unlimited UPC scanning!`);
            window.location.href = `/pricing?source=upc-limit&feature=upc-scanning&required=gold`;
            return false;
        }

        return true;
    };

    // 🆕 ENHANCED: UPC lookup with international context handling
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
            console.log('🔍 Starting international UPC lookup for:', upc);
            const response = await apiGet(`/api/upc?upc=${encodeURIComponent(upc)}`);
            const data = await response.json();

            console.log('🔍 International UPC lookup response:', {
                success: data.success,
                found: data.product?.found,
                usageIncremented: data.usageIncremented,
                dataSource: data.dataSource,
                internationalContext: data.internationalContext
            });

            if (data.success && data.product.found) {
                const standardizedNutrition = standardizeNutritionData(data.product.nutrition);
                const enhancedProduct = {
                    ...data.product,
                    nutrition: standardizedNutrition,
                    // 🆕 NEW: Add international context to product
                    internationalContext: data.internationalContext,
                    dataSource: data.dataSource,
                    barcodeInfo: data.product.barcodeInfo
                };

                setLookupResult({
                    success: true,
                    product: enhancedProduct,
                    internationalContext: data.internationalContext,
                    dataSource: data.dataSource
                });
                onProductFound(enhancedProduct);

                // FIXED: Since UPC lookup was successful, make the optimistic update permanent
                console.log('✅ International UPC lookup successful - making usage update permanent');

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
                // Enhanced error handling with international context
                const errorMessage = data.message || 'Product not found';
                const contextualMessage = data.internationalContext?.suggestions?.length > 0
                    ? `${errorMessage}. ${data.internationalContext.suggestions[0]}`
                    : errorMessage;

                setLookupResult({
                    success: false,
                    message: contextualMessage,
                    internationalContext: data.internationalContext,
                    barcodeInfo: data.barcodeInfo
                });

                if (localUPC && localUPC.length >= 8) {
                    console.log('🤖 UPC lookup failed, trying AI classification fallback...');
                    const productName = `Product ${localUPC}`;
                    await performAiClassification(productName, {});
                }

                // If lookup failed, revert the optimistic update
                console.log('❌ UPC lookup failed, reverting optimistic update');
                setOptimisticUsage(null);
                setIsUpdatingUsage(false);
                if (usageUpdateTimeoutRef.current) {
                    clearTimeout(usageUpdateTimeoutRef.current);
                }
            }
        } catch (error) {
            console.error('International UPC lookup error:', error);
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

    // 🆕 ENHANCED: Text search with international context handling
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
            console.log('🔍 Starting international text search for:', query);

            const params = new URLSearchParams({
                query: query.trim(),
                page: page.toString(),
                page_size: '15'
            });

            const response = await apiGet(`/api/upc/search?${params}`);

            console.log('🔍 International search response status:', response.status);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Search API error:', response.status, errorText);
                throw new Error(`Search API returned ${response.status}: ${response.statusText}`);
            }

            let data;
            try {
                const responseText = await response.text();
                console.log('📄 Raw response length:', responseText.length);
                data = JSON.parse(responseText);
            } catch (parseError) {
                console.error('❌ JSON parse error:', parseError);
                throw new Error('Invalid response format from search API');
            }

            console.log('🔍 International search response data:', {
                success: data.success,
                resultsCount: data.results?.length || 0,
                totalResults: data.pagination?.totalResults || 0,
                internationalContext: data.internationalContext
            });

            if (data.success) {
                const results = data.results || [];

                // 🆕 NEW: Enhance results with international context
                const enhancedResults = results.map(result => ({
                    ...result,
                    internationalContext: data.internationalContext,
                    userCurrency: data.internationalContext?.userCurrency
                }));

                setSearchResults(enhancedResults);
                setTotalPages(data.pagination?.totalPages || Math.ceil(results.length / 15) || 1);

                console.log(`✅ International search successful: ${results.length} results found`);

                // Make the usage update permanent
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

                // Clear optimistic update
                setOptimisticUsage(null);
                setIsUpdatingUsage(false);

                if (usageUpdateTimeoutRef.current) {
                    clearTimeout(usageUpdateTimeoutRef.current);
                }

            } else {
                throw new Error(data.error || 'Search failed - no success flag');
            }

        } catch (error) {
            console.error('❌ International text search error:', error);
            setSearchResults([]);
            setTotalPages(0);

            // Revert optimistic update
            console.log('❌ Search API failed, reverting optimistic update');
            setOptimisticUsage(null);
            setIsUpdatingUsage(false);
            if (usageUpdateTimeoutRef.current) {
                clearTimeout(usageUpdateTimeoutRef.current);
            }

            // Show user-friendly error messages
            if (error.message.includes('429') || error.message.includes('Rate limit')) {
                alert('❌ Search service is temporarily busy. Please wait a moment before searching again.');
            } else if (error.message.includes('timeout')) {
                alert('❌ Search is taking longer than usual. Please try again.');
            } else if (error.message.includes('404')) {
                alert('❌ Search service not available. Please try again later.');
            } else if (error.message.includes('Invalid response format')) {
                alert('❌ Search service returned invalid data. Please try again.');
            } else {
                alert(`❌ Search failed: ${error.message}. Please try again.`);
            }
        } finally {
            setIsSearching(false);
        }
    };

    // FIXED: Barcode detected handler - prevents duplicate processing
    const handleBarcodeDetectedWithImmediateUpdate = async (barcode) => {
        console.log('Barcode scanned:', barcode);

        // FIXED: Prevent multiple rapid calls AND same barcode repeats
        if (processingBarcodeRef.current) {
            console.log('Already processing a barcode, ignoring...');
            return;
        }

        // FIXED: Prevent processing the same barcode again within 30 seconds
        const now = Date.now();
        if (lastProcessedBarcodeRef.current === barcode &&
            (now - lastProcessedTimeRef.current) < 30000) {
            console.log(`Ignoring duplicate barcode "${barcode}" - processed ${(now - lastProcessedTimeRef.current) / 1000}s ago`);
            return;
        }

        processingBarcodeRef.current = true;
        lastProcessedBarcodeRef.current = barcode;
        lastProcessedTimeRef.current = now;

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
                upcInput.focus();
            }
        }, 500);

        // SIMPLIFIED: Just do the lookup without complex usage checking
        try {
            console.log('🔍 Starting auto-lookup for scanned barcode:', barcode);
            await handleUPCLookupWithImmediateUpdate(barcode);
        } catch (error) {
            console.error('Auto-lookup failed:', error);
            // Silently fail - UPC is already in the input field
        } finally {
            // Reset the processing flag after a shorter delay
            setTimeout(() => {
                processingBarcodeRef.current = false;
                console.log('✅ Ready for next barcode scan');
            }, 1000); // Reduced from 2000ms to 1000ms
        }
    };

    const performAiClassification = async (productName, existingData = {}) => {
        if (!productName || !process.env.NEXT_PUBLIC_ENABLE_AI_RECEIPTS) {
            return null;
        }

        setIsAiClassifying(true);
        setAiClassification(null);

        try {
            console.log('🤖 Performing AI classification for:', productName);

            const response = await apiPost('/api/food/classify', {
                itemName: productName,
                productDetails: existingData.name || '',
                context: 'upc_lookup_fallback'
            });

            if (response.ok) {
                const data = await response.json();

                if (data.success && data.data.classification.confidence_score > 0.7) {
                    const classification = {
                        category: data.data.classification.category,
                        storage_location: data.data.classification.storage_location,
                        confidence: data.data.classification.confidence_score,
                        reasoning: data.data.ai_analysis.reasoning,
                        dietary_flags: data.data.nutritional_category.dietary_flags || [],
                        allergen_warnings: data.data.nutritional_category.allergen_warnings || []
                    };

                    setAiClassification(classification);
                    console.log('✅ AI classification successful:', classification);
                    return classification;
                }
            }
        } catch (error) {
            console.warn('AI classification failed:', error);
        } finally {
            setIsAiClassifying(false);
        }

        return null;
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
                            📊 International UPC Scan Usage
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
                        {/* 🆕 NEW: Show user's region context */}
                        {userCurrencyInfo && !isLoadingCurrency && (
                            <p className="text-xs text-blue-600 mt-1">
                                🌍 Optimized for {userCurrencyInfo.currency} region
                            </p>
                        )}
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

    // NEW: Function to load current usage information
    const loadUsageInfo = async () => {
        try {
            setIsLoadingUsage(true);
            console.log('📊 Loading UPC usage information...');

            const response = await apiGet('/api/upc/usage');

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

    useEffect(() => {
        debugAPIEndpoint();
    }, []);

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

        console.log('🔄 Opening enhanced international barcode scanner...');
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
            console.log('🔍 Starting autocomplete for:', query);

            const params = new URLSearchParams({
                query: query.trim(),
                page: '1',
                page_size: '5'
            });

            const response = await apiGet(`/api/upc/search?${params}`);

            console.log('🔍 Autocomplete response status:', response.status);

            if (response.ok) {
                const responseText = await response.text();
                let data;

                try {
                    data = JSON.parse(responseText);
                } catch (parseError) {
                    console.log('❌ Autocomplete JSON parse error:', parseError);
                    setAutocompleteResults([]);
                    setShowAutocomplete(false);
                    return;
                }

                console.log('🔍 Autocomplete response:', {
                    success: data.success,
                    resultsCount: data.results?.length || 0
                });

                if (data.success && data.results) {
                    const suggestions = data.results.slice(0, 3).map(product => ({
                        name: product.name,
                        brand: product.brand,
                        image: product.image,
                    }));

                    setAutocompleteResults(suggestions);
                    setShowAutocomplete(suggestions.length > 0);
                    console.log(`✅ Autocomplete: ${suggestions.length} suggestions`);
                } else {
                    setAutocompleteResults([]);
                    setShowAutocomplete(false);
                }
            } else {
                // Silently fail for autocomplete
                console.log('❌ Autocomplete failed, status:', response.status);
                setAutocompleteResults([]);
                setShowAutocomplete(false);
            }

        } catch (error) {
            // Silently handle autocomplete errors
            console.log('❌ Autocomplete error (silent):', error.message);
            setAutocompleteResults([]);
            setShowAutocomplete(false);
        }
    };

    const debugAPIEndpoint = () => {
        console.log('🔍 International UPC Search API Debug:', {
            currentURL: window.location.href,
            apiEndpoint: '/api/upc/search',
            fullURL: `${window.location.origin}/api/upc/search`,
            userAgent: navigator.userAgent.substring(0, 100),
            userCurrency: userCurrencyInfo?.currency || 'Loading...'
        });
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

        // Clear results if query is too short
        if (query.length < 3) {
            setSearchResults([]);
            setTotalPages(0);
            setShowAutocomplete(false);
            setAutocompleteResults([]);
            return;
        }

        // Debounced autocomplete
        autocompleteTimeoutRef.current = setTimeout(() => {
            if (query.length >= 3) {
                performAutocomplete(query);
            }
        }, 500);

        // Debounced search
        searchTimeoutRef.current = setTimeout(() => {
            if (query.trim() && query.length >= 3) {
                console.log('🔍 Triggering international search for:', query);
                setSearchPage(1);
                performTextSearchWithImmediateUpdate(query, 1);
            }
        }, 1000);
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

        if (product.name && (!product.category || product.category === 'Other' || product.category === 'Unknown')) {
            console.log('🤖 Enhancing search result with AI classification...');
            await performAiClassification(product.name, product);
        }

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

// Add a function to reset the barcode detection when user manually changes UPC
    const handleUPCInput = (e) => {
        const upc = e.target.value;

        // FIXED: If user manually changes UPC, reset the duplicate detection
        if (upc !== lastProcessedBarcodeRef.current) {
            console.log('Manual UPC change detected, resetting duplicate detection');
            lastProcessedBarcodeRef.current = null;
            lastProcessedTimeRef.current = 0;
        }

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

// Add a function to clear the barcode memory when form is reset/submitted
    const clearBarcodeMemory = () => {
        console.log('🧹 Clearing barcode memory');
        lastProcessedBarcodeRef.current = null;
        lastProcessedTimeRef.current = 0;
        processingBarcodeRef.current = false;
    };

    useEffect(() => {
        const handleClearMemory = () => {
            clearBarcodeMemory();
        };

        window.addEventListener('clearBarcodeMemory', handleClearMemory);

        return () => {
            window.removeEventListener('clearBarcodeMemory', handleClearMemory);
        };
    }, []);

// Also clear memory when component unmounts
    useEffect(() => {
        return () => {
            clearBarcodeMemory();
        };
    }, []);

    const handleManualLookup = () => {
        const upcToLookup = localUPC || currentUPC;
        if (upcToLookup) {
            handleUPCLookupWithImmediateUpdate(upcToLookup);
        }
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
            {/* ENHANCED: Usage Display with international context */}
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
                            🌍 International Product Search
                        </label>
                        <div className="relative">
                            <KeyboardOptimizedInput
                                ref={searchInputRef}
                                type="text"
                                id="search"
                                value={searchQuery}
                                onChange={handleSearchInputChange}
                                onFocus={handleSearchInputFocus}
                                placeholder="Type product name (e.g., 'Cheerios', 'Heinz Baked Beans', 'Tim Tams')"
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
                                        <span
                                            className="text-xs font-medium text-gray-600">🌍 International suggestions</span>
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

                        {/* Enhanced help text with international examples */}
                        <div className="mt-2 text-xs text-gray-500 space-y-1">
                            <div>💡 <strong>International Search Tips:</strong></div>
                            <div>• Try products from your region (UK: "Walkers Crisps", EU: "Nutella", AU: "Tim Tams")
                            </div>
                            <div>• Include brand + product name for better results</div>
                            <div>• Search works across global databases with regional optimization</div>
                            <div>• Results prioritize products available in your region</div>
                            {userCurrencyInfo && !isLoadingCurrency && (
                                <div>• Currently optimized for {userCurrencyInfo.currency} region</div>
                            )}
                        </div>
                    </div>

                    {/* Search loading */}
                    {isSearching && (
                        <div className="flex items-center justify-center p-4 bg-blue-50 rounded-lg">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                            <span className="ml-2 text-blue-700">🌍 Searching international databases...</span>
                        </div>
                    )}

                    {/* Enhanced Search Results with international context */}
                    {searchResults.length > 0 && (
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-4">
                                <h4 className="text-lg font-medium text-gray-900">
                                    🌍 International Search Results ({searchResults.length} found)
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
                                                {/* 🆕 NEW: Show regional match indicator */}
                                                {product.regionalMatch && (
                                                    <div className="mt-1">
                                                        <span
                                                            className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                            🌍 Regional match
                                                        </span>
                                                    </div>
                                                )}
                                                {/* Show price if available */}
                                                {product.price && userCurrencyInfo && (
                                                    <div className="mt-1">
                                                        <span className="text-xs font-medium text-green-600">
                                                            {formatPrice(product.price, userCurrencyInfo)}
                                                        </span>
                                                    </div>
                                                )}
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
                            <div className="text-yellow-600 font-medium">🌍 No international products found for
                                "{searchQuery}"
                            </div>
                            <div className="text-sm text-yellow-600 mt-1">
                                Try different search terms, brand names, or check spelling
                            </div>
                            {userCurrencyInfo && !isLoadingCurrency && (
                                <div className="text-xs text-yellow-600 mt-1">
                                    Search optimized for {userCurrencyInfo.currency} region
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* UPC Tab Content */}
            {activeTab === 'upc' && (
                <div className="space-y-4">
                    <div>
                        <label htmlFor="upc" className="block text-sm font-medium text-gray-700 mb-2">
                            🌍 International UPC/Barcode
                        </label>

                        <KeyboardOptimizedInput
                            type="text"
                            id="upc"
                            name="upc"
                            value={localUPC}
                            onChange={handleUPCInput}
                            placeholder="Enter or scan international UPC/EAN code"
                            className="w-full mt-1 block border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        />

                        {/* Enhanced buttons with international context */}
                        <div className="flex space-x-2 mt-3">
                            <TouchEnhancedButton
                                type="button"
                                onClick={handleScannerClick}
                                disabled={isLooking}
                                className={`flex-1 px-4 py-2 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-400 ${
                                    cameraAvailable ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-500 cursor-not-allowed'
                                }`}
                                title={cameraAvailable ? 'Scan international barcode with camera' : 'Camera not available on this device'}
                            >
                                📷 {cameraAvailable ? 'Scan Barcode' : 'No Camera'}
                            </TouchEnhancedButton>

                            <TouchEnhancedButton
                                type="button"
                                onClick={handleManualLookup}
                                disabled={!localUPC || isLooking}
                                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-400"
                            >
                                {isLooking ? '🔍 Looking up...' : '🔍 Lookup Product'}
                            </TouchEnhancedButton>

                            <TouchEnhancedButton
                                type="button"
                                onClick={() => {
                                    if (localUPC && localUPC.length >= 8) {
                                        const productName = `Product ${localUPC}`;
                                        performAiClassification(productName, lookupResult?.product || {});
                                    }
                                }}
                                disabled={!localUPC || localUPC.length < 8 || isAiClassifying}
                                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-400"
                            >
                                {isAiClassifying ? '🤖 AI Analyzing...' : '🤖 AI Classify'}
                            </TouchEnhancedButton>
                        </div>

                        {/* Enhanced help text with international formats */}
                        <div className="mt-2 text-xs text-gray-500 space-y-1">
                            <div>💡 <strong>International Barcode Support:</strong></div>
                            <div>• UPC-A (12 digits, US/Canada): 012345678901</div>
                            <div>• EAN-13 (13 digits, International): 1234567890123</div>
                            <div>• EAN-8 (8 digits, Short format): 12345678</div>
                            <div>• Auto-detects barcode origin and optimizes search</div>
                            {userCurrencyInfo && !isLoadingCurrency && (
                                <div>• Currently optimized for {userCurrencyInfo.currency} products</div>
                            )}
                        </div>
                    </div>

                    {/* Enhanced Scanner Component */}
                    <BarcodeScanner
                        isActive={showScanner}
                        onBarcodeDetected={handleBarcodeDetectedWithImmediateUpdate}
                        onClose={() => {
                            console.log('🔄 Closing international barcode scanner...');
                            setShowScanner(false);
                        }}
                    />
                </div>
            )}

            {/* Loading State for UPC */}
            {isLooking && (
                <div className="flex items-center justify-center p-4 bg-blue-50 rounded-lg">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    <span className="ml-2 text-blue-700">🌍 Looking up international product...</span>
                </div>
            )}

            {/* 🆕 ENHANCED: Lookup Results with international context */}
            {lookupResult && (
                <div className={`p-4 rounded-lg ${
                    lookupResult.success ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'
                }`}>
                    {lookupResult.success ? (
                        <div>
                            <div className="flex items-center mb-3">
                                <span className="text-green-600 font-medium">✅ International Product Found!</span>
                                {hasNutrition && (
                                    <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                                        🥗 Nutrition Available
                                    </span>
                                )}
                                {/* 🆕 NEW: Show data source */}
                                {lookupResult.dataSource && (
                                    <span className="ml-2 px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
                                        📊 {lookupResult.dataSource}
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
                                    {lookupResult.product.price && userCurrencyInfo && (
                                        <div><strong>Price:</strong> {formatPrice(lookupResult.product.price, userCurrencyInfo)}</div>
                                    )}
                                    {lookupResult.product.detectedCountry && (
                                        <div><strong>Origin:</strong> {lookupResult.product.detectedCountry}</div>
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

                            {/* 🆕 NEW: Barcode Analysis Display */}
                            {lookupResult.product.barcodeInfo && (
                                <BarcodeAnalysisDisplay
                                    barcodeInfo={lookupResult.product.barcodeInfo}
                                    userCurrency={userCurrencyInfo?.currency}
                                />
                            )}

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
                                                * Nutrition data from international food databases
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

                            {/* AI Classification Results */}
                            {aiClassification && (
                                <div className="mt-4 pt-4 border-t border-blue-200">
                                    <div className="flex items-center mb-3">
                                        <span className="text-blue-800 font-medium">🤖 AI Suggestions</span>
                                        <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                                            {Math.round(aiClassification.confidence * 100)}% confident
                                        </span>
                                    </div>

                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                            <div>
                                                <strong>Suggested Category:</strong>
                                                <div className="text-blue-700">{aiClassification.category}</div>
                                            </div>
                                            <div>
                                                <strong>Storage Location:</strong>
                                                <div className="text-blue-700">{aiClassification.storage_location}</div>
                                            </div>
                                            {aiClassification.dietary_flags.length > 0 && (
                                                <div>
                                                    <strong>Dietary Flags:</strong>
                                                    <div
                                                        className="text-blue-700">{aiClassification.dietary_flags.join(', ')}</div>
                                                </div>
                                            )}
                                            {aiClassification.allergen_warnings.length > 0 && (
                                                <div>
                                                    <strong>Allergen Warnings:</strong>
                                                    <div
                                                        className="text-orange-700">{aiClassification.allergen_warnings.join(', ')}</div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="mt-3 text-xs text-blue-600">
                                            {aiClassification.reasoning}
                                        </div>

                                        <div className="mt-3 flex space-x-2">
                                            <TouchEnhancedButton
                                                type="button"
                                                onClick={() => {
                                                    if (lookupResult?.product) {
                                                        const enhancedProduct = {
                                                            ...lookupResult.product,
                                                            category: aiClassification.category,
                                                            storage_location: aiClassification.storage_location,
                                                            dietary_flags: aiClassification.dietary_flags,
                                                            allergen_warnings: aiClassification.allergen_warnings,
                                                            ai_enhanced: true
                                                        };

                                                        setLookupResult({success: true, product: enhancedProduct});
                                                        onProductFound(enhancedProduct);
                                                        setAiClassification(null);
                                                    }
                                                }}
                                                className="px-3 py-1 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700"
                                            >
                                                ✅ Apply Suggestions
                                            </TouchEnhancedButton>

                                            <TouchEnhancedButton
                                                type="button"
                                                onClick={() => setAiClassification(null)}
                                                className="px-3 py-1 bg-gray-300 text-gray-700 text-xs rounded-md hover:bg-gray-400"
                                            >
                                                ❌ Dismiss
                                            </TouchEnhancedButton>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* 🆕 NEW: International Context Display */}
                            {lookupResult.internationalContext && (
                                <InternationalContextDisplay
                                    internationalContext={lookupResult.internationalContext}
                                    dataSource={lookupResult.dataSource}
                                />
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
                                {/* 🆕 NEW: Show USDA link if available */}
                                {lookupResult.product.usdaUrl && (
                                    <span className="ml-3">
                                        <a
                                            href={lookupResult.product.usdaUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-600 hover:text-blue-800"
                                        >
                                            View on USDA →
                                        </a>
                                    </span>
                                )}
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

                            {/* 🆕 NEW: Show barcode analysis even for failed lookups */}
                            {lookupResult.barcodeInfo && (
                                <BarcodeAnalysisDisplay
                                    barcodeInfo={lookupResult.barcodeInfo}
                                    userCurrency={userCurrencyInfo?.currency}
                                />
                            )}

                            {/* 🆕 NEW: Show international context for failed lookups */}
                            {lookupResult.internationalContext && (
                                <InternationalContextDisplay
                                    internationalContext={lookupResult.internationalContext}
                                    dataSource="Search failed"
                                />
                            )}
                        </div>
                    )}

                    {/* AI Classification Loading */}
                    {isAiClassifying && (
                        <div className="mt-4 pt-4 border-t border-blue-200">
                            <div className="flex items-center justify-center p-4 bg-blue-50 rounded-lg">
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                                <span className="ml-2 text-blue-700 text-sm">🤖 AI analyzing product...</span>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* 🆕 ENHANCED: Usage Tips with international context */}
            <div className="text-xs text-gray-500 space-y-1">
                <div>💡 <strong>International Tips:</strong></div>
                {activeTab === 'upc' ? (
                    <>
                        <div>• Supports UPC (US/CA), EAN-13 (Global), EAN-8 (Short) formats</div>
                        <div>• Camera scanning works best in good lighting</div>
                        <div>• Auto-detects barcode region and optimizes database search</div>
                        {userCurrencyInfo && !isLoadingCurrency && (
                            <div>• Currently optimized for {userCurrencyInfo.currency} products and pricing</div>
                        )}
                    </>
                ) : (
                    <>
                        <div>• Search includes global product databases with regional prioritization</div>
                        <div>• UK users see UK products first, EU users see EU products first, etc.</div>
                        <div>• Results include products from Open Food Facts international database</div>
                        <div>• Regional products (Tim Tams, Walkers Crisps, etc.) are supported</div>
                    </>
                )}
                <div>• Data sourced from international food databases</div>
                <div>• Nutrition information varies by region and availability</div>
                <div>• If not found, you can still add the item manually</div>
            </div>
        </div>
    );
}