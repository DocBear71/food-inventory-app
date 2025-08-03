'use client';

// Enhanced Test Page with Score Thresholds and Approval System
// File: test-enhanced-images/page.js v3 - Fixed and cleaned up
import { useState } from 'react';

export default function EnhancedTestWithApproval() {
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState(null);
    const [settings, setSettings] = useState({
        scoreThreshold: 0.9,
        confidenceThreshold: 0.7,
        maxResults: 5,
        limit: 3
    });

    const [userApprovals, setUserApprovals] = useState({}); // Track manual approvals/rejections

    // Test the basic assign-images endpoint with improved filtering
    const testBasicAssignment = async () => {
        if (!confirm(`Test basic image assignment with enhanced filtering?\nThis will find recipes that truly need images and assign them.`)) {
            return;
        }

        setLoading(true);
        try {
            const response = await fetch('/api/admin/assign-images', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    limit: settings.limit,
                    dryRun: false,
                    publicOnly: true
                })
            });

            const result = await response.json();
            setResults(result);
            console.log('Basic assignment result:', result);

        } catch (error) {
            console.error('Basic assignment failed:', error);
            setResults({
                success: false,
                error: error.message || 'Basic assignment failed'
            });
        } finally {
            setLoading(false);
        }
    };

    // Dry run to see what would be processed
    const testDryRun = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/admin/assign-images', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    limit: settings.limit,
                    dryRun: true,
                    publicOnly: true
                })
            });

            const result = await response.json();
            setResults(result);
            console.log('Dry run result:', result);

        } catch (error) {
            console.error('Dry run failed:', error);
            setResults({
                success: false,
                error: error.message || 'Dry run failed'
            });
        } finally {
            setLoading(false);
        }
    };

    const analyzeWithThresholds = async () => {
        setLoading(true);
        setUserApprovals({}); // Reset approvals when analyzing
        try {
            const response = await fetch('/api/admin/fix-images-ai', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    action: 'analyze',
                    scoreThreshold: settings.scoreThreshold,
                    confidenceThreshold: settings.confidenceThreshold,
                    maxResults: settings.maxResults,
                    returnAllOptions: true
                })
            });

            const result = await response.json();
            setResults(result);
            console.log('Analysis with thresholds:', result);

        } catch (error) {
            console.error('Analysis failed:', error);
            setResults({
                success: false,
                error: error.message || 'Analysis failed'
            });
        } finally {
            setLoading(false);
        }
    };

    const processWithApproval = async () => {
        if (!confirm(`Process recipes with current thresholds?\nScore: ${settings.scoreThreshold}\nConfidence: ${settings.confidenceThreshold}`)) {
            return;
        }

        setLoading(true);
        try {
            const response = await fetch('/api/admin/fix-images-ai', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    action: 'process',
                    scoreThreshold: settings.scoreThreshold,
                    confidenceThreshold: settings.confidenceThreshold,
                    maxResults: settings.maxResults,
                    dryRun: false
                })
            });

            const result = await response.json();
            setResults(result);
            console.log('Processing result:', result);

        } catch (error) {
            console.error('Processing failed:', error);
            setResults({
                success: false,
                error: error.message || 'Processing failed'
            });
        } finally {
            setLoading(false);
        }
    };

    const processOnlyApprovedImages = () => {
        if (!results || !results.results?.processed) {
            alert('No analysis results available. Please run analysis first.');
            return;
        }

        // Count manual approvals
        const manualApprovals = Object.values(userApprovals).filter(status => status === 'approved').length;
        const manualRejections = Object.values(userApprovals).filter(status => status === 'rejected').length;

        if (manualApprovals === 0) {
            alert('No images have been manually approved yet. Please approve at least one image or use the regular processing.');
            return;
        }

        const confirmMessage = `Process ${manualApprovals} manually approved images?\n\n` +
            `• Approved: ${manualApprovals}\n` +
            `• Rejected: ${manualRejections}\n` +
            `• Not reviewed: ${Object.keys(userApprovals).length - manualApprovals - manualRejections}\n\n` +
            `Only manually approved images will be applied to recipes.`;

        if (!confirm(confirmMessage)) return;

        alert(`🎯 Manual approvals have been processed! ${manualApprovals} images were applied to recipes.`);
    };

    const approveImage = async (recipeTitle, imageOption) => {
        try {
            const response = await fetch('/api/admin/approve-reject-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'approve',
                    recipeTitle,
                    imageOption,
                    reason: 'Manually approved by user'
                })
            });

            const result = await response.json();

            if (result.success) {
                // Update local state to show approval
                setUserApprovals(prev => ({
                    ...prev,
                    [`${recipeTitle}-${imageOption.url}`]: 'approved'
                }));

                alert(`✅ Image approved and applied to "${recipeTitle}"!`);

                // Refresh results to show updated status
                // You might want to refresh the analysis here
            } else {
                alert(`❌ Failed to approve image: ${result.error}`);
            }
        } catch (error) {
            console.error('Approval failed:', error);
            alert('❌ Failed to approve image');
        }
    };

    const rejectImage = async (recipeTitle, imageOption) => {
        const reason = prompt(`Why are you rejecting this image for "${recipeTitle}"?`, 'Not accurate representation of the dish');
        if (!reason) return; // User cancelled

        try {
            const response = await fetch('/api/admin/approve-reject-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'reject',
                    recipeTitle,
                    imageOption,
                    reason
                })
            });

            const result = await response.json();

            if (result.success) {
                // Update local state to show rejection
                setUserApprovals(prev => ({
                    ...prev,
                    [`${recipeTitle}-${imageOption.url}`]: 'rejected'
                }));

                alert(`❌ Image rejected for "${recipeTitle}"`);
            } else {
                alert(`❌ Failed to reject image: ${result.error}`);
            }
        } catch (error) {
            console.error('Rejection failed:', error);
            alert('❌ Failed to reject image');
        }
    };

    const searchMoreImagesForRecipe = async (recipeTitle) => {
        if (!confirm(`Search for more image options for "${recipeTitle}"?\n\nThis will try different search terms and sources.`)) {
            return;
        }

        setLoading(true);
        try {
            const response = await fetch('/api/admin/find-more-images', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    recipeTitle,
                    excludeUrls: Object.keys(userApprovals).filter(key =>
                        key.startsWith(recipeTitle) && userApprovals[key] === 'rejected'
                    ).map(key => key.split('-').slice(1).join('-')), // Extract URL from key
                    maxResults: settings.maxResults,
                    useAlternativeTerms: true
                })
            });

            const result = await response.json();

            if (result.success && result.newOptions?.length > 0) {
                // Add new options to current results
                setResults(prev => {
                    if (!prev?.results?.processed) return prev;

                    const updatedProcessed = prev.results.processed.map(item => {
                        if (item.title === recipeTitle) {
                            return {
                                ...item,
                                options: [...(item.options || []), ...result.newOptions],
                                optionCount: (item.options?.length || 0) + result.newOptions.length
                            };
                        }
                        return item;
                    });

                    return {
                        ...prev,
                        results: {
                            ...prev.results,
                            processed: updatedProcessed
                        }
                    };
                });

                alert(`✅ Found ${result.newOptions.length} additional image options for "${recipeTitle}"`);
            } else {
                alert(`❌ No additional images found for "${recipeTitle}". You might need to manually add an image or try different search terms.`);
            }
        } catch (error) {
            console.error('Additional search failed:', error);
            alert('❌ Failed to search for more images');
        } finally {
            setLoading(false);
        }
    };

    const markRecipeAsNeedsManualImage = async (recipeTitle) => {
        const reason = prompt(`Why does "${recipeTitle}" need a manual image?`, 'AI could not find suitable images - needs custom photo or manual search');
        if (!reason) return;

        try {
            const response = await fetch('/api/admin/mark-manual-image-needed', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    recipeTitle,
                    reason,
                    rejectedImageCount: Object.keys(userApprovals).filter(key =>
                        key.startsWith(recipeTitle) && userApprovals[key] === 'rejected'
                    ).length
                })
            });

            const result = await response.json();

            if (result.success) {
                // Mark locally as needing manual work
                setUserApprovals(prev => ({
                    ...prev,
                    [`${recipeTitle}-MANUAL_NEEDED`]: 'manual_needed'
                }));

                alert(`📝 "${recipeTitle}" marked as needing manual image work`);
            } else {
                alert(`❌ Failed to mark recipe: ${result.error}`);
            }
        } catch (error) {
            console.error('Manual marking failed:', error);
            alert('❌ Failed to mark recipe as needing manual work');
        }
    };

    const getScoreColor = (score) => {
        if (score >= 0.7) return 'text-green-600 bg-green-100';
        if (score >= 0.5) return 'text-yellow-600 bg-yellow-100';
        if (score >= 0.3) return 'text-orange-600 bg-orange-100';
        return 'text-red-600 bg-red-100';
    };

    const getScoreBadge = (score) => {
        if (score >= 0.7) return '🟢 Excellent';
        if (score >= 0.5) return '🟡 Good';
        if (score >= 0.3) return '🟠 Fair';
        return '🔴 Poor';
    };

    const renderBasicResults = () => {
        if (!results?.results) return null;

        return (
            <div className="mt-8 bg-white rounded-lg border p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold">
                        📸 Basic Image Assignment Results {results.dryRun && '(Dry Run)'}
                    </h2>
                </div>

                {/* Summary Stats */}
                <div className="grid grid-cols-4 gap-4 mb-6">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold text-green-700">{results.results?.success || 0}</div>
                        <div className="text-sm text-green-600">Success</div>
                    </div>
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold text-red-700">{results.results?.failed || 0}</div>
                        <div className="text-sm text-red-600">Failed</div>
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold text-blue-700">{results.results?.skipped || 0}</div>
                        <div className="text-sm text-blue-600">Already Had Images</div>
                    </div>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold text-gray-700">{results.results?.total || 0}</div>
                        <div className="text-sm text-gray-600">Total Processed</div>
                    </div>
                </div>

                {/* Individual Results */}
                <div className="space-y-4 max-h-96 overflow-y-auto">
                    {(results.results?.processed || []).map((item, index) => (
                        <div key={index} className={`border rounded-lg p-4 ${
                            item.status === 'success'
                                ? 'bg-green-50 border-green-200'
                                : item.status === 'would_process'
                                    ? 'bg-blue-50 border-blue-200'
                                    : 'bg-red-50 border-red-200'
                        }`}>
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="font-semibold text-lg text-gray-900">{item.title}</h3>
                                <div className="flex items-center gap-2">
                                    {item.status === 'success' && (
                                        <span className="bg-green-500 text-white text-xs px-2 py-1 rounded font-medium">
                                            ✅ IMAGE ASSIGNED
                                        </span>
                                    )}
                                    {item.status === 'would_process' && (
                                        <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded font-medium">
                                            🔍 WOULD PROCESS
                                        </span>
                                    )}
                                    {item.status === 'no_image_found' && (
                                        <span className="bg-red-500 text-white text-xs px-2 py-1 rounded font-medium">
                                            ❌ NO IMAGE FOUND
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="text-sm text-gray-600 mb-2">
                                Category: {item.category || 'Unknown'}
                            </div>

                            {item.status === 'success' && (
                                <div className="bg-green-100 border border-green-200 rounded p-3">
                                    <div className="text-sm text-green-800">
                                        <div className="font-medium">✅ Image Successfully Assigned</div>
                                        <div>Source: {item.source}</div>
                                        {item.url && (
                                            <a href={item.url} target="_blank" rel="noopener noreferrer"
                                               className="text-green-600 hover:underline text-xs block mt-1">
                                                View Assigned Image →
                                            </a>
                                        )}
                                    </div>
                                </div>
                            )}

                            {item.status === 'error' && (
                                <div className="text-red-600 text-sm">
                                    ❌ {item.error || 'Processing failed'}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const renderImageOptions = (item) => {
        if (!item.options || item.options.length === 0) {
            return (
                <div className="text-gray-500 text-sm mt-2">
                    No image options available
                </div>
            );
        }

        return (
            <div className="mt-4">
                <h4 className="font-semibold text-gray-800 mb-3">
                    Image Options ({item.options.length})
                </h4>
                <div className="space-y-4">
                    {item.options.map((option, index) => (
                        <div
                            key={index}
                            className={`border-2 rounded-lg p-4 ${
                                option.approved
                                    ? 'border-green-300 bg-green-50'
                                    : 'border-gray-200 bg-white'
                            }`}
                        >
                            {/* Desktop: Side-by-side layout, Mobile: Stacked layout */}
                            <div className="flex flex-col lg:flex-row gap-4">
                                {/* Image Section */}
                                <div className="lg:w-80 lg:flex-shrink-0">
                                    <div className="relative">
                                        <img
                                            src={option.thumbnail || option.url}
                                            alt={option.description}
                                            className="w-full h-48 lg:h-56 object-cover rounded border cursor-pointer hover:opacity-90 transition-opacity shadow-sm"
                                            onClick={() => window.open(option.url, '_blank')}
                                        />
                                        {/* Status Overlays */}
                                        {userApprovals[`${item.title}-${option.url}`] === 'approved' && (
                                            <div className="absolute top-2 right-2 bg-green-600 text-white text-xs px-2 py-1 rounded shadow font-medium">
                                                ✅ MANUALLY APPROVED
                                            </div>
                                        )}
                                        {userApprovals[`${item.title}-${option.url}`] === 'rejected' && (
                                            <div className="absolute top-2 right-2 bg-red-600 text-white text-xs px-2 py-1 rounded shadow font-medium">
                                                ❌ REJECTED
                                            </div>
                                        )}
                                        {!userApprovals[`${item.title}-${option.url}`] && option.approved && (
                                            <div className="absolute top-2 right-2 bg-blue-500 text-white text-xs px-2 py-1 rounded shadow font-medium">
                                                🤖 AUTO-APPROVED
                                            </div>
                                        )}
                                        <div className="absolute bottom-2 left-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
                                            Click to enlarge
                                        </div>
                                    </div>
                                </div>

                                {/* Information Section */}
                                <div className="flex-1 flex flex-col">
                                    {/* Score and Source Header */}
                                    <div className="flex items-center justify-between mb-3">
                                        <span className={`text-sm px-3 py-1 rounded font-medium ${getScoreColor(option.score)}`}>
                                            {getScoreBadge(option.score)} ({option.score.toFixed(2)})
                                        </span>
                                        <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                            {option.source}
                                        </span>
                                    </div>

                                    {/* Detailed Scores */}
                                    <div className="text-sm text-gray-600 space-y-1 mb-3">
                                        <div className="flex justify-between">
                                            <span>Confidence:</span>
                                            <span className="font-medium">{(option.confidence * 100).toFixed(0)}%</span>
                                        </div>
                                        {option.relevance && (
                                            <div className="flex justify-between">
                                                <span>Relevance:</span>
                                                <span className="font-medium">{(option.relevance * 100).toFixed(0)}%</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* AI Reasoning */}
                                    <div className="text-sm text-gray-700 italic mb-3 flex-1">
                                        "{option.reason}"
                                    </div>

                                    {/* Description */}
                                    <div className="text-sm text-gray-800 mb-4 font-medium">
                                        {option.description}
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex gap-3 mt-auto">
                                        {userApprovals[`${item.title}-${option.url}`] === 'approved' ? (
                                            <div className="flex-1 bg-green-100 text-green-800 px-4 py-2 rounded text-center font-medium text-sm border border-green-300">
                                                ✅ Approved & Applied
                                            </div>
                                        ) : userApprovals[`${item.title}-${option.url}`] === 'rejected' ? (
                                            <div className="flex-1 bg-red-100 text-red-800 px-4 py-2 rounded text-center font-medium text-sm border border-red-300">
                                                ❌ Rejected
                                            </div>
                                        ) : (
                                            <>
                                                <button
                                                    onClick={() => approveImage(item.title, option)}
                                                    className="flex-1 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors font-medium text-sm"
                                                >
                                                    ✅ Approve & Apply
                                                </button>
                                                <button
                                                    onClick={() => rejectImage(item.title, option)}
                                                    className="flex-1 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors font-medium text-sm"
                                                >
                                                    ❌ Reject
                                                </button>
                                            </>
                                        )}
                                        <a
                                            href={option.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-center font-medium text-sm"
                                            title="View full size"
                                        >
                                            🔍
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                {/* Additional Actions */}
                <div className="mt-6 pt-4 border-t border-gray-200 flex gap-4 justify-end">
                    <button
                        onClick={() => searchMoreImagesForRecipe(item.title)}
                        className="bg-blue-100 text-blue-800 px-4 py-2 rounded text-sm hover:bg-blue-200 transition-colors font-medium border border-blue-300"
                    >
                        🔄 Search More Images
                    </button>
                    <button
                        onClick={() => markRecipeAsNeedsManualImage(item.title)}
                        className="bg-red-100 text-red-800 px-4 py-2 rounded text-sm hover:bg-red-200 transition-colors font-medium border border-red-300"
                    >
                        📝 Mark as Needs Manual Image
                    </button>
                </div>
            </div>
        );
    };

    const renderAdvancedResults = () => {
        if (!results?.results?.processed?.[0]?.options) return null;

        return (
            <div className="mt-8 bg-white rounded-lg border p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold">
                        🤖 AI Analysis Results {results.dryRun && '(Analysis Mode)'}
                    </h2>
                    {results.thresholds && (
                        <div className="text-sm text-gray-600">
                            Thresholds: Score ≥ {results.thresholds.scoreThreshold},
                            Confidence ≥ {results.thresholds.confidenceThreshold}
                        </div>
                    )}
                </div>

                {/* Summary Stats */}
                <div className="grid grid-cols-4 gap-4 mb-6">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold text-green-700">{results.results?.success || 0}</div>
                        <div className="text-sm text-green-600">Auto-Approved</div>
                    </div>
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold text-yellow-700">{results.results?.needsReview || 0}</div>
                        <div className="text-sm text-yellow-600">Needs Review</div>
                    </div>
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold text-red-700">{results.results?.failed || 0}</div>
                        <div className="text-sm text-red-600">Failed</div>
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold text-blue-700">{results.results?.total || 0}</div>
                        <div className="text-sm text-blue-600">Total</div>
                    </div>
                </div>

                {/* Individual Results */}
                <div className="space-y-6 max-h-96 overflow-y-auto">
                    {(results.results?.processed || []).map((item, index) => (
                        <div key={index} className={`border rounded-lg p-4 ${
                            item.status === 'auto_approved'
                                ? 'bg-green-50 border-green-200'
                                : item.status === 'needs_review' || item.status === 'needs_manual_review'
                                    ? 'bg-yellow-50 border-yellow-200'
                                    : item.status === 'ai_success'
                                        ? 'bg-blue-50 border-blue-200'
                                        : 'bg-red-50 border-red-200'
                        }`}>
                            {/* Recipe Header */}
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="font-semibold text-lg text-gray-900">{item.title}</h3>
                                <div className="flex items-center gap-2">
                                    {item.status === 'auto_approved' && (
                                        <span className="bg-green-500 text-white text-xs px-2 py-1 rounded font-medium">
                                            ✅ AUTO-APPROVED
                                        </span>
                                    )}
                                    {(item.status === 'needs_review' || item.status === 'needs_manual_review') && (
                                        <span className="bg-yellow-500 text-white text-xs px-2 py-1 rounded font-medium">
                                            ⚠️ NEEDS REVIEW
                                        </span>
                                    )}
                                    {item.status === 'ai_success' && (
                                        <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded font-medium">
                                            ✅ PROCESSED
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Recipe Info */}
                            <div className="text-sm text-gray-600 mb-3">
                                Category: {item.category || 'Unknown'} |
                                Ingredients: {item.ingredientCount || 0} |
                                Description: {item.hasDescription ? 'Yes' : 'No'}
                            </div>

                            {/* Score Summary */}
                            {(item.autoApprovedScore || item.bestScore) && (
                                <div className="mb-3">
                                    <div className="text-sm">
                                        {item.autoApprovedScore && (
                                            <span className="text-green-700 font-medium">
                                                Auto-approved score: {item.autoApprovedScore.toFixed(2)}
                                            </span>
                                        )}
                                        {item.bestScore && !item.autoApprovedScore && (
                                            <span className="text-yellow-700 font-medium">
                                                Best score: {item.bestScore.toFixed(2)} (below threshold)
                                            </span>
                                        )}
                                        {item.overallScore && (
                                            <span className="text-blue-700 font-medium">
                                                Overall score: {item.overallScore.toFixed(2)}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Success Details */}
                            {item.status === 'ai_success' && (
                                <div className="bg-blue-100 border border-blue-200 rounded p-3 mb-3">
                                    <div className="text-sm text-blue-800">
                                        <div className="font-medium">✅ Image Applied Successfully</div>
                                        <div>Source: {item.source}</div>
                                        <div>AI Score: {item.aiScore?.toFixed(2)} | Confidence: {(item.aiConfidence * 100).toFixed(0)}%</div>
                                        {item.autoApproved && <div className="text-green-700 font-medium">✅ Auto-approved</div>}
                                        {item.description && <div className="italic mt-1">"{item.description}"</div>}
                                        {item.url && (
                                            <a href={item.url} target="_blank" rel="noopener noreferrer"
                                               className="text-blue-600 hover:underline text-xs block mt-1">
                                                View Applied Image →
                                            </a>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Manual Review Info */}
                            {item.status === 'needs_manual_review' && item.reason && (
                                <div className="bg-yellow-100 border border-yellow-200 rounded p-3 mb-3">
                                    <div className="text-sm text-yellow-800">
                                        <div className="font-medium">⚠️ Manual Review Required</div>
                                        <div>{item.reason}</div>
                                    </div>
                                </div>
                            )}

                            {/* Error Details */}
                            {(item.status === 'analysis_failed' || item.status === 'ai_failed' || item.status === 'error') && (
                                <div className="text-red-600 text-sm">
                                    ❌ {item.error || 'Processing failed'}
                                </div>
                            )}

                            {/* Image Options for Review */}
                            {(item.status === 'auto_approved' || item.status === 'needs_review' || item.status === 'needs_manual_review') &&
                                renderImageOptions(item)}
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const renderResults = () => {
        if (!results) return null;

        if (!results.success) {
            return (
                <div className="mt-8 bg-red-50 border border-red-200 rounded-lg p-6">
                    <h2 className="text-xl font-bold text-red-800 mb-4">❌ Error</h2>
                    <p className="text-red-700">
                        <strong>Error:</strong> {results.error || 'Unknown error occurred'}
                    </p>
                </div>
            );
        }

        // Check if this is a basic assignment result or advanced AI result
        if (results.results && !results.results.processed?.[0]?.options) {
            return renderBasicResults();
        }

        return renderAdvancedResults();
    };

    return (
        <div className="p-8 max-w-6xl mx-auto">
            <h1 className="text-3xl font-bold mb-6">🎯 AI Image Analysis with Approval System</h1>

            {/* Enhanced Features Overview */}
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-6 mb-8">
                <h2 className="text-xl font-bold text-purple-900 mb-3">🚀 Enhanced AI Features v3</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                        <h3 className="font-semibold text-purple-800 mb-2">Smart Image Detection:</h3>
                        <ul className="text-purple-700 space-y-1">
                            <li>• Skips recipes with primary photos</li>
                            <li>• Skips recipes with uploaded images</li>
                            <li>• Skips recipes with extracted images</li>
                            <li>• Only processes recipes that truly need images</li>
                        </ul>
                    </div>
                    <div>
                        <h3 className="font-semibold text-purple-800 mb-2">Enhanced Search Sources:</h3>
                        <ul className="text-purple-700 space-y-1">
                            <li>• Google Images (best quality, with usage licensing)</li>
                            <li>• Pexels (excellent food imagery)</li>
                            <li>• Unsplash (high-quality photography)</li>
                            <li>• Smart fallback system</li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* Settings Panel */}
            <div className="bg-white rounded-lg border p-6 mb-6">
                <h2 className="text-lg font-bold mb-4">⚙️ AI Settings & Test Options</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Score Threshold
                        </label>
                        <input
                            type="number"
                            min="0"
                            max="1"
                            step="0.1"
                            value={settings.scoreThreshold}
                            onChange={(e) => setSettings(prev => ({
                                ...prev,
                                scoreThreshold: parseFloat(e.target.value)
                            }))}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                        />
                        <div className="text-xs text-gray-500 mt-1">
                            Minimum score for auto-approval
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Confidence Threshold
                        </label>
                        <input
                            type="number"
                            min="0"
                            max="1"
                            step="0.1"
                            value={settings.confidenceThreshold}
                            onChange={(e) => setSettings(prev => ({
                                ...prev,
                                confidenceThreshold: parseFloat(e.target.value)
                            }))}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                        />
                        <div className="text-xs text-gray-500 mt-1">
                            Minimum confidence level
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Max Options
                        </label>
                        <select
                            value={settings.maxResults}
                            onChange={(e) => setSettings(prev => ({
                                ...prev,
                                maxResults: parseInt(e.target.value)
                            }))}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                        >
                            <option value={3}>3 options</option>
                            <option value={5}>5 options</option>
                            <option value={8}>8 options</option>
                            <option value={10}>10 options</option>
                        </select>
                        <div className="text-xs text-gray-500 mt-1">
                            Options to show for review
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Recipes to Test
                        </label>
                        <select
                            value={settings.limit}
                            onChange={(e) => setSettings(prev => ({
                                ...prev,
                                limit: parseInt(e.target.value)
                            }))}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                        >
                            <option value={3}>3 recipes</option>
                            <option value={5}>5 recipes</option>
                            <option value={10}>10 recipes</option>
                            <option value={20}>20 recipes</option>
                        </select>
                        <div className="text-xs text-gray-500 mt-1">
                            Number of recipes to process
                        </div>
                    </div>
                </div>

                {/* Preset Buttons */}
                <div className="flex gap-2 mb-4">
                    <button
                        onClick={() => setSettings(prev => ({
                            ...prev,
                            scoreThreshold: 0.2,
                            confidenceThreshold: 0.4
                        }))}
                        className="px-3 py-2 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200"
                    >
                        🔴 Lenient (0.2/0.4)
                    </button>
                    <button
                        onClick={() => setSettings(prev => ({
                            ...prev,
                            scoreThreshold: 0.3,
                            confidenceThreshold: 0.5
                        }))}
                        className="px-3 py-2 bg-yellow-100 text-yellow-700 rounded text-sm hover:bg-yellow-200"
                    >
                        🟡 Balanced (0.3/0.5)
                    </button>
                    <button
                        onClick={() => setSettings(prev => ({
                            ...prev,
                            scoreThreshold: 0.5,
                            confidenceThreshold: 0.7
                        }))}
                        className="px-3 py-2 bg-green-100 text-green-700 rounded text-sm hover:bg-green-200"
                    >
                        🟢 Strict (0.5/0.7)
                    </button>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4 flex-wrap">
                    <button
                        onClick={testDryRun}
                        disabled={loading}
                        className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                    >
                        🧪 Test Dry Run (See What Would Be Processed)
                    </button>
                    <button
                        onClick={testBasicAssignment}
                        disabled={loading}
                        className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                    >
                        📸 Assign Basic Images (Skip Existing)
                    </button>
                    <button
                        onClick={analyzeWithThresholds}
                        disabled={loading}
                        className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                    >
                        🔍 Advanced Analysis with Scoring
                    </button>
                    <button
                        onClick={processWithApproval}
                        disabled={loading}
                        className="bg-orange-600 text-white px-6 py-3 rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                    >
                        ⚡ Auto-Process (Threshold-Based)
                    </button>
                    <button
                        onClick={processOnlyApprovedImages}
                        disabled={loading || !results}
                        className="bg-emerald-600 text-white px-6 py-3 rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                    >
                        🎯 Process Manual Approvals Only
                    </button>
                </div>

                {/* Manual Approval Summary */}
                {Object.keys(userApprovals).length > 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                        <h3 className="font-bold text-blue-800 mb-2">📊 Manual Review Summary</h3>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                            <div className="text-center">
                                <div className="text-2xl font-bold text-green-700">
                                    {Object.values(userApprovals).filter(status => status === 'approved').length}
                                </div>
                                <div className="text-green-600">Manually Approved</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-red-700">
                                    {Object.values(userApprovals).filter(status => status === 'rejected').length}
                                </div>
                                <div className="text-red-600">Rejected</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-gray-700">
                                    {results?.results?.processed?.reduce((total, item) =>
                                        total + (item.options?.length || 0), 0) - Object.keys(userApprovals).length || 0}
                                </div>
                                <div className="text-gray-600">Not Reviewed</div>
                            </div>
                        </div>
                        <div className="text-xs text-blue-600 mt-2">
                            💡 Use "Process Manual Approvals Only" to apply only the images you've specifically approved
                        </div>
                    </div>
                )}
            </div>

            {/* Score Explanation */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
                <h3 className="font-bold text-gray-800 mb-2">📊 Score System Explanation</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                    <div className="text-center">
                        <div className="text-green-600 font-bold">🟢 0.7+ Excellent</div>
                        <div className="text-gray-600">Perfect match, auto-approve</div>
                    </div>
                    <div className="text-center">
                        <div className="text-yellow-600 font-bold">🟡 0.5+ Good</div>
                        <div className="text-gray-600">Good match, likely approve</div>
                    </div>
                    <div className="text-center">
                        <div className="text-orange-600 font-bold">🟠 0.3+ Fair</div>
                        <div className="text-gray-600">Acceptable, review needed</div>
                    </div>
                    <div className="text-center">
                        <div className="text-red-600 font-bold">🔴 &lt; 0.3 Poor</div>
                        <div className="text-gray-600">Likely reject</div>
                    </div>
                </div>
            </div>

            {loading && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center mb-6">
                    <div className="text-yellow-800 font-medium">
                        🔄 {results?.dryRun ? 'Analyzing' : 'Processing'}... Please wait while AI analyzes images.
                    </div>
                </div>
            )}

            {renderResults()}
        </div>
    );
}