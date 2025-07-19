// file: /src/components/recipes/InstagramStoryShare.js - Story sharing component

'use client';

import { useState } from 'react';
import { TouchEnhancedButton } from '@/components/mobile/TouchEnhancedButton';
import { apiPost } from '@/lib/api-config';

export default function InstagramStoryShare({ recipe, onClose }) {
    const [selectedTemplate, setSelectedTemplate] = useState('modern');
    const [includeQR, setIncludeQR] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [error, setError] = useState(null);

    const templates = [
        {
            id: 'modern',
            name: 'Modern',
            description: 'Gradient background with circular photo',
            preview: '🎨'
        },
        {
            id: 'classic',
            name: 'Classic',
            description: 'Warm, traditional design',
            preview: '🏛️'
        },
        {
            id: 'minimal',
            name: 'Minimal',
            description: 'Clean, simple layout',
            preview: '⚪'
        }
    ];

    const generateStory = async () => {
        setGenerating(true);
        setError(null);

        try {
            const response = await fetch('/api/recipes/social/instagram-story', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    recipeId: recipe._id,
                    template: selectedTemplate,
                    includeQR
                }),
                credentials: 'include'
            });

            if (response.ok) {
                // Create blob URL for download
                const blob = await response.blob();
                const url = URL.createObjectURL(blob);

                // Trigger download
                const a = document.createElement('a');
                a.href = url;
                a.download = `${recipe.title.replace(/[^a-zA-Z0-9]/g, '-')}-story.png`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);

                // Show success message
                alert('Instagram story image downloaded! You can now upload it to your Instagram story.');

            } else {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to generate story');
            }
        } catch (error) {
            console.error('Error generating story:', error);
            setError(error.message);
        } finally {
            setGenerating(false);
        }
    };

    const shareToInstagram = async () => {
        if (navigator.share) {
            try {
                // Generate the story image first
                const response = await fetch('/api/recipes/social/instagram-story', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        recipeId: recipe._id,
                        template: selectedTemplate,
                        includeQR
                    }),
                    credentials: 'include'
                });

                if (response.ok) {
                    const blob = await response.blob();
                    const file = new File([blob], `${recipe.title}-story.png`, { type: 'image/png' });

                    await navigator.share({
                        title: `${recipe.title} - Recipe Story`,
                        text: `Check out this delicious recipe: ${recipe.title}`,
                        files: [file]
                    });
                }
            } catch (error) {
                console.error('Sharing failed:', error);
                // Fallback to download
                generateStory();
            }
        } else {
            // Fallback to download
            generateStory();
        }
    };

    const updatePreview = async (template) => {
        setSelectedTemplate(template);

        // Update preview
        const previewUrl = `/api/recipes/social/story-image?recipeId=${recipe._id}&template=${template}&includeQR=${includeQR}`;
        setPreviewUrl(previewUrl);
    };

    // Load initial preview
    useState(() => {
        updatePreview(selectedTemplate);
    }, []);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-gray-200 flex-shrink-0">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xl font-semibold text-gray-900">
                            Create Instagram Story
                        </h3>
                        <TouchEnhancedButton
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 text-2xl"
                        >
                            ×
                        </TouchEnhancedButton>
                    </div>
                    <p className="text-sm text-gray-600 mt-2">
                        Generate a beautiful story image for "{recipe.title}"
                    </p>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Left Column - Options */}
                        <div className="space-y-6">
                            {/* Template Selection */}
                            <div>
                                <h4 className="text-lg font-medium text-gray-900 mb-4">Choose Template</h4>
                                <div className="space-y-3">
                                    {templates.map((template) => (
                                        <label
                                            key={template.id}
                                            className={`relative flex items-center p-4 border rounded-lg cursor-pointer hover:bg-gray-50 ${
                                                selectedTemplate === template.id
                                                    ? 'border-blue-500 bg-blue-50'
                                                    : 'border-gray-200'
                                            }`}
                                        >
                                            <input
                                                type="radio"
                                                name="template"
                                                value={template.id}
                                                checked={selectedTemplate === template.id}
                                                onChange={() => updatePreview(template.id)}
                                                className="sr-only"
                                            />
                                            <div className="flex items-center flex-1">
                                                <div className="text-2xl mr-4">{template.preview}</div>
                                                <div>
                                                    <div className="font-medium text-gray-900">{template.name}</div>
                                                    <div className="text-sm text-gray-500">{template.description}</div>
                                                </div>
                                            </div>
                                            {selectedTemplate === template.id && (
                                                <div className="text-blue-500">
                                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                    </svg>
                                                </div>
                                            )}
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Options */}
                            <div>
                                <h4 className="text-lg font-medium text-gray-900 mb-4">Options</h4>
                                <div className="space-y-3">
                                    <label className="flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={includeQR}
                                            onChange={(e) => {
                                                setIncludeQR(e.target.checked);
                                                updatePreview(selectedTemplate);
                                            }}
                                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        <span className="ml-2 text-sm text-gray-700">Include QR code for easy access</span>
                                    </label>
                                </div>
                            </div>

                            {/* Recipe Info */}
                            <div className="bg-gray-50 rounded-lg p-4">
                                <h4 className="font-medium text-gray-900 mb-2">Recipe Details</h4>
                                <div className="text-sm text-gray-600 space-y-1">
                                    <div><strong>Title:</strong> {recipe.title}</div>
                                    {recipe.prepTime && <div><strong>Prep:</strong> {formatTime(recipe.prepTime)}</div>}
                                    {recipe.cookTime && <div><strong>Cook:</strong> {formatTime(recipe.cookTime)}</div>}
                                    {recipe.servings && <div><strong>Serves:</strong> {recipe.servings}</div>}
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="space-y-3">
                                {/* Mobile sharing (if supported) */}
                                {navigator.share && (
                                    <TouchEnhancedButton
                                        onClick={shareToInstagram}
                                        disabled={generating}
                                        className="w-full bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500 text-white py-3 px-4 rounded-lg hover:from-pink-600 hover:via-red-600 hover:to-yellow-600 disabled:opacity-50 flex items-center justify-center space-x-2"
                                    >
                                        {generating ? (
                                            <>
                                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                                <span>Generating...</span>
                                            </>
                                        ) : (
                                            <>
                                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                                    <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 6.62 5.367 11.987 11.988 11.987s11.987-5.367 11.987-11.987C24.004 5.367 18.637.001 12.017.001zm5.568 16.204c-.292 1.815-1.145 3.279-2.394 4.116-.965.646-2.085.919-3.202.919-.292 0-.584-.028-.875-.085-1.188-.233-2.275-.875-3.144-1.866-.465-.529-.777-1.087-.947-1.688-.096-.342-.14-.698-.14-1.054 0-.757.199-1.514.598-2.213.438-.771 1.073-1.455 1.855-1.999 1.022-.713 2.243-1.131 3.549-1.131.584 0 1.183.085 1.768.256.598.172 1.183.428 1.724.771.84.527 1.579 1.214 2.187 2.044.598.829.992 1.785.992 2.829 0 .372-.043.743-.115 1.101z"/>
                                                </svg>
                                                <span>Share to Instagram</span>
                                            </>
                                        )}
                                    </TouchEnhancedButton>
                                )}

                                {/* Download button */}
                                <TouchEnhancedButton
                                    onClick={generateStory}
                                    disabled={generating}
                                    className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center space-x-2"
                                >
                                    {generating ? (
                                        <>
                                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                            <span>Generating...</span>
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                            <span>Download Story Image</span>
                                        </>
                                    )}
                                </TouchEnhancedButton>
                            </div>
                        </div>

                        {/* Right Column - Preview */}
                        <div className="space-y-4">
                            <h4 className="text-lg font-medium text-gray-900">Preview</h4>

                            {/* Story Preview */}
                            <div className="bg-gray-100 rounded-lg p-4 flex items-center justify-center">
                                <div className="relative" style={{ width: '216px', height: '384px' }}>
                                    {/* Phone frame */}
                                    <div className="absolute inset-0 bg-black rounded-[24px] p-2">
                                        <div className="w-full h-full bg-white rounded-[20px] overflow-hidden relative">
                                            {previewUrl ? (
                                                <img
                                                    src={previewUrl}
                                                    alt="Story preview"
                                                    className="w-full h-full object-cover"
                                                    onError={() => setPreviewUrl(null)}
                                                />
                                            ) : (
                                                <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                                                    <div className="text-center text-gray-500">
                                                        <div className="text-4xl mb-2">📱</div>
                                                        <div className="text-sm">Loading preview...</div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Instagram UI overlay */}
                                            <div className="absolute top-4 left-4 right-4 flex items-center justify-between text-white text-xs">
                                                <div className="flex items-center space-x-2">
                                                    <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
                                                    <span className="font-medium">docbearscomfort</span>
                                                </div>
                                                <div className="text-white">×</div>
                                            </div>

                                            {/* Story progress bar */}
                                            <div className="absolute top-2 left-4 right-4">
                                                <div className="h-0.5 bg-white bg-opacity-30 rounded-full">
                                                    <div className="h-full w-1/3 bg-white rounded-full"></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Preview info */}
                            <div className="text-sm text-gray-600 text-center">
                                <p>Preview of your Instagram story</p>
                                <p className="text-xs mt-1">Actual image will be high-resolution (1080×1920)</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Error Display */}
                {error && (
                    <div className="p-4 border-t border-gray-200 bg-red-50">
                        <div className="flex items-center">
                            <svg className="w-5 h-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="text-red-700 text-sm">{error}</span>
                        </div>
                    </div>
                )}

                {/* Footer */}
                <div className="p-6 border-t border-gray-200 bg-gray-50 flex-shrink-0">
                    <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-600">
                            💡 Tip: Download the image and upload it to your Instagram story for best results
                        </div>
                        <TouchEnhancedButton
                            onClick={onClose}
                            className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300"
                        >
                            Close
                        </TouchEnhancedButton>
                    </div>
                </div>
            </div>
        </div>
    );
}

function formatTime(minutes) {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}