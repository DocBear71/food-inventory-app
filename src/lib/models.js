// file: /src/lib/models.js - v12 - FIXED with RecipeCollection model and proper exports - Updated for saved recipes fix

import mongoose from 'mongoose';
const crypto = require('crypto');

// Nutrition Schema
const NutritionSchema = new mongoose.Schema({
    calories: {
        value: {type: Number, default: 0},
        unit: {type: String, default: 'kcal'},
        name: {type: String, default: 'Calories'}
    },
    protein: {
        value: {type: Number, default: 0},
        unit: {type: String, default: 'g'},
        name: {type: String, default: 'Protein'}
    },
    fat: {
        value: {type: Number, default: 0},
        unit: {type: String, default: 'g'},
        name: {type: String, default: 'Fat'}
    },
    carbs: {
        value: {type: Number, default: 0},
        unit: {type: String, default: 'g'},
        name: {type: String, default: 'Carbohydrates'}
    },
    fiber: {
        value: {type: Number, default: 0},
        unit: {type: String, default: 'g'},
        name: {type: String, default: 'Fiber'}
    },
    sugars: {
        value: {type: Number, default: 0},
        unit: {type: String, default: 'g'},
        name: {type: String, default: 'Sugars'}
    },
    sodium: {
        value: {type: Number, default: 0},
        unit: {type: String, default: 'mg'},
        name: {type: String, default: 'Sodium'}
    },
    vitaminC: {
        value: {type: Number, default: 0},
        unit: {type: String, default: 'mg'},
        name: {type: String, default: 'Vitamin C'}
    },
    vitaminA: {
        value: {type: Number, default: 0},
        unit: {type: String, default: 'IU'},
        name: {type: String, default: 'Vitamin A'}
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
    }
}, {_id: false});

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
        }
    },
    legalVersion: {
        termsVersion: {
            type: String,
            default: '1.0' // Update this when you change terms
        },
        privacyVersion: {
            type: String,
            default: '1.0' // Update this when you change privacy policy
        }
    },
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
            enum: ['free', 'gold', 'platinum'],
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
});

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

    createdAt: {type: Date, default: Date.now}
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
            purchased: {type: Boolean, default: false}
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
        notes: String // User can add notes to specific items
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

    // Storage recommendations
    storage: {
        refrigerator: {
            maxDays: {type: Number},
            containerType: {type: String},
            tips: [String]
        },
        freezer: {
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
});

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
        enum: ['pantry', 'kitchen', 'fridge', 'freezer', 'other'],
        default: 'pantry'
    },
    notes: String,
    // Nutrition data for individual items
    nutrition: NutritionSchema,
    fdcId: String, // USDA Food Data Central ID for nutrition lookup
    // Expiration tracking fields
    notificationSent: {type: Boolean, default: false},
    lastNotifiedDate: Date
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

// Recipe Ingredient Schema - Enhanced with nutrition
const RecipeIngredientSchema = new mongoose.Schema({
    name: {type: String, required: true},
    amount: {type: mongoose.Schema.Types.Mixed}, // Updated to Mixed for flexible types
    unit: String,
    category: String,
    alternatives: [String],
    optional: {type: Boolean, default: false},
    // Nutrition data for this ingredient
    fdcId: String, // USDA Food Data Central ID
    nutrition: NutritionSchema
});

// Recipe Schema - Enhanced with rating, review system, and USER TRACKING
const RecipeSchema = new mongoose.Schema({
    title: {type: String, required: true},
    description: {type: String, default: ''}, // Updated with default
    ingredients: [RecipeIngredientSchema],
    instructions: [String],
    cookTime: Number, // in minutes
    prepTime: Number, // in minutes
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
    source: {type: String, default: ''}, // Updated with default
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    // USER TRACKING FIELDS
    lastEditedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    importedFrom: {
        type: String,
        default: null // e.g., "Doc Bear's Comfort Food Survival Guide Volume 1"
    },

    isPublic: {type: Boolean, default: false},

    // Nutrition information
    nutrition: NutritionSchema,
    nutritionCalculatedAt: Date,
    nutritionCoverage: Number, // Percentage of ingredients with nutrition data
    nutritionManuallySet: {type: Boolean, default: false},

    // Rating and Review System
    reviews: [RecipeReviewSchema],

    // Cached rating statistics for performance
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

    // Recipe engagement metrics
    metrics: {
        viewCount: {type: Number, default: 0},
        saveCount: {type: Number, default: 0}, // Future: users can save recipes
        shareCount: {type: Number, default: 0},
        lastViewed: Date
    },

    createdAt: {type: Date, default: Date.now},
    updatedAt: {type: Date, default: Date.now}
}, {
    timestamps: true // This will auto-update updatedAt
});

// Pre-save middleware to update lastEditedBy on edits
RecipeSchema.pre('save', function (next) {
    if (this.isModified() && !this.isNew) {
        this.updatedAt = new Date();
        // Note: lastEditedBy should be set in your API routes when editing
    }
    next();
});

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
        if (!this.hasActiveSubscription()) {
            return 'free';
        }

        return this.subscription?.tier || 'free';
    } catch (error) {
        console.error('❌ Error getting effective tier:', error);
        return 'free'; // Default to free if error
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
        const subscription = this.subscription || { tier: 'free', status: 'free' };

        // Import the functions (you'll need to import these at the top of your models file)
        const { checkFeatureAccess, checkUsageLimit } = require('./subscription-config');

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
    const crypto = require('crypto');

    // Generate a secure random token
    const token = crypto.randomBytes(32).toString('hex');

    // Set token and expiration (24 hours from now)
    this.emailVerificationToken = token;
    this.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
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

// Create indexes for better performance
UserInventorySchema.index({userId: 1});
RecipeSchema.index({title: 'text', description: 'text'});
RecipeSchema.index({tags: 1});
RecipeSchema.index({isPublic: 1});
RecipeSchema.index({createdBy: 1});
RecipeSchema.index({'nutrition.calories.value': 1}); // For nutrition-based filtering
RecipeSchema.index({nutritionCalculatedAt: 1});

// Rating and review indexes
RecipeSchema.index({'ratingStats.averageRating': -1}); // For sorting by rating
RecipeSchema.index({'ratingStats.totalRatings': -1}); // For sorting by popularity
RecipeSchema.index({'reviews.userId': 1}); // For finding user's reviews
RecipeSchema.index({'metrics.viewCount': -1}); // For trending recipes

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
let User, UserInventory, Recipe, DailyNutritionLog, MealPlan, MealPlanTemplate, Contact, EmailLog, SavedShoppingList,
    ShoppingListTemplate, MealPrepSuggestion, MealPrepTemplate, MealPrepKnowledge, CuratedMeal, RecipeCollection;

try {
    // Export models (prevent re-compilation in development)
    User = mongoose.models.User || mongoose.model('User', UserSchema);
    UserInventory = mongoose.models.UserInventory || mongoose.model('UserInventory', UserInventorySchema);
    Recipe = mongoose.models.Recipe || mongoose.model('Recipe', RecipeSchema);
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
    Recipe = Recipe || emptyModel;
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
    Recipe,
    DailyNutritionLog,
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