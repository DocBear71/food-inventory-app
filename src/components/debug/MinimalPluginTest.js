'use client';
// file: /src/components/debug/MinimalPluginTest.js v2 - Enhanced with visual debugging for MacInCloud

import React, { useState } from 'react';
import { registerPlugin } from '@capacitor/core';
import { Capacitor } from '@capacitor/core';
import VisualPluginDiagnostic from './VisualPluginDiagnostic';

const MinimalPluginTest = () => {
    const [testResults, setTestResults] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [showVisualDiagnostic, setShowVisualDiagnostic] = useState(false);
    const [visualLogs, setVisualLogs] = useState([]);

    // Register plugin
    const MinimalNativeScanner = registerPlugin('MinimalNativeScanner');

    // Visual logging for MacInCloud
    const addVisualLog = (message, data = null, type = 'info') => {
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = {
            timestamp,
            message,
            data: data ? (typeof data === 'string' ? data : JSON.stringify(data, null, 2)) : null,
            type,
            id: Date.now()
        };

        setVisualLogs(prev => [...prev.slice(-20), logEntry]); // Keep last 20 logs
    };

    const runMinimalTest = async () => {
        setIsLoading(true);
        setVisualLogs([]);

        const results = {
            basic: { name: "Basic Setup", status: "unknown", details: {} },
            registration: { name: "Plugin Registration", status: "unknown", details: {} },
            testMethod: { name: "Test Method", status: "unknown", details: {} },
            cameraMethod: { name: "Camera Method", status: "unknown", details: {} },
            summary: { success: false, message: "" }
        };

        try {
            addVisualLog('🔧 Starting minimal plugin test', null, 'info');

            // Basic platform check
            const isNative = Capacitor.isNativePlatform();
            const platform = Capacitor.getPlatform();

            results.basic.details = {
                isNative,
                platform,
                timestamp: new Date().toISOString()
            };
            results.basic.status = (isNative && platform === 'ios') ? "PASS" : "FAIL";

            addVisualLog('Basic platform check', results.basic.details, results.basic.status === 'PASS' ? 'success' : 'error');

            // Plugin registration check
            results.registration.details = {
                pluginExists: !!MinimalNativeScanner,
                pluginType: typeof MinimalNativeScanner,
                methodCount: MinimalNativeScanner ? Object.keys(MinimalNativeScanner).length : 0,
                availableMethods: MinimalNativeScanner ? Object.keys(MinimalNativeScanner) : []
            };
            results.registration.status = MinimalNativeScanner ? "PASS" : "FAIL";

            addVisualLog('Plugin registration check', results.registration.details, results.registration.status === 'PASS' ? 'success' : 'error');

            // Test method call
            if (MinimalNativeScanner && typeof MinimalNativeScanner.testMethod === 'function') {
                try {
                    addVisualLog('Attempting testMethod call...', null, 'info');
                    
                    const testStart = Date.now();
                    const testResult = await MinimalNativeScanner.testMethod();
                    const testDuration = Date.now() - testStart;

                    results.testMethod.details = {
                        called: true,
                        duration: testDuration,
                        result: testResult,
                        success: true,
                        resultKeys: testResult ? Object.keys(testResult) : []
                    };
                    results.testMethod.status = "PASS";
                    
                    addVisualLog('✅ testMethod SUCCESS', results.testMethod.details, 'success');
                } catch (error) {
                    results.testMethod.details = {
                        called: true,
                        error: error.message,
                        code: error.code || 'NO_CODE',
                        data: error.data || {},
                        success: false
                    };
                    results.testMethod.status = "FAIL";
                    
                    addVisualLog('❌ testMethod FAILED', results.testMethod.details, 'error');
                }
            } else {
                results.testMethod.details = {
                    called: false,
                    reason: "testMethod not found or not a function",
                    pluginExists: !!MinimalNativeScanner,
                    availableMethods: MinimalNativeScanner ? Object.keys(MinimalNativeScanner) : []
                };
                results.testMethod.status = "FAIL";
                
                addVisualLog('❌ testMethod not available', results.testMethod.details, 'error');
            }

            // Camera method test (only if testMethod passed)
            if (results.testMethod.status === "PASS" && MinimalNativeScanner.getCameraStatus) {
                try {
                    addVisualLog('Attempting getCameraStatus call...', null, 'info');
                    
                    const cameraResult = await MinimalNativeScanner.getCameraStatus();

                    results.cameraMethod.details = {
                        called: true,
                        result: cameraResult,
                        success: true,
                        hasRequiredFields: !!(cameraResult && cameraResult.camera && cameraResult.nativeScanner)
                    };
                    results.cameraMethod.status = "PASS";
                    
                    addVisualLog('✅ getCameraStatus SUCCESS', results.cameraMethod.details, 'success');
                } catch (error) {
                    results.cameraMethod.details = {
                        called: true,
                        error: error.message,
                        code: error.code || 'NO_CODE',
                        success: false
                    };
                    results.cameraMethod.status = "FAIL";
                    
                    addVisualLog('❌ getCameraStatus FAILED', results.cameraMethod.details, 'error');
                }
            } else {
                results.cameraMethod.details = {
                    called: false,
                    reason: "Skipped due to testMethod failure or method not available"
                };
                results.cameraMethod.status = "SKIP";
                
                addVisualLog('⏭️ getCameraStatus SKIPPED', results.cameraMethod.details, 'warning');
            }

            // Generate summary with visual feedback
            const passedTests = Object.keys(results).filter(key =>
                key !== 'summary' && results[key].status === 'PASS'
            ).length;

            if (passedTests >= 3) { // basic, registration, testMethod minimum
                results.summary.success = true;
                results.summary.message = `🎉 SUCCESS! ${passedTests}/4 tests passed - Plugin working!`;
                addVisualLog('🎉 DIAGNOSTIC COMPLETE - SUCCESS', { passedTests, totalTests: 4 }, 'success');
            } else if (results.basic.status === "FAIL") {
                results.summary.success = false;
                results.summary.message = "❌ Platform issue - Not running on native iOS";
                addVisualLog('❌ DIAGNOSTIC COMPLETE - Platform failure', null, 'error');
            } else if (results.registration.status === "FAIL") {
                results.summary.success = false;
                results.summary.message = "❌ Plugin not registered - Check Plugins.swift";
                addVisualLog('❌ DIAGNOSTIC COMPLETE - Registration failure', null, 'error');
            } else if (results.testMethod.status === "FAIL") {
                const error = results.testMethod.details.error || "Unknown error";
                if (error.includes("UNIMPLEMENTED")) {
                    results.summary.success = false;
                    results.summary.message = "❌ UNIMPLEMENTED ERROR - Bridge not working";
                    addVisualLog('❌ DIAGNOSTIC COMPLETE - UNIMPLEMENTED error', null, 'error');
                } else {
                    results.summary.success = false;
                    results.summary.message = `❌ Method call failed: ${error}`;
                    addVisualLog('❌ DIAGNOSTIC COMPLETE - Method call failure', { error }, 'error');
                }
            } else {
                results.summary.success = false;
                results.summary.message = `⚠️ Partial success: ${passedTests}/4 tests passed`;
                addVisualLog('⚠️ DIAGNOSTIC COMPLETE - Partial success', { passedTests }, 'warning');
            }

        } catch (error) {
            results.summary.success = false;
            results.summary.message = `❌ Test framework error: ${error.message}`;
            addVisualLog('❌ DIAGNOSTIC FRAMEWORK ERROR', { error: error.message }, 'error');
        }

        setTestResults(results);
        setIsLoading(false);
    };

    const testScanner = async () => {
        if (!MinimalNativeScanner || !MinimalNativeScanner.scanWithNativeCamera) {
            addVisualLog('❌ Scanner not available', null, 'error');
            return;
        }

        try {
            addVisualLog('🎥 Starting scanner test...', null, 'info');
            const result = await MinimalNativeScanner.scanWithNativeCamera();
            addVisualLog('✅ Scanner result', result, 'success');
        } catch (error) {
            addVisualLog('❌ Scanner error', { 
                error: error.message, 
                code: error.code 
            }, 'error');
        }
    };

    const StatusIcon = ({ status }) => {
        switch (status) {
            case 'PASS': return <span style={{ color: '#10B981', fontSize: '20px' }}>✅</span>;
            case 'FAIL': return <span style={{ color: '#EF4444', fontSize: '20px' }}>❌</span>;
            case 'SKIP': return <span style={{ color: '#F59E0B', fontSize: '20px' }}>⏭️</span>;
            default: return <span style={{ color: '#6B7280', fontSize: '20px' }}>⏳</span>;
        }
    };

    const downloadVisualLogs = () => {
        const logText = visualLogs.map(log => 
            `[${log.timestamp}] [${log.type.toUpperCase()}] ${log.message}${log.data ? '\n' + log.data : ''}`
        ).join('\n\n');
        
        const blob = new Blob([logText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `capacitor-test-${Date.now()}.log`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    if (showVisualDiagnostic) {
        return (
            <div style={{ position: 'relative' }}>
                <button
                    onClick={() => setShowVisualDiagnostic(false)}
                    style={{
                        position: 'absolute',
                        top: '20px',
                        left: '20px',
                        zIndex: 1000,
                        backgroundColor: '#EF4444',
                        color: 'white',
                        border: 'none',
                        padding: '10px 20px',
                        borderRadius: '8px',
                        fontSize: '14px',
                        cursor: 'pointer'
                    }}
                >
                    ← Back to Simple Test
                </button>
                <VisualPluginDiagnostic />
            </div>
        );
    }

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
                    🔧 Plugin Test (MacInCloud Visual Debugging)
                </h1>

                <p style={{ color: '#9CA3AF', marginBottom: '20px' }}>
                    Visual testing for remote desktop environments - All output displayed on screen
                </p>

                <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
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
                        {isLoading ? '⏳ Testing...' : '🔧 Run Plugin Test'}
                    </button>

                    <button
                        onClick={() => setShowVisualDiagnostic(true)}
                        style={{
                            backgroundColor: '#8B5CF6',
                            color: 'white',
                            border: 'none',
                            padding: '12px 24px',
                            borderRadius: '8px',
                            fontSize: '16px',
                            cursor: 'pointer'
                        }}
                    >
                        🔬 Full Visual Diagnostic
                    </button>

                    {testResults?.summary.success && (
                        <button
                            onClick={testScanner}
                            style={{
                                backgroundColor: '#10B981',
                                color: 'white',
                                border: 'none',
                                padding: '12px 24px',
                                borderRadius: '8px',
                                fontSize: '16px',
                                cursor: 'pointer'
                            }}
                        >
                            📸 Test Scanner
                        </button>
                    )}

                    {visualLogs.length > 0 && (
                        <button
                            onClick={downloadVisualLogs}
                            style={{
                                backgroundColor: '#059669',
                                color: 'white',
                                border: 'none',
                                padding: '12px 24px',
                                borderRadius: '8px',
                                fontSize: '16px',
                                cursor: 'pointer'
                            }}
                        >
                            💾 Download Logs
                        </button>
                    )}
                </div>

                {/* Live Visual Logs */}
                {visualLogs.length > 0 && (
                    <div style={{
                        backgroundColor: '#111827',
                        padding: '15px',
                        borderRadius: '8px',
                        marginBottom: '20px',
                        maxHeight: '300px',
                        overflowY: 'auto',
                        border: '1px solid #374151'
                    }}>
                        <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '10px', color: '#60A5FA' }}>
                            📋 Live Test Logs:
                        </div>
                        {visualLogs.map((log) => (
                            <div key={log.id} style={{ 
                                marginBottom: '8px', 
                                padding: '8px',
                                backgroundColor: log.type === 'error' ? '#7F1D1D' : 
                                                log.type === 'success' ? '#065F46' : 
                                                log.type === 'warning' ? '#92400E' : '#1F2937',
                                borderRadius: '4px',
                                borderLeft: `4px solid ${
                                    log.type === 'error' ? '#EF4444' : 
                                    log.type === 'success' ? '#10B981' : 
                                    log.type === 'warning' ? '#F59E0B' : '#60A5FA'
                                }`
                            }}>
                                <div style={{ color: '#9CA3AF', fontSize: '12px' }}>[{log.timestamp}]</div>
                                <div style={{ color: '#E5E7EB', fontSize: '14px', fontWeight: 'bold' }}>
                                    {log.message}
                                </div>
                                {log.data && (
                                    <pre style={{ 
                                        color: '#D1D5DB', 
                                        fontSize: '12px',
                                        marginTop: '5px',
                                        whiteSpace: 'pre-wrap',
                                        wordBreak: 'break-word'
                                    }}>
                                        {log.data}
                                    </pre>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {testResults && (
                    <>
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
                                    {Object.entries(test.details).map(([detailKey, detailValue]) => (
                                        <div key={detailKey} style={{ marginBottom: '5px' }}>
                                            <span style={{ color: '#9CA3AF', fontWeight: 'bold' }}>{detailKey}:</span>{' '}
                                            <span style={{ color: '#E5E7EB' }}>
                                                {Array.isArray(detailValue)
                                                    ? detailValue.join(', ') || 'none'
                                                    : typeof detailValue === 'object'
                                                        ? JSON.stringify(detailValue, null, 2)
                                                        : String(detailValue)
                                                }
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </>
                )}
            </div>

            <div style={{
                backgroundColor: '#1F2937',
                padding: '15px',
                borderRadius: '8px',
                fontSize: '12px',
                color: '#9CA3AF'
            }}>
                <div><strong>Test Environment:</strong> MacInCloud Remote Desktop Compatible</div>
                <div><strong>Platform:</strong> {Capacitor.getPlatform()}</div>
                <div><strong>Native:</strong> {Capacitor.isNativePlatform() ? 'Yes' : 'No'}</div>
                <div><strong>Debug Method:</strong> Visual on-screen logging (no console.log)</div>
                <div><strong>Time:</strong> {new Date().toLocaleTimeString()}</div>
            </div>
        </div>
    );
};

export default MinimalPluginTest;