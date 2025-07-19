// file: /src/app/api/integrations/modal-health/route.js (NEW)
export async function GET() {
    try {
        const startTime = Date.now();
        const healthChecks = {};

        // Check all Modal services
        const services = [
            { name: 'nutrition-analyzer', url: process.env.MODAL_NUTRITION_ANALYZER_URL },
            { name: 'inventory-manager', url: process.env.MODAL_INVENTORY_MANAGER_URL }
        ];

        for (const service of services) {
            try {
                const response = await fetch(`${service.url}/health`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${process.env.MODAL_API_TOKEN}`
                    },
                    timeout: 5000
                });

                healthChecks[service.name] = {
                    healthy: response.ok,
                    status: response.status,
                    responseTime: Date.now() - startTime
                };
            } catch (error) {
                healthChecks[service.name] = {
                    healthy: false,
                    error: error.message,
                    responseTime: Date.now() - startTime
                };
            }
        }

        const allHealthy = Object.values(healthChecks).every(check => check.healthy);
        const responseTime = Date.now() - startTime;

        return Response.json({
            healthy: allHealthy,
            service: 'modal-services',
            responseTime,
            version: '1.0.0',
            uptime: process.uptime() * 1000,
            timestamp: new Date().toISOString(),
            services: healthChecks,
            summary: {
                totalServices: services.length,
                healthyServices: Object.values(healthChecks).filter(check => check.healthy).length,
                unhealthyServices: Object.values(healthChecks).filter(check => !check.healthy).length
            }
        });
    } catch (error) {
        return Response.json({
            healthy: false,
            service: 'modal-services',
            error: error.message,
            timestamp: new Date().toISOString()
        }, { status: 500 });
    }
}