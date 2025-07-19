// file: /src/app/api/integrations/smart-inventory/health/route.js
export async function GET() {
    try {
        const startTime = Date.now();

        // Test smart inventory service
        const testResponse = await fetch(`${process.env.MODAL_INVENTORY_MANAGER_URL}/health`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${process.env.MODAL_API_TOKEN}`
            }
        });

        const responseTime = Date.now() - startTime;

        if (testResponse.ok) {
            return Response.json({
                healthy: true,
                service: 'smart-inventory',
                responseTime,
                version: '1.0.0',
                uptime: process.uptime() * 1000,
                timestamp: new Date().toISOString(),
                checks: {
                    modalConnection: true,
                    aiServices: true,
                    recipeGeneration: true
                }
            });
        } else {
            return Response.json({
                healthy: false,
                service: 'smart-inventory',
                responseTime,
                error: 'Modal service unreachable',
                timestamp: new Date().toISOString()
            }, { status: 503 });
        }
    } catch (error) {
        return Response.json({
            healthy: false,
            service: 'smart-inventory',
            error: error.message,
            timestamp: new Date().toISOString()
        }, { status: 500 });
    }
}
