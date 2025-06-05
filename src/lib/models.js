// file: /src/lib/models.js - v4

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
MealPlanTemplateSchema.index({ timesUsed: -1 }); // For popular templates


// Export models (prevent re-compilation in development)
export const User = mongoose.models.User || mongoose.model('User', UserSchema);
export const UserInventory = mongoose.models.UserInventory || mongoose.model('UserInventory', UserInventorySchema);
export const Recipe = mongoose.models.Recipe || mongoose.model('Recipe', RecipeSchema);
export const DailyNutritionLog = mongoose.models.DailyNutritionLog || mongoose.model('DailyNutritionLog', DailyNutritionLogSchema);
export const RecipeCollection = mongoose.models.RecipeCollection || mongoose.model('RecipeCollection', RecipeCollectionSchema);
export const MealPlan = mongoose.models.MealPlan || mongoose.model('MealPlan', MealPlanSchema);
export const MealPlanTemplate = mongoose.models.MealPlanTemplate || mongoose.model('MealPlanTemplate', MealPlanTemplateSchema);
