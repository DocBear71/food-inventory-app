// file: /src/models/NutritionLog.js v1 - Nutrition consumption log model

import mongoose from 'mongoose';

const NutritionLogSchema = new mongoose.Schema({
    itemId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'InventoryItem',
        required: true
    },
    userId: {
        type: String,
        required: true
    },
    nutrition: {
        calories: { value: Number, unit: String },
        protein: { value: Number, unit: String },
        fat: { value: Number, unit: String },
        carbs: { value: Number, unit: String },
        fiber: { value: Number, unit: String },
        sugars: { value: Number, unit: String },
        sodium: { value: Number, unit: String },
        calcium: { value: Number, unit: String },
        iron: { value: Number, unit: String },
        vitaminC: { value: Number, unit: String },
        vitaminA: { value: Number, unit: String },
        // Add more nutrients as needed
        itemName: String,
        consumedQuantity: Number,
        totalQuantity: Number,
        calculationMethod: String,
        confidence: Number
    },
    consumedAt: {
        type: Date,
        default: Date.now
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Index for efficient querying
NutritionLogSchema.index({ userId: 1, consumedAt: -1 });
NutritionLogSchema.index({ itemId: 1 });

export const NutritionLog = mongoose.models.NutritionLog || mongoose.model('NutritionLog', NutritionLogSchema);