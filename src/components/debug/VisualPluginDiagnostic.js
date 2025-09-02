'use client';
// file: /src/components/debug/VisualPluginDiagnostic.js v1 - Visual debugging for MacInCloud

import React, { useState } from 'react';
import { registerPlugin } from '@capacitor/core';
import { Capacitor } from '@capacitor/core';

const VisualPluginDiagnostic = () => {
    const [testResults, setTestResults] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [logs, setLogs] = useState([]);
    const [currentStep, setCurrentStep] = useState('');

    // Register the plugin
    const MinimalNativeScanner = registerPlugin('MinimalNativeScanner');

    // Visual logging function that adds to screen display
    const addVisualLog = (message, data = null) => {
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = {
            timestamp,
            message,
            data: data ? JSON.stringify(data, null, 2) : null,
            id: Date.now()
        };

        setLogs(prev => [...prev.slice(-50), logEntry]); // Keep last 50 logs

        // Also try to write to a downloadable log file
        try {
            if (typeof window !== 'undefined' && window.fs && window.fs.writeFile) {
                const logText = `[${timestamp}] ${message}${data ? '\n' + JSON.stringify(data, null, 2) : ''}\n`;
                window.fs.writeFile('capacitor-diagnostic.log', logText, { encoding: 'utf8', append: true })
                    .catch(() => {}); // Silent fail if not available
            }
        } catch (e) {
            // Silent fail if file system not available
        }
    };

    const runVisualDiagnostic = async () => {
        setIsLoading(true);
        setLogs([]);
        setCurrentStep('Starting diagnostic...');

        const results = {
            step1: { name: "Platform & Plugin Check", status: "unknown", details: {}, icon: "📱" },
            step2: { name: "Method Discovery", status: "unknown", details: {}, icon: "🔧" },
            step3: { name: "Test Method Call", status: "unknown", details: {}, icon: "🧪" },
            step4: { name: "Camera Status Test", status: "unknown", details: {}, icon: "📷" },
            step5: { name: "Diagnostic Logs", status: "unknown", details: {}, icon: "📋" },
            summary: { success: false, reason: "", recommendations: [], icon: "📊" }
        };

        try {
            addVisualLog('🔧 CAPACITOR7: Starting comprehensive visual diagnostic');

            // Step 1: Platform & Plugin Check
            setCurrentStep('Step 1: Checking platform and plugin...');
            await new Promise(resolve => setTimeout(resolve, 1000));

            const isNative = Capacitor.isNativePlatform();
            const platform = Capacitor.getPlatform();

            results.step1.details = {
                isNative,
                platform,
                pluginExists: !!MinimalNativeScanner,
                pluginType: typeof MinimalNativeScanner
            };
            results.step1.status = (isNative && platform === 'ios' && !!MinimalNativeScanner) ? "PASS" : "FAIL";

            addVisualLog('STEP 1 - Platform Check:', results.step1.details);

            // Step 2: Method Discovery
            setCurrentStep('Step 2: Discovering available methods...');
            await new Promise(resolve => setTimeout(resolve, 1000));

            if (MinimalNativeScanner) {
                const allMethods = Object.keys(MinimalNativeScanner);
                const expectedMethods = ['scanWithNativeCamera', 'getCameraStatus', 'requestCameraAccess', 'testMethod', 'getDiagnosticLogs'];
                const foundMethods = expectedMethods.filter(method =>
                    MinimalNativeScanner[method] && typeof MinimalNativeScanner[method] === 'function'
                );

                results.step2.details = {
                    allAvailable: allMethods,
                    expectedMethods,
                    foundMethods,
                    missingMethods: expectedMethods.filter(method => !foundMethods.includes(method)),
                    totalFound: foundMethods.length,
                    totalExpected: expectedMethods.length
                };
                results.step2.status = (foundMethods.length > 0) ? "PASS" : "FAIL";

                addVisualLog('STEP 2 - Method Discovery:', results.step2.details);
            } else {
                results.step2.status = "FAIL";
                results.step2.details = { error: "Plugin not available" };
                addVisualLog('STEP 2 - FAILED: Plugin not available');
            }

            // Step 3: Test Method Call (CRITICAL TEST)
            setCurrentStep('Step 3: Testing diagnostic method...');
            await new Promise(resolve => setTimeout(resolve, 1000));

            if (MinimalNativeScanner && results.step2.status === "PASS") {
                try {
                    addVisualLog('Attempting testMethod call...');

                    if (typeof MinimalNativeScanner.testMethod === 'function') {
                        const testResult = await MinimalNativeScanner.testMethod();

                        results.step3.details = {
                            method: 'testMethod',
                            called: true,
                            result: testResult,
                            success: true,
                            resultType: typeof testResult,
                            message: "Test method working correctly"
                        };
                        results.step3.status = "PASS";

                        addVisualLog('STEP 3 - testMethod SUCCESS:', testResult);
                    } else {
                        results.step3.details = {
                            method: 'testMethod',
                            called: false,
                            error: "testMethod not found as function",
                            availableMethods: Object.keys(MinimalNativeScanner)
                        };
                        results.step3.status = "FAIL";

                        addVisualLog('STEP 3 - FAILED: testMethod not a function');
                    }
                } catch (error) {
                    results.step3.status = "FAIL";
                    results.step3.details = {
                        method: 'testMethod',
                        called: true,
                        error: error.message,
                        code: error.code || 'unknown',
                        data: error.data || {}
                    };

                    addVisualLog('STEP 3 - testMethod ERROR:', {
                        error: error.message,
                        code: error.code,
                        data: error.data
                    });
                }
            } else {
                results.step3.status = "FAIL";
                results.step3.details = { error: "Prerequisites not met" };
                addVisualLog('STEP 3 - FAILED: Prerequisites not met');
            }

            // Step 4: Camera Status Test
            setCurrentStep('Step 4: Testing production methods...');
            await new Promise(resolve => setTimeout(resolve, 1000));

            if (MinimalNativeScanner && results.step3.status === "PASS") {
                try {
                    addVisualLog('Attempting getCameraStatus call...');
                    const cameraResult = await MinimalNativeScanner.getCameraStatus();

                    results.step4.details = {
                        method: 'getCameraStatus',
                        result: cameraResult,
                        success: true,
                        hasExpectedFields: !!(cameraResult && cameraResult.camera && cameraResult.nativeScanner)
                    };
                    results.step4.status = "PASS";

                    addVisualLog('STEP 4 - getCameraStatus SUCCESS:', cameraResult);
                } catch (error) {
                    results.step4.status = "FAIL";
                    results.step4.details = {
                        method: 'getCameraStatus',
                        error: error.message,
                        code: error.code || 'unknown'
                    };

                    addVisualLog('STEP 4 - getCameraStatus ERROR:', {
                        error: error.message,
                        code: error.code
                    });
                }
            } else {
                results.step4.status = "FAIL";
                results.step4.details = { error: "Test method failed - cannot test production methods" };
                addVisualLog('STEP 4 - FAILED: Cannot test production methods');
            }

            // Step 5: iOS Diagnostic Logs
            setCurrentStep('Step 5: Retrieving iOS diagnostic logs...');
            await new Promise(resolve => setTimeout(resolve, 1000));

            if (MinimalNativeScanner && typeof MinimalNativeScanner.getDiagnosticLogs === 'function') {
                try {
                    addVisualLog('Attempting getDiagnosticLogs call...');
                    const logsResult = await MinimalNativeScanner.getDiagnosticLogs();

                    results.step5.details = {
                        method: 'getDiagnosticLogs',
                        success: true,
                        logCount: logsResult.count || 0,
                        capacitorVersion: logsResult.capacitorVersion,
                        bridgeProtocol: logsResult.bridgeProtocol,
                        logs: logsResult.logs || [],
                        recentLogs: (logsResult.logs || []).slice(-10) // Show last 10 logs
                    };
                    results.step5.status = "PASS";

                    addVisualLog('STEP 5 - getDiagnosticLogs SUCCESS:', {
                        logCount: logsResult.count,
                        capacitorVersion: logsResult.capacitorVersion,
                        recentLogCount: results.step5.details.recentLogs.length
                    });
                } catch (error) {
                    results.step5.status = "FAIL";
                    results.step5.details = {
                        method: 'getDiagnosticLogs',
                        error: error.message,
                        code: error.code || 'unknown'
                    };

                    addVisualLog('STEP 5 - getDiagnosticLogs ERROR:', {
                        error: error.message,
                        code: error.code
                    });
                }
            } else {
                results.step5.status = "FAIL";
                results.step5.details = { error: "getDiagnosticLogs method not available" };
                addVisualLog('STEP 5 - FAILED: getDiagnosticLogs not available');
            }

            // Generate Summary
            const passedSteps = Object.keys(results)
                .filter(key => key.startsWith('step'))
                .filter(key => results[key].status === "PASS").length;

            if (passedSteps === 5) {
                results.summary.success = true;
                results.summary.reason = "🎉 ALL TESTS PASSED! Plugin working correctly!";
                results.summary.recommendations = [
                    "Plugin registration successful",
                    "All methods are properly exposed",
                    "Capacitor 7.0 bridge working",
                    "Ready to use scanner functionality"
                ];
            } else if (results.step1.status === "FAIL") {
                results.summary.success = false;
                results.summary.reason = "❌ Platform or plugin registration issue";
                results.summary.recommendations = [
                    "Verify running on native iOS device",
                    "Check plugin is registered in Plugins.swift",
                    "Rebuild iOS project completely"
                ];
            } else if (results.step2.status === "FAIL") {
                results.summary.success = false;
                results.summary.reason = "❌ No methods found - Swift compilation issue";
                results.summary.recommendations = [
                    "Check MinimalNativeScanner.swift is in build target",
                    "Verify @objc method declarations",
                    "Look for Swift compilation errors in Xcode",
                    "Clean build folder and rebuild"
                ];
            } else if (results.step3.status === "FAIL") {
                const error = results.step3.details.error || "Unknown error";
                if (error.includes("UNIMPLEMENTED")) {
                    results.summary.success = false;
                    results.summary.reason = "❌ UNIMPLEMENTED - Bridge communication issue";
                    results.summary.recommendations = [
                        "Plugin found but methods not accessible",
                        "Check CAPBridgedPlugin implementation",
                        "Verify pluginMethods array in Swift",
                        "Try: Product -> Clean Build Folder in Xcode"
                    ];
                } else {
                    results.summary.success = false;
                    results.summary.reason = `❌ Method call failed: ${error}`;
                    results.summary.recommendations = [
                        "Check iOS device logs in Xcode console",
                        "Look for Swift runtime errors",
                        "Verify method signatures match requirements"
                    ];
                }
            } else {
                results.summary.success = false;
                results.summary.reason = "❌ Partial functionality - Some methods working";
                results.summary.recommendations = [
                    `${passedSteps}/5 tests passed`,
                    "Some methods work but others don't",
                    "Check individual method implementations"
                ];
            }

            setCurrentStep('Visual diagnostic complete!');
            setTestResults(results);

            addVisualLog('DIAGNOSTIC COMPLETE:', results.summary);

        } catch (error) {
            results.summary.success = false;
            results.summary.reason = `❌ Diagnostic failed: ${error.message}`;
            results.summary.recommendations = ["Check for JavaScript errors"];
            setTestResults(results);

            addVisualLog('DIAGNOSTIC ERROR:', { error: error.message });
        } finally {
            setIsLoading(false);
        }
    };

    // Quick test for immediate feedback
    const quickTest = async () => {
        setLogs([]);
        addVisualLog('Starting quick test...');

        try {
            if (!MinimalNativeScanner) {
                addVisualLog('❌ Plugin not found');
                return;
            }

            if (typeof MinimalNativeScanner.testMethod !== 'function') {
                addVisualLog('❌ testMethod not a function');
                return;
            }

            addVisualLog('Calling testMethod...');
            const result = await MinimalNativeScanner.testMethod();

            addVisualLog('✅ Quick test SUCCESS:', result);
        } catch (error) {
            addVisualLog('❌ Quick test FAILED:', {
                error: error.message,
                code: error.code,
                data: error.data
            });
        }
    };

    const StatusIcon = ({ status }) => {
        switch (status) {
            case 'PASS': return <span style={{ color: '#10B981', fontSize: '20px' }}>✅</span>;
            case 'FAIL': return <span style={{ color: '#EF4444', fontSize: '20px' }}>❌</span>;
            default: return <span style={{ color: '#6B7280', fontSize: '20px' }}>⏳</span>;
        }
    };

    const getViewControllerLogs = async () => {
        try {
            // Try to access the ViewController diagnostic logs directly
            if (window.webkit && window.webkit.messageHandlers) {
                // This is a hack to try to access ViewController logs
                const result = await new Promise((resolve) => {
                    // Create a temporary plugin to get ViewController logs
                    const tempScript = `
                        if (window.bridge && window.bridge.getViewController) {
                            const vc = window.bridge.getViewController();
                            if (vc && vc.getViewControllerDiagnosticLogs) {
                                return vc.getViewControllerDiagnosticLogs();
                            }
                        }
                        return [];
                    `;
                    resolve([]);
                });
                return result;
            }
            return [];
        } catch (error) {
            return [`Error accessing ViewController logs: ${error.message}`];
        }
    };

    const downloadLogs = () => {
        const logText = logs.map(log =>
            `[${log.timestamp}] ${log.message}${log.data ? '\n' + log.data : ''}`
        ).join('\n\n');

        const blob = new Blob([logText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'capacitor-diagnostic.log';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div style={{
            padding: '20px',
            fontFamily: 'monospace',
            backgroundColor: '#000',
            color: '#fff',
            minHeight: '100vh',
            fontSize: '14px',
            lineHeight: '1.4'
        }}>
            <div style={{
                backgroundColor: '#1F2937',
                padding: '20px',
                borderRadius: '10px',
                marginBottom: '20px'
            }}>
                <h1 style={{ color: '#60A5FA', margin: '0 0 20px 0', fontSize: '20px' }}>
                    🔬 Visual Plugin Diagnostic (MacInCloud Compatible)
                </h1>

                <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
                    <button
                        onClick={runVisualDiagnostic}
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
                        {isLoading ? '⏳ Running...' : '🔬 Run Full Diagnostic'}
                    </button>
                    <button
                        onClick={async () => {
                            setCurrentStep('Getting ViewController diagnostic logs via plugin...');
                            try {
                                const result = await MinimalNativeScanner.getViewControllerDiagnosticLogs();

                                setLogs(prev => [...prev, {
                                    step: 'ViewController Diagnostics',
                                    status: result.logs && result.logs.length > 0 ? 'SUCCESS' : 'NO_LOGS',
                                    details: {
                                        logs: result.logs || [],
                                        count: result.count || 0,
                                        message: result.logs && result.logs.length > 0 ?
                                            'ViewController diagnostic logs retrieved successfully' :
                                            'No ViewController logs found',
                                        rawResult: result
                                    },
                                    timestamp: Date.now()
                                }]);

                                setCurrentStep('ViewController diagnostics complete');
                            } catch (error) {
                                setLogs(prev => [...prev, {
                                    step: 'ViewController Diagnostics',
                                    status: 'ERROR',
                                    details: { error: error.message },
                                    timestamp: Date.now()
                                }]);
                                setCurrentStep('ViewController diagnostics failed');
                            }
                        }}
                        style={{
                            backgroundColor: '#8B5CF6',
                            color: 'white',
                            border: 'none',
                            padding: '12px 24px',
                            borderRadius: '8px',
                            fontSize: '16px',
                            cursor: 'pointer',
                            margin: '10px'
                        }}
                    >
                        🔍 Get ViewController Logs
                    </button>
                    <button
                        onClick={quickTest}
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
                        ⚡ Quick Test
                    </button>

                    {logs.length > 0 && (
                        <button
                            onClick={downloadLogs}
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
                            💾 Download Logs
                        </button>
                    )}

                    <button
                        onClick={() => setLogs([])}
                        style={{
                            backgroundColor: '#6B7280',
                            color: 'white',
                            border: 'none',
                            padding: '12px 24px',
                            borderRadius: '8px',
                            fontSize: '16px',
                            cursor: 'pointer'
                        }}
                    >
                        🗑️ Clear Logs
                    </button>
                </div>

                {isLoading && (
                    <div style={{
                        backgroundColor: '#374151',
                        padding: '15px',
                        borderRadius: '8px',
                        marginBottom: '20px',
                        color: '#FBBF24'
                    }}>
                        <div style={{ fontSize: '16px', marginBottom: '10px' }}>⏳ Current Step:</div>
                        <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{currentStep}</div>
                    </div>
                )}

                {/* Live Logs Display */}
                {logs.length > 0 && (
                    <div style={{
                        backgroundColor: '#111827',
                        padding: '15px',
                        borderRadius: '8px',
                        marginBottom: '20px',
                        maxHeight: '400px',
                        overflowY: 'auto',
                        border: '1px solid #374151'
                    }}>
                        <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '10px', color: '#60A5FA' }}>
                            📋 Live Diagnostic Logs ({logs.length}):
                        </div>
                        {logs.map((log, index) => (
                            <div key={log.id} style={{
                                marginBottom: '10px',
                                padding: '8px',
                                backgroundColor: index % 2 === 0 ? '#1F2937' : '#111827',
                                borderRadius: '4px'
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
                                📊 Visual Diagnostic Results
                            </h2>
                            <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '10px' }}>
                                {testResults.summary.reason}
                            </div>
                            {testResults.summary.recommendations.length > 0 && (
                                <div>
                                    <div style={{ marginBottom: '5px', fontWeight: 'bold' }}>
                                        {testResults.summary.success ? 'Status:' : 'Recommendations:'}
                                    </div>
                                    {testResults.summary.recommendations.map((rec, index) => (
                                        <div key={index} style={{ marginLeft: '20px', marginBottom: '5px' }}>
                                            • {rec}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Detailed Results */}
                        {Object.entries(testResults).filter(([key]) => key.startsWith('step')).map(([key, step]) => (
                            <div key={key} style={{
                                backgroundColor: '#374151',
                                padding: '15px',
                                borderRadius: '8px',
                                marginBottom: '15px',
                                border: `1px solid ${step.status === 'PASS' ? '#10B981' : step.status === 'FAIL' ? '#EF4444' : '#6B7280'}`
                            }}>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    marginBottom: '10px',
                                    fontSize: '16px',
                                    fontWeight: 'bold'
                                }}>
                                    <StatusIcon status={step.status} />
                                    <span style={{ marginLeft: '10px' }}>
                                        {step.icon} {step.name}
                                    </span>
                                </div>

                                <div style={{ marginLeft: '30px', fontSize: '13px' }}>
                                    {Object.entries(step.details).map(([detailKey, detailValue]) => (
                                        <div key={detailKey} style={{ marginBottom: '8px' }}>
                                            <span style={{ color: '#9CA3AF', fontWeight: 'bold' }}>
                                                {detailKey}:
                                            </span>{' '}
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
                <div><strong>Diagnostic Type:</strong> Visual Plugin Testing (MacInCloud Compatible)</div>
                <div><strong>Platform:</strong> {typeof window !== 'undefined' ? Capacitor.getPlatform() : 'Unknown'}</div>
                <div><strong>Native:</strong> {typeof window !== 'undefined' ? (Capacitor.isNativePlatform() ? 'Yes' : 'No') : 'Unknown'}</div>
                <div><strong>Time:</strong> {new Date().toLocaleTimeString()}</div>
                <div><strong>Logs:</strong> All output shown on screen + downloadable</div>
            </div>

            {/* NEW: Registration Logs Section */}
            {logs.length > 0 && (
                <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#1f2937', borderRadius: '8px' }}>
                    <h3 style={{ color: '#10B981', margin: '0 0 15px 0', fontSize: '18px' }}>
                        📋 Registration Logs ({logs.find(log => log.hasRegistrationLogs)?.registrationLogCount || 0} entries)
                    </h3>

                    {logs.map((log, index) => (
                        log.registrationLogs && log.registrationLogs.length > 0 && (
                            <div key={index} style={{ marginBottom: '15px' }}>
                                <div style={{
                                    backgroundColor: '#374151',
                                    padding: '10px',
                                    borderRadius: '6px',
                                    maxHeight: '300px',
                                    overflowY: 'auto',
                                    border: '2px solid #10B981'
                                }}>
                                    <div style={{
                                        color: '#10B981',
                                        fontWeight: 'bold',
                                        marginBottom: '10px',
                                        fontSize: '14px'
                                    }}>
                                        🔧 iOS Plugin Registration Process:
                                    </div>

                                    {log.registrationLogs.map((regLog, regIndex) => (
                                        <div key={regIndex} style={{
                                            color: '#E5E7EB',
                                            fontSize: '12px',
                                            marginBottom: '5px',
                                            padding: '3px 6px',
                                            backgroundColor: regLog.includes('✅') ? '#065F46' :
                                                regLog.includes('❌') ? '#7F1D1D' : '#1F2937',
                                            borderRadius: '4px',
                                            fontFamily: 'monospace'
                                        }}>
                                            {regLog}
                                        </div>
                                    ))}

                                    {log.pluginInfo && (
                                        <div style={{
                                            marginTop: '10px',
                                            padding: '8px',
                                            backgroundColor: '#4F46E5',
                                            borderRadius: '4px'
                                        }}>
                                            <div style={{ color: '#C7D2FE', fontSize: '12px', fontWeight: 'bold' }}>
                                                Plugin Class Info:
                                            </div>
                                            <div style={{ color: '#E0E7FF', fontSize: '11px' }}>
                                                Class: {log.pluginInfo.className}<br/>
                                                Superclass: {log.pluginInfo.superclass}<br/>
                                                Protocols: {log.pluginInfo.protocols}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    ))}

                    {logs.every(log => !log.registrationLogs || log.registrationLogs.length === 0) && (
                        <div style={{
                            color: '#EF4444',
                            fontSize: '14px',
                            padding: '10px',
                            backgroundColor: '#7F1D1D',
                            borderRadius: '6px'
                        }}>
                            ❌ No registration logs found - this indicates the registration process may not be running
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default VisualPluginDiagnostic;