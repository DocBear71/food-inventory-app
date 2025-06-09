// file: /src/components/mobile/DragDropMeal.js - Drag and drop for meals
'use client';

import { useState } from 'react';

export function DragDropMealCard({ meal, onDrop, onEdit, onDelete }) {
    const [isDragging, setIsDragging] = useState(false);
    const [draggedOver, setDraggedOver] = useState(false);

    const handleDragStart = (e) => {
        setIsDragging(true);
        e.dataTransfer.setData('text/plain', JSON.stringify({
            type: 'meal',
            data: meal
        }));
        e.dataTransfer.effectAllowed = 'move';

        // Add touch feedback
        if (navigator.vibrate) {
            navigator.vibrate(50);
        }
    };

    const handleDragEnd = () => {
        setIsDragging(false);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setDraggedOver(true);
    };

    const handleDragLeave = () => {
        setDraggedOver(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setDraggedOver(false);

        try {
            const dropData = JSON.parse(e.dataTransfer.getData('text/plain'));
            if (dropData.type === 'meal' && onDrop) {
                onDrop(dropData.data);
            }
        } catch (error) {
            console.error('Error parsing drop data:', error);
        }
    };

    // Touch event handlers for mobile drag simulation
    const handleTouchStart = (e) => {
        setIsDragging(true);
        if (navigator.vibrate) {
            navigator.vibrate(50);
        }
    };

    const handleTouchEnd = () => {
        setIsDragging(false);
    };

    return (
        <div
            draggable
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            className={`
        relative p-3 bg-white rounded-lg border-2 transition-all duration-200
        ${isDragging ? 'opacity-50 scale-105 shadow-lg border-indigo-400' : 'border-gray-200'}
        ${draggedOver ? 'border-green-400 bg-green-50' : ''}
        touch-manipulation select-none
        hover:shadow-md active:scale-95
      `}
            style={{
                touchAction: 'manipulation',
                userSelect: 'none',
                WebkitUserSelect: 'none',
                WebkitTouchCallout: 'none'
            }}
        >
            {/* Drag handle */}
            <div className="absolute top-1 right-1 text-gray-400 text-xs">
                ⋮⋮
            </div>

            <div className="pr-6">
                <h4 className="font-medium text-gray-900 text-sm leading-tight">
                    {meal.recipeName}
                </h4>
                <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-gray-500 capitalize">
            {meal.mealType}
          </span>
                    <span className="text-xs text-gray-500">
            {meal.servings} serving{meal.servings !== 1 ? 's' : ''}
          </span>
                </div>

                {(meal.prepTime || meal.cookTime) && (
                    <div className="flex items-center mt-1 text-xs text-gray-400">
                        {meal.prepTime && <span>Prep: {meal.prepTime}m</span>}
                        {meal.prepTime && meal.cookTime && <span className="mx-1">•</span>}
                        {meal.cookTime && <span>Cook: {meal.cookTime}m</span>}
                    </div>
                )}
            </div>

            {/* Action buttons */}
            <div className="flex gap-1 mt-2">
                <button
                    onClick={() => onEdit && onEdit(meal)}
                    className="flex-1 bg-blue-50 text-blue-700 text-xs font-medium py-1 px-2 rounded hover:bg-blue-100 active:bg-blue-200 transition-colors"
                    style={{ touchAction: 'manipulation' }}
                >
                    ✏️ Edit
                </button>
                <button
                    onClick={() => onDelete && onDelete(meal)}
                    className="bg-red-50 text-red-700 text-xs font-medium py-1 px-2 rounded hover:bg-red-100 active:bg-red-200 transition-colors"
                    style={{ touchAction: 'manipulation' }}
                >
                    🗑️
                </button>
            </div>

            {/* Visual feedback for drag state */}
            {isDragging && (
                <div className="absolute inset-0 bg-indigo-100 opacity-20 rounded-lg pointer-events-none" />
            )}
        </div>
    );
}

export function MealDropZone({ day, mealType, children, onMealDrop, isEmpty = false }) {
    const [draggedOver, setDraggedOver] = useState(false);

    const handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setDraggedOver(true);
    };

    const handleDragLeave = (e) => {
        // Only hide if we're actually leaving the drop zone
        if (!e.currentTarget.contains(e.relatedTarget)) {
            setDraggedOver(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setDraggedOver(false);

        try {
            const dropData = JSON.parse(e.dataTransfer.getData('text/plain'));
            if (dropData.type === 'meal' && onMealDrop) {
                onMealDrop(dropData.data, day, mealType);
            }
        } catch (error) {
            console.error('Error parsing drop data:', error);
        }
    };

    return (
        <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`
        min-h-16 p-2 rounded-lg border-2 border-dashed transition-all duration-200
        ${draggedOver
                ? 'border-green-400 bg-green-50'
                : isEmpty
                    ? 'border-gray-200 bg-gray-50 hover:border-gray-300'
                    : 'border-transparent bg-transparent'
            }
      `}
        >
            {isEmpty && draggedOver ? (
                <div className="flex items-center justify-center h-16 text-green-600 text-sm font-medium">
                    <span>Drop meal here</span>
                </div>
            ) : isEmpty ? (
                <div className="flex items-center justify-center h-16 text-gray-400 text-sm">
                    <span>+ Add meal</span>
                </div>
            ) : (
                <div className="space-y-2">
                    {children}
                </div>
            )}
        </div>
    );
}