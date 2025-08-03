// file: /src/app/api/integrations/modal-health/route.js (FIXED)
export async function GET() {
    try {
        const startTime = Date.now();
        const healthChecks = {};

        // Check all Modal services - use the direct health URLs (don't append /health)
        const services = [
            { name: 'nutrition-analyzer', url: `https://doc-bears-comfort-kitchen--unified-nutrition-analyzer-health.modal.run` },
            { name: 'inventory-manager', url: `https://doc-bears-comfort-kitchen--smart-inventory-manager-health.modal.run` }
        ];

        for (const service of services) {
            const serviceStartTime = Date.now();
            try {
                // Don't append /health - these URLs ARE the health endpoints
                const response = await fetch(service.url, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${process.env.MODAL_API_TOKEN}`
                    }
                });

                const serviceResponseTime = Date.now() - serviceStartTime;

                if (response.ok) {
                    const data = await response.json();
                    healthChecks[service.name] = {
                        healthy: true,
                        status: response.status,
                        responseTime: serviceResponseTime,
                        data: data
                    };
                } else {
                    healthChecks[service.name] = {
                        healthy: false,
                        status: response.status,
                        responseTime: serviceResponseTime,
                        error: `HTTP ${response.status}`
                    };
                }
            } catch (error) {
                const serviceResponseTime = Date.now() - serviceStartTime;
                healthChecks[service.name] = {
                    healthy: false,
                    error: error.message,
                    responseTime: serviceResponseTime
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