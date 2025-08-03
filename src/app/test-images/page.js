'use client';

export default function TestImages() {
    const runTest = async (dryRun = true) => {
        const response = await fetch('/api/admin/assign-images', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                limit: 3,
                dryRun,
                publicOnly: true
            })
        });

        const result = await response.json();
        console.log('Result:', result);
        alert(JSON.stringify(result, null, 2));
    };

    // NEW: Fix wrong images function
    const fixWrongImages = async () => {
        const response = await fetch('/api/admin/fix-wrong-images', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                specificRecipes: [
                    'Doc Bear\'s Vegan Alfredo Sauce I',
                    'Doc Bear\'s Vegan Alfredo Sauce II',
                    'Doc Bear\'s Vegan Mushroom Alfredo Sauce',
                    'Cheesy Lasagna Sheet Pasta',
                    'Italian Drunken Noodles',
                    'Sweet and Sour Pineapple Chicken'
                ]
            })
        });

        const result = await response.json();
        console.log('Fix Result:', result);

        // Show results in a nice format
        let message = `Fixed ${result.results.success}/${result.results.total} recipes:\n\n`;
        result.results.processed.forEach(item => {
            if (item.status === 'fixed') {
                message += `✅ ${item.title}\n   Found using: "${item.searchTerm}" (${item.source})\n\n`;
            } else {
                message += `❌ ${item.title}\n   Status: ${item.status}\n\n`;
            }
        });

        alert(message);
    };

    return (
        <div className="p-8 max-w-2xl mx-auto">
            <h1 className="text-2xl font-bold mb-6">🧪 Test Image Automation</h1>

            {/* Original test buttons */}
            <div className="space-y-4 mb-8">
                <h2 className="text-lg font-semibold">Original Automation</h2>
                <div className="flex gap-4">
                    <button
                        onClick={() => runTest(true)}
                        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                    >
                        Test (Dry Run)
                    </button>
                    <button
                        onClick={() => runTest(false)}
                        className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                    >
                        Run For Real
                    </button>
                </div>
            </div>

            {/* NEW: Fix wrong images section */}
            <div className="border-t pt-8">
                <h2 className="text-lg font-semibold mb-4">🔧 Fix Wrong Images</h2>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                    <h3 className="font-bold text-yellow-800 mb-2">⚠️ Known Problem Images</h3>
                    <ul className="text-sm text-yellow-700 space-y-1">
                        <li>• Vegan Alfredo Sauce → Currently shows mushrooms</li>
                        <li>• Cheesy Lasagna → Currently shows wrong pasta</li>
                        <li>• Sweet & Sour Chicken → Currently shows wrong dish</li>
                    </ul>
                </div>

                <button
                    onClick={fixWrongImages}
                    className="w-full bg-orange-600 text-white px-6 py-3 rounded-lg hover:bg-orange-700 transition-colors font-semibold"
                >
                    🎯 Fix Known Problem Recipes
                </button>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                    <h3 className="font-bold text-blue-800 mb-2">🧠 Enhanced Algorithm</h3>
                    <p className="text-sm text-blue-700">
                        The new fix uses smarter recipe-specific search terms:
                    </p>
                    <ul className="text-sm text-blue-600 mt-2 space-y-1">
                        <li>• "Vegan Alfredo" → "vegan alfredo sauce"</li>
                        <li>• "Cheesy Lasagna" → "cheesy lasagna"</li>
                        <li>• "Drunken Noodles" → "thai drunken noodles"</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}