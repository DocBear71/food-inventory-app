'use client';
// file: /src/components/debug/JavaScriptDiagnosticTester.js v1 - Comprehensive plugin diagnostic with testMethod

import React, { useState, useEffect } from 'react';
import { registerPlugin } from '@capacitor/core';
import { Capacitor } from '@capacitor/core';

const JavaScriptDiagnosticTester = () => {
  const [testResults, setTestResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState('');

  // Register the plugin
  const MinimalNativeScanner = registerPlugin('MinimalNativeScanner');

  const runComprehensiveDiagnostic = async () => {
    setIsLoading(true);
    setCurrentStep('Starting comprehensive diagnostic...');
    
    const results = {
      step1: { name: "Platform & Plugin Check", status: "unknown", details: {}, icon: "🔍" },
      step2: { name: "Method Discovery", status: "unknown", details: {}, icon: "🔧" },
      step3: { name: "Test Method Call", status: "unknown", details: {}, icon: "🧪" },
      step4: { name: "Production Method Test", status: "unknown", details: {}, icon: "⚡" },
      step5: { name: "iOS Logs Retrieval", status: "unknown", details: {}, icon: "📋" },
      summary: { success: false, reason: "", recommendations: [], icon: "📊" }
    };

    try {
      // Step 1: Platform & Plugin Check
      setCurrentStep('Step 1: Checking platform and plugin registration...');
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
      } else {
        results.step2.status = "FAIL";
        results.step2.details = { error: "Plugin not available" };
      }

      // Step 3: Test Method Call (Diagnostic Method)
      setCurrentStep('Step 3: Testing diagnostic method...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (MinimalNativeScanner && results.step2.status === "PASS") {
        try {
          // Try the new test method first
          if (typeof MinimalNativeScanner.testMethod === 'function') {
            const testResult = await MinimalNativeScanner.testMethod();
            
            results.step3.details = {
              method: 'testMethod',
              called: true,
              result: testResult,
              success: true,
              message: "Diagnostic method working correctly"
            };
            results.step3.status = "PASS";
          } else {
            results.step3.details = {
              method: 'testMethod',
              called: false,
              error: "testMethod not found",
              availableMethods: Object.keys(MinimalNativeScanner)
            };
            results.step3.status = "FAIL";
          }
        } catch (error) {
          results.step3.status = "FAIL";
          results.step3.details = {
            method: 'testMethod',
            called: true,
            error: error.message,
            code: error.code || 'unknown'
          };
        }
      } else {
        results.step3.status = "FAIL";
        results.step3.details = { error: "Prerequisites not met" };
      }

      // Step 4: Production Method Test
      setCurrentStep('Step 4: Testing production methods...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (MinimalNativeScanner && results.step3.status === "PASS") {
        try {
          const cameraStatus = await MinimalNativeScanner.getCameraStatus();
          
          results.step4.details = {
            method: 'getCameraStatus',
            result: cameraStatus,
            success: true,
            hasExpectedFields: !!(cameraStatus && cameraStatus.camera && cameraStatus.nativeScanner)
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
        results.step4.details = { error: "Test method failed - cannot test production methods" };
      }

      // Step 5: iOS Logs Retrieval
      setCurrentStep('Step 5: Retrieving iOS diagnostic logs...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (MinimalNativeScanner && typeof MinimalNativeScanner.getDiagnosticLogs === 'function') {
        try {
          const logsResult = await MinimalNativeScanner.getDiagnosticLogs();
          
          results.step5.details = {
            method: 'getDiagnosticLogs',
            success: true,
            logCount: logsResult.count || 0,
            logs: logsResult.logs || [],
            recentLogs: (logsResult.logs || []).slice(-10) // Show last 10 logs
          };
          results.step5.status = "PASS";
        } catch (error) {
          results.step5.status = "FAIL";
          results.step5.details = {
            method: 'getDiagnosticLogs',
            error: error.message,
            code: error.code || 'unknown'
          };
        }
      } else {
        results.step5.status = "FAIL";
        results.step5.details = { error: "getDiagnosticLogs method not available" };
      }

      // Generate Summary
      const passedSteps = Object.keys(results)
        .filter(key => key.startsWith('step'))
        .filter(key => results[key].status === "PASS").length;

      if (passedSteps === 5) {
        results.summary.success = true;
        results.summary.reason = "🎉 All tests passed! Plugin is working correctly!";
        results.summary.recommendations = [
          "Plugin registration successful",
          "All methods are properly exposed", 
          "Swift-JavaScript bridge is working",
          "iOS logs are accessible",
          "Ready to use scanner functionality"
        ];
      } else if (results.step1.status === "FAIL") {
        results.summary.success = false;
        results.summary.reason = "❌ Platform or plugin registration issue";
        results.summary.recommendations = [
          "Verify running on native iOS device",
          "Check plugin is properly registered in Plugins.swift",
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
        results.summary.success = false;
        results.summary.reason = "❌ Method calls failing - Bridge communication issue";
        results.summary.recommendations = [
          "Check iOS device logs in Xcode console",
          "Look for Swift runtime errors",
          "Verify method signatures match Capacitor requirements"
        ];
      } else {
        results.summary.success = false;
        results.summary.reason = "❌ Partial functionality - Some methods working";
        results.summary.recommendations = [
          "Some methods work but others don't",
          "Check individual method implementations",
          "Look for specific Swift errors in Xcode logs"
        ];
      }

      setCurrentStep('Diagnostic complete!');
      setTestResults(results);
    } catch (error) {
      results.summary.success = false;
      results.summary.reason = `❌ Diagnostic failed: ${error.message}`;
      results.summary.recommendations = ["Check JavaScript console for errors"];
      setTestResults(results);
    } finally {
      setIsLoading(false);
    }
  };

  const testScannerMethod = async () => {
    if (!MinimalNativeScanner || !MinimalNativeScanner.scanWithNativeCamera) {
      alert('❌ Scanner method not available');
      return;
    }

    try {
      const result = await MinimalNativeScanner.scanWithNativeCamera();
      alert(`✅ Scanner result: ${JSON.stringify(result)}`);
    } catch (error) {
      alert(`❌ Scanner error: ${error.message}`);
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
          🔬 Comprehensive Plugin Diagnostic
        </h1>
        
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          <button 
            onClick={runComprehensiveDiagnostic}
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
            {isLoading ? '⏳ Running Diagnostics...' : '🔬 Run Full Diagnostic'}
          </button>
          
          {testResults?.summary.success && (
            <button 
              onClick={testScannerMethod}
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
                📊 Diagnostic Results
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
        <div><strong>Diagnostic Version:</strong> Enhanced with testMethod</div>
        <div><strong>Platform:</strong> {Capacitor.getPlatform()}</div>
        <div><strong>Native:</strong> {Capacitor.isNativePlatform() ? 'Yes' : 'No'}</div>
        <div><strong>Time:</strong> {new Date().toLocaleTimeString()}</div>
      </div>
    </div>
  );
};

export default JavaScriptDiagnosticTester;