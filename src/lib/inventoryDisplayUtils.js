// file: /src/lib/inventoryDisplayUtils.js - v2 (Added "each" unit support)

/**
 * Smart display logic for inventory items with dual units
 * Converts generic units like "item" to more specific names based on the item
 */

// Mapping of item names to their specific unit names
const ITEM_UNIT_MAPPINGS = {
    // Produce items
    'onions': 'onions',
    'onions (yellow)': 'onions',
    'onions (white)': 'onions',
    'onions (red)': 'onions',
    'carrots': 'carrots',
    'potatoes': 'potatoes',
    'potatoes (russet)': 'potatoes',
    'potatoes (red)': 'potatoes',
    'potatoes (yukon)': 'potatoes',
    'tomatoes': 'tomatoes',
    'bananas': 'bananas',
    'apples': 'apples',
    'lemons': 'lemons',
    'limes': 'limes',
    'bell peppers': 'peppers',
    'peppers': 'peppers',

    // Meat items
    'chicken breasts': 'pieces',
    'chicken breast': 'pieces',
    'chicken thighs': 'pieces',
    'chicken thigh': 'pieces',
    'chicken legs': 'pieces',
    'chicken leg': 'pieces',
    'chicken wings': 'pieces',
    'chicken wing': 'pieces',
    'pork chops': 'chops',
    'pork chop': 'chops',
    'beef steaks': 'steaks',
    'beef steak': 'steaks',
    'steak': 'steaks',
    'steaks': 'steaks',
    'hamburger patties': 'hamburger patties',
    'burger patties': 'burger patties',
    'patties': 'patties',

    // Eggs
    'eggs': 'eggs',
    'eggs (large)': 'eggs',
    'eggs (medium)': 'eggs',
    'eggs (extra large)': 'eggs',

    // Bacon and processed meats
    'bacon': 'slices',
    'bacon slices': 'slices',
    'ham slices': 'slices',
    'deli meat': 'slices',
    'lunch meat': 'slices',

    // Canned goods - keep as cans but could be enhanced
    'canned': 'cans',
    'can': 'cans',

    // Packages/boxes
    'pasta': 'boxes',
    'cereal': 'boxes',
    'rice': 'bags',
    'flour': 'bags',
    'sugar': 'bags',
};

/**
 * Get the smart unit name for an item
 * @param {string} itemName - The name of the item
 * @param {string} unit - The current unit (e.g., 'item', 'can', 'package', 'each')
 * @param {number} quantity - The quantity (for pluralization)
 * @returns {string} - The smart unit name
 */
export function getSmartUnitName(itemName, unit, quantity = 1) {
    // Handle "each" unit - keep it as is since it's explicit
    if (unit === 'each') {
        return quantity === 1 ? 'each' : 'each';
    }

    // Handle explicit units - if user chose package, can, etc., respect their choice
    if (unit === 'package') {
        return quantity === 1 ? 'package' : 'packages';
    }

    if (unit === 'can') {
        return quantity === 1 ? 'can' : 'cans';
    }

    if (unit === 'box') {
        return quantity === 1 ? 'box' : 'boxes';
    }

    if (unit === 'bag') {
        return quantity === 1 ? 'bag' : 'bags';
    }

    if (unit === 'bottle') {
        return quantity === 1 ? 'bottle' : 'bottles';
    }

    if (unit === 'jar') {
        return quantity === 1 ? 'jar' : 'jars';
    }

    // If it's not a generic unit, return as-is
    if (unit !== 'item') {
        return unit;
    }

    // Only do smart mapping for the generic "item" unit
    const lowerItemName = itemName.toLowerCase();

    // Check for exact matches first
    if (ITEM_UNIT_MAPPINGS[lowerItemName]) {
        const smartUnit = ITEM_UNIT_MAPPINGS[lowerItemName];
        return quantity === 1 ? smartUnit.slice(0, -1) : smartUnit; // Handle singular/plural
    }

    // Check for partial matches
    for (const [key, value] of Object.entries(ITEM_UNIT_MAPPINGS)) {
        if (lowerItemName.includes(key) || key.includes(lowerItemName)) {
            const smartUnit = value;
            return quantity === 1 ? smartUnit.slice(0, -1) : smartUnit;
        }
    }

    // Check for common patterns - only for "item" unit
    if (lowerItemName.includes('chicken')) {
        return quantity === 1 ? 'piece' : 'pieces';
    }

    if (lowerItemName.includes('egg')) {
        return quantity === 1 ? 'egg' : 'eggs';
    }

    // Default fallback for "item" unit
    return unit;
}

/**
 * Format the display text for an inventory item with dual units
 * @param {Object} item - The inventory item
 * @returns {string} - Formatted display text
 */
export function formatInventoryDisplayText(item) {
    const primaryQty = parseFloat(item.quantity) || 0;
    const secondaryQty = parseFloat(item.secondaryQuantity) || 0;

    // If only primary quantity exists
    if (primaryQty > 0 && secondaryQty === 0) {
        const smartUnit = getSmartUnitName(item.name, item.unit, primaryQty);
        return `${primaryQty} ${smartUnit}`;
    }

    // If only secondary quantity exists
    if (primaryQty === 0 && secondaryQty > 0) {
        const smartUnit = getSmartUnitName(item.name, item.secondaryUnit, secondaryQty);
        return `${secondaryQty} ${smartUnit}`;
    }

    // If both quantities exist - ENHANCED: Better "each" handling
    if (primaryQty > 0 && secondaryQty > 0) {
        const primarySmartUnit = getSmartUnitName(item.name, item.unit, primaryQty);
        const secondarySmartUnit = getSmartUnitName(item.name, item.secondaryUnit, secondaryQty);

        // Check if secondary unit is "each" - this indicates per-unit measurement
        if (item.secondaryUnit === 'each') {
            return `${primaryQty} ${primarySmartUnit} (${secondaryQty} ${getItemSpecificUnit(item.name)} each)`;
        }

        // Check if it's likely a per-unit measurement (cans + weight, packages + weight, etc.)
        const isPerUnitMeasurement = isLikelyPerUnitMeasurement(item.unit, item.secondaryUnit);

        if (isPerUnitMeasurement) {
            return `${primaryQty} ${primarySmartUnit} (${secondaryQty} ${secondarySmartUnit} each)`;
        } else {
            return `${primaryQty} ${primarySmartUnit} (${secondaryQty} ${secondarySmartUnit})`;
        }
    }

    // Fallback if no quantities
    return `${item.quantity || 0} ${item.unit}`;
}

/**
 * Get the specific unit name for an item when using "each"
 * @param {string} itemName - The name of the item
 * @returns {string} - The specific unit name for the item
 */
function getItemSpecificUnit(itemName) {
    const lowerItemName = itemName.toLowerCase();

    // Bacon-related items
    if (lowerItemName.includes('bacon')) {
        return 'slices';
    }

    // Hamburger patties
    if (lowerItemName.includes('hamburger') || lowerItemName.includes('burger') || lowerItemName.includes('patties')) {
        return 'patties';
    }

    // Hot dogs / sausages
    if (lowerItemName.includes('hot dog') || lowerItemName.includes('hotdog') || lowerItemName.includes('sausage')) {
        return 'pieces';
    }

    // Chicken pieces
    if (lowerItemName.includes('chicken')) {
        if (lowerItemName.includes('breast')) return 'breasts';
        if (lowerItemName.includes('thigh')) return 'thighs';
        if (lowerItemName.includes('wing')) return 'wings';
        if (lowerItemName.includes('leg')) return 'legs';
        return 'pieces';
    }

    // Fish fillets
    if (lowerItemName.includes('fillet') || lowerItemName.includes('fish')) {
        return 'fillets';
    }

    // Steaks and chops
    if (lowerItemName.includes('steak')) {
        return 'steaks';
    }
    if (lowerItemName.includes('chop')) {
        return 'chops';
    }

    // Eggs
    if (lowerItemName.includes('egg')) {
        return 'eggs';
    }

    // Bread slices
    if (lowerItemName.includes('bread') || lowerItemName.includes('toast')) {
        return 'slices';
    }

    // Tortillas
    if (lowerItemName.includes('tortilla')) {
        return 'tortillas';
    }

    // Cookies, crackers
    if (lowerItemName.includes('cookie') || lowerItemName.includes('cracker')) {
        return 'pieces';
    }

    // Cheese slices
    if (lowerItemName.includes('cheese slice') || lowerItemName.includes('american cheese')) {
        return 'slices';
    }

    // Default fallback
    return 'items';
}

/**
 * Check if the unit combination suggests a per-unit measurement
 * @param {string} primaryUnit - The primary unit (e.g., 'can', 'package', 'item')
 * @param {string} secondaryUnit - The secondary unit (e.g., 'oz', 'g', 'ml', 'each')
 * @returns {boolean} - True if it's likely a per-unit measurement
 */
function isLikelyPerUnitMeasurement(primaryUnit, secondaryUnit) {
    // If secondary unit is "each", it's definitely per-unit
    if (secondaryUnit === 'each') {
        return true;
    }

    // Count units paired with weight/volume units = per-unit measurement
    const countUnits = ['can', 'package', 'item', 'box', 'bag', 'bottle', 'jar'];
    const measurementUnits = ['oz', 'g', 'kg', 'lbs', 'ml', 'l'];

    const isPrimaryCount = countUnits.includes(primaryUnit?.toLowerCase());
    const isSecondaryMeasurement = measurementUnits.includes(secondaryUnit?.toLowerCase());

    return isPrimaryCount && isSecondaryMeasurement;
}

/**
 * Get the primary display text (main quantity)
 * @param {Object} item - The inventory item
 * @returns {string} - Primary display text
 */
export function getPrimaryDisplayText(item) {
    const primaryQty = parseFloat(item.quantity) || 0;
    const secondaryQty = parseFloat(item.secondaryQuantity) || 0;

    // If primary quantity exists, use it
    if (primaryQty > 0) {
        const smartUnit = getSmartUnitName(item.name, item.unit, primaryQty);
        return `${primaryQty} ${smartUnit}`;
    }

    // If only secondary quantity exists, use it as primary
    if (secondaryQty > 0) {
        const smartUnit = getSmartUnitName(item.name, item.secondaryUnit, secondaryQty);
        return `${secondaryQty} ${smartUnit}`;
    }

    // Fallback
    return `${item.quantity || 0} ${item.unit}`;
}

/**
 * Get the secondary display text (alternative quantity)
 * @param {Object} item - The inventory item
 * @returns {string|null} - Secondary display text or null if not applicable
 */
export function getSecondaryDisplayText(item) {
    const primaryQty = parseFloat(item.quantity) || 0;
    const secondaryQty = parseFloat(item.secondaryQuantity) || 0;

    // Only show secondary if both exist
    if (primaryQty > 0 && secondaryQty > 0) {
        if (item.secondaryUnit === 'each') {
            return `${secondaryQty} ${getItemSpecificUnit(item.name)} each`;
        } else {
            const smartUnit = getSmartUnitName(item.name, item.secondaryUnit, secondaryQty);
            return `${secondaryQty} ${smartUnit}`;
        }
    }

    return null;
}

/**
 * Check if an item has dual units
 * @param {Object} item - The inventory item
 * @returns {boolean} - True if item has dual units
 */
export function hasDualUnits(item) {
    const primaryQty = parseFloat(item.quantity) || 0;
    const secondaryQty = parseFloat(item.secondaryQuantity) || 0;
    return primaryQty > 0 && secondaryQty > 0;
}

/**
 * Get a short display text for mobile/compact views
 * @param {Object} item - The inventory item
 * @returns {string} - Short display text
 */
export function getShortDisplayText(item) {
    const primaryQty = parseFloat(item.quantity) || 0;
    const secondaryQty = parseFloat(item.secondaryQuantity) || 0;

    // For mobile, just show the most relevant quantity
    if (primaryQty > 0) {
        const smartUnit = getSmartUnitName(item.name, item.unit, primaryQty);
        return `${primaryQty} ${smartUnit}`;
    }

    if (secondaryQty > 0) {
        const smartUnit = getSmartUnitName(item.name, item.secondaryUnit, secondaryQty);
        return `${secondaryQty} ${smartUnit}`;
    }

    return `${item.quantity || 0} ${item.unit}`;
}