// file: /lib/models.js

import mongoose from 'mongoose';

// User Schema
const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
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
    notes: String
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

// Recipe Ingredient Schema
const RecipeIngredientSchema = new mongoose.Schema({
    name: { type: String, required: true },
    amount: String,
    unit: String,
    category: String,
    alternatives: [String], // for flexible matching
    optional: { type: Boolean, default: false }
});

// Recipe Schema
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
    source: String, // "Doc Bear's Volume 1", etc.
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    isPublic: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Create indexes for better performance
UserInventorySchema.index({ userId: 1 });
RecipeSchema.index({ title: 'text', description: 'text' });
RecipeSchema.index({ tags: 1 });
RecipeSchema.index({ isPublic: 1 });
RecipeSchema.index({ createdBy: 1 });

// Export models (prevent re-compilation in development)
export const User = mongoose.models.User || mongoose.model('User', UserSchema);
export const UserInventory = mongoose.models.UserInventory || mongoose.model('UserInventory', UserInventorySchema);
export const Recipe = mongoose.models.Recipe || mongoose.model('Recipe', RecipeSchema);