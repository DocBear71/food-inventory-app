// file: /src/models/RecipeCollection.js
// Mongoose model for Recipe Collections

import mongoose from 'mongoose';

const RecipeCollectionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    name: {
        type: String,
        required: true,
        maxlength: 100,
        trim: true
    },
    description: {
        type: String,
        maxlength: 500,
        trim: true,
        default: ''
    },
    recipes: [{
        recipeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Recipe',
            required: true
        },
        addedAt: {
            type: Date,
            default: Date.now
        }
    }],
    isPublic: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true // This will automatically handle createdAt and updatedAt
});

// Create indexes for better query performance
RecipeCollectionSchema.index({ userId: 1, name: 1 }, { unique: true });
RecipeCollectionSchema.index({ userId: 1, updatedAt: -1 });
RecipeCollectionSchema.index({ isPublic: 1, updatedAt: -1 });

// Middleware to update the updatedAt field on save
RecipeCollectionSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    next();
});

// Virtual for getting recipe count
RecipeCollectionSchema.virtual('recipeCount').get(function() {
    return this.recipes.length;
});

// Ensure virtual fields are serialized
RecipeCollectionSchema.set('toJSON', { virtuals: true });

export default mongoose.models.RecipeCollection || mongoose.model('RecipeCollection', RecipeCollectionSchema);