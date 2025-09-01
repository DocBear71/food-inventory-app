'use client';
// file: /src/components/debug/MinimalPluginTest.js v1 - Test basic plugin functionality

import React, { useState } from 'react';
import { registerPlugin } from '@capacitor/core';
import { Capacitor } from '@capacitor/core';

const MinimalPluginTest = () => {
    const [testResults, setTestResults] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    // Register plugin
    const MinimalNativeScanner = registerPlugin('MinimalNativeScanner');

    const runMinimalTest = async () => {
        setIsLoading(true);

        const results = {
            basic: { name: "Basic Setup", status: "unknown", details: {} },
            registration: { name: "Plugin Registration", status: "unknown", details: {} },
            pingTest: { name: "Ping Test", status: "unknown", details: {} },
            simpleTest: { name: "Simple Test", status: "unknown", details: {} },
            summary: { success: false, message: "" }
        };

        try {
            // Basic platform check
            results.basic.details = {
                isNative: Capacitor.isNativePlatform(),
                platform: Capacitor.getPlatform()
            };
            results.basic.status = (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios') ? "PASS" : "FAIL";

            // Plugin registration check
            results.registration.details = {
                pluginExists: !!MinimalNativeScanner,
                pluginType: typeof MinimalNativeScanner,
                methodCount: MinimalNativeScanner ? Object.keys(MinimalNativeScanner).length : 0,
                availableMethods: MinimalNativeScanner ? Object.keys(MinimalNativeScanner) : []
            };
            results.registration.status = MinimalNativeScanner ? "PASS" : "FAIL";

            // Ping test - simplest possible method call
            if (MinimalNativeScanner && typeof MinimalNativeScanner.ping === 'function') {
                try {
                    const pingStart = Date.now();
                    const pingResult = await MinimalNativeScanner.ping();
                    const pingDuration = Date.now() - pingStart;

                    results.pingTest.details = {
                        called: true,
                        duration: pingDuration,
                        result: pingResult,
                        success: true
                    };
                    results.pingTest.status = "PASS";
                } catch (error) {
                    results.pingTest.details = {
                        called: true,
                        error: error.message,
                        code: error.code,
                        success: false
                    };
                    results.pingTest.status = "FAIL";
                }
            } else {
                results.pingTest.details = {
                    called: false,
                    reason: "ping method not found"
                };
                results.pingTest.status = "FAIL";
            }

            // Simple test - another basic method
            if (MinimalNativeScanner && typeof MinimalNativeScanner.simpleTest === 'function') {
                try {
                    const simpleResult = await MinimalNativeScanner.simpleTest();

                    results.simpleTest.details = {
                        called: true,
                        result: simpleResult,
                        success: true
                    };
                    results.simpleTest.status = "PASS";
                } catch (error) {
                    results.simpleTest.details = {
                        called: true,
                        error: error.message,
                        code: error.code,
                        success: false
                    };
                    results.simpleTest.status = "FAIL";
                }
            } else {
                results.simpleTest.details = {
                    called: false,
                    reason: "simpleTest method not found"
                };
                results.simpleTest.status = "FAIL";
            }

            // Generate summary
            const passedTests = Object.keys(results).filter(key =>
                key !== 'summary' && results[key].status === 'PASS'
            ).length;

            if (passedTests === 4) {
                results.summary.success = true;
                results.summary.message = "All tests passed - Plugin is working correctly!";
            } else if (results.basic.status === "FAIL") {
                results.summary.success = false;
                results.summary.message = "Platform issue - Not running on native iOS";
            } else if (results.registration.status === "FAIL") {
                results.summary.success = false;
                results.summary.message = "Plugin registration failed - Swift class not found";
            } else if (results.pingTest.status === "FAIL") {
                const error = results.pingTest.details.error || "Unknown error";
                if (error.includes("UNIMPLEMENTED")) {
                    results.summary.success = false;
                    results.summary.message = "Swift class found but method calls fail - Runtime binding issue";
                } else {
                    results.summary.success = false;
                    results.summary.message = `Method call failed: ${error}`;
                }
            } else {
                results.summary.success = false;
                results.summary.message = "Partial functionality - Some methods work, others don't";
            }

        } catch (error) {
            results.summary.success = false;
            results.summary.message = `Test framework error: ${error.message}`;
        }

        setTestResults(results);
        setIsLoading(false);
    };

    const StatusIcon = ({ status }) => {
        if (status === 'PASS') return <span style={{ color: '#10B981', fontSize: '18px' }}>✅</span>;
        if (status === 'FAIL') return <span style={{ color: '#EF4444', fontSize: '18px' }}>❌</span>;
        return <span style={{ color: '#6B7280', fontSize: '18px' }}>⏳</span>;
    };

    return (
        <div style={{
            padding: '20px',
            fontFamily: 'monospace',
            backgroundColor: '#000',
            color: '#fff',
            minHeight: '100vh',
            fontSize: '14px'
        }}>
            <div style={{
                backgroundColor: '#1F2937',
                padding: '20px',
                borderRadius: '10px',
                marginBottom: '20px'
            }}>
                <h1 style={{ color: '#60A5FA', margin: '0 0 20px 0', fontSize: '20px' }}>
                    🔧 Minimal Plugin Test
                </h1>

                <p style={{ color: '#9CA3AF', marginBottom: '20px' }}>
                    Final debugging attempt - Testing basic plugin functionality with minimal Swift implementation
                </p>

                <button
                    onClick={runMinimalTest}
                    disabled={isLoading}
                    style={{
                        backgroundColor: '#3B82F6',
                        color: 'white',
                        border: 'none',
                        padding: '12px 24px',
                        borderRadius: '8px',
                        fontSize: '16px',
                        cursor: 'pointer',
                        opacity: isLoading ? 0.6 : 1
                    }}
                >
                    {isLoading ? '⏳ Running Minimal Test...' : '🔧 Run Minimal Test'}
                </button>

                {testResults && (
                    <div style={{ marginTop: '20px' }}>
                        {/* Summary */}
                        <div style={{
                            backgroundColor: testResults.summary.success ? '#065F46' : '#7F1D1D',
                            padding: '20px',
                            borderRadius: '8px',
                            marginBottom: '20px',
                            border: `2px solid ${testResults.summary.success ? '#10B981' : '#EF4444'}`
                        }}>
                            <h2 style={{ margin: '0 0 10px 0', fontSize: '18px' }}>
                                📊 Test Results
                            </h2>
                            <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
                                {testResults.summary.message}
                            </div>
                        </div>

                        {/* Individual Test Results */}
                        {Object.entries(testResults).filter(([key]) => key !== 'summary').map(([testName, test]) => (
                            <div key={testName} style={{
                                backgroundColor: '#374151',
                                padding: '15px',
                                borderRadius: '8px',
                                marginBottom: '15px',
                                border: `1px solid ${test.status === 'PASS' ? '#10B981' : test.status === 'FAIL' ? '#EF4444' : '#6B7280'}`
                            }}>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    marginBottom: '10px',
                                    fontSize: '16px',
                                    fontWeight: 'bold'
                                }}>
                                    <StatusIcon status={test.status} />
                                    <span style={{ marginLeft: '10px' }}>
                    {test.name}
                  </span>
                                </div>

                                <div style={{ marginLeft: '30px', fontSize: '13px' }}>
                  <pre style={{
                      backgroundColor: '#1F2937',
                      padding: '10px',
                      borderRadius: '4px',
                      overflow: 'auto',
                      margin: 0
                  }}>
                    {JSON.stringify(test.details, null, 2)}
                  </pre>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div style={{
                backgroundColor: '#1F2937',
                padding: '15px',
                borderRadius: '8px',
                fontSize: '12px',
                color: '#9CA3AF'
            }}>
                <div><strong>Test Type:</strong> Minimal Plugin Functionality</div>
                <div><strong>Platform:</strong> {Capacitor.getPlatform()}</div>
                <div><strong>Native:</strong> {Capacitor.isNativePlatform() ? 'Yes' : 'No'}</div>
                <div><strong>Time:</strong> {new Date().toLocaleTimeString()}</div>
            </div>
        </div>
    );
};

export default MinimalPluginTest;