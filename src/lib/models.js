// file: /src/lib/models.js - v6

import mongoose from 'mongoose';

// Nutrition Schema
const NutritionSchema = new mongoose.Schema({
    calories: {
        value: { type: Number, default: 0 },
        unit: { type: String, default: 'kcal' },
        name: { type: String, default: 'Calories' }
    },
    protein: {
        value: { type: Number, default: 0 },
        unit: { type: String, default: 'g' },
        name: { type: String, default: 'Protein' }
    },
    fat: {
        value: { type: Number, default: 0 },
        unit: { type: String, default: 'g' },
        name: { type: String, default: 'Fat' }
    },
    carbs: {
        value: { type: Number, default: 0 },
        unit: { type: String, default: 'g' },
        name: { type: String, default: 'Carbohydrates' }
    },
    fiber: {
        value: { type: Number, default: 0 },
        unit: { type: String, default: 'g' },
        name: { type: String, default: 'Fiber' }
    },
    sugars: {
        value: { type: Number, default: 0 },
        unit: { type: String, default: 'g' },
        name: { type: String, default: 'Sugars' }
    },
    sodium: {
        value: { type: Number, default: 0 },
        unit: { type: String, default: 'mg' },
        name: { type: String, default: 'Sodium' }
    },
    vitaminC: {
        value: { type: Number, default: 0 },
        unit: { type: String, default: 'mg' },
        name: { type: String, default: 'Vitamin C' }
    },
    vitaminA: {
        value: { type: Number, default: 0 },
        unit: { type: String, default: 'IU' },
        name: { type: String, default: 'Vitamin A' }
    },
    calcium: {
        value: { type: Number, default: 0 },
        unit: { type: String, default: 'mg' },
        name: { type: String, default: 'Calcium' }
    },
    iron: {
        value: { type: Number, default: 0 },
        unit: { type: String, default: 'mg' },
        name: { type: String, default: 'Iron' }
    }
}, { _id: false });

// NEW: Recipe Review Schema
const RecipeReviewSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    userName: { type: String, required: true }, // Cache user name for performance
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
    // Optional: What the user thought about specific aspects
    aspects: {
        taste: { type: Number, min: 1, max: 5 },
        difficulty: { type: Number, min: 1, max: 5 },
        instructions: { type: Number, min: 1, max: 5 }
    },
    // Did they modify the recipe?
    modifications: {
        type: String,
        maxlength: 500,
        trim: true
    },
    // Would they make it again?
    wouldMakeAgain: { type: Boolean },

    // Helpful voting system
    helpfulVotes: { type: Number, default: 0 },
    unhelpfulVotes: { type: Number, default: 0 },
    votedBy: [{
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        vote: { type: String, enum: ['helpful', 'unhelpful'] }
    }],

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Notification Settings Schema
const NotificationSettingsSchema = new mongoose.Schema({
    email: {
        enabled: { type: Boolean, default: false },
        dailyDigest: { type: Boolean, default: false },
        expirationAlerts: { type: Boolean, default: true },
        daysBeforeExpiration: { type: Number, default: 3, min: 1, max: 30 }
    },
    dashboard: {
        showExpirationPanel: { type: Boolean, default: true },
        showQuickStats: { type: Boolean, default: true },
        alertThreshold: { type: Number, default: 7, min: 1, max: 30 }
    },
    mobile: {
        pushNotifications: { type: Boolean, default: false },
        soundEnabled: { type: Boolean, default: true }
    }
}, { _id: false });

// User Schema - Updated
const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
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
    // Nutrition tracking preferences
    nutritionGoals: {
        dailyCalories: { type: Number, default: 2000 },
        protein: { type: Number, default: 150 }, // grams
        fat: { type: Number, default: 65 }, // grams
        carbs: { type: Number, default: 250 }, // grams
        fiber: { type: Number, default: 25 }, // grams
        sodium: { type: Number, default: 2300 } // mg
    },
    // NEW: User profile for reviews
    profile: {
        bio: { type: String, maxlength: 200 },
        cookingLevel: {
            type: String,
            enum: ['beginner', 'intermediate', 'advanced'],
            default: 'beginner'
        },
        favoritesCuisines: [String],
        reviewCount: { type: Number, default: 0 },
        averageRatingGiven: { type: Number, default: 0 }
    },
    lastNotificationSent: Date,
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Inventory Item Schema
const InventoryItemSchema = new mongoose.Schema({
    upc: { type: String, index: true },
    name: { type: String, required: true },
    brand: String,
    category: String,
    quantity: { type: Number, default: 1 },
    unit: { type: String, default: 'item' },
    expirationDate: Date,
    addedDate: { type: Date, default: Date.now },
    location: {
        type: String,
        enum: ['pantry', 'fridge', 'freezer', 'other'],
        default: 'pantry'
    },
    notes: String,
    // Nutrition data for individual items
    nutrition: NutritionSchema,
    fdcId: String, // USDA Food Data Central ID for nutrition lookup
    // Expiration tracking fields
    notificationSent: { type: Boolean, default: false },
    lastNotifiedDate: Date
});

// User Inventory Schema
const UserInventorySchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    items: [InventoryItemSchema],
    lastUpdated: { type: Date, default: Date.now }
});

// Recipe Ingredient Schema - Enhanced with nutrition
const RecipeIngredientSchema = new mongoose.Schema({
    name: { type: String, required: true },
    amount: String,
    unit: String,
    category: String,
    alternatives: [String],
    optional: { type: Boolean, default: false },
    // Nutrition data for this ingredient
    fdcId: String, // USDA Food Data Central ID
    nutrition: NutritionSchema
});

// Recipe Schema - Enhanced with rating and review system
const RecipeSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: String,
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
    tags: [String],
    source: String,
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    isPublic: { type: Boolean, default: false },

    // Nutrition information
    nutrition: NutritionSchema,
    nutritionCalculatedAt: Date,
    nutritionCoverage: Number, // Percentage of ingredients with nutrition data
    nutritionManuallySet: { type: Boolean, default: false },

    // NEW: Rating and Review System
    reviews: [RecipeReviewSchema],

    // Cached rating statistics for performance
    ratingStats: {
        averageRating: { type: Number, default: 0, min: 0, max: 5 },
        totalRatings: { type: Number, default: 0 },
        ratingDistribution: {
            star5: { type: Number, default: 0 },
            star4: { type: Number, default: 0 },
            star3: { type: Number, default: 0 },
            star2: { type: Number, default: 0 },
            star1: { type: Number, default: 0 }
        }
    },

    // Recipe engagement metrics
    metrics: {
        viewCount: { type: Number, default: 0 },
        saveCount: { type: Number, default: 0 }, // Future: users can save recipes
        shareCount: { type: Number, default: 0 },
        lastViewed: Date
    },

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Daily Nutrition Log Schema - Track user's daily nutrition intake
const DailyNutritionLogSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    date: { type: Date, required: true },
    meals: [{
        mealType: {
            type: String,
            enum: ['breakfast', 'lunch', 'dinner', 'snack'],
            required: true
        },
        recipeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Recipe'
        },
        recipeName: String,
        servings: { type: Number, default: 1 },
        nutrition: NutritionSchema,
        loggedAt: { type: Date, default: Date.now }
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
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// NEW: Recipe Collection Schema - Users can create collections of recipes
const RecipeCollectionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    name: { type: String, required: true, maxlength: 100 },
    description: { type: String, maxlength: 500 },
    recipes: [{
        recipeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Recipe' },
        addedAt: { type: Date, default: Date.now }
    }],
    isPublic: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const MealPlanEntrySchema = new mongoose.Schema({
    recipeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Recipe',
        required: true
    },
    recipeName: { type: String, required: true }, // Cache for performance
    mealType: {
        type: String,
        enum: ['breakfast', 'lunch', 'dinner', 'snack'],
        required: true
    },
    servings: { type: Number, default: 1, min: 1 },
    notes: { type: String, maxlength: 200 },
    prepTime: Number, // Cached from recipe
    cookTime: Number, // Cached from recipe
    createdAt: { type: Date, default: Date.now }
});

// NEW: Meal Plan Schema
const MealPlanSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    name: { type: String, required: true, maxlength: 100 },
    description: { type: String, maxlength: 500 },

    // Week-based planning (Monday = 0, Sunday = 6)
    weekStartDate: { type: Date, required: true }, // Start of the planning week

    // Meals organized by day and meal type
    meals: {
        monday: [MealPlanEntrySchema],
        tuesday: [MealPlanEntrySchema],
        wednesday: [MealPlanEntrySchema],
        thursday: [MealPlanEntrySchema],
        friday: [MealPlanEntrySchema],
        saturday: [MealPlanEntrySchema],
        sunday: [MealPlanEntrySchema]
    },

    // Planning preferences
    preferences: {
        defaultServings: { type: Number, default: 4 },
        mealTypes: {
            type: [String],
            enum: ['breakfast', 'lunch', 'dinner', 'snack'],
            default: ['breakfast', 'lunch', 'dinner']
        },
        dietaryRestrictions: [String],
        avoidIngredients: [String]
    },

    // Shopping list generation
    shoppingList: {
        generated: { type: Boolean, default: false },
        generatedAt: Date,
        items: [{
            ingredient: { type: String, required: true },
            amount: String,
            unit: String,
            category: { type: String, default: 'other' },
            recipes: [String], // Which recipes need this ingredient
            inInventory: { type: Boolean, default: false },
            purchased: { type: Boolean, default: false }
        }]
    },

    // Meal prep suggestions
    mealPrep: {
        batchCookingSuggestions: [{
            ingredient: String,
            recipes: [String],
            prepMethod: String,
            storageTime: String
        }],
        prepDays: {
            type: [String],
            enum: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
            default: ['sunday']
        }
    },

    // Nutrition tracking for the week
    weeklyNutrition: {
        totalCalories: { type: Number, default: 0 },
        averageDailyCalories: { type: Number, default: 0 },
        protein: { type: Number, default: 0 },
        carbs: { type: Number, default: 0 },
        fat: { type: Number, default: 0 },
        fiber: { type: Number, default: 0 }
    },

    isTemplate: { type: Boolean, default: false }, // Can be saved as a reusable template
    isActive: { type: Boolean, default: true },

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// NEW: Meal Plan Template Schema (for saving favorite meal plans)
const MealPlanTemplateSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    name: { type: String, required: true, maxlength: 100 },
    description: { type: String, maxlength: 500 },
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
    timesUsed: { type: Number, default: 0 },
    rating: { type: Number, min: 1, max: 5 },

    isPublic: { type: Boolean, default: false }, // Share with other users

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Add meal planning preferences to User schema
const UserMealPlanningPreferencesSchema = new mongoose.Schema({
    defaultMealTypes: {
        type: [String],
        enum: ['breakfast', 'lunch', 'dinner', 'snack'],
        default: ['breakfast', 'lunch', 'dinner']
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
}, { _id: false });

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
            validator: function(email) {
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
        receiveShoppingLists: { type: Boolean, default: true },
        receiveRecipeShares: { type: Boolean, default: true },
        preferredFormat: {
            type: String,
            enum: ['html', 'text'],
            default: 'html'
        }
    },

    // Track email activity
    stats: {
        emailsSent: { type: Number, default: 0 },
        lastEmailSent: Date,
        lastEmailOpened: Date
    },

    isActive: { type: Boolean, default: true },
    notes: { type: String, maxlength: 200 },

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
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
        contactId: { type: mongoose.Schema.Types.ObjectId, ref: 'Contact' }
    }],

    subject: { type: String, required: true },
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
    sentAt: { type: Date, default: Date.now },
    deliveredAt: Date,
    openedAt: Date,
    clickedAt: Date,

    error: String, // If failed

    createdAt: { type: Date, default: Date.now }
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
        ingredient: { type: String, required: true },
        amount: String,
        category: { type: String, default: 'other' },
        inInventory: { type: Boolean, default: false },
        purchased: { type: Boolean, default: false },
        recipes: [String], // Recipe names using this ingredient
        originalName: String,
        needAmount: String,
        haveAmount: String,
        itemKey: String, // For checkbox tracking
        notes: String // User can add notes to specific items
    }],

    // Statistics (cached for performance)
    stats: {
        totalItems: { type: Number, default: 0 },
        needToBuy: { type: Number, default: 0 },
        inInventory: { type: Number, default: 0 },
        purchased: { type: Number, default: 0 },
        estimatedCost: Number, // Future: price estimation
        categories: { type: Number, default: 0 }
    },

    // Usage and Management
    tags: [String], // User-defined tags for organization
    color: {
        type: String,
        default: '#3b82f6' // Hex color for visual organization
    },

    // Status and Visibility
    isTemplate: { type: Boolean, default: false }, // Can be reused as template
    isShared: { type: Boolean, default: false }, // Shared with family/friends
    isArchived: { type: Boolean, default: false }, // Archived but not deleted

    // Usage Statistics
    usage: {
        timesLoaded: { type: Number, default: 0 },
        lastLoaded: Date,
        lastModified: Date,
        averageCompletionTime: Number, // How long shopping took
        completionRate: Number // % of items typically purchased
    },

    // Shopping Session Data
    shoppingSessions: [{
        startedAt: { type: Date, default: Date.now },
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
        sharedAt: { type: Date, default: Date.now }
    }],

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
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
        ingredient: { type: String, required: true },
        defaultAmount: String,
        category: { type: String, default: 'other' },
        isOptional: { type: Boolean, default: false },
        notes: String
    }],

    // Usage Statistics
    timesUsed: { type: Number, default: 0 },
    isPublic: { type: Boolean, default: false }, // Share with community
    rating: { type: Number, min: 1, max: 5 },

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Pre-save middleware to update timestamps and stats
SavedShoppingListSchema.pre('save', function(next) {
    this.updatedAt = new Date();

    // Recalculate stats
    this.stats.totalItems = this.items.length;
    this.stats.needToBuy = this.items.filter(item => !item.inInventory && !item.purchased).length;
    this.stats.inInventory = this.items.filter(item => item.inInventory).length;
    this.stats.purchased = this.items.filter(item => item.purchased).length;
    this.stats.categories = [...new Set(this.items.map(item => item.category))].length;

    next();
});

// Methods for SavedShoppingList
SavedShoppingListSchema.methods.markAsLoaded = function() {
    this.usage.timesLoaded += 1;
    this.usage.lastLoaded = new Date();
    return this.save();
};

SavedShoppingListSchema.methods.startShoppingSession = function() {
    this.shoppingSessions.push({
        startedAt: new Date(),
        totalItems: this.stats.totalItems
    });
    return this.save();
};

SavedShoppingListSchema.methods.completeShoppingSession = function(itemsPurchased, notes = '') {
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

// Create indexes for better performance
UserInventorySchema.index({ userId: 1 });
RecipeSchema.index({ title: 'text', description: 'text' });
RecipeSchema.index({ tags: 1 });
RecipeSchema.index({ isPublic: 1 });
RecipeSchema.index({ createdBy: 1 });
RecipeSchema.index({ 'nutrition.calories.value': 1 }); // For nutrition-based filtering
RecipeSchema.index({ nutritionCalculatedAt: 1 });

// NEW: Rating and review indexes
RecipeSchema.index({ 'ratingStats.averageRating': -1 }); // For sorting by rating
RecipeSchema.index({ 'ratingStats.totalRatings': -1 }); // For sorting by popularity
RecipeSchema.index({ 'reviews.userId': 1 }); // For finding user's reviews
RecipeSchema.index({ 'metrics.viewCount': -1 }); // For trending recipes

// Add expiration date index for efficient expiration queries
InventoryItemSchema.index({ expirationDate: 1 });

// Add nutrition tracking indexes
DailyNutritionLogSchema.index({ userId: 1, date: 1 }, { unique: true });
DailyNutritionLogSchema.index({ userId: 1, 'meals.recipeId': 1 });

// Recipe collection indexes
RecipeCollectionSchema.index({ userId: 1 });
RecipeCollectionSchema.index({ isPublic: 1 });

// Create indexes for meal planning
MealPlanSchema.index({ userId: 1, weekStartDate: 1 });
MealPlanSchema.index({ userId: 1, isActive: 1 });
MealPlanSchema.index({ weekStartDate: 1 });

MealPlanTemplateSchema.index({ userId: 1 });
MealPlanTemplateSchema.index({ isPublic: 1, category: 1 });
MealPlanTemplateSchema.index({ timesUsed: -1 });

ContactSchema.index({ userId: 1, email: 1 }, { unique: true });
ContactSchema.index({ userId: 1, isActive: 1 });
ContactSchema.index({ 'stats.lastEmailSent': 1 });

EmailLogSchema.index({ userId: 1, sentAt: -1 });
EmailLogSchema.index({ 'recipients.email': 1 });
EmailLogSchema.index({ emailType: 1, sentAt: -1 });

SavedShoppingListSchema.index({ userId: 1, createdAt: -1 });
SavedShoppingListSchema.index({ userId: 1, isArchived: 1 });
SavedShoppingListSchema.index({ userId: 1, listType: 1 });
SavedShoppingListSchema.index({ userId: 1, tags: 1 });
SavedShoppingListSchema.index({ 'usage.lastLoaded': -1 });
SavedShoppingListSchema.index({ 'stats.totalItems': 1 });

ShoppingListTemplateSchema.index({ userId: 1, category: 1 });
ShoppingListTemplateSchema.index({ isPublic: 1, timesUsed: -1 });
ShoppingListTemplateSchema.index({ userId: 1, timesUsed: -1 });



// Export models (prevent re-compilation in development)
export const User = mongoose.models.User || mongoose.model('User', UserSchema);
export const UserInventory = mongoose.models.UserInventory || mongoose.model('UserInventory', UserInventorySchema);
export const Recipe = mongoose.models.Recipe || mongoose.model('Recipe', RecipeSchema);
export const DailyNutritionLog = mongoose.models.DailyNutritionLog || mongoose.model('DailyNutritionLog', DailyNutritionLogSchema);
export const RecipeCollection = mongoose.models.RecipeCollection || mongoose.model('RecipeCollection', RecipeCollectionSchema);
export const MealPlan = mongoose.models.MealPlan || mongoose.model('MealPlan', MealPlanSchema);
export const MealPlanTemplate = mongoose.models.MealPlanTemplate || mongoose.model('MealPlanTemplate', MealPlanTemplateSchema);
export const Contact = mongoose.models.Contact || mongoose.model('Contact', ContactSchema);
export const EmailLog = mongoose.models.EmailLog || mongoose.model('EmailLog', EmailLogSchema);
export const SavedShoppingList = mongoose.models.SavedShoppingList || mongoose.model('SavedShoppingList', SavedShoppingListSchema);
export const ShoppingListTemplate = mongoose.models.ShoppingListTemplate || mongoose.model('ShoppingListTemplate', ShoppingListTemplateSchema);
