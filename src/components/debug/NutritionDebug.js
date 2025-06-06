// file: /src/components/debug/NutritionDebug.js - v1

'use client';

export default function NutritionDebug({ recipe }) {
    if (!recipe) return null;

    return (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 m-4">
            <h3 className="text-sm font-semibold text-yellow-800 mb-2">🐛 Nutrition Debug Info</h3>
            <div className="text-xs text-yellow-700 space-y-2">
                <div>
                    <strong>Recipe ID:</strong> {recipe._id}
                </div>
                <div>
                    <strong>Has nutrition property:</strong> {recipe.nutrition ? 'Yes' : 'No'}
                </div>
                {recipe.nutrition && (
                    <div>
                        <strong>Nutrition data structure:</strong>
                        <pre className="mt-1 p-2 bg-yellow-100 rounded text-xs overflow-auto max-h-32">
                            {JSON.stringify(recipe.nutrition, null, 2)}
                        </pre>
                    </div>
                )}
                <div>
                    <strong>Nutrition value types:</strong>
                    {recipe.nutrition && Object.entries(recipe.nutrition).map(([key, value]) => (
                        <div key={key} className="ml-2">
                            {key}: {typeof value} {typeof value === 'object' ? `(has .value: ${value?.value !== undefined})` : `(value: ${value})`}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}