// file: /src/app/api/upc/route.js v9 - Enhanced with international support for UK/EU users

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import { User } from '@/lib/models';
import { FEATURE_GATES, checkUsageLimit, getUpgradeMessage, getRequiredTier } from '@/lib/subscription-config';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Enhanced international API configuration
const INTERNATIONAL_ENDPOINTS = {
    // Open Food Facts - Primary global database
    openFoodFacts: {
        global: 'https://world.openfoodfacts.org/api/v2/product',
        uk: 'https://uk.openfoodfacts.org/api/v2/product',
        france: 'https://fr.openfoodfacts.org/api/v2/product',
        germany: 'https://de.openfoodfacts.org/api/v2/product',
        spain: 'https://es.openfoodfacts.org/api/v2/product',
        italy: 'https://it.openfoodfacts.org/api/v2/product',
        canada: 'https://ca.openfoodfacts.org/api/v2/product',
        australia: 'https://au.openfoodfacts.org/api/v2/product'
    },

    // USDA (US-specific)
    usda: {
        baseUrl: 'https://api.nal.usda.gov/fdc/v1',
        apiKey: process.env.USDA_API_KEY,
        searchEndpoint: '/foods/search',
        foodEndpoint: '/food'
    },

    // UK-specific databases (fallback options)
    ukDatabases: {
        // Food Standards Agency (if available)
        fsa: 'https://www.food.gov.uk/api', // Placeholder - would need real API
        // Tesco API (if available)
        tesco: process.env.TESCO_API_BASE_URL, // Would need Tesco developer API
    }
};

// International currency symbols for price display
const CURRENCY_SYMBOLS = {
    'USD': '$', 'EUR': '€', 'GBP': '£', 'CAD': 'C$', 'AUD': 'A$', 'JPY': '¥',
    'CHF': 'CHF', 'SEK': 'kr', 'NOK': 'kr', 'DKK': 'kr', 'PLN': 'zł',
    'CZK': 'Kč', 'HUF': 'Ft', 'RON': 'lei', 'NZD': 'NZ$', 'ZAR': 'R',
    'INR': '₹', 'CNY': '¥', 'KRW': '₩', 'SGD': 'S$', 'HKD': 'HK$',
    'THB': '฿', 'MYR': 'RM', 'RUB': '₽', 'TRY': '₺', 'ILS': '₪',
    'AED': 'د.إ', 'SAR': 'ر.س', 'BRL': 'R$', 'MXN': '$', 'ARS': '$'
};

// Enhanced barcode format detection
function detectBarcodeFormat(barcode) {
    const clean = barcode.replace(/\D/g, '');

    if (clean.length === 8) {
        return { format: 'EAN-8', region: 'EU', type: 'short' };
    } else if (clean.length === 12) {
        return { format: 'UPC-A', region: 'US', type: 'standard' };
    } else if (clean.length === 13) {
        const prefix = clean.substring(0, 3);

        // Determine region by GS1 prefix
        if (prefix >= '000' && prefix <= '019') return { format: 'EAN-13', region: 'US', type: 'us_in_ean' };
        if (prefix >= '020' && prefix <= '029') return { format: 'EAN-13', region: 'RESTRICTED', type: 'internal' };
        if (prefix >= '030' && prefix <= '039') return { format: 'EAN-13', region: 'US', type: 'drugs' };
        if (prefix >= '040' && prefix <= '049') return { format: 'EAN-13', region: 'RESTRICTED', type: 'internal' };
        if (prefix >= '050' && prefix <= '059') return { format: 'EAN-13', region: 'US', type: 'coupons' };
        if (prefix >= '060' && prefix <= '099') return { format: 'EAN-13', region: 'US', type: 'standard' };

        // International prefixes
        if (prefix >= '100' && prefix <= '139') return { format: 'EAN-13', region: 'US', type: 'standard' };
        if (prefix >= '200' && prefix <= '299') return { format: 'EAN-13', region: 'RESTRICTED', type: 'internal' };
        if (prefix >= '300' && prefix <= '379') return { format: 'EAN-13', region: 'FR', type: 'standard', country: 'France' };
        if (prefix >= '380' && prefix <= '380') return { format: 'EAN-13', region: 'BG', type: 'standard', country: 'Bulgaria' };
        if (prefix >= '383' && prefix <= '383') return { format: 'EAN-13', region: 'SI', type: 'standard', country: 'Slovenia' };
        if (prefix >= '385' && prefix <= '385') return { format: 'EAN-13', region: 'HR', type: 'standard', country: 'Croatia' };
        if (prefix >= '387' && prefix <= '387') return { format: 'EAN-13', region: 'BA', type: 'standard', country: 'Bosnia' };
        if (prefix >= '400' && prefix <= '440') return { format: 'EAN-13', region: 'DE', type: 'standard', country: 'Germany' };
        if (prefix >= '450' && prefix <= '459') return { format: 'EAN-13', region: 'JP', type: 'standard', country: 'Japan' };
        if (prefix >= '460' && prefix <= '469') return { format: 'EAN-13', region: 'RU', type: 'standard', country: 'Russia' };
        if (prefix >= '470' && prefix <= '470') return { format: 'EAN-13', region: 'KG', type: 'standard', country: 'Kyrgyzstan' };
        if (prefix >= '471' && prefix <= '471') return { format: 'EAN-13', region: 'TW', type: 'standard', country: 'Taiwan' };
        if (prefix >= '474' && prefix <= '474') return { format: 'EAN-13', region: 'EE', type: 'standard', country: 'Estonia' };
        if (prefix >= '475' && prefix <= '475') return { format: 'EAN-13', region: 'LV', type: 'standard', country: 'Latvia' };
        if (prefix >= '476' && prefix <= '476') return { format: 'EAN-13', region: 'AZ', type: 'standard', country: 'Azerbaijan' };
        if (prefix >= '477' && prefix <= '477') return { format: 'EAN-13', region: 'LT', type: 'standard', country: 'Lithuania' };
        if (prefix >= '478' && prefix <= '478') return { format: 'EAN-13', region: 'UZ', type: 'standard', country: 'Uzbekistan' };
        if (prefix >= '479' && prefix <= '479') return { format: 'EAN-13', region: 'LK', type: 'standard', country: 'Sri Lanka' };
        if (prefix >= '480' && prefix <= '489') return { format: 'EAN-13', region: 'PH', type: 'standard', country: 'Philippines' };
        if (prefix >= '490' && prefix <= '499') return { format: 'EAN-13', region: 'JP', type: 'standard', country: 'Japan' };
        if (prefix >= '500' && prefix <= '509') return { format: 'EAN-13', region: 'UK', type: 'standard', country: 'United Kingdom' };
        if (prefix >= '520' && prefix <= '521') return { format: 'EAN-13', region: 'GR', type: 'standard', country: 'Greece' };
        if (prefix >= '528' && prefix <= '528') return { format: 'EAN-13', region: 'LB', type: 'standard', country: 'Lebanon' };
        if (prefix >= '529' && prefix <= '529') return { format: 'EAN-13', region: 'CY', type: 'standard', country: 'Cyprus' };
        if (prefix >= '530' && prefix <= '530') return { format: 'EAN-13', region: 'AL', type: 'standard', country: 'Albania' };
        if (prefix >= '531' && prefix <= '531') return { format: 'EAN-13', region: 'MK', type: 'standard', country: 'Macedonia' };
        if (prefix >= '535' && prefix <= '535') return { format: 'EAN-13', region: 'MT', type: 'standard', country: 'Malta' };
        if (prefix >= '539' && prefix <= '539') return { format: 'EAN-13', region: 'IE', type: 'standard', country: 'Ireland' };
        if (prefix >= '540' && prefix <= '549') return { format: 'EAN-13', region: 'BE', type: 'standard', country: 'Belgium/Luxembourg' };
        if (prefix >= '560' && prefix <= '560') return { format: 'EAN-13', region: 'PT', type: 'standard', country: 'Portugal' };
        if (prefix >= '569' && prefix <= '569') return { format: 'EAN-13', region: 'IS', type: 'standard', country: 'Iceland' };
        if (prefix >= '570' && prefix <= '579') return { format: 'EAN-13', region: 'DK', type: 'standard', country: 'Denmark' };
        if (prefix >= '590' && prefix <= '590') return { format: 'EAN-13', region: 'PL', type: 'standard', country: 'Poland' };
        if (prefix >= '594' && prefix <= '594') return { format: 'EAN-13', region: 'RO', type: 'standard', country: 'Romania' };
        if (prefix >= '599' && prefix <= '599') return { format: 'EAN-13', region: 'HU', type: 'standard', country: 'Hungary' };
        if (prefix >= '600' && prefix <= '601') return { format: 'EAN-13', region: 'ZA', type: 'standard', country: 'South Africa' };
        if (prefix >= '603' && prefix <= '603') return { format: 'EAN-13', region: 'GH', type: 'standard', country: 'Ghana' };
        if (prefix >= '604' && prefix <= '604') return { format: 'EAN-13', region: 'SN', type: 'standard', country: 'Senegal' };
        if (prefix >= '608' && prefix <= '608') return { format: 'EAN-13', region: 'BH', type: 'standard', country: 'Bahrain' };
        if (prefix >= '609' && prefix <= '609') return { format: 'EAN-13', region: 'MU', type: 'standard', country: 'Mauritius' };
        if (prefix >= '611' && prefix <= '611') return { format: 'EAN-13', region: 'MA', type: 'standard', country: 'Morocco' };
        if (prefix >= '613' && prefix <= '613') return { format: 'EAN-13', region: 'DZ', type: 'standard', country: 'Algeria' };
        if (prefix >= '615' && prefix <= '615') return { format: 'EAN-13', region: 'NG', type: 'standard', country: 'Nigeria' };
        if (prefix >= '616' && prefix <= '616') return { format: 'EAN-13', region: 'KE', type: 'standard', country: 'Kenya' };
        if (prefix >= '618' && prefix <= '618') return { format: 'EAN-13', region: 'CI', type: 'standard', country: 'Ivory Coast' };
        if (prefix >= '619' && prefix <= '619') return { format: 'EAN-13', region: 'TN', type: 'standard', country: 'Tunisia' };
        if (prefix >= '620' && prefix <= '620') return { format: 'EAN-13', region: 'TZ', type: 'standard', country: 'Tanzania' };
        if (prefix >= '621' && prefix <= '621') return { format: 'EAN-13', region: 'SY', type: 'standard', country: 'Syria' };
        if (prefix >= '622' && prefix <= '622') return { format: 'EAN-13', region: 'EG', type: 'standard', country: 'Egypt' };
        if (prefix >= '623' && prefix <= '623') return { format: 'EAN-13', region: 'BN', type: 'standard', country: 'Brunei' };
        if (prefix >= '624' && prefix <= '624') return { format: 'EAN-13', region: 'LY', type: 'standard', country: 'Libya' };
        if (prefix >= '625' && prefix <= '625') return { format: 'EAN-13', region: 'JO', type: 'standard', country: 'Jordan' };
        if (prefix >= '626' && prefix <= '626') return { format: 'EAN-13', region: 'IR', type: 'standard', country: 'Iran' };
        if (prefix >= '627' && prefix <= '627') return { format: 'EAN-13', region: 'KW', type: 'standard', country: 'Kuwait' };
        if (prefix >= '628' && prefix <= '628') return { format: 'EAN-13', region: 'SA', type: 'standard', country: 'Saudi Arabia' };
        if (prefix >= '629' && prefix <= '629') return { format: 'EAN-13', region: 'AE', type: 'standard', country: 'UAE' };
        if (prefix >= '640' && prefix <= '649') return { format: 'EAN-13', region: 'FI', type: 'standard', country: 'Finland' };
        if (prefix >= '690' && prefix <= '695') return { format: 'EAN-13', region: 'CN', type: 'standard', country: 'China' };
        if (prefix >= '700' && prefix <= '709') return { format: 'EAN-13', region: 'NO', type: 'standard', country: 'Norway' };
        if (prefix >= '729' && prefix <= '729') return { format: 'EAN-13', region: 'IL', type: 'standard', country: 'Israel' };
        if (prefix >= '730' && prefix <= '739') return { format: 'EAN-13', region: 'SE', type: 'standard', country: 'Sweden' };
        if (prefix >= '740' && prefix <= '740') return { format: 'EAN-13', region: 'GT', type: 'standard', country: 'Guatemala' };
        if (prefix >= '741' && prefix <= '741') return { format: 'EAN-13', region: 'SV', type: 'standard', country: 'El Salvador' };
        if (prefix >= '742' && prefix <= '742') return { format: 'EAN-13', region: 'HN', type: 'standard', country: 'Honduras' };
        if (prefix >= '743' && prefix <= '743') return { format: 'EAN-13', region: 'NI', type: 'standard', country: 'Nicaragua' };
        if (prefix >= '744' && prefix <= '744') return { format: 'EAN-13', region: 'CR', type: 'standard', country: 'Costa Rica' };
        if (prefix >= '745' && prefix <= '745') return { format: 'EAN-13', region: 'PA', type: 'standard', country: 'Panama' };
        if (prefix >= '746' && prefix <= '746') return { format: 'EAN-13', region: 'DO', type: 'standard', country: 'Dominican Republic' };
        if (prefix >= '750' && prefix <= '750') return { format: 'EAN-13', region: 'MX', type: 'standard', country: 'Mexico' };
        if (prefix >= '754' && prefix <= '755') return { format: 'EAN-13', region: 'CA', type: 'standard', country: 'Canada' };
        if (prefix >= '759' && prefix <= '759') return { format: 'EAN-13', region: 'VE', type: 'standard', country: 'Venezuela' };
        if (prefix >= '760' && prefix <= '769') return { format: 'EAN-13', region: 'CH', type: 'standard', country: 'Switzerland' };
        if (prefix >= '770' && prefix <= '771') return { format: 'EAN-13', region: 'CO', type: 'standard', country: 'Colombia' };
        if (prefix >= '773' && prefix <= '773') return { format: 'EAN-13', region: 'UY', type: 'standard', country: 'Uruguay' };
        if (prefix >= '775' && prefix <= '775') return { format: 'EAN-13', region: 'PE', type: 'standard', country: 'Peru' };
        if (prefix >= '777' && prefix <= '777') return { format: 'EAN-13', region: 'BO', type: 'standard', country: 'Bolivia' };
        if (prefix >= '778' && prefix <= '779') return { format: 'EAN-13', region: 'AR', type: 'standard', country: 'Argentina' };
        if (prefix >= '780' && prefix <= '780') return { format: 'EAN-13', region: 'CL', type: 'standard', country: 'Chile' };
        if (prefix >= '784' && prefix <= '784') return { format: 'EAN-13', region: 'PY', type: 'standard', country: 'Paraguay' };
        if (prefix >= '786' && prefix <= '786') return { format: 'EAN-13', region: 'EC', type: 'standard', country: 'Ecuador' };
        if (prefix >= '789' && prefix <= '790') return { format: 'EAN-13', region: 'BR', type: 'standard', country: 'Brazil' };
        if (prefix >= '800' && prefix <= '839') return { format: 'EAN-13', region: 'IT', type: 'standard', country: 'Italy' };
        if (prefix >= '840' && prefix <= '849') return { format: 'EAN-13', region: 'ES', type: 'standard', country: 'Spain' };
        if (prefix >= '850' && prefix <= '850') return { format: 'EAN-13', region: 'CU', type: 'standard', country: 'Cuba' };
        if (prefix >= '858' && prefix <= '858') return { format: 'EAN-13', region: 'SK', type: 'standard', country: 'Slovakia' };
        if (prefix >= '859' && prefix <= '859') return { format: 'EAN-13', region: 'CZ', type: 'standard', country: 'Czech Republic' };
        if (prefix >= '860' && prefix <= '860') return { format: 'EAN-13', region: 'RS', type: 'standard', country: 'Serbia' };
        if (prefix >= '865' && prefix <= '865') return { format: 'EAN-13', region: 'MN', type: 'standard', country: 'Mongolia' };
        if (prefix >= '867' && prefix <= '867') return { format: 'EAN-13', region: 'KP', type: 'standard', country: 'North Korea' };
        if (prefix >= '868' && prefix <= '869') return { format: 'EAN-13', region: 'TR', type: 'standard', country: 'Turkey' };
        if (prefix >= '870' && prefix <= '879') return { format: 'EAN-13', region: 'NL', type: 'standard', country: 'Netherlands' };
        if (prefix >= '880' && prefix <= '880') return { format: 'EAN-13', region: 'KR', type: 'standard', country: 'South Korea' };
        if (prefix >= '884' && prefix <= '884') return { format: 'EAN-13', region: 'KH', type: 'standard', country: 'Cambodia' };
        if (prefix >= '885' && prefix <= '885') return { format: 'EAN-13', region: 'TH', type: 'standard', country: 'Thailand' };
        if (prefix >= '888' && prefix <= '888') return { format: 'EAN-13', region: 'SG', type: 'standard', country: 'Singapore' };
        if (prefix >= '890' && prefix <= '890') return { format: 'EAN-13', region: 'IN', type: 'standard', country: 'India' };
        if (prefix >= '893' && prefix <= '893') return { format: 'EAN-13', region: 'VN', type: 'standard', country: 'Vietnam' };
        if (prefix >= '896' && prefix <= '896') return { format: 'EAN-13', region: 'PK', type: 'standard', country: 'Pakistan' };
        if (prefix >= '899' && prefix <= '899') return { format: 'EAN-13', region: 'ID', type: 'standard', country: 'Indonesia' };
        if (prefix >= '900' && prefix <= '919') return { format: 'EAN-13', region: 'AT', type: 'standard', country: 'Austria' };
        if (prefix >= '930' && prefix <= '939') return { format: 'EAN-13', region: 'AU', type: 'standard', country: 'Australia' };
        if (prefix >= '940' && prefix <= '949') return { format: 'EAN-13', region: 'NZ', type: 'standard', country: 'New Zealand' };
        if (prefix >= '950' && prefix <= '950') return { format: 'EAN-13', region: 'GLOBAL', type: 'demo', country: 'Global Office' };
        if (prefix >= '951' && prefix <= '951') return { format: 'EAN-13', region: 'GLOBAL', type: 'demo', country: 'Global Office' };
        if (prefix >= '955' && prefix <= '955') return { format: 'EAN-13', region: 'MY', type: 'standard', country: 'Malaysia' };
        if (prefix >= '958' && prefix <= '958') return { format: 'EAN-13', region: 'MO', type: 'standard', country: 'Macau' };

        // Default for unknown prefixes
        return { format: 'EAN-13', region: 'UNKNOWN', type: 'standard', country: 'Unknown' };
    } else if (clean.length === 14) {
        return { format: 'GTIN-14', region: 'GLOBAL', type: 'case' };
    }

    return { format: 'UNKNOWN', region: 'UNKNOWN', type: 'invalid' };
}

// Enhanced region-specific endpoint selection
function getOptimalEndpoints(barcodeInfo, userCurrency = 'USD') {
    const endpoints = [];

    // Determine user's likely region from currency
    const currencyToRegion = {
        'GBP': 'UK', 'EUR': 'EU', 'USD': 'US', 'CAD': 'CA', 'AUD': 'AU',
        'JPY': 'JP', 'CNY': 'CN', 'INR': 'IN', 'KRW': 'KR', 'SGD': 'SG'
    };

    const userRegion = currencyToRegion[userCurrency] || 'US';

    // Prioritize endpoints based on barcode origin and user location
    if (barcodeInfo.region === 'UK' || userRegion === 'UK') {
        endpoints.push(
            INTERNATIONAL_ENDPOINTS.openFoodFacts.uk,
            INTERNATIONAL_ENDPOINTS.openFoodFacts.global,
            INTERNATIONAL_ENDPOINTS.openFoodFacts.france  // EU fallback
        );
    } else if (barcodeInfo.region === 'DE' || barcodeInfo.region === 'FR' || barcodeInfo.region === 'EU' || userRegion === 'EU') {
        endpoints.push(
            INTERNATIONAL_ENDPOINTS.openFoodFacts.france,
            INTERNATIONAL_ENDPOINTS.openFoodFacts.germany,
            INTERNATIONAL_ENDPOINTS.openFoodFacts.global
        );
    } else if (barcodeInfo.region === 'AU' || userRegion === 'AU') {
        endpoints.push(
            INTERNATIONAL_ENDPOINTS.openFoodFacts.australia,
            INTERNATIONAL_ENDPOINTS.openFoodFacts.global
        );
    } else if (barcodeInfo.region === 'CA' || userRegion === 'CA') {
        endpoints.push(
            INTERNATIONAL_ENDPOINTS.openFoodFacts.canada,
            INTERNATIONAL_ENDPOINTS.openFoodFacts.global
        );
    } else {
        // US or unknown - try global first, then regional
        endpoints.push(
            INTERNATIONAL_ENDPOINTS.openFoodFacts.global,
            INTERNATIONAL_ENDPOINTS.openFoodFacts.uk,    // UK has good coverage
            INTERNATIONAL_ENDPOINTS.openFoodFacts.france // EU has good coverage
        );
    }

    return endpoints;
}

// Enhanced Open Food Facts fetcher with region awareness
async function fetchFromOpenFoodFacts(upc, userCurrency = 'USD', maxRetries = 2) {
    const cleanUpc = upc.replace(/\D/g, '');
    const barcodeInfo = detectBarcodeFormat(cleanUpc);
    const endpoints = getOptimalEndpoints(barcodeInfo, userCurrency);

    console.log(`🌍 Detected barcode: ${barcodeInfo.format} from ${barcodeInfo.country || barcodeInfo.region}`);
    console.log(`🎯 User currency: ${userCurrency}, trying ${endpoints.length} endpoints`);

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        for (const [index, baseUrl] of endpoints.entries()) {
            try {
                console.log(`🥫 OpenFoodFacts attempt ${attempt + 1}/${maxRetries} - endpoint ${index + 1}/${endpoints.length}`);
                console.log(`📡 Trying: ${baseUrl}`);

                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 8000);

                const response = await fetch(`${baseUrl}/${cleanUpc}.json`, {
                    headers: {
                        'User-Agent': 'DocBearsComfortKitchen/1.0 (international-food-inventory@docbearscomfort.kitchen)',
                        'Accept': 'application/json',
                        'Cache-Control': 'no-cache',
                        'Accept-Language': getAcceptLanguage(userCurrency)
                    },
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                if (response.ok) {
                    const data = await response.json();
                    if (data.status !== 0 && data.status_verbose !== 'product not found') {
                        console.log(`✅ OpenFoodFacts success with ${baseUrl}`);
                        console.log(`📊 Product: ${data.product?.product_name || 'Unknown'} from ${barcodeInfo.country || barcodeInfo.region}`);
                        return {
                            success: true,
                            data,
                            source: 'openfoodfacts',
                            endpoint: baseUrl,
                            barcodeInfo,
                            regional: index === 0 // First endpoint is most region-specific
                        };
                    }
                }

            } catch (error) {
                console.log(`❌ OpenFoodFacts error with ${baseUrl}:`, error.message);
            }
        }

        if (attempt < maxRetries - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }

    return { success: false, source: 'openfoodfacts', barcodeInfo };
}

// Get Accept-Language header based on user currency/region
function getAcceptLanguage(userCurrency) {
    const languageMap = {
        'GBP': 'en-GB,en;q=0.9',
        'EUR': 'en-GB,fr;q=0.9,de;q=0.8,es;q=0.7,it;q=0.6',
        'CAD': 'en-CA,fr-CA;q=0.9,en;q=0.8',
        'AUD': 'en-AU,en;q=0.9',
        'USD': 'en-US,en;q=0.9',
        'JPY': 'ja,en;q=0.9',
        'CNY': 'zh-CN,en;q=0.9'
    };

    return languageMap[userCurrency] || 'en-US,en;q=0.9';
}

// Enhanced USDA conversion for international users
function convertUPCToGTIN14(upc) {
    const cleanUpc = upc.replace(/\D/g, '');

    if (cleanUpc.length === 12) {
        return '00' + cleanUpc;
    } else if (cleanUpc.length === 13) {
        return '0' + cleanUpc;
    } else if (cleanUpc.length === 14) {
        return cleanUpc;
    } else if (cleanUpc.length === 8) {
        return '000000' + cleanUpc;
    }

    return cleanUpc.padStart(14, '0');
}

// Enhanced USDA fetcher (still primarily US-focused)
async function fetchFromUSDA(upc, maxRetries = 2) {
    if (!INTERNATIONAL_ENDPOINTS.usda.apiKey) {
        console.log('⚠️ USDA API key not configured, skipping USDA lookup');
        return { success: false, source: 'usda', error: 'API key not configured' };
    }

    const gtin14 = convertUPCToGTIN14(upc);
    console.log(`🇺🇸 USDA lookup for UPC ${upc} -> GTIN-14: ${gtin14}`);

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            console.log(`🇺🇸 USDA attempt ${attempt + 1}/${maxRetries}`);

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000);

            const searchUrl = `${INTERNATIONAL_ENDPOINTS.usda.baseUrl}${INTERNATIONAL_ENDPOINTS.usda.searchEndpoint}`;
            const searchParams = new URLSearchParams({
                api_key: INTERNATIONAL_ENDPOINTS.usda.apiKey,
                query: gtin14,
                dataType: ['Branded'],
                pageSize: 5,
                sortBy: 'dataType.keyword',
                sortOrder: 'asc'
            });

            const response = await fetch(`${searchUrl}?${searchParams}`, {
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'DocBearsComfortKitchen/1.0'
                },
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (response.ok) {
                const data = await response.json();
                console.log(`📊 USDA search returned ${data.foods?.length || 0} results`);

                const exactMatch = data.foods?.find(food =>
                    food.gtinUpc === gtin14 ||
                    food.gtinUpc === upc.replace(/\D/g, '') ||
                    food.gtinUpc?.endsWith(upc.replace(/\D/g, ''))
                );

                if (exactMatch) {
                    console.log(`✅ USDA exact match found: ${exactMatch.description}`);

                    const detailResponse = await fetch(
                        `${INTERNATIONAL_ENDPOINTS.usda.baseUrl}${INTERNATIONAL_ENDPOINTS.usda.foodEndpoint}/${exactMatch.fdcId}?api_key=${INTERNATIONAL_ENDPOINTS.usda.apiKey}`,
                        { signal: controller.signal }
                    );

                    if (detailResponse.ok) {
                        const detailData = await detailResponse.json();
                        return {
                            success: true,
                            data: detailData,
                            source: 'usda',
                            searchData: exactMatch
                        };
                    }
                }

                if (data.foods && data.foods.length > 0) {
                    const firstResult = data.foods[0];
                    console.log(`🔍 USDA using best match: ${firstResult.description}`);

                    const detailResponse = await fetch(
                        `${INTERNATIONAL_ENDPOINTS.usda.baseUrl}${INTERNATIONAL_ENDPOINTS.usda.foodEndpoint}/${firstResult.fdcId}?api_key=${INTERNATIONAL_ENDPOINTS.usda.apiKey}`,
                        { signal: controller.signal }
                    );

                    if (detailResponse.ok) {
                        const detailData = await detailResponse.json();
                        return {
                            success: true,
                            data: detailData,
                            source: 'usda',
                            searchData: firstResult,
                            isApproximateMatch: true
                        };
                    }
                }
            }

        } catch (error) {
            console.log(`❌ USDA error on attempt ${attempt + 1}:`, error.message);
        }

        if (attempt < maxRetries - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }

    return { success: false, source: 'usda' };
}

// Enhanced international category mapping
function mapCategoryInternational(categoriesTags, countryContext = null) {
    if (!categoriesTags || !Array.isArray(categoriesTags)) return 'Other';

    // Enhanced category mapping with international variants
    const internationalCategoryMap = {
        // International Baking & Cooking
        'Baking & Cooking Ingredients': [
            'en:baking-ingredients', 'en:cooking-ingredients', 'en:flour', 'en:sugar', 'en:brown-sugar',
            'en:baking-powder', 'en:baking-soda', 'en:yeast', 'en:vanilla-extract', 'en:extracts',
            'en:oils', 'en:cooking-oils', 'en:olive-oil', 'en:vegetable-oil', 'en:vinegar',
            'en:breadcrumbs', 'en:panko', 'en:cornstarch', 'en:lard', 'en:shortening', 'en:honey',
            'en:maple-syrup', 'en:molasses', 'en:cocoa-powder', 'en:chocolate-chips', 'en:food-coloring',
            // UK/EU specific
            'en:caster-sugar', 'en:icing-sugar', 'en:plain-flour', 'en:self-raising-flour', 'en:cornflour',
            'en:bicarbonate-of-soda', 'en:cream-of-tartar', 'en:golden-syrup', 'en:treacle'
        ],

        // International Dairy variants
        'Dairy': [
            'en:dairy', 'en:milk', 'en:yogurt', 'en:butter', 'en:cream', 'en:sour-cream',
            // UK/EU variants
            'en:yoghurt', 'en:double-cream', 'en:single-cream', 'en:clotted-cream', 'en:crème-fraîche',
            'en:fromage-frais', 'en:quark', 'en:skyr'
        ],

        // International Cheese varieties
        'Cheese': [
            'en:cheese', 'en:cheeses', 'en:cheddar', 'en:mozzarella', 'en:parmesan', 'en:cream-cheese',
            // UK/EU specific cheeses
            'en:stilton', 'en:wensleydale', 'en:camembert', 'en:brie', 'en:roquefort', 'en:gouda',
            'en:edam', 'en:gruyere', 'en:emmental', 'en:feta', 'en:halloumi', 'en:mascarpone',
            'en:ricotta', 'en:pecorino', 'en:gorgonzola'
        ],

        // Enhanced Beverages with international variants
        'Beverages': [
            'en:beverages', 'en:drinks', 'en:sodas', 'en:juices', 'en:water', 'en:coffee', 'en:tea', 'en:energy-drinks',
            // UK/International variants
            'en:squash', 'en:cordial', 'en:fizzy-drinks', 'en:soft-drinks', 'en:mineral-water', 'en:sparkling-water',
            'en:herbal-tea', 'en:green-tea', 'en:earl-grey', 'en:builders-tea'
        ],

        // International Meat categories
        'Fresh/Frozen Beef': ['en:beef', 'en:beef-meat', 'en:ground-beef', 'en:steaks', 'en:roasts', 'en:mince', 'en:mincemeat'],
        'Fresh/Frozen Pork': [
            'en:pork', 'en:pork-meat', 'en:bacon', 'en:ham', 'en:sausages', 'en:ground-pork',
            'en:gammon', 'en:pancetta', 'en:prosciutto', 'en:chorizo', 'en:bratwurst'
        ],
        'Fresh/Frozen Poultry': [
            'en:chicken', 'en:poultry', 'en:turkey', 'en:duck', 'en:chicken-meat', 'en:turkey-meat',
            'en:goose', 'en:quail', 'en:pheasant'
        ],

        // UK/EU specific categories
        'Ready Meals': [
            'en:ready-meals', 'en:microwave-meals', 'en:tv-dinners', 'en:convenience-foods',
            'en:prepared-meals', 'en:frozen-meals'
        ],

        'Biscuits & Confectionery': [
            'en:biscuits', 'en:cookies', 'en:crackers', 'en:confectionery', 'en:sweets', 'en:candy',
            'en:chocolate', 'en:digestives', 'en:hobnobs', 'en:custard-creams', 'en:jammy-dodgers'
        ],

        // Enhanced Canned/Preserved with international variants
        'Canned/Jarred Foods': [
            'en:canned-foods', 'en:jarred-foods', 'en:preserves', 'en:pickles', 'en:jams', 'en:marmalade',
            'en:canned-beans', 'en:canned-vegetables', 'en:canned-fruit', 'en:canned-fish',
            'en:baked-beans', 'en:mushy-peas', 'en:tinned-tomatoes'
        ],

        // Add more international-specific categories...
        'Frozen Foods': [
            'en:frozen-foods', 'en:frozen-vegetables', 'en:frozen-fruits', 'en:frozen-meals',
            'en:ice-cream', 'en:frozen-desserts', 'en:frozen-chips', 'en:frozen-peas'
        ]
    };

    // Country-specific adjustments
    if (countryContext) {
        switch (countryContext) {
            case 'United Kingdom':
            case 'Ireland':
                // Prioritize UK-specific terms
                if (categoriesTags.some(tag => tag.includes('biscuit'))) return 'Biscuits & Confectionery';
                if (categoriesTags.some(tag => tag.includes('ready-meal'))) return 'Ready Meals';
                break;
            case 'France':
                // French-specific handling
                if (categoriesTags.some(tag => tag.includes('fromage'))) return 'Cheese';
                break;
            case 'Germany':
                // German-specific handling
                if (categoriesTags.some(tag => tag.includes('wurst'))) return 'Fresh/Frozen Pork';
                break;
        }
    }

    // Standard mapping with priority for international variants
    for (const [ourCategory, tags] of Object.entries(internationalCategoryMap)) {
        if (categoriesTags.some(tag =>
            tags.some(mappedTag => tag.toLowerCase().includes(mappedTag.replace('en:', '')))
        )) {
            return ourCategory;
        }
    }

    return 'Other';
}

// Enhanced product conversion with international support
function convertUSDAToProduct(usdaResult, upc) {
    const { data: usdaFood, searchData, isApproximateMatch } = usdaResult;

    const description = usdaFood.description || searchData?.description || 'Unknown Product';
    const brandOwner = usdaFood.brandOwner || usdaFood.brandName || '';

    let productName = description;
    let brand = brandOwner;

    if (brandOwner && description.toLowerCase().startsWith(brandOwner.toLowerCase())) {
        productName = description.substring(brandOwner.length).trim().replace(/^[,\-\s]+/, '');
    }

    return {
        found: true,
        upc: upc.replace(/\D/g, ''),
        name: productName,
        brand: brand,
        category: mapUSDACategory(usdaFood.foodCategory?.description || usdaFood.brandedFoodCategory),
        ingredients: usdaFood.ingredients || '',
        image: null,
        nutrition: processUSDANutrition(usdaFood),
        scores: {
            nutriscore: null,
            nova_group: null,
            ecoscore: null
        },
        allergens: [],
        packaging: usdaFood.packageWeight ? `${usdaFood.packageWeight}g` : '',
        quantity: usdaFood.servingSize ? `${usdaFood.servingSize} ${usdaFood.servingSizeUnit || ''}`.trim() : '',
        stores: '',
        countries: 'United States',
        labels: [],
        openFoodFactsUrl: `https://world.openfoodfacts.org/product/${upc.replace(/\D/g, '')}`,
        usdaUrl: `https://fdc.nal.usda.gov/fdc-app.html#/food-details/${usdaFood.fdcId}/nutrients`,
        lastModified: usdaFood.modifiedDate || usdaFood.availableDate,
        dataSource: 'USDA FoodData Central',
        fdcId: usdaFood.fdcId,
        isApproximateMatch: isApproximateMatch || false
    };
}

// Enhanced nutrition processing (keeping existing logic)
function processUSDANutrition(usdaFood) {
    const nutrients = {};

    if (usdaFood.foodNutrients) {
        const nutrientMap = {
            'Energy': ['208', '1008'],
            'Protein': ['203'],
            'Total lipid (fat)': ['204'],
            'Carbohydrate, by difference': ['205'],
            'Fiber, total dietary': ['291'],
            'Sugars, total including NLEA': ['269'],
            'Sodium, Na': ['307']
        };

        for (const [nutrientName, nutrientIds] of Object.entries(nutrientMap)) {
            const nutrient = usdaFood.foodNutrients.find(n =>
                nutrientIds.includes(n.nutrient?.number?.toString())
            );

            if (nutrient && nutrient.amount) {
                const key = nutrientName.toLowerCase().includes('energy') ? 'energy_100g' :
                    nutrientName.toLowerCase().includes('protein') ? 'proteins_100g' :
                        nutrientName.toLowerCase().includes('fat') ? 'fat_100g' :
                            nutrientName.toLowerCase().includes('carbohydrate') ? 'carbohydrates_100g' :
                                nutrientName.toLowerCase().includes('fiber') ? 'fiber_100g' :
                                    nutrientName.toLowerCase().includes('sugar') ? 'sugars_100g' :
                                        nutrientName.toLowerCase().includes('sodium') ? 'sodium_100mg' : null;

                if (key) {
                    nutrients[key] = nutrient.amount;
                }
            }
        }
    }

    return nutrients;
}

// Enhanced USDA category mapping (keeping existing)
function mapUSDACategory(usdaCategory) {
    if (!usdaCategory) return 'Other';

    const categoryLower = usdaCategory.toLowerCase();

    const categoryMap = {
        'Dairy': ['dairy', 'milk', 'cheese', 'yogurt', 'butter', 'cream'],
        'Fresh/Frozen Beef': ['beef', 'cattle'],
        'Fresh/Frozen Pork': ['pork', 'swine'],
        'Fresh/Frozen Poultry': ['poultry', 'chicken', 'turkey'],
        'Fresh/Frozen Fish & Seafood': ['fish', 'seafood', 'salmon', 'tuna'],
        'Beverages': ['beverages', 'drinks', 'juice', 'soda', 'water'],
        'Snacks': ['snacks', 'chips', 'crackers', 'cookies'],
        'Grains': ['grains', 'cereal', 'rice', 'bread', 'pasta'],
        'Fresh Vegetables': ['vegetables', 'produce'],
        'Fresh Fruits': ['fruits', 'fruit'],
        'Soups & Soup Mixes': ['soup', 'broth', 'stew'],
        'Condiments': ['condiments', 'sauce', 'dressing'],
        'Canned Meals': ['meals', 'entree', 'dinner'],
        'Frozen Vegetables': ['frozen vegetables'],
        'Frozen Fruit': ['frozen fruit']
    };

    for (const [ourCategory, keywords] of Object.entries(categoryMap)) {
        if (keywords.some(keyword => categoryLower.includes(keyword))) {
            return ourCategory;
        }
    }

    return 'Other';
}

// Enhanced fallback products with international examples
const INTERNATIONAL_FALLBACK_PRODUCTS = {
    // US Products
    '0064144282432': {
        name: 'Campbell\'s Condensed Tomato Soup',
        brand: 'Campbell\'s',
        category: 'Soups & Soup Mixes',
        nutrition: { energy_100g: 67, proteins_100g: 1.8, carbohydrates_100g: 13.3, fat_100g: 0.9, sodium_100mg: 356 },
        dataSource: 'fallback'
    },

    // UK Products (examples)
    '5000169005415': {
        name: 'Heinz Baked Beans',
        brand: 'Heinz',
        category: 'Canned Beans',
        nutrition: { energy_100g: 81, proteins_100g: 4.8, carbohydrates_100g: 13.6, fat_100g: 0.6, sodium_100mg: 430 },
        dataSource: 'fallback',
        region: 'UK'
    },

    '5000169124819': {
        name: 'Walkers Ready Salted Crisps',
        brand: 'Walkers',
        category: 'Snacks',
        nutrition: { energy_100g: 534, proteins_100g: 6.0, carbohydrates_100g: 50.0, fat_100g: 34.0, sodium_100mg: 580 },
        dataSource: 'fallback',
        region: 'UK'
    }
};

export async function GET(request) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            console.log('GET /api/upc - No session found');
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        console.log('GET /api/upc - Session found:', session.user.email, 'source:', session.source);

        await connectDB();

        const user = await User.findById(session.user.id);
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Get user's currency preference for regional optimization
        const userCurrency = user.currencyPreferences?.currency || 'USD';
        console.log(`💰 User currency: ${userCurrency}`);

        const userSubscription = {
            tier: user.getEffectiveTier(),
            status: user.subscription?.status || 'free'
        };

        // Reset monthly counter if needed (keeping existing logic)
        const now = new Date();
        try {
            if (!user.usageTracking ||
                user.usageTracking.currentMonth !== now.getMonth() ||
                user.usageTracking.currentYear !== now.getFullYear()) {

                if (!user.usageTracking) {
                    user.usageTracking = {};
                }

                user.usageTracking.currentMonth = now.getMonth();
                user.usageTracking.currentYear = now.getFullYear();
                user.usageTracking.monthlyUPCScans = 0;
                user.usageTracking.lastUpdated = now;

                await User.updateOne(
                    { _id: user._id },
                    {
                        $set: {
                            'usageTracking.currentMonth': now.getMonth(),
                            'usageTracking.currentYear': now.getFullYear(),
                            'usageTracking.monthlyUPCScans': 0,
                            'usageTracking.lastUpdated': now
                        }
                    },
                    { runValidators: false }
                );
            }
        } catch (trackingError) {
            console.error('Error resetting usage tracking:', trackingError);
        }

        const currentScans = user.usageTracking?.monthlyUPCScans || 0;

        // Check usage limits (keeping existing logic)
        const hasCapacity = checkUsageLimit(userSubscription, FEATURE_GATES.UPC_SCANNING, currentScans);

        if (!hasCapacity) {
            const requiredTier = getRequiredTier(FEATURE_GATES.UPC_SCANNING);
            return NextResponse.json({
                error: getUpgradeMessage(FEATURE_GATES.UPC_SCANNING, requiredTier),
                code: 'USAGE_LIMIT_EXCEEDED',
                feature: FEATURE_GATES.UPC_SCANNING,
                currentCount: currentScans,
                currentTier: userSubscription.tier,
                requiredTier: requiredTier,
                upgradeUrl: `/pricing?source=upc-limit&feature=${FEATURE_GATES.UPC_SCANNING}&required=${requiredTier}`
            }, { status: 403 });
        }

        // Get and validate UPC
        const { searchParams } = new URL(request.url);
        const upc = searchParams.get('upc');

        if (!upc) {
            return NextResponse.json({ error: 'UPC code is required' }, { status: 400 });
        }

        const cleanUpc = upc.replace(/\D/g, '');

        if (cleanUpc.length < 8 || cleanUpc.length > 14) {
            return NextResponse.json({ error: 'Invalid UPC format' }, { status: 400 });
        }

        // Detect barcode format and origin
        const barcodeInfo = detectBarcodeFormat(cleanUpc);
        console.log(`🏷️ Barcode analysis: ${JSON.stringify(barcodeInfo)}`);

        // Track the scan attempt BEFORE making API calls (keeping existing logic)
        let scanTracked = false;
        try {
            const newScanCount = currentScans + 1;
            console.log(`🔄 Incrementing UPC scan count from ${currentScans} to ${newScanCount}`);

            const updateResult = await User.updateOne(
                { _id: user._id },
                {
                    $set: {
                        'usageTracking.monthlyUPCScans': newScanCount,
                        'usageTracking.lastUpdated': now,
                        'usageTracking.currentMonth': now.getMonth(),
                        'usageTracking.currentYear': now.getFullYear()
                    }
                },
                { runValidators: false, upsert: false }
            );

            scanTracked = updateResult.modifiedCount === 1;
        } catch (trackingError) {
            console.error('❌ Error tracking UPC scan:', trackingError);
        }

        console.log(`🔍 Starting international UPC lookup for: ${cleanUpc}`);
        console.log(`🌍 Region context: ${barcodeInfo.country || barcodeInfo.region}, User currency: ${userCurrency}`);

        // Try Open Food Facts first with regional optimization
        const offResult = await fetchFromOpenFoodFacts(cleanUpc, userCurrency);

        if (offResult.success) {
            console.log('✅ Using Open Food Facts data');
            const product = offResult.data.product;
            const productInfo = {
                found: true,
                upc: cleanUpc,
                name: product.product_name || product.product_name_en || 'Unknown Product',
                brand: product.brands || product.brand_owner || '',
                category: mapCategoryInternational(product.categories_tags, barcodeInfo.country),
                ingredients: product.ingredients_text || product.ingredients_text_en || '',
                image: product.image_url || product.image_front_url || '',
                nutrition: {
                    serving_size: product.serving_size || '',
                    energy_100g: product.nutriments?.['energy-kcal_100g'] || product.nutriments?.energy_100g || null,
                    fat_100g: product.nutriments?.fat_100g || null,
                    carbohydrates_100g: product.nutriments?.carbohydrates_100g || null,
                    proteins_100g: product.nutriments?.proteins_100g || null,
                    salt_100g: product.nutriments?.salt_100g || null,
                    sugars_100g: product.nutriments?.sugars_100g || null,
                    fiber_100g: product.nutriments?.fiber_100g || null,
                },
                scores: {
                    nutriscore: product.nutriscore_grade || null,
                    nova_group: product.nova_group || null,
                    ecoscore: product.ecoscore_grade || null,
                },
                allergens: product.allergens_tags || [],
                packaging: product.packaging || '',
                quantity: product.quantity || '',
                openFoodFactsUrl: `https://world.openfoodfacts.org/product/${cleanUpc}`,
                dataSource: 'Open Food Facts',
                apiEndpoint: offResult.endpoint,
                barcodeInfo: offResult.barcodeInfo,
                regionalMatch: offResult.regional,
                // Enhanced international context
                detectedCountry: barcodeInfo.country,
                userCurrency: userCurrency,
                currencySymbol: CURRENCY_SYMBOLS[userCurrency] || '$'
            };

            return NextResponse.json({
                success: true,
                product: productInfo,
                usageIncremented: scanTracked,
                dataSource: 'openfoodfacts',
                internationalContext: {
                    barcodeOrigin: barcodeInfo.country || barcodeInfo.region,
                    userRegion: userCurrency,
                    regionalOptimization: offResult.regional
                },
                remainingScans: userSubscription.tier === 'free' ?
                    Math.max(0, 10 - (currentScans + 1)) : 'Unlimited'
            });
        }

        // Try USDA as backup (primarily for US products)
        if (barcodeInfo.region === 'US' || userCurrency === 'USD') {
            console.log('🇺🇸 Trying USDA for US product...');
            const usdaResult = await fetchFromUSDA(cleanUpc);

            if (usdaResult.success) {
                console.log('✅ Using USDA data');
                const productInfo = convertUSDAToProduct(usdaResult, cleanUpc);

                // Add international context
                productInfo.barcodeInfo = barcodeInfo;
                productInfo.userCurrency = userCurrency;
                productInfo.currencySymbol = CURRENCY_SYMBOLS[userCurrency] || '$';

                return NextResponse.json({
                    success: true,
                    product: productInfo,
                    usageIncremented: scanTracked,
                    dataSource: 'usda',
                    isApproximateMatch: usdaResult.isApproximateMatch,
                    internationalContext: {
                        barcodeOrigin: barcodeInfo.country || barcodeInfo.region,
                        userRegion: userCurrency,
                        note: 'USDA database primarily covers US products'
                    },
                    remainingScans: userSubscription.tier === 'free' ?
                        Math.max(0, 10 - (currentScans + 1)) : 'Unlimited'
                });
            }
        }

        // Try enhanced fallback data with international products
        const fallbackKey = cleanUpc;
        if (INTERNATIONAL_FALLBACK_PRODUCTS[fallbackKey]) {
            console.log('📋 Using enhanced international fallback data');
            const fallbackProduct = {
                ...INTERNATIONAL_FALLBACK_PRODUCTS[fallbackKey],
                found: true,
                upc: cleanUpc,
                openFoodFactsUrl: `https://world.openfoodfacts.org/product/${cleanUpc}`,
                barcodeInfo: barcodeInfo,
                userCurrency: userCurrency,
                currencySymbol: CURRENCY_SYMBOLS[userCurrency] || '$'
            };

            return NextResponse.json({
                success: true,
                product: fallbackProduct,
                usageIncremented: scanTracked,
                dataSource: 'fallback',
                internationalContext: {
                    barcodeOrigin: barcodeInfo.country || barcodeInfo.region,
                    userRegion: userCurrency,
                    fallbackRegion: fallbackProduct.region || 'Global'
                },
                remainingScans: userSubscription.tier === 'free' ?
                    Math.max(0, 10 - (currentScans + 1)) : 'Unlimited'
            });
        }

        // All sources failed - enhanced error message with regional context
        return NextResponse.json({
            success: false,
            found: false,
            message: `Product not found in any database. This ${barcodeInfo.format} barcode appears to be from ${barcodeInfo.country || barcodeInfo.region}.`,
            upc: cleanUpc,
            usageIncremented: scanTracked,
            searchedSources: ['Open Food Facts (International)', 'USDA FoodData Central', 'Enhanced Fallback'],
            barcodeInfo: barcodeInfo,
            internationalContext: {
                barcodeOrigin: barcodeInfo.country || barcodeInfo.region,
                userRegion: userCurrency,
                suggestions: getBarcodeRegionSuggestions(barcodeInfo, userCurrency)
            },
            remainingScans: userSubscription.tier === 'free' ?
                Math.max(0, 10 - (currentScans + 1)) : 'Unlimited'
        }, { status: 404 });

    } catch (error) {
        console.error('❌ Enhanced international UPC lookup error:', error);
        return NextResponse.json({
            success: false,
            error: 'Failed to lookup product information',
            details: error.message
        }, { status: 500 });
    }
}

// Helper function for regional suggestions
function getBarcodeRegionSuggestions(barcodeInfo, userCurrency) {
    const suggestions = [];

    if (barcodeInfo.region !== 'US' && userCurrency === 'USD') {
        suggestions.push('This appears to be a non-US product. Try scanning again or check if the barcode is complete.');
    }

    if (barcodeInfo.region === 'UK' && userCurrency !== 'GBP') {
        suggestions.push('This appears to be a UK product. The item might be available in UK stores.');
    }

    if (barcodeInfo.country && !['US', 'UK', 'Canada', 'Australia'].includes(barcodeInfo.country)) {
        suggestions.push(`This product appears to be from ${barcodeInfo.country}. Coverage may be limited for products from this region.`);
    }

    if (barcodeInfo.format === 'EAN-8') {
        suggestions.push('This is a short EAN-8 barcode. Try the full product barcode if available.');
    }

    if (suggestions.length === 0) {
        suggestions.push('Try adding the product manually or check if the barcode is clearly visible and complete.');
    }

    return suggestions;
}

// Enhanced category mapping function (keeping existing logic but adding international support)
function mapCategory(categoriesTags) {
    return mapCategoryInternational(categoriesTags);
}