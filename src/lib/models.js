// file: /src/lib/models.js - v14 - ENHANCED with image support for recipes

import mongoose from 'mongoose';
import { checkFeatureAccess, checkUsageLimit } from './subscription-config';
import crypto from 'crypto';

const NutritionSchema = new mongoose.Schema({
    // === MACRONUTRIENTS ===
    calories: {
        value: {type: Number, default: 0},
        unit: {type: String, default: 'kcal'},
        name: {type: String, default: 'Energy'}
    },
    protein: {
        value: {type: Number, default: 0},
        unit: {type: String, default: 'g'},
        name: {type: String, default: 'Protein'}
    },

    // === FATS ===
    fat: {
        value: {type: Number, default: 0},
        unit: {type: String, default: 'g'},
        name: {type: String, default: 'Total Fat'}
    },
    saturatedFat: {
        value: {type: Number, default: 0},
        unit: {type: String, default: 'g'},
        name: {type: String, default: 'Saturated Fat'}
    },
    monounsaturatedFat: {
        value: {type: Number, default: 0},
        unit: {type: String, default: 'g'},
        name: {type: String, default: 'Monounsaturated Fat'}
    },
    polyunsaturatedFat: {
        value: {type: Number, default: 0},
        unit: {type: String, default: 'g'},
        name: {type: String, default: 'Polyunsaturated Fat'}
    },
    transFat: {
        value: {type: Number, default: 0},
        unit: {type: String, default: 'g'},
        name: {type: String, default: 'Trans Fat'}
    },
    cholesterol: {
        value: {type: Number, default: 0},
        unit: {type: String, default: 'mg'},
        name: {type: String, default: 'Cholesterol'}
    },

    // === CARBOHYDRATES ===
    carbs: {
        value: {type: Number, default: 0},
        unit: {type: String, default: 'g'},
        name: {type: String, default: 'Total Carbohydrate'}
    },
    fiber: {
        value: {type: Number, default: 0},
        unit: {type: String, default: 'g'},
        name: {type: String, default: 'Dietary Fiber'}
    },
    sugars: {
        value: {type: Number, default: 0},
        unit: {type: String, default: 'g'},
        name: {type: String, default: 'Total Sugars'}
    },
    addedSugars: {
        value: {type: Number, default: 0},
        unit: {type: String, default: 'g'},
        name: {type: String, default: 'Added Sugars'}
    },

    // === MINERALS ===
    sodium: {
        value: {type: Number, default: 0},
        unit: {type: String, default: 'mg'},
        name: {type: String, default: 'Sodium'}
    },
    potassium: {
        value: {type: Number, default: 0},
        unit: {type: String, default: 'mg'},
        name: {type: String, default: 'Potassium'}
    },
    calcium: {
        value: {type: Number, default: 0},
        unit: {type: String, default: 'mg'},
        name: {type: String, default: 'Calcium'}
    },
    iron: {
        value: {type: Number, default: 0},
        unit: {type: String, default: 'mg'},
        name: {type: String, default: 'Iron'}
    },
    magnesium: {
        value: {type: Number, default: 0},
        unit: {type: String, default: 'mg'},
        name: {type: String, default: 'Magnesium'}
    },
    phosphorus: {
        value: {type: Number, default: 0},
        unit: {type: String, default: 'mg'},
        name: {type: String, default: 'Phosphorus'}
    },
    zinc: {
        value: {type: Number, default: 0},
        unit: {type: String, default: 'mg'},
        name: {type: String, default: 'Zinc'}
    },

    // === VITAMINS ===
    // Fat-soluble vitamins
    vitaminA: {
        value: {type: Number, default: 0},
        unit: {type: String, default: 'µg'}, // Changed from IU to µg (RAE)
        name: {type: String, default: 'Vitamin A (RAE)'}
    },
    vitaminD: {
        value: {type: Number, default: 0},
        unit: {type: String, default: 'µg'},
        name: {type: String, default: 'Vitamin D'}
    },
    vitaminE: {
        value: {type: Number, default: 0},
        unit: {type: String, default: 'mg'},
        name: {type: String, default: 'Vitamin E'}
    },
    vitaminK: {
        value: {type: Number, default: 0},
        unit: {type: String, default: 'µg'},
        name: {type: String, default: 'Vitamin K'}
    },

    // Water-soluble vitamins
    vitaminC: {
        value: {type: Number, default: 0},
        unit: {type: String, default: 'mg'},
        name: {type: String, default: 'Vitamin C'}
    },

    // B-Complex Vitamins
    thiamin: { // B1
        value: {type: Number, default: 0},
        unit: {type: String, default: 'mg'},
        name: {type: String, default: 'Thiamin (B1)'}
    },
    riboflavin: { // B2
        value: {type: Number, default: 0},
        unit: {type: String, default: 'mg'},
        name: {type: String, default: 'Riboflavin (B2)'}
    },
    niacin: { // B3
        value: {type: Number, default: 0},
        unit: {type: String, default: 'mg'},
        name: {type: String, default: 'Niacin (B3)'}
    },
    vitaminB6: {
        value: {type: Number, default: 0},
        unit: {type: String, default: 'mg'},
        name: {type: String, default: 'Vitamin B6'}
    },
    folate: { // B9
        value: {type: Number, default: 0},
        unit: {type: String, default: 'µg'},
        name: {type: String, default: 'Folate (B9)'}
    },
    vitaminB12: {
        value: {type: Number, default: 0},
        unit: {type: String, default: 'µg'},
        name: {type: String, default: 'Vitamin B12'}
    },
    biotin: { // B7
        value: {type: Number, default: 0},
        unit: {type: String, default: 'µg'},
        name: {type: String, default: 'Biotin (B7)'}
    },
    pantothenicAcid: { // B5
        value: {type: Number, default: 0},
        unit: {type: String, default: 'mg'},
        name: {type: String, default: 'Pantothenic Acid (B5)'}
    },

    // === ADDITIONAL NUTRIENTS ===
    choline: {
        value: {type: Number, default: 0},
        unit: {type: String, default: 'mg'},
        name: {type: String, default: 'Choline'}
    },

    // === METADATA ===
    // Calculation metadata
    calculationMethod: {
        type: String,
        enum: ['ai_calculated', 'usda_lookup', 'manual_entry', 'openfoodfacts', 'estimated'],
        default: 'estimated'
    },
    dataSource: {
        type: String,
        default: 'mixed' // 'usda', 'openfoodfacts', 'ai_analysis', 'manual', 'mixed'
    },
    calculatedAt: {
        type: Date,
        default: Date.now
    },
    confidence: {
        type: Number,
        min: 0,
        max: 1,
        default: 0.5 // 0 = very uncertain, 1 = very confident
    },
    coverage: {
        type: Number,
        min: 0,
        max: 1,
        default: 0 // Percentage of ingredients with nutrition data
    },

    // AI-specific metadata
    aiAnalysis: {
        modelUsed: String, // 'gpt-4', 'gpt-3.5-turbo', etc.
        promptVersion: String,
        processingTime: Number, // milliseconds
        tokensUsed: Number,
        cost: Number, // USD cost of the analysis
        warnings: [String] // Any warnings from the AI analysis
    }
}, {_id: false});

// NEW: Extracted image schema for video imports
const ExtractedImageSchema = new mongoose.Schema({
    data: { type: String, required: true }, // Base64 image data
    extractionMethod: { type: String, required: true }, // 'video_frame_analysis', 'ai_selection', etc.
    frameCount: { type: Number, default: 0 }, // Number of frames analyzed
    source: { type: String, required: true }, // Platform: 'tiktok', 'instagram', 'facebook'
    extractedAt: { type: Date, default: Date.now },
    confidence: { type: Number, min: 0, max: 1 }, // AI confidence in image selection
    metadata: {
        originalFrameIndex: Number,
        videoTimestamp: Number,
        imageQuality: String,
        processingTime: Number
    }
}, { _id: false });

// Recipe Ingredient Schema - Enhanced with nutrition and video metadata
const RecipeIngredientSchema = new mongoose.Schema({
    name: {type: String, required: true},
    amount: {type: mongoose.Schema.Types.Mixed}, // Updated to Mixed for flexible types
    unit: String,
    category: String,
    alternatives: [String],
    optional: {type: Boolean, default: false},
    // NEW: Video timestamp support
    videoTimestamp: { type: Number },
    videoLink: { type: String },
    // Nutrition data for this ingredient
    fdcId: String, // USDA Food Data Central ID
    nutrition: NutritionSchema
}, { _id: false });

// Enhanced Video Metadata Schema
const VideoMetadataSchema = new mongoose.Schema({
    videoSource: String,
    videoPlatform: String,
    videoId: String,
    videoTitle: String,
    videoDuration: Number,
    extractionMethod: String,
    importedFrom: String,
    socialMediaOptimized: { type: Boolean, default: false },
    transcriptLength: Number,
    processingTime: String,
    hasExtractedImageFlag: { type: Boolean, default: false }, // NEW: Flag for image presence
    // NEW: Image extraction metadata
    imageExtractionMetadata: {
        framesAnalyzed: Number,
        aiModelUsed: String,
        selectionCriteria: [String],
        processingCost: Number
    }
}, { _id: false });


const RecipePhotoSchema = new mongoose.Schema({
    recipeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Recipe',
        required: true,
        index: true
    },
    filename: {
        type: String,
        required: true
    },
    originalName: String,
    mimeType: {
        type: String,
        required: true,
        enum: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    },
    size: {
        type: Number,
        required: true,
        max: 5242880 // 5MB limit
    },
    data: {
        type: Buffer,
        required: true
    },
    isPrimary: {
        type: Boolean,
        default: false
    },
    source: {
        type: String,
        enum: ['user_upload', 'video_extracted'], // SIMPLIFIED: Only 2 sources
        default: 'user_upload'
    },
    // Video extraction metadata (for social media imports)
    videoExtractionData: {
        platform: { type: String, enum: ['tiktok', 'instagram', 'facebook'] },
        videoUrl: String,
        frameTimestamp: Number,
        extractionMethod: String,
        confidence: { type: Number, min: 0, max: 1 },
        aiModelUsed: String
    },
    uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    uploadedAt: {
        type: Date,
        default: Date.now
    }
});

// Indexes for efficient queries
RecipePhotoSchema.index({ recipeId: 1, isPrimary: 1 });
RecipePhotoSchema.index({ uploadedBy: 1 });
RecipePhotoSchema.index({ source: 1 });
RecipePhotoSchema.index({ 'aiAnalysis.foodRelevanceScore': -1 });

// Virtual for photo URL
RecipePhotoSchema.virtual('url').get(function() {
    return `/api/recipes/photos/${this._id}`;
});

// Method to get optimized photo data
RecipePhotoSchema.methods.getOptimizedData = function(maxWidth = 800) {
    // This would be used with image processing libraries like sharp
    // For now, return original data
    return this.data;
};

// Static method to get primary photo for recipe
RecipePhotoSchema.statics.getPrimaryPhoto = async function(recipeId) {
    return this.findOne({ recipeId, isPrimary: true });
};

// Static method to get all photos for recipe
RecipePhotoSchema.statics.getRecipePhotos = async function(recipeId) {
    return this.find({ recipeId }).sort({ isPrimary: -1, uploadedAt: -1 });
};


// NEW: Recipe Collection Schema - MISSING MODEL ADDED
const RecipeCollectionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },
    description: {
        type: String,
        maxlength: 500,
        trim: true,
        default: ''
    },

    // Array of recipes in this collection
    recipes: [{
        recipeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Recipe',
            required: true
        },
        addedAt: {
            type: Date,
            default: Date.now
        },
        notes: {
            type: String,
            maxlength: 200
        }
    }],

    // Collection settings
    isPublic: {
        type: Boolean,
        default: false
    },
    color: {
        type: String,
        default: '#3b82f6' // Default blue color for UI
    },
    tags: [String], // User-defined tags for organization

    // Statistics (cached for performance)
    stats: {
        recipeCount: {type: Number, default: 0},
        averageDifficulty: {type: String, default: 'medium'},
        totalCookTime: {type: Number, default: 0}, // Total minutes for all recipes
        categories: [String] // Most common categories in this collection
    },

    // Usage tracking
    usage: {
        timesViewed: {type: Number, default: 0},
        lastViewed: Date,
        lastModified: Date,
        recipesAdded: {type: Number, default: 0},
        recipesRemoved: {type: Number, default: 0}
    },

    // Sharing and collaboration
    sharedWith: [{
        email: String,
        name: String,
        permissions: {
            type: String,
            enum: ['view', 'edit'],
            default: 'view'
        },
        sharedAt: {type: Date, default: Date.now}
    }],

    createdAt: {type: Date, default: Date.now},
    updatedAt: {type: Date, default: Date.now}
});

// Pre-save middleware to update stats and timestamps
RecipeCollectionSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    this.usage.lastModified = new Date();

    // Update recipe count
    this.stats.recipeCount = this.recipes.length;

    next();
});

// Methods for RecipeCollection
RecipeCollectionSchema.methods.addRecipe = function(recipeId, notes = '') {
    // Check if recipe already exists
    const existingRecipe = this.recipes.find(r => r.recipeId.toString() === recipeId.toString());

    if (!existingRecipe) {
        this.recipes.push({
            recipeId: recipeId,
            addedAt: new Date(),
            notes: notes
        });
        this.usage.recipesAdded += 1;
        return true;
    }

    return false; // Recipe already exists
};

RecipeCollectionSchema.methods.removeRecipe = function(recipeId) {
    const initialLength = this.recipes.length;
    this.recipes = this.recipes.filter(r => r.recipeId.toString() !== recipeId.toString());

    if (this.recipes.length < initialLength) {
        this.usage.recipesRemoved += 1;
        return true;
    }

    return false; // Recipe not found
};

RecipeCollectionSchema.methods.recordView = function() {
    this.usage.timesViewed += 1;
    this.usage.lastViewed = new Date();
    return this.save();
};

// Indexes for RecipeCollection
RecipeCollectionSchema.index({userId: 1, name: 1}, {unique: true}); // Users can't have duplicate collection names
RecipeCollectionSchema.index({userId: 1, createdAt: -1});
RecipeCollectionSchema.index({isPublic: 1, createdAt: -1});
RecipeCollectionSchema.index({'recipes.recipeId': 1});
RecipeCollectionSchema.index({tags: 1});
RecipeCollectionSchema.index({'usage.lastViewed': -1});

// Curated Meal Component Schema
const CuratedMealComponentSchema = new mongoose.Schema({
    itemName: {
        type: String,
        required: true,
        trim: true
    },
    category: {
        type: String,
        enum: ['protein', 'starch', 'vegetable', 'sauce', 'dairy', 'fruit', 'condiment'],
        required: true
    },
    required: {
        type: Boolean,
        default: true
    },
    alternatives: [String], // Alternative ingredient names
    notes: {
        type: String,
        maxlength: 100
    }
}, {_id: false});

// Curated Meal Schema - Manual meal database for suggestions
const CuratedMealSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },
    description: {
        type: String,
        required: true,
        trim: true,
        maxlength: 300
    },

    // Meal components (ingredients/items needed)
    components: [CuratedMealComponentSchema],

    // Meal metadata
    tags: [String], // e.g., ["comfort-food", "dinner", "family-friendly"]
    estimatedTime: {
        type: Number,
        required: true,
        min: 5,
        max: 300 // 5 hours max
    },
    difficulty: {
        type: String,
        enum: ['easy', 'medium', 'hard'],
        default: 'easy'
    },
    servings: {
        type: Number,
        default: 4,
        min: 1,
        max: 20
    },

    // Meal type/category
    mealType: {
        type: String,
        enum: ['breakfast', 'lunch', 'dinner', 'snack', 'dessert', 'any'],
        default: 'dinner'
    },
    season: {
        type: String,
        enum: ['spring', 'summer', 'fall', 'winter', 'any'],
        default: 'any'
    },

    // User and approval system
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    submittedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User' // Different from createdBy for user submissions
    },

    // Approval workflow
    isApproved: {
        type: Boolean,
        default: false
    },
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    approvedAt: Date,

    // Admin vs user submission
    submissionType: {
        type: String,
        enum: ['admin', 'user'],
        default: 'admin'
    },

    // Status for user submissions
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    rejectionReason: String,

    // Usage statistics
    usageStats: {
        timesSuggested: {type: Number, default: 0},
        timesUsed: {type: Number, default: 0},
        lastSuggested: Date,
        userRating: {type: Number, default: 0, min: 0, max: 5},
        ratingCount: {type: Number, default: 0}
    },

    // Quick cooking tips
    cookingTips: [String],

    // Nutritional category (optional)
    nutritionTags: [String], // ["high-protein", "low-carb", "heart-healthy"]

    // Original source (if from cookbook, etc.)
    source: String,

    createdAt: {type: Date, default: Date.now},
    updatedAt: {type: Date, default: Date.now}
});

// MOVED: Define UserMealPlanningPreferencesSchema BEFORE UserSchema
const UserMealPlanningPreferencesSchema = new mongoose.Schema({
    weekStartDay: {
        type: String,
        enum: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
        default: 'monday'
    },
    // UPDATED: New expanded meal types
    defaultMealTypes: {
        type: [String],
        enum: ['Breakfast', 'AM Snack', 'Lunch', 'Afternoon Snack', 'Dinner', 'PM Snack'],
        default: ['Breakfast', 'AM Snack', 'Lunch', 'Afternoon Snack', 'Dinner', 'PM Snack']
    },
    planningHorizon: {
        type: String,
        enum: ['week', '2weeks', 'month'],
        default: 'week'
    },
    shoppingDay: {
        type: String,
        enum: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
        default: 'sunday'
    },
    mealPrepDays: {
        type: [String],
        enum: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
        default: ['sunday']
    },
    dietaryRestrictions: [String],
    avoidIngredients: [String],
    preferredCuisines: [String],
    cookingTimePreference: {
        type: String,
        enum: ['quick', 'moderate', 'any'],
        default: 'any'
    }
}, {_id: false});

// Notification Settings Schema
const NotificationSettingsSchema = new mongoose.Schema({
    email: {
        enabled: {type: Boolean, default: false},
        dailyDigest: {type: Boolean, default: false},
        expirationAlerts: {type: Boolean, default: true},
        daysBeforeExpiration: {type: Number, default: 3, min: 1, max: 30}
    },
    dashboard: {
        showExpirationPanel: {type: Boolean, default: true},
        showQuickStats: {type: Boolean, default: true},
        alertThreshold: {type: Number, default: 7, min: 1, max: 30}
    },
    mobile: {
        pushNotifications: {type: Boolean, default: false},
        soundEnabled: {type: Boolean, default: true}
    }
}, {_id: false});

// User Schema - Updated with Legal Acceptance Fields
const UserSchema = new mongoose.Schema({
    name: {type: String, required: true},
    email: {type: String, required: true, unique: true},
    password: {type: String, required: true},
    isAdmin: {
        type: Boolean,
        default: false,
        select: false // Don't include in regular queries for security
    },
    avatar: {
        type: String,
        default: '',
        maxlength: 100 // URL length limit
    },
    disablePWABanner: {
        type: Boolean,
        default: false
    },
    legalAcceptance: {
        termsAccepted: {
            type: Boolean,
            required: true,
            default: false
        },
        privacyAccepted: {
            type: Boolean,
            required: true,
            default: false
        },
        acceptanceDate: {
            type: Date,
            required: true
        },
        ipAddress: {
            type: String,
            required: false
        },
        userAgent: {
            type: String,
            required: false
        },

        // NEW: International compliance fields
        country: {
            type: String,
            required: true,
            maxlength: 50
        },
        isEUUser: {
            type: Boolean,
            default: false
        },
        gdprApplies: {
            type: Boolean,
            default: false
        },

        // GDPR-specific consents
        acceptedDataProcessing: {
            type: Boolean,
            default: null // null = not applicable, true/false = explicit consent
        },
        acceptedVoiceProcessing: {
            type: Boolean,
            default: false
        },
        acceptedInternationalTransfers: {
            type: Boolean,
            default: false
        },

        // Minor protection fields
        isMinor: {
            type: Boolean,
            default: false
        },
        parentEmail: {
            type: String,
            default: null,
            lowercase: true
        },
        acceptedMinorConsent: {
            type: Boolean,
            default: null
        },
        parentVerificationRequired: {
            type: Boolean,
            default: false
        },
        parentVerificationToken: {
            type: String,
            select: false
        },
        parentVerificationExpires: {
            type: Date,
            select: false
        },
        parentVerificationCompleted: {
            type: Boolean,
            default: false
        },
        parentVerificationCompletedAt: {
            type: Date,
            default: null
        },

        // Legal document versions at time of acceptance
        termsVersion: {
            type: String,
            default: '3.0'
        },
        privacyVersion: {
            type: String,
            default: '2.0'
        },

        // Consent metadata
        consentMethod: {
            type: String,
            enum: ['explicit-web-form', 'explicit-api', 'implied', 'updated'],
            default: 'explicit-web-form'
        },
        consentContext: {
            type: String,
            enum: ['account-registration', 'policy-update', 'feature-opt-in', 'admin-update'],
            default: 'account-registration'
        },
        consentWithdrawn: {
            type: Boolean,
            default: false
        },
        consentWithdrawnDate: {
            type: Date,
            default: null
        },
        consentWithdrawnMethod: {
            type: String,
            enum: ['user-request', 'admin-action', 'automated', 'parental-request'],
            default: null
        },

        // Consent history for audit trails
        consentHistory: [{
            action: {
                type: String,
                enum: ['granted', 'withdrawn', 'updated', 'renewed'],
                required: true
            },
            date: {
                type: Date,
                default: Date.now
            },
            method: {
                type: String,
                enum: ['web-form', 'api', 'email', 'admin'],
                required: true
            },
            ipAddress: String,
            userAgent: String,
            termsVersion: String,
            privacyVersion: String,
            details: String, // Additional context
            dataProcessing: Boolean,
            voiceProcessing: Boolean,
            internationalTransfers: Boolean
        }]
    },

    // UPDATE your existing legalVersion field with this enhanced version:
    legalVersion: {
        termsVersion: {
            type: String,
            default: '3.0' // Updated with international compliance
        },
        privacyVersion: {
            type: String,
            default: '2.0' // Updated with GDPR compliance
        },
        lastUpdatedNotification: {
            type: Date,
            default: null
        },
        requiresNewConsent: {
            type: Boolean,
            default: false
        }
    },

    // NEW: GDPR Rights Exercise Tracking
    gdprRights: {
        exercisedRights: [{
            rightType: {
                type: String,
                enum: ['access', 'rectification', 'erasure', 'restrict', 'portability', 'object', 'withdraw-consent'],
                required: true
            },
            requestDate: {
                type: Date,
                default: Date.now
            },
            completedDate: {
                type: Date,
                default: null
            },
            status: {
                type: String,
                enum: ['pending', 'in-progress', 'completed', 'denied', 'not-applicable'],
                default: 'pending'
            },
            requestMethod: {
                type: String,
                enum: ['email', 'web-form', 'support-ticket', 'phone'],
                required: true
            },
            notes: String,
            handledBy: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User'
            }
        }],

        dataPortabilityRequests: [{
            requestDate: {
                type: Date,
                default: Date.now
            },
            format: {
                type: String,
                enum: ['json', 'csv', 'xml'],
                default: 'json'
            },
            downloadUrl: String,
            expiresAt: Date,
            downloaded: {
                type: Boolean,
                default: false
            },
            downloadedAt: Date
        }],

        erasureRequests: [{
            requestDate: {
                type: Date,
                default: Date.now
            },
            reason: {
                type: String,
                enum: ['no-longer-necessary', 'withdraw-consent', 'unlawful-processing', 'legal-obligation', 'other'],
                required: true
            },
            completedDate: Date,
            dataRetained: String, // Description of any data that must be retained for legal reasons
            retentionReason: String
        }]
    },
    // NEW: Feature-specific consents (can be updated independently)
    featureConsents: {
        voiceInput: {
            consented: {
                type: Boolean,
                default: false
            },
            consentDate: {
                type: Date,
                default: null
            },
            withdrawnDate: {
                type: Date,
                default: null
            },
            lastUsed: {
                type: Date,
                default: null
            }
        },

        internationalFeatures: {
            consented: {
                type: Boolean,
                default: false
            },
            consentDate: {
                type: Date,
                default: null
            },
            withdrawnDate: {
                type: Date,
                default: null
            },
            lastUsed: {
                type: Date,
                default: null
            }
        },

        priceTracking: {
            consented: {
                type: Boolean,
                default: false
            },
            consentDate: {
                type: Date,
                default: null
            },
            withdrawnDate: {
                type: Date,
                default: null
            },
            lastUsed: {
                type: Date,
                default: null
            }
        },

        analytics: {
            consented: {
                type: Boolean,
                default: false
            },
            consentDate: {
                type: Date,
                default: null
            },
            withdrawnDate: {
                type: Date,
                default: null
            }
        },

        marketing: {
            consented: {
                type: Boolean,
                default: false
            },
            consentDate: {
                type: Date,
                default: null
            },
            withdrawnDate: {
                type: Date,
                default: null
            }
        }
    },

    // NEW: Data retention and deletion tracking
    dataRetention: {
        accountCreatedAt: {
            type: Date,
            default: Date.now
        },
        lastActiveAt: {
            type: Date,
            default: Date.now
        },
        scheduledDeletionDate: {
            type: Date,
            default: null
        },
        deletionReason: {
            type: String,
            enum: ['user-request', 'gdpr-erasure', 'account-closure', 'inactivity', 'legal-requirement'],
            default: null
        },
        deletionRequestDate: {
            type: Date,
            default: null
        },
        deletionCompletedDate: {
            type: Date,
            default: null
        },
        retentionCategory: {
            type: String,
            enum: ['active', 'inactive', 'pending-deletion', 'legal-hold'],
            default: 'active'
        },
        dataMinimizationDate: {
            type: Date,
            default: null
        },
        anonymizationDate: {
            type: Date,
            default: null
        }
    },

    // NEW: Compliance audit log
    complianceAuditLog: [{
        event: {
            type: String,
            enum: ['data-access', 'data-export', 'consent-change', 'rights-exercise', 'deletion-request'],
            required: true
        },
        timestamp: {
            type: Date,
            default: Date.now
        },
        ipAddress: String,
        userAgent: String,
        details: String,
        adminUser: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    }],
    // Password reset functionality
    passwordResetToken: {
        type: String,
        select: false // Don't include in queries by default
    },
    passwordResetExpires: {
        type: Date,
        select: false // Don't include in queries by default
    },
    passwordResetRequestedAt: {
        type: Date,
        select: false // Track when reset was requested for rate limiting
    },
    passwordResetCount: {
        type: Number,
        default: 0,
        select: false // Track number of reset attempts for security
    },
    notificationSettings: {
        type: NotificationSettingsSchema,
        default: () => ({
            email: {
                enabled: false,
                dailyDigest: false,
                expirationAlerts: true,
                daysBeforeExpiration: 3
            },
            dashboard: {
                showExpirationPanel: true,
                showQuickStats: true,
                alertThreshold: 7
            },
            mobile: {
                pushNotifications: false,
                soundEnabled: true
            }
        })
    },
    savedRecipes: [
        {
            recipeId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Recipe',
                required: true
            },
            savedAt: {
                type: Date,
                default: Date.now
            }
        }
    ],
    // UPDATED: Meal planning preferences with new meal types
    mealPlanningPreferences: {
        type: UserMealPlanningPreferencesSchema,
        default: () => ({
            defaultMealTypes: ['Breakfast', 'AM Snack', 'Lunch', 'Afternoon Snack', 'Dinner', 'PM Snack'],
            planningHorizon: 'week',
            shoppingDay: 'sunday',
            mealPrepDays: ['sunday'],
            dietaryRestrictions: [],
            avoidIngredients: [],
            preferredCuisines: [],
            cookingTimePreference: 'any',
            weekStartDay: 'monday'
        })
    },
    // Nutrition tracking preferences
    nutritionGoals: {
        dailyCalories: {type: Number, default: 2000},
        protein: {type: Number, default: 150}, // grams
        fat: {type: Number, default: 65}, // grams
        carbs: {type: Number, default: 250}, // grams
        fiber: {type: Number, default: 25}, // grams
        sodium: {type: Number, default: 2300} // mg
    },
    // User profile for reviews
    profile: {
        bio: {type: String, maxlength: 200},
        cookingLevel: {
            type: String,
            enum: ['beginner', 'intermediate', 'advanced'],
            default: 'beginner'
        },
        favoritesCuisines: [String],
        reviewCount: {type: Number, default: 0},
        averageRatingGiven: {type: Number, default: 0}
    },
    lastNotificationSent: Date,
    createdAt: {type: Date, default: Date.now},
    updatedAt: {type: Date, default: Date.now},

    // Email verification fields
    emailVerified: {
        type: Boolean,
        default: false
    },
    emailVerificationToken: {
        type: String,
        select: false // Don't include in queries by default
    },
    emailVerificationExpires: {
        type: Date,
        select: false
    },
    emailVerificationRequestedAt: {
        type: Date,
        select: false
    },

// Subscription and billing fields
    subscription: {
        tier: {
            type: String,
            enum: ['free', 'gold', 'platinum', 'admin'],
            default: 'free'
        },
        status: {
            type: String,
            enum: ['trial', 'active', 'cancelled', 'expired', 'free'],
            default: 'free'
        },
        billingCycle: {
            type: String,
            enum: ['monthly', 'annual'],
            default: null
        },
        startDate: {
            type: Date,
            default: null
        },
        endDate: {
            type: Date,
            default: null
        },
        trialStartDate: {
            type: Date,
            default: null
        },
        trialEndDate: {
            type: Date,
            default: null
        },
        hasUsedFreeTrial: {
            type: Boolean,
            default: false
        },
        // For future payment integration
        paymentMethod: {
            type: String,
            default: null
        },
        stripeCustomerId: {
            type: String,
            default: null
        },
        lastPaymentDate: {
            type: Date,
            default: null
        },
        nextBillingDate: {
            type: Date,
            default: null
        }
    },
    // NEW: Add inventory preferences
    inventoryPreferences: {
        defaultSortBy: {
            type: String,
            enum: ['expiration', 'expiration-date', 'name', 'brand', 'category', 'location', 'quantity', 'date-added'],
            default: 'expiration'
        },
        defaultFilterStatus: {
            type: String,
            enum: ['all', 'expired', 'expiring', 'fresh'],
            default: 'all'
        },
        defaultFilterLocation: {
            type: String,
            enum: ['all', 'pantry', 'kitchen', 'fridge', 'fridge-freezer', 'deep-freezer', 'garage', 'other'],
            default: 'all'
        },
        showQuickFilters: {
            type: Boolean,
            default: true
        },
        itemsPerPage: {
            type: String,
            enum: ['all', '20', '50', '100'],
            default: 'all'
        },
        compactView: {
            type: Boolean,
            default: false
        }
    },

// Enhanced currency preferences (already exists in your schema - keeping for reference)
    currencyPreferences: {
        currency: {
            type: String,
            enum: [
                'USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF', 'SEK', 'NOK', 'DKK',
                'PLN', 'CZK', 'HUF', 'RON', 'BGN', 'HRK', 'NZD', 'ZAR', 'BRL', 'MXN',
                'ARS', 'CLP', 'COP', 'PEN', 'INR', 'CNY', 'KRW', 'SGD', 'HKD', 'TWD',
                'THB', 'PHP', 'MYR', 'IDR', 'VND', 'RUB', 'TRY', 'ILS', 'AED', 'SAR', 'EGP'
            ],
            default: 'USD'
        },
        currencySymbol: {
            type: String,
            default: '$',
            maxlength: 5
        },
        currencyPosition: {
            type: String,
            enum: ['before', 'after'],
            default: 'before'
        },
        showCurrencyCode: {
            type: Boolean,
            default: false
        },
        decimalPlaces: {
            type: Number,
            min: 0,
            max: 3,
            default: 2
        }
    },

    // 🆕 NEW: International preferences for UPC scanning and product data
    internationalPreferences: {
        // Primary region for product lookups
        primaryRegion: {
            type: String,
            enum: ['US', 'UK', 'EU', 'CA', 'AU', 'JP', 'CN', 'IN', 'Global'],
            default: 'US'
        },

        // Preferred product databases (in order of preference)
        preferredDatabases: {
            type: [String],
            enum: ['OpenFoodFacts', 'USDA', 'UK-FSA', 'EU-EFSA', 'Global'],
            default: ['OpenFoodFacts', 'USDA']
        },

        // Language preferences for product names
        preferredLanguages: {
            type: [String],
            enum: ['en', 'en-US', 'en-GB', 'en-CA', 'en-AU', 'fr', 'de', 'es', 'it', 'ja', 'zh', 'pt'],
            default: ['en']
        },

        // Unit system preferences
        unitSystem: {
            type: String,
            enum: ['metric', 'imperial', 'mixed'],
            default: 'imperial' // US default
        },

        // Temperature scale
        temperatureScale: {
            type: String,
            enum: ['celsius', 'fahrenheit'],
            default: 'fahrenheit'
        },

        // Date format preference
        dateFormat: {
            type: String,
            enum: ['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD', 'DD-MM-YYYY'],
            default: 'MM/DD/YYYY'
        },

        // Regional barcode preferences
        barcodePreferences: {
            acceptEAN8: {
                type: Boolean,
                default: true
            },
            acceptEAN13: {
                type: Boolean,
                default: true
            },
            acceptUPCA: {
                type: Boolean,
                default: true
            },
            acceptGTIN14: {
                type: Boolean,
                default: false // Usually for cases/packaging
            },

            // Auto-pad short barcodes
            autoPadBarcodes: {
                type: Boolean,
                default: true
            },

            // Show barcode format in results
            showBarcodeFormat: {
                type: Boolean,
                default: false
            }
        },

        // Store chain preferences (for price tracking)
        preferredStoreChains: {
            type: [String],
            default: []
            // Examples: ['Walmart', 'Target', 'Kroger'] for US
            // ['Tesco', 'ASDA', 'Sainsbury\'s'] for UK
            // ['Carrefour', 'Auchan', 'Leclerc'] for France
        },

        // Regional category preferences
        categoryMappingStyle: {
            type: String,
            enum: ['US', 'UK', 'EU', 'Global', 'Auto'],
            default: 'Auto' // Auto-detect based on currency/region
        },

        // Nutrition label style preference
        nutritionLabelStyle: {
            type: String,
            enum: ['US', 'EU', 'UK', 'CA', 'AU'],
            default: 'US'
        },

        // Show regional product warnings
        showRegionalWarnings: {
            type: Boolean,
            default: true
        },

        // Auto-detect region from IP/currency
        autoDetectRegion: {
            type: Boolean,
            default: true
        }
    },

    // 🆕 NEW: Enhanced localization preferences
    localizationPreferences: {
        // Measurement units for different contexts
        measurementUnits: {
            // Cooking measurements
            volume: {
                type: String,
                enum: ['ml', 'l', 'cups', 'fl-oz', 'pints', 'quarts', 'gallons'],
                default: 'cups'
            },
            weight: {
                type: String,
                enum: ['g', 'kg', 'oz', 'lbs', 'stones'],
                default: 'oz'
            },
            temperature: {
                type: String,
                enum: ['celsius', 'fahrenheit', 'gas-mark'],
                default: 'fahrenheit'
            },

            // Nutrition display units
            energy: {
                type: String,
                enum: ['kcal', 'kJ', 'cal'],
                default: 'kcal'
            },

            // Package sizes
            packageVolume: {
                type: String,
                enum: ['ml', 'l', 'fl-oz', 'cups', 'pints', 'quarts'],
                default: 'fl-oz'
            },
            packageWeight: {
                type: String,
                enum: ['g', 'kg', 'oz', 'lbs'],
                default: 'oz'
            }
        },

        // Number formatting
        numberFormat: {
            // Decimal separator
            decimalSeparator: {
                type: String,
                enum: ['.', ','],
                default: '.'
            },

            // Thousands separator
            thousandsSeparator: {
                type: String,
                enum: [',', '.', ' ', ''],
                default: ','
            },

            // Number of decimal places for different contexts
            priceDecimals: {
                type: Number,
                min: 0,
                max: 4,
                default: 2
            },
            nutritionDecimals: {
                type: Number,
                min: 0,
                max: 3,
                default: 1
            },
            quantityDecimals: {
                type: Number,
                min: 0,
                max: 3,
                default: 2
            }
        },

        // Time and date preferences
        timeFormat: {
            type: String,
            enum: ['12-hour', '24-hour'],
            default: '12-hour'
        },

        // First day of week (for meal planning, etc.)
        firstDayOfWeek: {
            type: String,
            enum: ['sunday', 'monday'],
            default: 'sunday'
        }
    },

    // 🆕 NEW: Regional shopping preferences
    regionalShoppingPreferences: {
        // Common store types in user's region
        commonStoreTypes: {
            type: [String],
            default: [] // Will be populated based on region
            // US: ['supermarket', 'grocery-store', 'warehouse-club', 'convenience-store']
            // UK: ['supermarket', 'convenience-store', 'corner-shop', 'hypermarket']
            // EU: ['supermarche', 'hypermarche', 'epicerie', 'marche']
        },

        // Regional tax handling
        showPricesWithTax: {
            type: Boolean,
            default: false // US default (prices without tax), true for EU/UK
        },

        // VAT/Sales tax rate for calculations
        localTaxRate: {
            type: Number,
            min: 0,
            max: 0.5, // 50% max
            default: 0
        },

        // Typical shopping patterns
        shoppingFrequency: {
            type: String,
            enum: ['daily', 'few-times-week', 'weekly', 'bi-weekly', 'monthly'],
            default: 'weekly'
        },

        // Package size preferences
        preferredPackageSizes: {
            type: String,
            enum: ['small', 'medium', 'large', 'bulk', 'mixed'],
            default: 'medium'
        }
    },

    // 🆕 NEW: Enhanced product database preferences
    productDatabasePreferences: {
        // Database priority order
        databasePriority: {
            type: [String],
            enum: [
                'OpenFoodFacts-Regional', 'OpenFoodFacts-Global', 'USDA',
                'UK-FSA', 'EU-EFSA', 'Health-Canada', 'FSANZ-AU', 'Local-Fallback'
            ],
            default: ['OpenFoodFacts-Regional', 'OpenFoodFacts-Global', 'USDA']
        },

        // Product matching preferences
        productMatching: {
            // Strict matching for brand names
            strictBrandMatching: {
                type: Boolean,
                default: false
            },

            // Accept approximate matches
            acceptApproximateMatches: {
                type: Boolean,
                default: true
            },

            // Show confidence scores
            showConfidenceScores: {
                type: Boolean,
                default: false
            },

            // Minimum confidence threshold
            minimumConfidence: {
                type: Number,
                min: 0.1,
                max: 1.0,
                default: 0.6
            }
        },

        // Image preferences
        imagePreferences: {
            // Prefer local market images
            preferRegionalImages: {
                type: Boolean,
                default: true
            },

            // Image quality preference
            imageQuality: {
                type: String,
                enum: ['low', 'medium', 'high'],
                default: 'medium'
            }
        },

        // Nutrition data preferences
        nutritionPreferences: {
            // Primary nutrition standard
            nutritionStandard: {
                type: String,
                enum: ['US-FDA', 'EU-Regulation', 'UK-FSA', 'CA-Health', 'AU-FSANZ'],
                default: 'US-FDA'
            },

            // Show per 100g/100ml values
            showPer100g: {
                type: Boolean,
                default: true
            },

            // Show per serving values
            showPerServing: {
                type: Boolean,
                default: true
            },

            // Preferred allergen format
            allergenFormat: {
                type: String,
                enum: ['US', 'EU', 'UK', 'Global'],
                default: 'US'
            }
        }
    },

    // 🆕 NEW: International search and discovery preferences
    searchPreferences: {
        // Search result preferences
        resultPreferences: {
            // Prioritize local products
            prioritizeLocalProducts: {
                type: Boolean,
                default: true
            },

            // Include international variants
            includeInternationalVariants: {
                type: Boolean,
                default: true
            },

            // Show regional availability
            showRegionalAvailability: {
                type: Boolean,
                default: true
            },

            // Results per page
            resultsPerPage: {
                type: Number,
                min: 5,
                max: 50,
                default: 15
            }
        },

        // Search scope preferences
        searchScope: {
            // Geographic scope
            geographicScope: {
                type: String,
                enum: ['local', 'national', 'regional', 'global'],
                default: 'national'
            },

            // Database scope
            databaseScope: {
                type: [String],
                enum: ['OpenFoodFacts', 'USDA', 'Regional', 'Global'],
                default: ['OpenFoodFacts', 'USDA']
            }
        },

        // Search enhancement features
        searchEnhancements: {
            // Auto-correct search terms
            autoCorrectSearchTerms: {
                type: Boolean,
                default: true
            },

            // Suggest alternative spellings
            suggestAlternativeSpellings: {
                type: Boolean,
                default: true
            },

            // Include phonetic matches
            includePhoneticMatches: {
                type: Boolean,
                default: false
            },

            // Search in local language equivalents
            searchLocalLanguage: {
                type: Boolean,
                default: true
            }
        }
    },

    // 🆕 NEW: Regional feature preferences
    regionalFeatures: {
        // Enable region-specific features
        enableRegionalFeatures: {
            type: Boolean,
            default: true
        },

        // Regional price tracking
        priceTracking: {
            // Enable regional price comparison
            enableRegionalPriceComparison: {
                type: Boolean,
                default: true
            },

            // Include regional store chains
            includeRegionalStores: {
                type: Boolean,
                default: true
            },

            // Price alert thresholds (regional currency)
            priceAlertThreshold: {
                type: Number,
                default: 0 // 0 = disabled
            }
        },

        // Regional recipe features
        recipeFeatures: {
            // Show regional recipe variants
            showRegionalRecipeVariants: {
                type: Boolean,
                default: true
            },

            // Include regional ingredients
            includeRegionalIngredients: {
                type: Boolean,
                default: true
            },

            // Use regional cooking terms
            useRegionalCookingTerms: {
                type: Boolean,
                default: true
            }
        },

        // Regional shopping list features
        shoppingListFeatures: {
            // Group by regional store layout
            groupByRegionalStoreLayout: {
                type: Boolean,
                default: false
            },

            // Include regional product alternatives
            includeRegionalAlternatives: {
                type: Boolean,
                default: true
            },

            // Show regional availability warnings
            showAvailabilityWarnings: {
                type: Boolean,
                default: true
            }
        }
    },

    // 🆕 NEW: User regional profile (auto-populated)
    userRegionalProfile: {
        // Detected/configured region
        detectedRegion: {
            type: String,
            enum: ['US', 'UK', 'EU', 'CA', 'AU', 'JP', 'CN', 'IN', 'Other'],
            default: 'US'
        },

        // Country (more specific than region)
        detectedCountry: {
            type: String,
            maxlength: 2, // ISO country codes
            default: 'US'
        },

        // Regional detection methods used
        detectionMethods: {
            type: [String],
            enum: ['currency', 'ip-location', 'user-specified', 'browser-locale', 'timezone'],
            default: []
        },

        // Last detection update
        lastDetectionUpdate: {
            type: Date,
            default: Date.now
        },

        // Regional confidence score
        regionalConfidence: {
            type: Number,
            min: 0,
            max: 1,
            default: 0.5
        },

        // Regional data quality metrics
        regionalDataQuality: {
            productDatabaseCoverage: {
                type: Number,
                min: 0,
                max: 1,
                default: 0.8
            },
            storeCoverage: {
                type: Number,
                min: 0,
                max: 1,
                default: 0.7
            },
            pricingDataCoverage: {
                type: Number,
                min: 0,
                max: 1,
                default: 0.6
            }
        }
    },

    // 🆕 NEW: International compliance and legal preferences
    compliancePreferences: {
        // Data privacy compliance
        dataPrivacyCompliance: {
            type: String,
            enum: ['GDPR', 'CCPA', 'PIPEDA', 'APPs', 'Standard'],
            default: 'Standard'
        },

        // Nutrition labeling compliance
        nutritionLabelingCompliance: {
            type: String,
            enum: ['US-FDA', 'EU-1169', 'UK-FSA', 'CA-CFIA', 'AU-FSANZ'],
            default: 'US-FDA'
        },

        // Allergen disclosure compliance
        allergenDisclosureCompliance: {
            type: String,
            enum: ['US-FALCPA', 'EU-1169', 'UK-FSA', 'CA-Enhanced', 'AU-Standard'],
            default: 'US-FALCPA'
        },

        // Age verification requirements
        ageVerificationRequired: {
            type: Boolean,
            default: false
        }
    },
    // Usage tracking for subscription limits
    usageTracking: {
        currentMonth: {type: Number, default: () => new Date().getMonth()},
        currentYear: {type: Number, default: () => new Date().getFullYear()},
        monthlyUPCScans: {type: Number, default: 0},
        monthlyReceiptScans: {type: Number, default: 0},
        totalInventoryItems: {type: Number, default: 0},
        totalPersonalRecipes: {type: Number, default: 0},
        totalSavedRecipes: {type: Number, default: 0},
        totalPublicRecipes: {type: Number, default: 0},
        totalRecipeCollections: {type: Number, default: 0},
        savedRecipes: {type: Number, default: 0},
        lastUpdated: {type: Date, default: Date.now}
    },
    // Account status and suspension management
    accountStatus: {
        status: {
            type: String,
            enum: ['active', 'suspended', 'banned'],
            default: 'active'
        },
        suspendedAt: Date,
        suspendedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        suspensionReason: String,
        suspensionEndDate: Date, // null for indefinite suspension
        unsuspendedAt: Date,
        unsuspendedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        // Keep history of suspension actions
        suspensionHistory: [{
            action: {
                type: String,
                enum: ['suspend', 'unsuspend', 'auto_unsuspend'],
                required: true
            },
            date: {
                type: Date,
                default: Date.now
            },
            adminId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User'
            },
            adminEmail: String,
            reason: String,
            duration: Number, // days
            endDate: Date
        }]
    },
    customCategories: {
        type: mongoose.Schema.Types.Mixed,
        default: {},
        validate: {
            validator: function(categories) {
                // Validate structure of custom categories
                if (!categories || typeof categories !== 'object') return true; // Allow empty/null

                for (const [name, category] of Object.entries(categories)) {
                    if (!category.name || !category.icon || !category.custom) {
                        return false;
                    }

                    // Check lengths
                    if (name.length > 50 || category.name.length > 50 || category.icon.length > 10) {
                        return false;
                    }
                }
                return true;
            },
            message: 'Invalid custom categories structure'
        }
    },

// Category preferences for better AI suggestions
    categoryPreferences: {
        type: mongoose.Schema.Types.Mixed,
        default: {},
        // Store user preferences like: { "chicken breast": "Fresh Poultry", "tomato": "Fresh Produce" }
    },

// Store-specific category orders
    storeCategories: {
        type: mongoose.Schema.Types.Mixed,
        default: {},
        // Store layouts like: { "walmart-123": { storeName: "Walmart", categories: [...] } }
    },
});

// Pre-save middleware for admin detection and compliance tracking
UserSchema.pre('save', function(next) {
    // Define your admin email addresses here
    const adminEmails = [
        'e.g.mckeown@gmail.com',
        'admin@docbearscomfortkitchen.com',
    ];

    // Auto-assign admin status based on email
    if (this.isNew || this.isModified('email')) {
        // Auto-assign admin status based on email
        if (adminEmails.includes(this.email.toLowerCase())) {
            console.log('🔧 Admin email detected, setting admin status for:', this.email);
            this.isAdmin = true;

            // Override subscription to admin tier
            if (!this.subscription) {
                this.subscription = {};
            }
            this.subscription.tier = 'admin';
            this.subscription.status = 'active';
            this.subscription.startDate = this.subscription.startDate || new Date();
            this.subscription.endDate = null; // Never expires
        }
    }

    // Update lastActiveAt for compliance tracking (only for existing users)
    if (this.isModified() && !this.isNew) {
        // Ensure dataRetention object exists
        if (!this.dataRetention) {
            this.dataRetention = {
                accountCreatedAt: this.createdAt || new Date(),
                lastActiveAt: new Date(),
                retentionCategory: 'active'
            };
        } else {
            this.dataRetention.lastActiveAt = new Date();
        }
    }

    // Initialize dataRetention for new users
    if (this.isNew && !this.dataRetention) {
        this.dataRetention = {
            accountCreatedAt: new Date(),
            lastActiveAt: new Date(),
            retentionCategory: 'active'
        };
    }

    next();
});

// Method to check if user requires GDPR compliance
UserSchema.methods.requiresGDPRCompliance = function() {
    return this.legalAcceptance.isEUUser || this.legalAcceptance.gdprApplies;
};

// Method to check if user is a minor requiring parental consent
UserSchema.methods.requiresParentalConsent = function() {
    return this.legalAcceptance.isMinor && !this.legalAcceptance.parentVerificationCompleted;
};

// Method to log compliance events
UserSchema.methods.logComplianceEvent = function(event, details, adminUser = null) {
    this.complianceAuditLog.push({
        event,
        details,
        adminUser,
        timestamp: new Date()
    });
    return this.save();
};


UserSchema.methods.trackRecipeScaling = function(isAI = false) {
    try {
        this.checkAndResetMonthlyUsage();

        if (!this.usageTracking.recipeTransformations) {
            this.usageTracking.recipeTransformations = {
                basicScalings: 0,
                aiScalings: 0,
                basicConversions: 0,
                aiConversions: 0,
                lastReset: new Date()
            };
        }

        if (isAI) {
            this.usageTracking.recipeTransformations.aiScalings += 1;
        } else {
            this.usageTracking.recipeTransformations.basicScalings += 1;
        }

        this.usageTracking.lastUpdated = new Date();
        return this.save();
    } catch (error) {
        console.error('❌ Error tracking recipe scaling:', error);
        throw error;
    }
};

UserSchema.methods.trackRecipeConversion = function(isAI = false) {
    try {
        this.checkAndResetMonthlyUsage();

        if (!this.usageTracking.recipeTransformations) {
            this.usageTracking.recipeTransformations = {
                basicScalings: 0,
                aiScalings: 0,
                basicConversions: 0,
                aiConversions: 0,
                lastReset: new Date()
            };
        }

        if (isAI) {
            this.usageTracking.recipeTransformations.aiConversions += 1;
        } else {
            this.usageTracking.recipeTransformations.basicConversions += 1;
        }

        this.usageTracking.lastUpdated = new Date();
        return this.save();
    } catch (error) {
        console.error('❌ Error tracking recipe conversion:', error);
        throw error;
    }
};

UserSchema.methods.isSuspended = function() {
    if (!this.accountStatus || this.accountStatus.status !== 'suspended') {
        return false;
    }

    // Check if suspension has expired
    if (this.accountStatus.suspensionEndDate) {
        const now = new Date();
        const endDate = new Date(this.accountStatus.suspensionEndDate);
        return now < endDate;
    }

    // Indefinite suspension
    return true;
};

// Get suspension details
UserSchema.methods.getSuspensionInfo = function() {
    if (!this.isSuspended()) {
        return { isSuspended: false };
    }

    const endDate = this.accountStatus.suspensionEndDate
        ? new Date(this.accountStatus.suspensionEndDate)
        : null;

    const daysRemaining = endDate
        ? Math.ceil((endDate - new Date()) / (1000 * 60 * 60 * 24))
        : null;

    return {
        isSuspended: true,
        reason: this.accountStatus.suspensionReason,
        suspendedAt: this.accountStatus.suspendedAt,
        endDate: endDate,
        daysRemaining: daysRemaining,
        isIndefinite: !endDate
    };
};

// NEW: Method to check if user is admin
UserSchema.methods.isAdminUser = function() {
    return this.isAdmin === true;
};

// UPDATED: MealPlanEntrySchema with new meal types
const MealPlanEntrySchema = new mongoose.Schema({
    // Type of meal entry
    entryType: {
        type: String,
        enum: ['recipe', 'simple'],
        required: true,
        default: 'recipe'
    },
    // Recipe-based meal fields (existing)
    recipeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Recipe',
        required: function () {
            return this.entryType === 'recipe';
        }
    },
    recipeName: {
        type: String,
        required: function () {
            return this.entryType === 'recipe';
        }
    },

    // Simple meal fields (new)
    simpleMeal: {
        name: {type: String}, // e.g., "Steak Dinner"
        description: {type: String}, // e.g., "Ribeye with mashed potatoes and broccoli"
        items: [{
            inventoryItemId: {type: mongoose.Schema.Types.ObjectId},
            itemName: {type: String, required: true}, // e.g., "Ribeye Steak"
            itemCategory: {type: String}, // e.g., "protein", "starch", "vegetable"
            quantity: {type: Number, default: 1},
            unit: {type: String, default: 'item'},
            notes: {type: String} // e.g., "grilled medium-rare"
        }],
        totalEstimatedTime: {type: Number, default: 30}, // minutes
        difficulty: {
            type: String,
            enum: ['easy', 'medium', 'hard'],
            default: 'easy'
        }
    },

    // UPDATED: Common fields for both types with new meal types
    mealType: {
        type: String,
        enum: ['Breakfast', 'AM Snack', 'Lunch', 'Afternoon Snack', 'Dinner', 'PM Snack'],
        required: true
    },
    servings: {type: Number, default: 1, min: 1},
    notes: {type: String, maxlength: 200},

    // Cached times (for recipes, estimated for simple meals)
    prepTime: {type: Number, default: 0},
    cookTime: {type: Number, default: 0},

    // Nutrition estimation for simple meals
    estimatedNutrition: {
        calories: {type: Number, default: 0},
        protein: {type: Number, default: 0},
        carbs: {type: Number, default: 0},
        fat: {type: Number, default: 0}
    },

    createdAt: {type: Date, default: Date.now},

    completed: {
        type: Boolean,
        default: false
    },
    completedAt: {
        type: Date,
        default: null
    },
    completionType: {
        type: String,
        enum: ['full', 'partial'],
        default: 'full'
    },
    completionPercentage: {
        type: Number,
        default: 100,
        min: 1,
        max: 100
    },
    completionNotes: {
        type: String,
        maxlength: 500,
        default: ''
    },
    itemsConsumed: [{
        inventoryItemId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'InventoryItem'
        },
        itemName: String,
        quantityConsumed: Number,
        unit: String,
        consumedAt: {
            type: Date,
            default: Date.now
        }
    }],
});

// Update the MealPlanSchema to include simple meal preferences
const MealPlanSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    name: {type: String, required: true, maxlength: 100},
    description: {type: String, maxlength: 500},

    // Week-based planning
    weekStartDate: {type: Date, required: true},

    // Meals organized by day and meal type (using updated schema)
    meals: {
        monday: [MealPlanEntrySchema],
        tuesday: [MealPlanEntrySchema],
        wednesday: [MealPlanEntrySchema],
        thursday: [MealPlanEntrySchema],
        friday: [MealPlanEntrySchema],
        saturday: [MealPlanEntrySchema],
        sunday: [MealPlanEntrySchema]
    },

    // UPDATED: Planning preferences with new meal types
    preferences: {
        defaultServings: {type: Number, default: 4},
        mealTypes: {
            type: [String],
            enum: ['Breakfast', 'AM Snack', 'Lunch', 'Afternoon Snack', 'Dinner', 'PM Snack'],
            default: ['Breakfast', 'AM Snack', 'Lunch', 'Afternoon Snack', 'Dinner', 'PM Snack']
        },
        dietaryRestrictions: [String],
        avoidIngredients: [String],
        // Simple meal preferences
        allowSimpleMeals: {type: Boolean, default: true},
        preferredMealComplexity: {
            type: String,
            enum: ['simple', 'mixed', 'recipe-focused'],
            default: 'mixed'
        }
    },

    // Shopping list generation (enhanced for simple meals)
    shoppingList: {
        generated: {type: Boolean, default: false},
        generatedAt: Date,
        items: [{
            ingredient: {type: String, required: true},
            amount: String,
            unit: String,
            category: {type: String, default: 'other'},
            recipes: [String], // Which recipes/meals need this ingredient
            isFromSimpleMeal: {type: Boolean, default: false},
            simpleMealNames: [String], // Which simple meals need this
            inInventory: {type: Boolean, default: false},
            inventoryItemId: {type: mongoose.Schema.Types.ObjectId},
            purchased: {type: Boolean, default: false},
            price: { type: Number },
            unitPrice: { type: Number },
            estimatedPrice: { type: Number },
            priceSource: { type: String, enum: ['manual', 'estimated', 'inventory', 'lookup'] },
            priceUpdatedAt: { type: Date }
        }]
    },

    // Meal prep suggestions (enhanced for simple meals)
    mealPrep: {
        batchCookingSuggestions: [{
            ingredient: String,
            recipes: [String],
            simpleMeals: [String], // Simple meals using this ingredient
            prepMethod: String,
            storageTime: String
        }],
        prepDays: {
            type: [String],
            enum: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
            default: ['sunday']
        }
    },

    // Nutrition tracking for the week (enhanced)
    weeklyNutrition: {
        totalCalories: {type: Number, default: 0},
        averageDailyCalories: {type: Number, default: 0},
        protein: {type: Number, default: 0},
        carbs: {type: Number, default: 0},
        fat: {type: Number, default: 0},
        fiber: {type: Number, default: 0},
        fromRecipes: {type: Number, default: 0}, // Calories from recipe-based meals
        fromSimpleMeals: {type: Number, default: 0}, // Estimated calories from simple meals
        estimatedAccuracy: {type: Number, default: 0} // Percentage of nutrition data that's accurate vs estimated
    },

    // Statistics
    statistics: {
        totalMeals: {type: Number, default: 0},
        recipeMeals: {type: Number, default: 0},
        simpleMeals: {type: Number, default: 0},
        averageComplexity: {type: String, default: 'medium'},
        inventoryItemsUsed: {type: Number, default: 0},
        estimatedCookingTime: {type: Number, default: 0} // Total minutes for the week
    },

    isTemplate: {type: Boolean, default: false},
    isActive: {type: Boolean, default: true},

    createdAt: {type: Date, default: Date.now},
    updatedAt: {type: Date, default: Date.now}
});

// Add pre-save middleware to calculate statistics
MealPlanSchema.pre('save', function (next) {
    let totalMeals = 0;
    let recipeMeals = 0;
    let simpleMeals = 0;
    let totalCookingTime = 0;
    let inventoryItemsUsed = 0;

    // Calculate statistics from all meals
    Object.values(this.meals).forEach(dayMeals => {
        if (Array.isArray(dayMeals)) {
            dayMeals.forEach(meal => {
                totalMeals++;
                if (meal.entryType === 'recipe') {
                    recipeMeals++;
                    totalCookingTime += (meal.prepTime || 0) + (meal.cookTime || 0);
                } else {
                    simpleMeals++;
                    totalCookingTime += meal.simpleMeal?.totalEstimatedTime || 30;
                    inventoryItemsUsed += meal.simpleMeal?.items?.length || 0;
                }
            });
        }
    });

    this.statistics = {
        totalMeals,
        recipeMeals,
        simpleMeals,
        averageComplexity: recipeMeals > simpleMeals ? 'high' :
            simpleMeals > recipeMeals ? 'low' : 'medium',
        inventoryItemsUsed,
        estimatedCookingTime: totalCookingTime
    };

    this.updatedAt = new Date();
    next();
});

// Add method to get user's preferred meal types from their profile
MealPlanSchema.methods.getEffectiveMealTypes = function (userPreferences) {
    // Use meal plan preferences first, then fall back to user preferences
    const planPreferences = this.preferences?.mealTypes || [];
    const userPrefs = userPreferences?.defaultMealTypes || ['Breakfast', 'AM Snack', 'Lunch', 'Afternoon Snack', 'Dinner', 'PM Snack'];

    return planPreferences.length > 0 ? planPreferences : userPrefs;
};

// Add method to check if simple meals are allowed
MealPlanSchema.methods.allowsSimpleMeals = function () {
    return this.preferences?.allowSimpleMeals !== false;
};

// MealPlanTemplate Schema with updated meal types
const MealPlanTemplateSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    name: {type: String, required: true, maxlength: 100},
    description: {type: String, maxlength: 500},
    category: {
        type: String,
        enum: ['family', 'healthy', 'quick', 'budget', 'vegetarian', 'keto', 'custom'],
        default: 'custom'
    },

// Template meals (same structure as MealPlan)
    templateMeals: {
        monday: [MealPlanEntrySchema],
        tuesday: [MealPlanEntrySchema],
        wednesday: [MealPlanEntrySchema],
        thursday: [MealPlanEntrySchema],
        friday: [MealPlanEntrySchema],
        saturday: [MealPlanEntrySchema],
        sunday: [MealPlanEntrySchema]
    },

// Usage statistics
    timesUsed: {type: Number, default: 0},
    rating: {type: Number, min: 1, max: 5},

    isPublic: {type: Boolean, default: false}, // Share with other users

    createdAt: {type: Date, default: Date.now},
    updatedAt: {type: Date, default: Date.now}
});

// Contact Schema for managing email recipients
const ContactSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },
    email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
        validate: {
            validator: function (email) {
                return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
            },
            message: 'Invalid email format'
        }
    },
    relationship: {
        type: String,
        enum: ['family', 'friend', 'roommate', 'colleague', 'other'],
        default: 'other'
    },
    // Optional grouping for contacts
    groups: [String],

    // Email preferences
    preferences: {
        receiveShoppingLists: {type: Boolean, default: true},
        receiveRecipeShares: {type: Boolean, default: true},
        preferredFormat: {
            type: String,
            enum: ['html', 'text'],
            default: 'html'
        }
    },

    // Track email activity
    stats: {
        emailsSent: {type: Number, default: 0},
        lastEmailSent: Date,
        lastEmailOpened: Date
    },

    isActive: {type: Boolean, default: true},
    notes: {type: String, maxlength: 200},

    createdAt: {type: Date, default: Date.now},
    updatedAt: {type: Date, default: Date.now}
});

// Email Log Schema for tracking sent emails
const EmailLogSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    // Email details
    recipients: [{
        email: String,
        name: String,
        contactId: {type: mongoose.Schema.Types.ObjectId, ref: 'Contact'}
    }],

    subject: {type: String, required: true},
    emailType: {
        type: String,
        enum: ['shopping-list', 'recipe-share', 'meal-plan'],
        required: true
    },

    // Content details
    content: {
        shoppingListId: String, // For future reference
        recipeIds: [String],
        mealPlanId: String,
        personalMessage: String,
        contextName: String
    },

    // Email service details
    messageId: String, // From email provider
    status: {
        type: String,
        enum: ['sent', 'delivered', 'failed', 'bounced'],
        default: 'sent'
    },

    // Tracking
    sentAt: {type: Date, default: Date.now},
    deliveredAt: Date,
    openedAt: Date,
    clickedAt: Date,

    error: String, // If failed

    createdAt: {type: Date, default: Date.now}
});

// Saved Shopping List Schema
const SavedShoppingListSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    // Basic Information
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },
    description: {
        type: String,
        maxlength: 500,
        trim: true
    },

    // List Type and Context
    listType: {
        type: String,
        enum: ['recipe', 'recipes', 'meal-plan', 'custom'],
        required: true
    },
    contextName: String, // Recipe name, meal plan name, etc.

    // Source Information
    sourceRecipeIds: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Recipe'
    }],
    sourceMealPlanId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'MealPlan'
    },

    // Shopping List Data
    items: [{
        ingredient: {type: String, required: true},
        amount: String,
        category: {type: String, default: 'other'},
        inInventory: {type: Boolean, default: false},
        purchased: {type: Boolean, default: false},
        recipes: [String], // Recipe names using this ingredient
        originalName: String,
        needAmount: String,
        haveAmount: String,
        itemKey: String, // For checkbox tracking
        notes: String, // User can add notes to specific items
        price: { type: Number },
        unitPrice: { type: Number },
        estimatedPrice: { type: Number },
        priceSource: { type: String, enum: ['manual', 'estimated', 'inventory', 'lookup'] },
        priceUpdatedAt: { type: Date }
    }],

    // Statistics (cached for performance)
    stats: {
        totalItems: {type: Number, default: 0},
        needToBuy: {type: Number, default: 0},
        inInventory: {type: Number, default: 0},
        purchased: {type: Number, default: 0},
        estimatedCost: Number, // Future: price estimation
        categories: {type: Number, default: 0}
    },

    // Usage and Management
    tags: [String], // User-defined tags for organization
    color: {
        type: String,
        default: '#3b82f6' // Hex color for visual organization
    },

    // Status and Visibility
    isTemplate: {type: Boolean, default: false}, // Can be reused as template
    isShared: {type: Boolean, default: false}, // Shared with family/friends
    isArchived: {type: Boolean, default: false}, // Archived but not deleted

    // Usage Statistics
    usage: {
        timesLoaded: {type: Number, default: 0},
        lastLoaded: Date,
        lastModified: Date,
        averageCompletionTime: Number, // How long shopping took
        completionRate: Number // % of items typically purchased
    },

    // Shopping Session Data
    shoppingSessions: [{
        startedAt: {type: Date, default: Date.now},
        completedAt: Date,
        itemsPurchased: Number,
        totalItems: Number,
        duration: Number, // in minutes
        notes: String
    }],

    // Sharing and Collaboration
    sharedWith: [{
        email: String,
        name: String,
        permissions: {
            type: String,
            enum: ['view', 'edit'],
            default: 'view'
        },
        sharedAt: {type: Date, default: Date.now}
    }],

    createdAt: {type: Date, default: Date.now},
    updatedAt: {type: Date, default: Date.now}
});

// Shopping List Template Schema (for commonly used lists)
const ShoppingListTemplateSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    name: {
        type: String,
        required: true,
        maxlength: 100
    },
    description: String,
    category: {
        type: String,
        enum: ['weekly-staples', 'meal-prep', 'party', 'holiday', 'bulk-shopping', 'custom'],
        default: 'custom'
    },

    // Template Items (without purchased status)
    templateItems: [{
        ingredient: {type: String, required: true},
        defaultAmount: String,
        category: {type: String, default: 'other'},
        isOptional: {type: Boolean, default: false},
        notes: String
    }],

    // Usage Statistics
    timesUsed: {type: Number, default: 0},
    isPublic: {type: Boolean, default: false}, // Share with community
    rating: {type: Number, min: 1, max: 5},

    createdAt: {type: Date, default: Date.now},
    updatedAt: {type: Date, default: Date.now}
});

// Meal Prep Suggestion Schema
const MealPrepSuggestionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    mealPlanId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'MealPlan',
        required: true
    },

    // Batch cooking opportunities
    batchCookingSuggestions: [{
        ingredient: {type: String, required: true},
        totalAmount: {type: String, required: true},
        unit: {type: String},
        recipes: [String], // Recipe names using this ingredient
        cookingMethod: {type: String}, // 'bake', 'grill', 'saute', etc.
        prepInstructions: {type: String},
        storageInstructions: {type: String},
        shelfLife: {type: String}, // "3-4 days refrigerated"
        estimatedPrepTime: {type: Number}, // minutes
        difficulty: {
            type: String,
            enum: ['easy', 'medium', 'hard'],
            default: 'easy'
        }
    }],

    // Ingredient prep consolidation
    ingredientPrepSuggestions: [{
        ingredient: {type: String, required: true},
        totalAmount: {type: String},
        prepType: {type: String}, // 'chop', 'dice', 'slice', 'mince'
        recipes: [String],
        prepInstructions: {type: String},
        storageMethod: {type: String},
        estimatedPrepTime: {type: Number} // minutes
    }],

    // Recommended prep schedule
    prepSchedule: [{
        day: {
            type: String,
            enum: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
            required: true
        },
        tasks: [{
            taskType: {
                type: String,
                enum: ['batch_cook', 'ingredient_prep', 'portion', 'marinate'],
                required: true
            },
            description: {type: String, required: true},
            estimatedTime: {type: Number}, // minutes
            priority: {
                type: String,
                enum: ['high', 'medium', 'low'],
                default: 'medium'
            },
            ingredients: [String],
            equipment: [String] // 'large pot', 'baking sheet', etc.
        }]
    }],

    // Time and efficiency metrics
    metrics: {
        totalPrepTime: {type: Number, default: 0}, // total minutes
        timeSaved: {type: Number, default: 0}, // estimated minutes saved during week
        efficiency: {type: Number, default: 0}, // percentage efficiency gain
        recipesAffected: {type: Number, default: 0},
        ingredientsConsolidated: {type: Number, default: 0}
    },

    // User preferences and customization
    preferences: {
        maxPrepTime: {type: Number, default: 180}, // max minutes willing to spend on prep
        preferredPrepDays: [{
            type: String,
            enum: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
        }],
        avoidedTasks: [String], // tasks user doesn't want to do
        skillLevel: {
            type: String,
            enum: ['beginner', 'intermediate', 'advanced'],
            default: 'beginner'
        }
    },

    // Implementation tracking
    implementation: {
        tasksCompleted: [String], // task IDs that were completed
        completionRate: {type: Number, default: 0}, // percentage
        feedback: {
            difficulty: {type: Number, min: 1, max: 5},
            timeAccuracy: {type: Number, min: 1, max: 5},
            usefulness: {type: Number, min: 1, max: 5},
            comments: String
        },
        actualTimeSpent: {type: Number}, // actual minutes spent on prep
        wouldUseAgain: {type: Boolean}
    },

    // Status and metadata
    status: {
        type: String,
        enum: ['generated', 'in_progress', 'completed', 'abandoned'],
        default: 'generated'
    },
    weekStartDate: {type: Date, required: true},

    createdAt: {type: Date, default: Date.now},
    updatedAt: {type: Date, default: Date.now}
});

// Meal Prep Template Schema (reusable prep strategies)
const MealPrepTemplateSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    name: {type: String, required: true, maxlength: 100},
    description: {type: String, maxlength: 500},
    category: {
        type: String,
        enum: ['protein_prep', 'vegetable_prep', 'grain_prep', 'sauce_prep', 'full_meal_prep'],
        required: true
    },

    // Template instructions
    instructions: [{
        step: {type: Number, required: true},
        instruction: {type: String, required: true},
        estimatedTime: {type: Number}, // minutes
        equipment: [String],
        tips: [String]
    }],

    // Applicable ingredients/recipes
    applicableIngredients: [String],
    recipeTypes: [String], // 'chicken dishes', 'pasta recipes', etc.

    // Template metrics
    estimatedTime: {type: Number, required: true}, // total minutes
    difficulty: {
        type: String,
        enum: ['easy', 'medium', 'hard'],
        default: 'easy'
    },
    yield: {type: String}, // "Serves 4-6 meals"
    shelfLife: {type: String},

    // Usage statistics
    usage: {
        timesUsed: {type: Number, default: 0},
        averageRating: {type: Number, default: 0},
        lastUsed: Date
    },

    // Community features
    isPublic: {type: Boolean, default: false},
    tags: [String],

    createdAt: {type: Date, default: Date.now},
    updatedAt: {type: Date, default: Date.now}
});

// Meal Prep Knowledge Base - cooking methods and techniques
const MealPrepKnowledgeSchema = new mongoose.Schema({
    ingredient: {type: String, required: true},
    category: {type: String, required: true}, // 'protein', 'vegetable', 'grain', etc.

    // Batch cooking methods
    batchMethods: [{
        method: {type: String, required: true}, // 'oven_roast', 'slow_cook', 'grill', etc.
        description: {type: String},
        temperature: {type: String}, // "375°F"
        timePerPound: {type: String}, // "20-25 minutes per lb"
        maxBatchSize: {type: String}, // "5-6 lbs"
        equipment: [String],
        benefits: [String], // "Even cooking", "hands-off", etc.
        tips: [String]
    }],

    // Food/Recipe model - Update storage enum (if you have one)
    storage: {
        refrigerator: {
            maxDays: {type: Number},
            containerType: {type: String},
            tips: [String]
        },
        fridge_freezer: {
            maxMonths: {type: Number},
            packagingMethod: {type: String},
            thawingInstructions: {type: String}
        },
        deep_freezer: {
            maxMonths: {type: Number},
            packagingMethod: {type: String},
            thawingInstructions: {type: String}
        }
    },

    // Prep techniques
    prepTechniques: [{
        technique: {type: String}, // 'dice', 'julienne', 'rough chop'
        timePerCup: {type: Number}, // minutes
        shelfLife: {type: String},
        storageMethod: {type: String}
    }],

    // Reheating guidelines
    reheating: [{
        method: {type: String}, // 'microwave', 'oven', 'stovetop'
        instructions: {type: String},
        timeGuideline: {type: String},
        qualityNotes: {type: String} // "Best texture", "May dry out", etc.
    }]
});

// Pre-save middleware for meal prep suggestions
MealPrepSuggestionSchema.pre('save', function (next) {
    this.updatedAt = new Date();

    // Calculate metrics
    if (this.batchCookingSuggestions && this.ingredientPrepSuggestions) {
        this.metrics.recipesAffected = new Set([
            ...this.batchCookingSuggestions.flatMap(s => s.recipes),
            ...this.ingredientPrepSuggestions.flatMap(s => s.recipes)
        ]).size;

        this.metrics.ingredientsConsolidated = this.batchCookingSuggestions.length +
            this.ingredientPrepSuggestions.length;

        this.metrics.totalPrepTime = this.prepSchedule.reduce((total, day) =>
            total + day.tasks.reduce((dayTotal, task) => dayTotal + (task.estimatedTime || 0), 0), 0
        );

        // Estimate time saved (rough calculation)
        this.metrics.timeSaved = Math.floor(this.metrics.totalPrepTime * 0.3); // 30% time savings estimate
        this.metrics.efficiency = this.metrics.timeSaved > 0 ?
            Math.min(Math.floor((this.metrics.timeSaved / this.metrics.totalPrepTime) * 100), 100) : 0;
    }

    next();
});

// Recipe Review Schema
const RecipeReviewSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    userName: {type: String, required: true},
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    comment: {
        type: String,
        maxlength: 1000,
        trim: true
    },
    aspects: {
        taste: {type: Number, min: 1, max: 5},
        difficulty: {type: Number, min: 1, max: 5},
        instructions: {type: Number, min: 1, max: 5}
    },
    modifications: {
        type: String,
        maxlength: 500,
        trim: true
    },
    wouldMakeAgain: {type: Boolean},
    helpfulVotes: {type: Number, default: 0},
    unhelpfulVotes: {type: Number, default: 0},
    votedBy: [{
        userId: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
        vote: {type: String, enum: ['helpful', 'unhelpful']}
    }],
    createdAt: {type: Date, default: Date.now},
    updatedAt: {type: Date, default: Date.now}
}, { _id: false });

// Inventory Item Schema with Kitchen Cabinets location
const InventoryItemSchema = new mongoose.Schema({
    upc: {type: String, index: true},
    name: {type: String, required: true},
    brand: String,
    category: String,

    // Primary quantity and unit (required)
    quantity: {type: Number, default: 1},
    unit: {type: String, default: 'item'},

    // Secondary quantity and unit (optional)
    secondaryQuantity: {type: Number, default: null},
    secondaryUnit: {type: String, default: null},

    expirationDate: Date,
    addedDate: {type: Date, default: Date.now},
    location: {
        type: String,
        enum: ['pantry', 'kitchen', 'fridge', 'fridge-freezer', 'deep-freezer', 'garage', 'other'],
        default: 'pantry'
    },
    notes: String,
    // Nutrition data for individual items
    nutrition: NutritionSchema,
    fdcId: String, // USDA Food Data Central ID for nutrition lookup
    // Expiration tracking fields
    notificationSent: {type: Boolean, default: false},
    lastNotifiedDate: Date,
    priceHistory: [{
        price: { type: Number, required: true },
        store: { type: String, required: true },
        date: { type: Date, default: Date.now },
        size: { type: String }, // "12 oz", "1 lb", etc.
        unitPrice: { type: Number }, // price per unit (calculated)
        unit: { type: String }, // "oz", "lb", "each"
        isOnSale: { type: Boolean, default: false },
        saleEndDate: { type: Date },
        notes: { type: String },
        receiptPhoto: { type: String }, // Optional receipt image
        addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
    }],

    // Current best price tracking
    currentBestPrice: {
        price: { type: Number },
        store: { type: String },
        date: { type: Date },
        unitPrice: { type: Number },
        isOnSale: { type: Boolean, default: false }
    },

    // Price alerts
    priceAlerts: {
        enabled: { type: Boolean, default: false },
        targetPrice: { type: Number },
        alertWhenBelow: { type: Boolean, default: true },
        lastAlertSent: { type: Date }
    },

    // Average pricing calculations
    averagePrice: { type: Number },
    lowestPrice: { type: Number },
    highestPrice: { type: Number },
    priceStability: { type: String, enum: ['stable', 'volatile', 'trending-up', 'trending-down'] }
});

const StoreSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    chain: {
        type: String,
        trim: true
    },
    address: {
        type: String,
        trim: true
    },
    city: {
        type: String,
        trim: true
    },
    state: {
        type: String,
        trim: true
    },
    zipCode: {
        type: String,
        trim: true
    },
    coordinates: {
        lat: { type: Number },
        lng: { type: Number }
    },
    storeId: {
        type: String,
        trim: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    addedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Consumption History Schema for tracking inventory usage
const ConsumptionHistorySchema = new mongoose.Schema({
    itemId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    itemName: {
        type: String,
        required: true
    },
    ingredient: String, // For recipe mode - what the item was used as
    quantityConsumed: {
        type: Number,
        required: true
    },
    unitConsumed: {
        type: String,
        required: true
    },
    reason: {
        type: String,
        enum: ['consumed', 'recipe', 'expired', 'donated', 'spilled', 'other'],
        required: true
    },
    notes: String,
    recipeName: String, // If used in a recipe
    dateConsumed: {
        type: Date,
        default: Date.now,
        required: true
    },

    // Enhanced dual unit tracking
    isDualUnitConsumption: {
        type: Boolean,
        default: false
    },
    useSecondaryUnit: {
        type: Boolean,
        default: false
    },
    originalPrimaryQuantity: Number,
    originalSecondaryQuantity: Number,
    originalSecondaryUnit: String,

    // Remaining quantities after consumption
    remainingQuantity: {
        type: Number,
        required: true
    },
    remainingSecondaryQuantity: Number,

    // Change tracking
    primaryQuantityChange: Number,
    secondaryQuantityChange: Number
}, {_id: false});

// UPDATED User Inventory Schema - WITH consumptionHistory field
const UserInventorySchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    items: [InventoryItemSchema],

    consumptionHistory: [ConsumptionHistorySchema],

    lastUpdated: {type: Date, default: Date.now}
});



// ENHANCED Recipe Schema with image support
const RecipeSchema = new mongoose.Schema({
    title: {type: String, required: true},
    description: {type: String, default: ''},
    ingredients: [RecipeIngredientSchema],
    instructions: {
        type: [mongoose.Schema.Types.Mixed], // Keep your existing Mixed type
        validate: {
            validator: function(instructions) {
                if (!Array.isArray(instructions) || instructions.length === 0) {
                    return false;
                }

                return instructions.every(inst => {
                    if (typeof inst === 'string') {
                        return inst.trim().length > 0;
                    } else if (typeof inst === 'object' && inst !== null) {
                        return (inst.text && typeof inst.text === 'string' && inst.text.trim().length > 0) ||
                            (inst.instruction && typeof inst.instruction === 'string' && inst.instruction.trim().length > 0);
                    }
                    return false;
                });
            },
            message: 'Instructions must be an array of non-empty strings or objects with text/instruction property'
        }
    },

    cookTime: Number,
    prepTime: Number,
    servings: Number,
    difficulty: {
        type: String,
        enum: ['easy', 'medium', 'hard'],
        default: 'medium'
    },

    category: {
        type: String,
        enum: [
            'seasonings', 'sauces', 'salad-dressings', 'marinades', 'ingredients',
            'entrees', 'side-dishes', 'soups', 'sandwiches', 'appetizers',
            'desserts', 'breads', 'pizza-dough', 'specialty-items', 'beverages', 'breakfast'
        ],
        default: 'entrees'
    },

    tags: [String],
    source: {type: String, default: ''},
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    lastEditedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    importedFrom: {
        type: String,
        default: null
    },

    isPublic: {type: Boolean, default: false},

    // UPDATED: Binary image storage (like user avatars)
    uploadedImage: {
        data: { type: String }, // Base64 encoded image
        mimeType: { type: String, enum: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'] },
        size: { type: Number, max: 5242880 }, // 5MB limit
        originalName: { type: String },
        uploadedAt: { type: Date, default: Date.now },
        source: { type: String, default: 'user_upload' }
    },

    // AI-extracted image from video (existing)
    extractedImage: ExtractedImageSchema,

    // Simple flags for quick queries
    hasUserImage: { type: Boolean, default: false },
    hasExtractedImage: { type: Boolean, default: false },

    // Video-specific metadata
    videoMetadata: VideoMetadataSchema,

    // ... rest of your existing schema fields ...
    nutrition: NutritionSchema,
    nutritionCalculatedAt: Date,
    nutritionCoverage: Number,
    nutritionManuallySet: {type: Boolean, default: false},

    reviews: [RecipeReviewSchema],
    ratingStats: {
        averageRating: {type: Number, default: 0, min: 0, max: 5},
        totalRatings: {type: Number, default: 0},
        ratingDistribution: {
            star5: {type: Number, default: 0},
            star4: {type: Number, default: 0},
            star3: {type: Number, default: 0},
            star2: {type: Number, default: 0},
            star1: {type: Number, default: 0}
        }
    },

    metrics: {
        viewCount: {type: Number, default: 0},
        saveCount: {type: Number, default: 0},
        shareCount: {type: Number, default: 0},
        lastViewed: Date
    },

    aiAnalysis: {
        nutritionGenerated: { type: Boolean, default: false },
        nutritionMetadata: {
            modelUsed: String,
            processingTime: Number,
            confidence: Number,
            coverage: Number,
            cost: Number
        }
    },

    originalServings: { type: Number, default: null },
    currentServings: { type: Number, default: null },
    scalingHistory: [{
        fromServings: Number,
        toServings: Number,
        scaledAt: Date,
        scaledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        aiGenerated: Boolean,
        scalingNotes: String,
        cookingAdjustments: {
            timeMultiplier: Number,
            temperatureChanges: String,
            equipmentNotes: String,
            difficultyNotes: String
        }
    }],

    // NEW: Unit conversion tracking
    originalMeasurementSystem: {
        type: String,
        enum: ['us', 'metric', 'mixed', 'unknown'],
        default: 'unknown'
    },
    currentMeasurementSystem: {
        type: String,
        enum: ['us', 'metric', 'mixed'],
        default: 'us'
    },
    conversionHistory: [{
        fromSystem: String,
        toSystem: String,
        convertedAt: Date,
        convertedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        aiGenerated: Boolean,
        conversionNotes: String,
        conversionMethod: String, // 'ai_contextual', 'basic_math', 'manual'
        culturalAdaptations: [String]
    }],

    // NEW: AI transformation enhancements
    aiTransformations: {
        scalingOptimized: { type: Boolean, default: false },
        unitsOptimized: { type: Boolean, default: false },
        lastAiTransformation: Date,
        aiTransformationVersion: String,
        transformationMetadata: {
            originalIngredientCount: Number,
            transformedIngredientCount: Number,
            confidenceScore: Number,
            processingCost: Number
        }
    },

    createdAt: {type: Date, default: Date.now},
    updatedAt: {type: Date, default: Date.now}
}, {
    timestamps: true
});

// UPDATED: Pre-save middleware to update image flags
RecipeSchema.pre('save', function(next) {
    if (this.isModified() && !this.isNew) {
        this.updatedAt = new Date();
    }

    // Update image flags
    this.hasUserImage = !!(this.uploadedImage?.data);
    this.hasExtractedImageFlag = !!(this.extractedImage?.data);

    // Update video metadata flag
    if (this.videoMetadata && this.extractedImage) {
        this.videoMetadata.hasExtractedImage = true;
    }

    next();
});

// NEW: Add these indexes for better performance on scaling/conversion queries
RecipeSchema.index({ 'scalingHistory.scaledAt': -1 });
RecipeSchema.index({ 'conversionHistory.convertedAt': -1 });
RecipeSchema.index({ originalServings: 1, currentServings: 1 });
RecipeSchema.index({ originalMeasurementSystem: 1, currentMeasurementSystem: 1 });
RecipeSchema.index({ 'aiTransformations.lastAiTransformation': -1 });

// NEW: Instance methods for recipe transformations
RecipeSchema.methods.recordScaling = function(fromServings, toServings, userId, aiData = null) {
    this.scalingHistory.push({
        fromServings,
        toServings,
        scaledAt: new Date(),
        scaledBy: userId,
        aiGenerated: !!aiData,
        scalingNotes: aiData?.notes || '',
        cookingAdjustments: aiData?.cookingAdjustments || {}
    });

    this.currentServings = toServings;
    if (!this.originalServings) {
        this.originalServings = fromServings;
    }

    if (aiData) {
        this.aiTransformations.scalingOptimized = true;
        this.aiTransformations.lastAiTransformation = new Date();
    }

    return this.save();
};

RecipeSchema.methods.recordConversion = function(fromSystem, toSystem, userId, aiData = null) {
    this.conversionHistory.push({
        fromSystem,
        toSystem,
        convertedAt: new Date(),
        convertedBy: userId,
        aiGenerated: !!aiData,
        conversionNotes: aiData?.notes || '',
        conversionMethod: aiData?.method || 'manual',
        culturalAdaptations: aiData?.culturalAdaptations || []
    });

    this.currentMeasurementSystem = toSystem;
    if (this.originalMeasurementSystem === 'unknown') {
        this.originalMeasurementSystem = fromSystem;
    }

    if (aiData) {
        this.aiTransformations.unitsOptimized = true;
        this.aiTransformations.lastAiTransformation = new Date();
    }

    return this.save();
};

RecipeSchema.methods.hasBeenScaled = function() {
    return this.scalingHistory && this.scalingHistory.length > 0;
};

RecipeSchema.methods.hasBeenConverted = function() {
    return this.conversionHistory && this.conversionHistory.length > 0;
};

RecipeSchema.methods.getLatestScaling = function() {
    if (!this.scalingHistory || this.scalingHistory.length === 0) return null;
    return this.scalingHistory[this.scalingHistory.length - 1];
};

RecipeSchema.methods.getLatestConversion = function() {
    if (!this.conversionHistory || this.conversionHistory.length === 0) return null;
    return this.conversionHistory[this.conversionHistory.length - 1];
};

RecipeSchema.methods.isScaledFromOriginal = function() {
    return this.originalServings && this.currentServings &&
        this.originalServings !== this.currentServings;
};

RecipeSchema.methods.isConvertedFromOriginal = function() {
    return this.originalMeasurementSystem && this.currentMeasurementSystem &&
        this.originalMeasurementSystem !== this.currentMeasurementSystem;
};

// NEW: Static methods for transformation queries
RecipeSchema.statics.findScaledRecipes = function(userId = null) {
    const query = { 'scalingHistory.0': { $exists: true } };
    if (userId) {
        query['scalingHistory.scaledBy'] = userId;
    }
    return this.find(query);
};

RecipeSchema.statics.findConvertedRecipes = function(userId = null) {
    const query = { 'conversionHistory.0': { $exists: true } };
    if (userId) {
        query['conversionHistory.convertedBy'] = userId;
    }
    return this.find(query);
};

RecipeSchema.statics.findAiTransformedRecipes = function() {
    return this.find({
        $or: [
            { 'aiTransformations.scalingOptimized': true },
            { 'aiTransformations.unitsOptimized': true }
        ]
    });
};

// NEW: Virtual fields for transformation status
RecipeSchema.virtual('transformationSummary').get(function() {
    return {
        hasScaling: this.hasBeenScaled(),
        hasConversion: this.hasBeenConverted(),
        isModified: this.isScaledFromOriginal() || this.isConvertedFromOriginal(),
        aiOptimized: this.aiTransformations?.scalingOptimized || this.aiTransformations?.unitsOptimized,
        lastTransformation: this.aiTransformations?.lastAiTransformation
    };
});

// Ensure virtual fields are included in JSON output
RecipeSchema.set('toJSON', { virtuals: true });


// NEW: Instance methods for image handling
RecipeSchema.methods.hasVideoSource = function() {
    return !!(this.videoMetadata?.videoSource && this.videoMetadata?.videoPlatform);
};

RecipeSchema.methods.hasExtractedImageData = function() {
    return !!(this.extractedImage?.data);
};

RecipeSchema.methods.hasAnyImage = function() {
    return this.hasUserImage || this.hasExtractedImageData();
};

// NEW: Get image for display (extracted or uploaded)
RecipeSchema.methods.getDisplayImage = function() {
    // Priority: 1) User uploaded image, 2) AI-extracted from video
    if (this.uploadedImage?.data) {
        return {
            type: 'uploaded',
            data: `data:${this.uploadedImage.mimeType};base64,${this.uploadedImage.data}`,
            source: 'user_upload',
            method: 'manual_upload',
            uploadedAt: this.uploadedImage.uploadedAt,
            size: this.uploadedImage.size
        };
    }

    if (this.extractedImage?.data) {
        return {
            type: 'extracted',
            data: `data:image/jpeg;base64,${this.extractedImage.data}`,
            source: this.extractedImage.source, // tiktok, instagram, facebook
            method: 'ai_video_extraction',
            extractedAt: this.extractedImage.extractedAt,
            confidence: this.extractedImage.confidence
        };
    }

    return null;
};

RecipeSchema.methods.getImageUrl = function() {
    if (this.hasAnyImage()) {
        return `/api/recipes/photos/upload?recipeId=${this._id}`;
    }
    return null;
};

// NEW: Remove uploaded image
RecipeSchema.methods.removeUploadedImage = function() {
    this.uploadedImage = undefined;
    this.hasUserImage = false;
    return this.save();
};


RecipeSchema.methods.getTimestampedIngredients = function() {
    return this.ingredients.filter(ingredient => ingredient.videoTimestamp);
};

RecipeSchema.methods.getTimestampedInstructions = function() {
    return this.instructions.filter(instruction => {
        // Handle both string and object instructions
        if (typeof instruction === 'object' && instruction !== null) {
            return instruction.videoTimestamp;
        }
        return false; // Strings don't have timestamps
    });
};

RecipeSchema.methods.getInstructionText = function(instruction) {
    if (typeof instruction === 'string') {
        return instruction;
    }
    if (typeof instruction === 'object' && instruction !== null) {
        return instruction.text || instruction.instruction || '';
    }
    return '';
};

RecipeSchema.methods.hasInstructionVideoData = function(instruction) {
    if (typeof instruction === 'object' && instruction !== null) {
        return !!(instruction.videoTimestamp || instruction.videoLink);
    }
    return false;
};

// NEW: Get video platform display info
RecipeSchema.methods.getVideoPlatformInfo = function() {
    if (!this.videoMetadata?.videoPlatform) return null;

    const platformInfo = {
        tiktok: { icon: '🎵', name: 'TikTok', color: 'pink' },
        instagram: { icon: '📸', name: 'Instagram', color: 'purple' },
        facebook: { icon: '👥', name: 'Facebook', color: 'blue' },
        youtube: { icon: '📺', name: 'YouTube', color: 'red' }
    };

    return platformInfo[this.videoMetadata.videoPlatform.toLowerCase()] || {
        icon: '🎥',
        name: 'Video',
        color: 'gray'
    };
};

// Static methods
RecipeSchema.statics.findVideoRecipes = function(platform = null) {
    const query = { 'videoMetadata.videoPlatform': { $exists: true } };
    if (platform) {
        query['videoMetadata.videoPlatform'] = platform;
    }
    return this.find(query);
};

// NEW: Find recipes with images
RecipeSchema.statics.findRecipesWithImages = function(imageType = 'any') {
    const query = {};

    if (imageType === 'extracted') {
        query['extractedImage.data'] = { $exists: true };
    } else if (imageType === 'uploaded') {
        query.imageUrl = { $exists: true };
    } else if (imageType === 'any') {
        query.$or = [
            { 'extractedImage.data': { $exists: true } },
            { imageUrl: { $exists: true } }
        ];
    }

    return this.find(query);
};

// Static method to find recipes with specific image types
RecipeSchema.statics.findByImageType = function(imageType = 'any') {
    const query = {};

    if (imageType === 'uploaded') {
        query.hasUserImage = true;
    } else if (imageType === 'extracted') {
        query.hasExtractedImage = true;
    } else if (imageType === 'any') {
        query.$or = [
            { hasUserImage: true },
            { hasExtractedImage: true }
        ];
    } else if (imageType === 'none') {
        query.hasUserImage = false;
        query.hasExtractedImage = false;
    }

    return this.find(query);
};


RecipeSchema.statics.findByPlatform = function(platform) {
    return this.find({ 'videoMetadata.videoPlatform': platform });
};

// Virtual for total time
RecipeSchema.virtual('totalTime').get(function() {
    const prep = this.prepTime || 0;
    const cook = this.cookTime || 0;
    return prep + cook;
});

// Virtual for checking if any image exists
RecipeSchema.virtual('hasImage').get(function() {
    return this.hasUserImage || this.hasExtractedImage;
});

// Ensure virtual fields are serialized
RecipeSchema.set('toJSON', { virtuals: true });

// Create indexes for better performance
RecipeSchema.index({title: 'text', description: 'text'});
RecipeSchema.index({tags: 1});
RecipeSchema.index({isPublic: 1});
RecipeSchema.index({createdBy: 1});
RecipeSchema.index({'nutrition.calories.value': 1});
RecipeSchema.index({nutritionCalculatedAt: 1});
RecipeSchema.index({'ratingStats.averageRating': -1});
RecipeSchema.index({'ratingStats.totalRatings': -1});
RecipeSchema.index({'reviews.userId': 1});
RecipeSchema.index({'metrics.viewCount': -1});
RecipeSchema.index({ 'videoMetadata.videoPlatform': 1 }); // NEW: Index for video platform queries
RecipeSchema.index({ 'extractedImage.source': 1 }); // NEW: Index for image source queries
RecipeSchema.index({ 'videoMetadata.hasExtractedImage': 1 }); // NEW: Index for image queries
RecipeSchema.index({ hasUserImage: 1 });
RecipeSchema.index({ hasExtractedImage: 1 });
RecipeSchema.index({ 'uploadedImage.uploadedAt': -1 });


// UPDATED: Daily Nutrition Log Schema with new meal types
const DailyNutritionLogSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    date: {type: Date, required: true},
    meals: [{
        mealType: {
            type: String,
            enum: ['Breakfast', 'AM Snack', 'Lunch', 'Afternoon Snack', 'Dinner', 'PM Snack'],
            required: true
        },
        recipeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Recipe'
        },
        recipeName: String,
        servings: {type: Number, default: 1},
        nutrition: NutritionSchema,
        loggedAt: {type: Date, default: Date.now}
    }],
    totalNutrition: NutritionSchema,
    goals: {
        dailyCalories: Number,
        protein: Number,
        fat: Number,
        carbs: Number,
        fiber: Number,
        sodium: Number
    },
    createdAt: {type: Date, default: Date.now},
    updatedAt: {type: Date, default: Date.now}
});

// Pre-save middleware to update timestamps and stats
SavedShoppingListSchema.pre('save', function (next) {
    this.updatedAt = new Date();

    // Recalculate stats
    this.stats.totalItems = this.items.length;
    this.stats.needToBuy = this.items.filter(item => !item.inInventory && !item.purchased).length;
    this.stats.inInventory = this.items.filter(item => item.inInventory).length;
    this.stats.purchased = this.items.filter(item => item.purchased).length;
    this.stats.categories = [...new Set(this.items.map(item => item.category))].length;

    next();
});

UserSchema.add({
    priceTrackingPreferences: {
        defaultStore: { type: String },
        priceAlertFrequency: { type: String, enum: ['immediate', 'daily', 'weekly'], default: 'daily' },
        trackPricesAutomatically: { type: Boolean, default: true },
        showPriceHistory: { type: Boolean, default: true },
        preferredCurrency: { type: String, default: 'USD' },
        roundPricesToCents: { type: Boolean, default: true }
    }
});

// Check if user has accepted current version of legal documents
UserSchema.methods.hasCurrentLegalAcceptance = function () {
    const currentTermsVersion = '1.0'; // Update when you change terms
    const currentPrivacyVersion = '1.0'; // Update when you change privacy

    return this.legalAcceptance?.termsAccepted &&
        this.legalAcceptance?.privacyAccepted &&
        this.legalVersion?.termsVersion === currentTermsVersion &&
        this.legalVersion?.privacyVersion === currentPrivacyVersion;
};

// Update legal acceptance (for when terms change)
UserSchema.methods.updateLegalAcceptance = function (termsAccepted, privacyAccepted, ipAddress, userAgent) {
    this.legalAcceptance = {
        termsAccepted,
        privacyAccepted,
        acceptanceDate: new Date(),
        ipAddress: ipAddress || 'unknown',
        userAgent: userAgent || 'unknown'
    };

    this.legalVersion = {
        termsVersion: '1.0', // Current version
        privacyVersion: '1.0' // Current version
    };

    return this.save();
};

// Get legal acceptance summary for admin/audit purposes
UserSchema.methods.getLegalAcceptanceSummary = function () {
    return {
        userId: this._id,
        email: this.email,
        termsAccepted: this.legalAcceptance?.termsAccepted || false,
        privacyAccepted: this.legalAcceptance?.privacyAccepted || false,
        acceptanceDate: this.legalAcceptance?.acceptanceDate,
        termsVersion: this.legalVersion?.termsVersion,
        privacyVersion: this.legalVersion?.privacyVersion,
        hasCurrentAcceptance: this.hasCurrentLegalAcceptance()
    };
};

UserSchema.methods.canRequestPasswordReset = function () {
    // Allow 3 reset requests per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    if (!this.passwordResetRequestedAt || this.passwordResetRequestedAt < oneHourAgo) {
        return true;
    }

    return (this.passwordResetCount || 0) < 3;
};

// Track password reset request
UserSchema.methods.trackPasswordResetRequest = function () {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    // Reset counter if it's been more than an hour
    if (!this.passwordResetRequestedAt || this.passwordResetRequestedAt < oneHourAgo) {
        this.passwordResetCount = 1;
    } else {
        this.passwordResetCount = (this.passwordResetCount || 0) + 1;
    }

    this.passwordResetRequestedAt = new Date();
    return this.save();
};

// Clear password reset fields after successful reset
UserSchema.methods.clearPasswordReset = function () {
    this.passwordResetToken = undefined;
    this.passwordResetExpires = undefined;
    this.passwordResetRequestedAt = undefined;
    this.passwordResetCount = 0;
    return this.save();
};

// FIXED: Track UPC scan usage with better error handling
UserSchema.methods.trackUPCScan = function() {
    try {
        // Reset monthly counter if new month
        const now = new Date();

        // Initialize usageTracking if it doesn't exist
        if (!this.usageTracking) {
            this.usageTracking = {
                currentMonth: now.getMonth(),
                currentYear: now.getFullYear(),
                monthlyUPCScans: 0,
                monthlyReceiptScans: 0,
                totalInventoryItems: 0,
                totalPersonalRecipes: 0,
                totalSavedRecipes: 0,
                totalPublicRecipes: 0,
                totalRecipeCollections: 0,
                lastUpdated: now
            };
        }

        // Check if we need to reset monthly counters
        if (this.usageTracking.currentMonth !== now.getMonth() ||
            this.usageTracking.currentYear !== now.getFullYear()) {

            console.log(`📅 Resetting monthly UPC scan counter for user ${this.email}`);
            this.usageTracking.currentMonth = now.getMonth();
            this.usageTracking.currentYear = now.getFullYear();
            this.usageTracking.monthlyUPCScans = 0;
            this.usageTracking.monthlyReceiptScans = 0;
        }

        // Increment the scan count
        this.usageTracking.monthlyUPCScans = (this.usageTracking.monthlyUPCScans || 0) + 1;
        this.usageTracking.lastUpdated = now;

        console.log(`📊 UPC scan tracked: User ${this.email} now has ${this.usageTracking.monthlyUPCScans} scans this month`);

        return this.save();
    } catch (error) {
        console.error('❌ Error in trackUPCScan:', error);
        throw error;
    }
};

// FIXED: Track receipt scan usage with better error handling
UserSchema.methods.trackReceiptScan = function() {
    try {
        const now = new Date();

        // Initialize usageTracking if it doesn't exist
        if (!this.usageTracking) {
            this.usageTracking = {
                currentMonth: now.getMonth(),
                currentYear: now.getFullYear(),
                monthlyUPCScans: 0,
                monthlyReceiptScans: 0,
                totalInventoryItems: 0,
                totalPersonalRecipes: 0,
                totalSavedRecipes: 0,
                totalPublicRecipes: 0,
                totalRecipeCollections: 0,
                lastUpdated: now
            };
        }

        // Check if we need to reset monthly counters
        if (this.usageTracking.currentMonth !== now.getMonth() ||
            this.usageTracking.currentYear !== now.getFullYear()) {

            console.log(`📅 Resetting monthly receipt scan counter for user ${this.email}`);
            this.usageTracking.currentMonth = now.getMonth();
            this.usageTracking.currentYear = now.getFullYear();
            this.usageTracking.monthlyUPCScans = 0;
            this.usageTracking.monthlyReceiptScans = 0;
        }

        // Increment the receipt scan count
        this.usageTracking.monthlyReceiptScans = (this.usageTracking.monthlyReceiptScans || 0) + 1;
        this.usageTracking.lastUpdated = now;

        console.log(`📊 Receipt scan tracked: User ${this.email} now has ${this.usageTracking.monthlyReceiptScans} receipt scans this month`);

        return this.save();
    } catch (error) {
        console.error('❌ Error in trackReceiptScan:', error);
        throw error;
    }
};

// FIXED: Update inventory item count with better error handling
UserSchema.methods.updateInventoryCount = function(count) {
    try {
        // Initialize usageTracking if it doesn't exist
        if (!this.usageTracking) {
            const now = new Date();
            this.usageTracking = {
                currentMonth: now.getMonth(),
                currentYear: now.getFullYear(),
                monthlyUPCScans: 0,
                monthlyReceiptScans: 0,
                totalInventoryItems: 0,
                totalPersonalRecipes: 0,
                totalSavedRecipes: 0,
                totalPublicRecipes: 0,
                totalRecipeCollections: 0,
                lastUpdated: now
            };
        }

        this.usageTracking.totalInventoryItems = count;
        this.usageTracking.lastUpdated = new Date();

        return this.save();
    } catch (error) {
        console.error('❌ Error in updateInventoryCount:', error);
        throw error;
    }
};

// FIXED: Update personal recipe count with better error handling
UserSchema.methods.updatePersonalRecipeCount = function(count) {
    try {
        // Initialize usageTracking if it doesn't exist
        if (!this.usageTracking) {
            const now = new Date();
            this.usageTracking = {
                currentMonth: now.getMonth(),
                currentYear: now.getFullYear(),
                monthlyUPCScans: 0,
                monthlyReceiptScans: 0,
                totalInventoryItems: 0,
                totalPersonalRecipes: 0,
                totalSavedRecipes: 0,
                totalPublicRecipes: 0,
                totalRecipeCollections: 0,
                lastUpdated: now
            };
        }

        this.usageTracking.totalPersonalRecipes = count;
        this.usageTracking.lastUpdated = new Date();

        return this.save();
    } catch (error) {
        console.error('❌ Error in updatePersonalRecipeCount:', error);
        throw error;
    }
};

// FIXED: Check if subscription is active with better error handling
UserSchema.methods.hasActiveSubscription = function() {
    try {
        if (!this.subscription) return false;

        const status = this.subscription.status;
        if (status === 'free') return true; // Free is always "active"
        if (status === 'active') return true;
        if (status === 'trial') {
            return this.subscription.trialEndDate && new Date() < new Date(this.subscription.trialEndDate);
        }

        return false;
    } catch (error) {
        console.error('❌ Error checking subscription status:', error);
        return false; // Default to inactive if error
    }
};

// FIXED: Get effective tier with better error handling
UserSchema.methods.getEffectiveTier = function() {
    try {
        // Admin check first
        if (this.isAdmin) {
            return 'admin';
        }

        if (!this.hasActiveSubscription()) {
            return 'free';
        }

        return this.subscription?.tier || 'free';
    } catch (error) {
        console.error('❌ Error getting effective tier:', error);
        return 'free';
    }
};

// FIXED: Update recipe collection count with better error handling
UserSchema.methods.updateRecipeCollectionCount = function(count) {
    try {
        // Initialize usageTracking if it doesn't exist
        if (!this.usageTracking) {
            const now = new Date();
            this.usageTracking = {
                currentMonth: now.getMonth(),
                currentYear: now.getFullYear(),
                monthlyUPCScans: 0,
                monthlyReceiptScans: 0,
                totalInventoryItems: 0,
                totalPersonalRecipes: 0,
                totalSavedRecipes: 0,
                totalPublicRecipes: 0,
                totalRecipeCollections: 0,
                lastUpdated: now
            };
        }

        this.usageTracking.totalRecipeCollections = count;
        this.usageTracking.lastUpdated = new Date();

        return this.save();
    } catch (error) {
        console.error('❌ Error in updateRecipeCollectionCount:', error);
        throw error;
    }
};

// FIXED: Enhanced canPerformAction method with better error handling
UserSchema.methods.canPerformAction = function(feature, currentCount = null) {
    try {
        // Admin always has access to everything
        if (this.isAdmin) {
            return { allowed: true, reason: 'admin_access' };
        }

        const subscription = this.subscription || { tier: 'free', status: 'free' };

        // First check if feature is available for their tier
        if (!checkFeatureAccess(subscription, feature)) {
            return { allowed: false, reason: 'feature_not_available' };
        }

        // Then check usage limits if a count is provided
        if (currentCount !== null && !checkUsageLimit(subscription, feature, currentCount)) {
            return { allowed: false, reason: 'limit_exceeded' };
        }

        return { allowed: true };
    } catch (error) {
        console.error('❌ Error in canPerformAction:', error);
        return { allowed: false, reason: 'error_checking_permissions' };
    }
};

// FIXED: Get usage summary for debugging
UserSchema.methods.getUsageSummary = function() {
    try {
        const now = new Date();
        const usage = this.usageTracking || {};

        return {
            userId: this._id,
            email: this.email,
            tier: this.getEffectiveTier(),
            currentMonth: now.getMonth(),
            currentYear: now.getFullYear(),
            trackedMonth: usage.currentMonth,
            trackedYear: usage.currentYear,
            monthlyUPCScans: usage.monthlyUPCScans || 0,
            monthlyReceiptScans: usage.monthlyReceiptScans || 0,
            totalInventoryItems: usage.totalInventoryItems || 0,
            totalPersonalRecipes: usage.totalPersonalRecipes || 0,
            totalRecipeCollections: usage.totalRecipeCollections || 0,
            lastUpdated: usage.lastUpdated || null,
            needsReset: !usage.currentMonth || usage.currentMonth !== now.getMonth() || usage.currentYear !== now.getFullYear()
        };
    } catch (error) {
        console.error('❌ Error getting usage summary:', error);
        return {
            error: 'Failed to get usage summary',
            userId: this._id
        };
    }
};

// Add this method to your UserSchema.methods
UserSchema.methods.checkAndResetMonthlyUsage = function() {
    try {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        // Initialize usageTracking if it doesn't exist
        if (!this.usageTracking) {
            this.usageTracking = {
                currentMonth,
                currentYear,
                // Monthly counters (reset each month)
                monthlyUPCScans: 0,
                monthlyReceiptScans: 0,
                // Total counters (never reset)
                totalInventoryItems: 0,
                totalPersonalRecipes: 0,
                totalSavedRecipes: 0,
                totalPublicRecipes: 0,
                totalRecipeCollections: 0,
                lastUpdated: now
            };
            console.log(`📊 Initialized usage tracking for user ${this.email}`);
            return true;
        }

        // Check if we need to reset monthly counters
        if (this.usageTracking.currentMonth !== currentMonth ||
            this.usageTracking.currentYear !== currentYear) {

            console.log(`📅 Resetting MONTHLY usage for user ${this.email} - was ${this.usageTracking.currentMonth}/${this.usageTracking.currentYear}, now ${currentMonth}/${currentYear}`);

            // Reset ONLY monthly counters
            this.usageTracking.currentMonth = currentMonth;
            this.usageTracking.currentYear = currentYear;
            this.usageTracking.monthlyUPCScans = 0;
            this.usageTracking.monthlyReceiptScans = 0;
            // DO NOT reset total counters - they persist across months
            this.usageTracking.lastUpdated = now;

            return true; // Indicates reset occurred
        }

        return false; // No reset needed
    } catch (error) {
        console.error('❌ Error in checkAndResetMonthlyUsage:', error);
        return false;
    }
};

// Add this method to your UserSchema.methods
UserSchema.methods.checkAndExpireTrial = function() {
    try {
        // Only check if user is currently on trial status in database
        if (this.subscription?.status !== 'trial') {
            return false; // Not on trial status, nothing to expire
        }

        // Use existing hasActiveSubscription logic to check if trial is expired
        if (!this.hasActiveSubscription()) {
            console.log(`⏰ Trial expired for user ${this.email} - trial ended ${this.subscription.trialEndDate}`);

            // Update database to reflect expired trial
            this.subscription.tier = 'free';
            this.subscription.status = 'free';
            this.subscription.billingCycle = null;
            this.subscription.endDate = null;
            this.subscription.nextBillingDate = null;

            // Keep trial dates for record keeping
            // this.subscription.trialStartDate - keep
            // this.subscription.trialEndDate - keep

            return true; // Indicates trial was expired and database updated
        }

        return false; // Trial still active
    } catch (error) {
        console.error('❌ Error in checkAndExpireTrial:', error);
        return false;
    }
};

// Email verification rate limiting (allow 3 requests per hour)
UserSchema.methods.canRequestEmailVerification = function() {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    // If no previous request or it was over an hour ago, allow request
    if (!this.emailVerificationRequestedAt || this.emailVerificationRequestedAt < oneHourAgo) {
        return true;
    }

    // For security, limit to 3 verification requests per hour
    return false;
};

// Generate email verification token and set expiration
UserSchema.methods.generateEmailVerificationToken = function() {
    // Generate a secure random token
    const token = crypto.randomBytes(32).toString('hex');

    // Set token and expiration (24 hours from now)
    this.emailVerificationToken = token;
    this.emailVerificationExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    this.emailVerificationRequestedAt = new Date();

    return token;
};

// Verify email with token
UserSchema.methods.verifyEmailWithToken = function(token) {
    // Check if token matches and hasn't expired
    if (this.emailVerificationToken === token &&
        this.emailVerificationExpires &&
        new Date() < this.emailVerificationExpires) {

        // Mark email as verified and clear verification fields
        this.emailVerified = true;
        this.emailVerificationToken = undefined;
        this.emailVerificationExpires = undefined;
        this.emailVerificationRequestedAt = undefined;

        return true;
    }

    return false;
};

// Clear email verification fields after successful verification
UserSchema.methods.clearEmailVerification = function() {
    this.emailVerificationToken = undefined;
    this.emailVerificationExpires = undefined;
    this.emailVerificationRequestedAt = undefined;
    return this.save();
};

// Methods for meal prep suggestions
MealPrepSuggestionSchema.methods.markTaskCompleted = function (taskId) {
    if (!this.implementation.tasksCompleted.includes(taskId)) {
        this.implementation.tasksCompleted.push(taskId);

        // Recalculate completion rate
        const totalTasks = this.prepSchedule.reduce((total, day) => total + day.tasks.length, 0);
        this.implementation.completionRate = totalTasks > 0 ?
            Math.floor((this.implementation.tasksCompleted.length / totalTasks) * 100) : 0;

        // Update status based on completion
        if (this.implementation.completionRate === 100) {
            this.status = 'completed';
        } else if (this.implementation.completionRate > 0) {
            this.status = 'in_progress';
        }
    }

    return this.save();
};

MealPrepSuggestionSchema.methods.addFeedback = function (feedback) {
    this.implementation.feedback = {
        ...this.implementation.feedback,
        ...feedback
    };

    return this.save();
};

// Template usage tracking
MealPrepTemplateSchema.methods.recordUsage = function (rating) {
    this.usage.timesUsed += 1;
    this.usage.lastUsed = new Date();

    if (rating && rating >= 1 && rating <= 5) {
        const currentRating = this.usage.averageRating || 0;
        const currentCount = this.usage.timesUsed - 1;
        this.usage.averageRating = ((currentRating * currentCount) + rating) / this.usage.timesUsed;
    }

    return this.save();
};

// Methods for SavedShoppingList
SavedShoppingListSchema.methods.markAsLoaded = function () {
    this.usage.timesLoaded += 1;
    this.usage.lastLoaded = new Date();
    return this.save();
};

SavedShoppingListSchema.methods.startShoppingSession = function () {
    this.shoppingSessions.push({
        startedAt: new Date(),
        totalItems: this.stats.totalItems
    });
    return this.save();
};

SavedShoppingListSchema.methods.completeShoppingSession = function (itemsPurchased, notes = '') {
    const currentSession = this.shoppingSessions[this.shoppingSessions.length - 1];
    if (currentSession && !currentSession.completedAt) {
        const now = new Date();
        currentSession.completedAt = now;
        currentSession.itemsPurchased = itemsPurchased;
        currentSession.duration = Math.round((now - currentSession.startedAt) / (1000 * 60)); // minutes
        currentSession.notes = notes;

        // Update completion rate
        const completedSessions = this.shoppingSessions.filter(s => s.completedAt);
        if (completedSessions.length > 0) {
            const avgCompletion = completedSessions.reduce((sum, s) =>
                sum + (s.itemsPurchased / s.totalItems), 0) / completedSessions.length;
            this.usage.completionRate = Math.round(avgCompletion * 100);

            const avgDuration = completedSessions.reduce((sum, s) => sum + s.duration, 0) / completedSessions.length;
            this.usage.averageCompletionTime = Math.round(avgDuration);
        }
    }
    return this.save();
};

// Add method to get display name for any meal type
MealPlanEntrySchema.methods.getDisplayName = function () {
    if (this.entryType === 'recipe') {
        return this.recipeName;
    } else {
        return this.simpleMeal.name || this.simpleMeal.items.map(item => item.itemName).join(', ');
    }
};

// Add method to get estimated total time
MealPlanEntrySchema.methods.getTotalTime = function () {
    if (this.entryType === 'recipe') {
        return (this.prepTime || 0) + (this.cookTime || 0);
    } else {
        return this.simpleMeal.totalEstimatedTime || 30;
    }
};

// Add method to get ingredients/items for shopping list
MealPlanEntrySchema.methods.getIngredients = function () {
    if (this.entryType === 'recipe') {
        // This would need to be populated from the recipe
        return [];
    } else {
        return this.simpleMeal.items.map(item => ({
            name: item.itemName,
            quantity: item.quantity,
            unit: item.unit,
            category: item.itemCategory,
            isFromInventory: true
        }));
    }
};

// Methods for meal completion
MealPlanEntrySchema.methods.markComplete = function(completionData) {
    this.completed = true;
    this.completedAt = new Date();
    this.completionType = completionData.completionType || 'full';
    this.completionPercentage = completionData.completionPercentage || 100;
    this.completionNotes = completionData.notes || '';

    if (completionData.itemsConsumed) {
        this.itemsConsumed = completionData.itemsConsumed.map(item => ({
            inventoryItemId: item.inventoryItemId,
            itemName: item.itemName,
            quantityConsumed: item.quantityConsumed,
            unit: item.unit,
            consumedAt: new Date()
        }));
    }

    return this;
};

MealPlanEntrySchema.methods.undoCompletion = function() {
    this.completed = false;
    this.completedAt = null;
    this.completionType = 'full';
    this.completionPercentage = 100;
    this.completionNotes = '';
    this.itemsConsumed = [];

    return this;
};

MealPlanEntrySchema.methods.getCompletionSummary = function() {
    return {
        isCompleted: this.completed,
        completedAt: this.completedAt,
        completionType: this.completionType,
        completionPercentage: this.completionPercentage,
        notes: this.completionNotes,
        itemsConsumedCount: this.itemsConsumed?.length || 0
    };
};

MealPlanEntrySchema.methods.getDisplayStatus = function() {
    if (!this.completed) {
        return { status: 'planned', icon: '', class: '' };
    }

    if (this.completionPercentage === 100) {
        return {
            status: 'completed',
            icon: '✅',
            class: 'bg-gray-100 border-gray-300 opacity-75'
        };
    } else {
        return {
            status: 'partial',
            icon: '🔄',
            class: 'bg-yellow-50 border-yellow-300'
        };
    }
};

// Methods for meal suggestions
CuratedMealSchema.methods.recordSuggestion = function() {
    this.usageStats.timesSuggested += 1;
    this.usageStats.lastSuggested = new Date();
    return this.save();
};

CuratedMealSchema.methods.recordUsage = function() {
    this.usageStats.timesUsed += 1;
    return this.save();
};

CuratedMealSchema.methods.addRating = function(rating) {
    const currentRating = this.usageStats.userRating || 0;
    const currentCount = this.usageStats.ratingCount || 0;

    this.usageStats.userRating = ((currentRating * currentCount) + rating) / (currentCount + 1);
    this.usageStats.ratingCount = currentCount + 1;

    return this.save();
};

// Static methods for admin approval
CuratedMealSchema.statics.approve = function(mealId, adminUserId) {
    return this.findByIdAndUpdate(mealId, {
        isApproved: true,
        status: 'approved',
        approvedBy: adminUserId,
        approvedAt: new Date()
    }, {new: true});
};

CuratedMealSchema.statics.reject = function(mealId, reason) {
    return this.findByIdAndUpdate(mealId, {
        status: 'rejected',
        rejectionReason: reason
    }, {new: true});
};

// Pre-save middleware
CuratedMealSchema.pre('save', function(next) {
    this.updatedAt = new Date();

    // Auto-approve admin submissions
    if (this.submissionType === 'admin' && this.isNew) {
        this.isApproved = true;
        this.status = 'approved';
        this.approvedBy = this.createdBy;
        this.approvedAt = new Date();
    }

    next();
});

// Password reset indexes for security and performance
UserSchema.index({passwordResetToken: 1});
UserSchema.index({passwordResetExpires: 1});
UserSchema.index({email: 1, passwordResetRequestedAt: 1}); // For rate limiting
// Add indexes for compliance queries
UserSchema.index({ 'legalAcceptance.country': 1 });
UserSchema.index({ 'legalAcceptance.isEUUser': 1 });
UserSchema.index({ 'legalAcceptance.isMinor': 1 });
UserSchema.index({ 'legalAcceptance.parentVerificationRequired': 1 });
UserSchema.index({ 'dataRetention.retentionCategory': 1 });
UserSchema.index({ 'dataRetention.scheduledDeletionDate': 1 });

// Create indexes for better performance
UserInventorySchema.index({userId: 1});

// Add expiration date index for efficient expiration queries
InventoryItemSchema.index({expirationDate: 1});

// Add nutrition tracking indexes
DailyNutritionLogSchema.index({userId: 1, date: 1}, {unique: true});
DailyNutritionLogSchema.index({userId: 1, 'meals.recipeId': 1});

// Create indexes for meal planning
MealPlanSchema.index({userId: 1, weekStartDate: 1});
MealPlanSchema.index({userId: 1, isActive: 1});
MealPlanSchema.index({weekStartDate: 1});

MealPlanTemplateSchema.index({userId: 1});
MealPlanTemplateSchema.index({isPublic: 1, category: 1});
MealPlanTemplateSchema.index({timesUsed: -1});

ContactSchema.index({userId: 1, email: 1}, {unique: true});
ContactSchema.index({userId: 1, isActive: 1});
ContactSchema.index({'stats.lastEmailSent': 1});

EmailLogSchema.index({userId: 1, sentAt: -1});
EmailLogSchema.index({'recipients.email': 1});
EmailLogSchema.index({emailType: 1, sentAt: -1});

SavedShoppingListSchema.index({userId: 1, createdAt: -1});
SavedShoppingListSchema.index({userId: 1, isArchived: 1});
SavedShoppingListSchema.index({userId: 1, listType: 1});
SavedShoppingListSchema.index({userId: 1, tags: 1});
SavedShoppingListSchema.index({'usage.lastLoaded': -1});
SavedShoppingListSchema.index({'stats.totalItems': 1});

ShoppingListTemplateSchema.index({userId: 1, category: 1});
ShoppingListTemplateSchema.index({isPublic: 1, timesUsed: -1});
ShoppingListTemplateSchema.index({userId: 1, timesUsed: -1});

MealPrepSuggestionSchema.index({userId: 1, weekStartDate: -1});
MealPrepSuggestionSchema.index({mealPlanId: 1});
MealPrepSuggestionSchema.index({status: 1, userId: 1});
MealPrepSuggestionSchema.index({'preferences.preferredPrepDays': 1});

MealPrepTemplateSchema.index({userId: 1, category: 1});
MealPrepTemplateSchema.index({isPublic: 1, category: 1});
MealPrepTemplateSchema.index({tags: 1});
MealPrepTemplateSchema.index({'usage.averageRating': -1});

MealPrepKnowledgeSchema.index({ingredient: 1});
MealPrepKnowledgeSchema.index({category: 1});

// Indexes for performance
CuratedMealSchema.index({isApproved: 1, status: 1});
CuratedMealSchema.index({createdBy: 1});
CuratedMealSchema.index({submittedBy: 1});
CuratedMealSchema.index({mealType: 1, isApproved: 1});
CuratedMealSchema.index({tags: 1});
CuratedMealSchema.index({'components.category': 1});
CuratedMealSchema.index({'usageStats.timesSuggested': -1});
CuratedMealSchema.index({estimatedTime: 1});
CuratedMealSchema.index({difficulty: 1});

// Declare variables first
let User, Recipe, RecipePhoto,UserInventory, InventoryItem, Store, DailyNutritionLog,
    MealPlan, MealPlanTemplate, Contact, EmailLog, SavedShoppingList,
    ShoppingListTemplate, MealPrepSuggestion, MealPrepTemplate,
    MealPrepKnowledge, CuratedMeal, RecipeCollection;

try {
    // Export models (prevent re-compilation in development)
    User = mongoose.models.User || mongoose.model('User', UserSchema);
    UserInventory = mongoose.models.UserInventory || mongoose.model('UserInventory', UserInventorySchema);
    InventoryItem = mongoose.models.InventoryItem || mongoose.model('InventoryItem', InventoryItemSchema);
    Store = mongoose.models.Store || mongoose.model('Store', StoreSchema);
    Recipe = mongoose.models.Recipe || mongoose.model('Recipe', RecipeSchema);
    RecipePhoto = mongoose.models.RecipePhoto || mongoose.model('RecipePhoto', RecipePhotoSchema);
    DailyNutritionLog = mongoose.models.DailyNutritionLog || mongoose.model('DailyNutritionLog', DailyNutritionLogSchema);
    MealPlan = mongoose.models.MealPlan || mongoose.model('MealPlan', MealPlanSchema);
    MealPlanTemplate = mongoose.models.MealPlanTemplate || mongoose.model('MealPlanTemplate', MealPlanTemplateSchema);
    Contact = mongoose.models.Contact || mongoose.model('Contact', ContactSchema);
    EmailLog = mongoose.models.EmailLog || mongoose.model('EmailLog', EmailLogSchema);
    SavedShoppingList = mongoose.models.SavedShoppingList || mongoose.model('SavedShoppingList', SavedShoppingListSchema);
    ShoppingListTemplate = mongoose.models.ShoppingListTemplate || mongoose.model('ShoppingListTemplate', ShoppingListTemplateSchema);
    MealPrepSuggestion = mongoose.models.MealPrepSuggestion || mongoose.model('MealPrepSuggestion', MealPrepSuggestionSchema);
    MealPrepTemplate = mongoose.models.MealPrepTemplate || mongoose.model('MealPrepTemplate', MealPrepTemplateSchema);
    MealPrepKnowledge = mongoose.models.MealPrepKnowledge || mongoose.model('MealPrepKnowledge', MealPrepKnowledgeSchema);
    CuratedMeal = mongoose.models.CuratedMeal || mongoose.model('CuratedMeal', CuratedMealSchema);

    // NEW: Add RecipeCollection model
    RecipeCollection = mongoose.models.RecipeCollection || mongoose.model('RecipeCollection', RecipeCollectionSchema);

} catch (error) {
    console.error('Error creating models:', error);
    // Initialize as empty objects to prevent import errors
    const emptyModel = {};
    User = User || emptyModel;
    UserInventory = UserInventory || emptyModel;
    InventoryItem = InventoryItem || emptyModel;
    Store = Store || emptyModel;
    Recipe = Recipe || emptyModel;
    RecipePhoto = RecipePhoto || emptyModel;
    DailyNutritionLog = DailyNutritionLog || emptyModel;
    MealPlan = MealPlan || emptyModel;
    MealPlanTemplate = MealPlanTemplate || emptyModel;
    Contact = Contact || emptyModel;
    EmailLog = EmailLog || emptyModel;
    SavedShoppingList = SavedShoppingList || emptyModel;
    ShoppingListTemplate = ShoppingListTemplate || emptyModel;
    MealPrepSuggestion = MealPrepSuggestion || emptyModel;
    MealPrepTemplate = MealPrepTemplate || emptyModel;
    MealPrepKnowledge = MealPrepKnowledge || emptyModel;
    CuratedMeal = CuratedMeal || emptyModel;
    RecipeCollection = RecipeCollection || emptyModel;
}

export {
    User,
    UserInventory,
    InventoryItem,
    Store,
    Recipe,
    RecipePhoto,
    DailyNutritionLog,
    NutritionSchema,
    MealPlan,
    MealPlanTemplate,
    Contact,
    EmailLog,
    SavedShoppingList,
    ShoppingListTemplate,
    MealPrepSuggestion,
    MealPrepTemplate,
    MealPrepKnowledge,
    CuratedMeal,
    RecipeCollection // NEW: Export RecipeCollection
};