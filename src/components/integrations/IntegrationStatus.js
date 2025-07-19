'use client';

// file: /src/components/integrations/IntegrationStatus.js v1

import React, { useState, useEffect } from 'react';

export function IntegrationStatus({ onHealthCheck }) {
    const [status, setStatus] = useState({
        nutrition: { status: 'unknown', lastCheck: null },
        inventory: { status: 'unknown', lastCheck: null },
        modal: { status: 'unknown', lastCheck: null }
    });
    const [checking, setChecking] = useState(false);

    useEffect(() => {
        checkAllServices();
    }, []);

    const checkAllServices = async () => {
        setChecking(true);

        try {
            // Check all available services
            const services = [
                { key: 'nutrition', endpoint: '/api/integrations/nutrition-integration/health' },
                { key: 'inventory', endpoint: '/api/integrations/smart-inventory/health' },
                { key: 'modal', endpoint: '/api/integrations/modal-health' },
                { key: 'recipeImport', endpoint: '/api/integrations/enhanced-recipe-import/health' },
                { key: 'nutritionAnalysis', endpoint: '/api/integrations/nutrition-analysis/health' }
            ];

            const newStatus = {};

            for (const service of services) {
                try {
                    const response = await fetch(service.endpoint);
                    const data = await response.json();

                    newStatus[service.key] = {
                        status: data.healthy ? 'healthy' : 'unhealthy',
                        lastCheck: new Date().toISOString(),
                        details: data
                    };
                } catch (error) {
                    newStatus[service.key] = {
                        status: 'unhealthy',
                        lastCheck: new Date().toISOString(),
                        details: { error: error.message }
                    };
                }
            }

            setStatus(newStatus);
            onHealthCheck?.(Object.values(newStatus).every(s => s.status === 'healthy'));

        } catch (error) {
            console.error('Health check failed:', error);
            onHealthCheck?.(false);
        } finally {
            setChecking(false);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'healthy': return 'text-green-600 bg-green-100';
            case 'unhealthy': return 'text-red-600 bg-red-100';
            case 'degraded': return 'text-yellow-600 bg-yellow-100';
            default: return 'text-gray-600 bg-gray-100';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'healthy': return '✅';
            case 'unhealthy': return '❌';
            case 'degraded': return '⚠️';
            default: return '❓';
        }
    };

    const formatLastCheck = (timestamp) => {
        if (!timestamp) return 'Never';
        const date = new Date(timestamp);
        return date.toLocaleTimeString();
    };

    return (
        <div className="space-y-6">
            {/* Overall Status */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">🔧 Integration Status</h3>
                    <button
                        onClick={checkAllServices}
                        disabled={checking}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                        {checking ? '🔄 Checking...' : '🔄 Refresh'}
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                        { key: 'nutrition', label: 'Nutrition Analysis', icon: '🔬' },
                        { key: 'inventory', label: 'Smart Inventory', icon: '📦' },
                        { key: 'modal', label: 'Modal Services', icon: '☁️' }
                    ].map(service => (
                        <div key={service.key} className="border border-gray-200 rounded-lg p-4">
                            <div className="flex items-center space-x-3 mb-3">
                                <span className="text-2xl">{service.icon}</span>
                                <div>
                                    <h4 className="font-medium text-gray-900">{service.label}</h4>
                                    <p className="text-xs text-gray-500">
                                        Last check: {formatLastCheck(status[service.key].lastCheck)}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center space-x-2">
                                <span className="text-lg">{getStatusIcon(status[service.key].status)}</span>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(status[service.key].status)}`}>
                                    {status[service.key].status.toUpperCase()}
                                </span>
                            </div>

                            {status[service.key].details && (
                                <div className="mt-3 pt-3 border-t border-gray-100">
                                    <div className="text-xs text-gray-600 space-y-1">
                                        {status[service.key].details.responseTime && (
                                            <div>Response: {status[service.key].details.responseTime}ms</div>
                                        )}
                                        {status[service.key].details.version && (
                                            <div>Version: {status[service.key].details.version}</div>
                                        )}
                                        {status[service.key].details.uptime && (
                                            <div>Uptime: {Math.round(status[service.key].details.uptime / 1000)}s</div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Service Details */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">🔍 Service Details</h4>

                <div className="space-y-4">
                    {Object.entries(status).map(([service, data]) => (
                        <div key={service} className="border border-gray-200 rounded-lg p-4">
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <h5 className="font-medium text-gray-900 capitalize">{service} Service</h5>
                                    <p className="text-sm text-gray-600">
                                        Status: <span className={`font-medium ${data.status === 'healthy' ? 'text-green-600' : 'text-red-600'}`}>
                                            {data.status}
                                        </span>
                                    </p>
                                </div>
                                <span className="text-2xl">{getStatusIcon(data.status)}</span>
                            </div>

                            {data.details && (
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                    {Object.entries(data.details).map(([key, value]) => (
                                        <div key={key}>
                                            <span className="text-gray-600 capitalize">{key.replace(/([A-Z])/g, ' $1')}:</span>
                                            <div className="font-medium">
                                                {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">⚡ Quick Actions</h4>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <button
                        onClick={() => window.open('/api/integrations/nutrition-integration/health', '_blank')}
                        className="bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 transition-colors text-center"
                    >
                        <div className="text-lg mb-1">🔬</div>
                        <div className="font-medium">Test Nutrition</div>
                        <div className="text-xs opacity-90">API Health Check</div>
                    </button>

                    <button
                        onClick={() => window.open('/api/integrations/smart-inventory/health', '_blank')}
                        className="bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition-colors text-center"
                    >
                        <div className="text-lg mb-1">📦</div>
                        <div className="font-medium">Test Inventory</div>
                        <div className="text-xs opacity-90">Service Status</div>
                    </button>

                    <button
                        onClick={() => window.open('/api/integrations/modal-health', '_blank')}
                        className="bg-purple-600 text-white px-4 py-3 rounded-lg hover:bg-purple-700 transition-colors text-center"
                    >
                        <div className="text-lg mb-1">☁️</div>
                        <div className="font-medium">Test Modal</div>
                        <div className="text-xs opacity-90">Cloud Services</div>
                    </button>

                    <button
                        onClick={checkAllServices}
                        className="bg-orange-600 text-white px-4 py-3 rounded-lg hover:bg-orange-700 transition-colors text-center"
                    >
                        <div className="text-lg mb-1">🔄</div>
                        <div className="font-medium">Refresh All</div>
                        <div className="text-xs opacity-90">Full Health Check</div>
                    </button>
                </div>
            </div>

            {/* Integration Guide */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h4 className="text-lg font-semibold text-blue-900 mb-4">📚 Integration Guide</h4>
                <div className="space-y-3 text-sm text-blue-800">
                    <div className="flex items-start space-x-2">
                        <span className="text-blue-600">1.</span>
                        <div>
                            <strong>Deploy Modal Services:</strong> Upload your Python services to Modal.com and update environment variables
                        </div>
                    </div>
                    <div className="flex items-start space-x-2">
                        <span className="text-blue-600">2.</span>
                        <div>
                            <strong>Test Connections:</strong> Use the buttons above to verify each service is responding correctly
                        </div>
                    </div>
                    <div className="flex items-start space-x-2">
                        <span className="text-blue-600">3.</span>
                        <div>
                            <strong>Monitor Health:</strong> Check this dashboard regularly to ensure all integrations are working
                        </div>
                    </div>
                </div>
            </div>

            {/* Troubleshooting */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                <h4 className="text-lg font-semibold text-yellow-900 mb-4">🔧 Troubleshooting</h4>
                <div className="space-y-3 text-sm text-yellow-800">
                    <div className="flex items-start space-x-2">
                        <span className="text-yellow-600">❌</span>
                        <div>
                            <strong>Service Unhealthy:</strong> Check Modal.com dashboard and verify your services are deployed correctly
                        </div>
                    </div>
                    <div className="flex items-start space-x-2">
                        <span className="text-yellow-600">⚠️</span>
                        <div>
                            <strong>Connection Issues:</strong> Verify environment variables and API endpoints are correct
                        </div>
                    </div>
                    <div className="flex items-start space-x-2">
                        <span className="text-yellow-600">🔄</span>
                        <div>
                            <strong>Slow Response:</strong> Check Modal.com service logs for performance issues
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}