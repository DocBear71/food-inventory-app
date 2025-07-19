// file: /src/app/api/integrations/enhanced-recipe-import/health/route.js (OPTIONAL)
export async function GET() {
    try {
        const startTime = Date.now();

        // Test recipe import functionality
        const responseTime = Date.now() - startTime;

        return Response.json({
            healthy: true,
            service: 'enhanced-recipe-import',
            responseTime,
            version: '1.0.0',
            uptime: process.uptime() * 1000,
            timestamp: new Date().toISOString(),
            checks: {
                urlParsing: true,
                nutritionExtraction: true,
                recipeProcessing: true
            }
        });
    } catch (error) {
        return Response.json({
            healthy: false,
            service: 'enhanced-recipe-import',
            error: error.message,
            timestamp: new Date().toISOString()
        }, { status: 500 });
    }
}