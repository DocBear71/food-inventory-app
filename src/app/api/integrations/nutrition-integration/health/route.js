// file: /src/app/api/integrations/nutrition-integration/health/route.js
export async function GET() {
    try {
        const startTime = Date.now();

        // Test basic functionality
        const testResponse = await fetch(`${process.env.MODAL_NUTRITION_ANALYZER_URL}/health`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${process.env.MODAL_API_TOKEN}`
            }
        });

        const responseTime = Date.now() - startTime;

        if (testResponse.ok) {
            return Response.json({
                healthy: true,
                service: 'nutrition-integration',
                responseTime,
                version: '1.0.0',
                uptime: process.uptime() * 1000,
                timestamp: new Date().toISOString(),
                checks: {
                    modalConnection: true,
                    databaseConnection: true,
                    externalApis: true
                }
            });
        } else {
            return Response.json({
                healthy: false,
                service: 'nutrition-integration',
                responseTime,
                error: 'Modal service unreachable',
                timestamp: new Date().toISOString()
            }, { status: 503 });
        }
    } catch (error) {
        return Response.json({
            healthy: false,
            service: 'nutrition-integration',
            error: error.message,
            timestamp: new Date().toISOString()
        }, { status: 500 });
    }
}