// file: /src/lib/models.js - v8 (Build-Safe Version)

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

// Consumption Log Schema
const ConsumptionLogSchema = new mongoose.Schema({
    itemId: { type: mongoose.Schema.Types.ObjectId, required: true },
    itemName: { type: String, required: true },
    ingredient: { type: String }, // For recipe mode
    quantityConsumed: { type: Number, required: true },
    unitConsumed: { type: String, required: true },
    reason: {
        type: String,
        enum: ['consumed', 'recipe', 'expired', 'donated', 'spilled', 'other'],
        required: true
    },
    notes: { type: String, maxlength: 500 },
    recipeName: { type: String },
    dateConsumed: { type: Date, default: Date.now },
    remainingQuantity: { type: Number, default: 0 }
}, { _id: false });

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

// User Schema
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
    nutritionGoals: {
        dailyCalories: { type: Number, default: 2000 },
        protein: { type: Number, default: 150 },
        fat: { type: Number, default: 65 },
        carbs: { type: Number, default: 250 },
        fiber: { type: Number, default: 25 },
        sodium: { type: Number, default: 2300 }
    },
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
    nutrition: NutritionSchema,
    fdcId: String,
    notificationSent: { type: Boolean, default: false },
    lastNotifiedDate: Date
});

// User Inventory Schema - Updated with consumption tracking
const UserInventorySchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    items: [InventoryItemSchema],
    // Consumption tracking
    consumptionHistory: [ConsumptionLogSchema],
    consumptionStats: {
        totalItemsConsumed: { type: Number, default: 0 },
        topConsumedItems: [{
            itemName: String,
            totalConsumed: Number,
            unit: String
        }],
        consumptionByReason: {
            consumed: { type: Number, default: 0 },
            recipe: { type: Number, default: 0 },
            expired: { type: Number, default: 0 },
            donated: { type: Number, default: 0 },
            spilled: { type: Number, default: 0 },
            other: { type: Number, default: 0 }
        },
        lastUpdated: { type: Date, default: Date.now }
    },
    lastUpdated: { type: Date, default: Date.now }
});

// Recipe Review Schema
const RecipeReviewSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    userName: { type: String, required: true },
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
        taste: { type: Number, min: 1, max: 5 },
        difficulty: { type: Number, min: 1, max: 5 },
        instructions: { type: Number, min: 1, max: 5 }
    },
    modifications: {
        type: String,
        maxlength: 500,
        trim: true
    },
    wouldMakeAgain: { type: Boolean },
    helpfulVotes: { type: Number, default: 0 },
    unhelpfulVotes: { type: Number, default: 0 },
    votedBy: [{
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        vote: { type: String, enum: ['helpful', 'unhelpful'] }
    }],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Recipe Ingredient Schema
const RecipeIngredientSchema = new mongoose.Schema({
    name: { type: String, required: true },
    amount: String,
    unit: String,
    category: String,
    alternatives: [String],
    optional: { type: Boolean, default: false },
    fdcId: String,
    nutrition: NutritionSchema
});

// Recipe Schema
const RecipeSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: String,
    ingredients: [RecipeIngredientSchema],
    instructions: [String],
    cookTime: Number,
    prepTime: Number,
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
    nutrition: NutritionSchema,
    nutritionCalculatedAt: Date,
    nutritionCoverage: Number,
    nutritionManuallySet: { type: Boolean, default: false },
    reviews: [RecipeReviewSchema],
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
    metrics: {
        viewCount: { type: Number, default: 0 },
        saveCount: { type: Number, default: 0 },
        shareCount: { type: Number, default: 0 },
        lastViewed: Date
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Daily Nutrition Log Schema
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

// Create indexes
UserInventorySchema.index({ userId: 1 });
RecipeSchema.index({ title: 'text', description: 'text' });
RecipeSchema.index({ tags: 1 });
RecipeSchema.index({ isPublic: 1 });
RecipeSchema.index({ createdBy: 1 });
RecipeSchema.index({ 'ratingStats.averageRating': -1 });
RecipeSchema.index({ 'ratingStats.totalRatings': -1 });
InventoryItemSchema.index({ expirationDate: 1 });
DailyNutritionLogSchema.index({ userId: 1, date: 1 }, { unique: true });

// Export models with proper error handling
let User, UserInventory, Recipe, DailyNutritionLog;

try {
    User = mongoose.models.User || mongoose.model('User', UserSchema);
    UserInventory = mongoose.models.UserInventory || mongoose.model('UserInventory', UserInventorySchema);
    Recipe = mongoose.models.Recipe || mongoose.model('Recipe', RecipeSchema);
    DailyNutritionLog = mongoose.models.DailyNutritionLog || mongoose.model('DailyNutritionLog', DailyNutritionLogSchema);
} catch (error) {
    console.error('Model compilation error:', error);
    // Fallback exports
    User = mongoose.models.User;
    UserInventory = mongoose.models.UserInventory;
    Recipe = mongoose.models.Recipe;
    DailyNutritionLog = mongoose.models.DailyNutritionLog;
}

export { User, UserInventory, Recipe, DailyNutritionLog };