'use client';

// Enhanced Fix Wrong Images Testing Page
import { useState } from 'react';

export default function EnhancedFixWrongImages() {
    const [results, setResults] = useState(null);
    const [loading, setLoading] = useState(false);
    const [testResults, setTestResults] = useState(null);

    const problemRecipes = [
        'Doc Bear\'s Vegan Alfredo Sauce I',
        'Doc Bear\'s Vegan Alfredo Sauce II',
        'Doc Bear\'s Vegan Mushroom Alfredo Sauce',
        'Cheesy Lasagna Sheet Pasta',
        'Sweet and Sour Pineapple Chicken'
    ];

    const testKeywordExtraction = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/admin/fix-wrong-images', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    specificRecipes: problemRecipes,
                    testMode: true
                })
            });

            const result = await response.json();
            setTestResults(result.results);
            console.log('Keyword Test Results:', result);
        } catch (error) {
            console.error('Test failed:', error);
            alert('Keyword test failed: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const runEnhancedFix = async () => {
        if (!confirm('This will replace images for the 5 problematic recipes. Continue?')) return;

        setLoading(true);
        try {
            const response = await fetch('/api/admin/fix-wrong-images', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    specificRecipes: problemRecipes
                })
            });

            const result = await response.json();
            setResults(result);
            console.log('Enhanced Fix Results:', result);

            // Show detailed results
            let message = `🎯 Enhanced Fix Complete!\n\n`;
            message += `✅ Success: ${result.results.success}\n`;
            message += `❌ Failed: ${result.results.failed}\n\n`;

            result.results.processed.forEach(item => {
                if (item.status === 'enhanced') {
                    message += `✅ ${item.title}\n`;
                    message += `   Source: ${item.source}\n`;
                    message += `   Search: "${item.searchTerm}"\n`;
                    message += `   Desc: "${item.description}"\n\n`;
                } else {
                    message += `❌ ${item.title}\n`;
                    message += `   Status: ${item.status}\n\n`;
                }
            });

            alert(message);
        } catch (error) {
            console.error('Enhanced fix failed:', error);
            alert('Enhanced fix failed: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const fixAllImages = async () => {
        if (!confirm('This will reprocess ALL recipe images with the enhanced algorithm. This may take a while. Continue?')) return;

        setLoading(true);
        try {
            const response = await fetch('/api/admin/fix-wrong-images', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    reprocessAll: true
                })
            });

            const result = await response.json();
            setResults(result);

            alert(`🔄 Bulk Enhancement Complete!\n\nProcessed: ${result.results.total}\nSuccess: ${result.results.success}\nFailed: ${result.results.failed}`);
        } catch (error) {
            console.error('Bulk fix failed:', error);
            alert('Bulk fix failed: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold mb-6">🚀 Enhanced Recipe Image Fixer</h1>

            <div className="space-y-6">
                {/* Problem Analysis */}
                <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                    <h2 className="font-bold text-red-800 mb-3">🔍 Current Image Problems</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-red-700">
                        <div>
                            <strong>Vegan Alfredo Sauce:</strong><br/>
                            ❌ Currently shows falafel/pita bread<br/>
                            ✅ Should show creamy white sauce
                        </div>
                        <div>
                            <strong>Cheesy Lasagna:</strong><br/>
                            ❌ Currently shows disposable tray<br/>
                            ✅ Should show homemade layers
                        </div>
                        <div>
                            <strong>Sweet & Sour Chicken:</strong><br/>
                            ❌ Currently shows generic vegetables<br/>
                            ✅ Should show chicken with pineapple
                        </div>
                    </div>
                </div>

                {/* Enhancement Features */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                    <h2 className="font-bold text-blue-800 mb-3">✨ Enhanced Algorithm Features</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-700">
                        <ul className="space-y-1">
                            <li>• Smart keyword extraction</li>
                            <li>• Dietary-aware search patterns</li>
                            <li>• Content-based image scoring</li>
                            <li>• Must-include/exclude filtering</li>
                        </ul>
                        <ul className="space-y-1">
                            <li>• Multi-source comparison</li>
                            <li>• Description analysis</li>
                            <li>• Food-specific filtering</li>
                            <li>• Quality ranking system</li>
                        </ul>
                    </div>
                </div>

                {/* Test Section */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h3 className="font-bold text-gray-800 mb-4">🧪 Test Enhanced Algorithm</h3>
                    <div className="space-y-4">
                        <button
                            onClick={testKeywordExtraction}
                            disabled={loading}
                            className="w-full bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors font-semibold disabled:opacity-50"
                        >
                            {loading ? '🔄 Testing...' : '🔍 Test Keyword Extraction'}
                        </button>

                        {testResults && (
                            <div className="mt-4 bg-gray-50 rounded-lg p-4">
                                <h4 className="font-semibold mb-3">Keyword Extraction Results:</h4>
                                <div className="space-y-3 text-sm">
                                    {testResults.map((test, index) => (
                                        <div key={index} className="border-l-4 border-blue-400 pl-3">
                                            <div className="font-medium">{test.title}</div>
                                            <div className="text-gray-600">
                                                Pattern: {test.criteria.pattern}
                                            </div>
                                            <div className="text-green-600">
                                                Search Terms: {test.criteria.searchTerms.join(', ')}
                                            </div>
                                            {test.criteria.mustInclude.length > 0 && (
                                                <div className="text-blue-600">
                                                    Must Include: {test.criteria.mustInclude.join(', ')}
                                                </div>
                                            )}
                                            {test.criteria.mustExclude.length > 0 && (
                                                <div className="text-red-600">
                                                    Must Exclude: {test.criteria.mustExclude.join(', ')}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button
                        onClick={runEnhancedFix}
                        disabled={loading}
                        className="bg-purple-600 text-white px-6 py-4 rounded-lg hover:bg-purple-700 transition-colors font-semibold disabled:opacity-50"
                    >
                        {loading ? '🔄 Fixing...' : '🎯 Fix Problem Recipes (Enhanced)'}
                    </button>

                    <button
                        onClick={fixAllImages}
                        disabled={loading}
                        className="bg-orange-600 text-white px-6 py-4 rounded-lg hover:bg-orange-700 transition-colors font-semibold disabled:opacity-50"
                    >
                        {loading ? '🔄 Processing...' : '🔄 Enhance ALL Images'}
                    </button>
                </div>

                {/* Results Display */}
                {results && (
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                        <h3 className="font-bold text-gray-800 mb-4">📊 Enhancement Results</h3>
                        <div className="grid grid-cols-3 gap-4 mb-6">
                            <div className="text-center p-3 bg-green-50 rounded-lg">
                                <div className="text-2xl font-bold text-green-600">{results.results.success}</div>
                                <div className="text-sm text-green-700">Enhanced</div>
                            </div>
                            <div className="text-center p-3 bg-red-50 rounded-lg">
                                <div className="text-2xl font-bold text-red-600">{results.results.failed}</div>
                                <div className="text-sm text-red-700">Failed</div>
                            </div>
                            <div className="text-center p-3 bg-blue-50 rounded-lg">
                                <div className="text-2xl font-bold text-blue-600">{results.results.total}</div>
                                <div className="text-sm text-blue-700">Total</div>
                            </div>
                        </div>

                        <div className="space-y-3 max-h-96 overflow-y-auto">
                            {results.results.processed.map((item, index) => (
                                <div key={index} className={`p-4 rounded-lg border-l-4 ${
                                    item.status === 'enhanced'
                                        ? 'bg-green-50 border-green-400'
                                        : 'bg-red-50 border-red-400'
                                }`}>
                                    <div className="font-semibold">{item.title}</div>
                                    {item.status === 'enhanced' ? (
                                        <div className="text-sm text-gray-600 mt-1">
                                            <div>✅ Source: {item.source}</div>
                                            <div>🔍 Search: "{item.searchTerm}"</div>
                                            <div>📝 Description: "{item.description}"</div>
                                            {item.url && (
                                                <div className="mt-2">
                                                    <img
                                                        src={item.url}
                                                        alt={item.title}
                                                        className="w-32 h-24 object-cover rounded border"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="text-sm text-red-600 mt-1">
                                            ❌ Status: {item.status}
                                            {item.error && <div>Error: {item.error}</div>}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* How It Works */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                    <h3 className="font-bold text-gray-800 mb-3">🔧 How The Enhanced Algorithm Works</h3>
                    <div className="text-sm text-gray-600 space-y-2">
                        <div><strong>1. Smart Pattern Matching:</strong> Recognizes specific recipe types (vegan alfredo, lasagna, etc.)</div>
                        <div><strong>2. Dietary Awareness:</strong> Excludes non-vegan images for vegan recipes</div>
                        <div><strong>3. Content Scoring:</strong> Ranks images based on description relevance</div>
                        <div><strong>4. Quality Filtering:</strong> Avoids disposable containers, wrong food types</div>
                        <div><strong>5. Multi-Source Search:</strong> Tries multiple search terms across Pexels and Unsplash</div>
                    </div>
                </div>
            </div>
        </div>
    );
}