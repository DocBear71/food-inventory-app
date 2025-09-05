'use client';
// file: /src/components/debug/VisualPluginDebugger.js v1 - Visual on-screen debugging for iPad testing

import React, { useState, useEffect } from 'react';
import { registerPlugin } from '@capacitor/core';
import { Capacitor } from '@capacitor/core';

const VisualPluginDebugger = () => {
    const [testResults, setTestResults] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [currentStep, setCurrentStep] = useState('');

    // Register the CORRECTED plugin name
    const MinimalNativeScanner = registerPlugin('MinimalNativeScanner');

    const runVisualTest = async () => {
        setIsLoading(true);
        setCurrentStep('Starting test...');

        const results = {
            step1: { name: "Platform Check", status: "unknown", details: {}, icon: "🏗️" },
            step2: { name: "Plugin Registration", status: "unknown", details: {}, icon: "🔌" },
            step3: { name: "Method Availability", status: "unknown", details: {}, icon: "🔧" },
            step4: { name: "Plugin Communication", status: "unknown", details: {}, icon: "📡" },
            summary: { success: false, reason: "", recommendations: [], icon: "📊" }
        };

        try {
            // Step 1: Platform Check
            setCurrentStep('Checking platform...');
            await new Promise(resolve => setTimeout(resolve, 500));

            const isNative = Capacitor.isNativePlatform();
            const platform = Capacitor.getPlatform();

            results.step1.details = {
                isNative,
                platform,
                userAgent: navigator.userAgent.substring(0, 100) + '...'
            };
            results.step1.status = (isNative && platform === 'ios') ? "PASS" : "FAIL";

            // Step 2: Plugin Registration
            setCurrentStep('Checking plugin registration...');
            await new Promise(resolve => setTimeout(resolve, 500));

            results.step2.details = {
                pluginExists: !!MinimalNativeScanner,
                pluginType: typeof MinimalNativeScanner,
                availableMethods: MinimalNativeScanner ? Object.keys(MinimalNativeScanner).slice(0, 10) : []
            };
            results.step2.status = MinimalNativeScanner ? "PASS" : "FAIL";

            // Step 3: Method Availability
            setCurrentStep('Checking available methods...');
            await new Promise(resolve => setTimeout(resolve, 500));

            if (MinimalNativeScanner) {
                const expectedMethods = ['scanWithNativeCamera', 'getCameraStatus', 'requestCameraAccess'];
                const availableMethods = Object.keys(MinimalNativeScanner);
                const foundMethods = expectedMethods.filter(method => availableMethods.includes(method));

                results.step3.details = {
                    expected: expectedMethods,
                    found: foundMethods,
                    missing: expectedMethods.filter(method => !foundMethods.includes(method)),
                    total: availableMethods.length
                };
                results.step3.status = foundMethods.length >= 2 ? "PASS" : "FAIL";
            } else {
                results.step3.status = "FAIL";
                results.step3.details = { error: "Plugin not available" };
            }

            // Step 4: Plugin Communication Test
            setCurrentStep('Testing plugin communication...');
            await new Promise(resolve => setTimeout(resolve, 500));

            if (MinimalNativeScanner && results.step1.status === "PASS") {
                try {
                    const statusResult = await MinimalNativeScanner.getCameraStatus();

                    results.step4.details = {
                        method: 'getCameraStatus',
                        result: statusResult,
                        success: true
                    };
                    results.step4.status = "PASS";
                } catch (error) {
                    results.step4.status = "FAIL";
                    results.step4.details = {
                        method: 'getCameraStatus',
                        error: error.message,
                        code: error.code || 'unknown'
                    };
                }
            } else {
                results.step4.status = "FAIL";
                results.step4.details = { error: "Prerequisites not met" };
            }

            // Generate Summary
            const passedSteps = Object.keys(results)
                .filter(key => key.startsWith('step'))
                .filter(key => results[key].status === "PASS").length;

            if (passedSteps === 4) {
                results.summary.success = true;
                results.summary.reason = "✅ Plugin working correctly!";
                results.summary.recommendations = ["Plugin is ready to use for scanning"];
            } else if (results.step1.status === "FAIL") {
                results.summary.success = false;
                results.summary.reason = "❌ Platform issue";
                results.summary.recommendations = ["Must run on native iOS app", "Check device and app type"];
            } else if (results.step2.status === "FAIL") {
                results.summary.success = false;
                results.summary.reason = "❌ Plugin not registered";
                results.summary.recommendations = [
                    "Check MinimalNativeScanner.swift in iOS project",
                    "Verify Plugins.swift includes MinimalNativeScanner.self",
                    "Rebuild iOS app completely"
                ];
            } else if (results.step3.status === "FAIL") {
                results.summary.success = false;
                results.summary.reason = "❌ Methods missing";
                results.summary.recommendations = [
                    "Check @objc method declarations in Swift",
                    "Ensure methods are properly exposed"
                ];
            } else if (results.step4.status === "FAIL") {
                results.summary.success = false;
                results.summary.reason = "❌ Communication failed";
                results.summary.recommendations = [
                    "Check iOS logs in Xcode",
                    "Verify camera permissions setup"
                ];
            }

            setCurrentStep('Test complete!');
            setTestResults(results);
        } catch (error) {
            results.summary.success = false;
            results.summary.reason = `❌ Test failed: ${error.message}`;
            results.summary.recommendations = ["Check JavaScript console for errors"];
            setTestResults(results);
        } finally {
            setIsLoading(false);
        }
    };

    const testScanner = async () => {
        if (!MinimalNativeScanner) {
            alert('❌ Plugin not available');
            return;
        }

        try {
            const result = await MinimalNativeScanner.scanWithNativeCamera();
            alert(`✅ Scan successful: ${JSON.stringify(result)}`);
        } catch (error) {
            alert(`❌ Scan failed: ${error.message}`);
        }
    };

    const StatusIcon = ({ status }) => {
        switch (status) {
            case 'PASS': return <span style={{ color: '#10B981', fontSize: '20px' }}>✅</span>;
            case 'FAIL': return <span style={{ color: '#EF4444', fontSize: '20px' }}>❌</span>;
            default: return <span style={{ color: '#6B7280', fontSize: '20px' }}>⏳</span>;
        }
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
                    🔧 Visual Plugin Debugger
                </h1>

                <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                    <button
                        onClick={runVisualTest}
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
                        {isLoading ? '⏳ Testing...' : '🧪 Run Visual Test'}
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
                                📊 Test Summary
                            </h2>
                            <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '10px' }}>
                                {testResults.summary.reason}
                            </div>
                            {testResults.summary.recommendations.length > 0 && (
                                <div>
                                    <div style={{ marginBottom: '5px', fontWeight: 'bold' }}>Recommendations:</div>
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
                <div><strong>Plugin Name:</strong> MinimalNativeScanner (CORRECTED)</div>
                <div><strong>Platform:</strong> {Capacitor.getPlatform()}</div>
                <div><strong>Native:</strong> {Capacitor.isNativePlatform() ? 'Yes' : 'No'}</div>
                <div><strong>Time:</strong> {new Date().toLocaleTimeString()}</div>
            </div>
        </div>
    );
};

export default VisualPluginDebugger;