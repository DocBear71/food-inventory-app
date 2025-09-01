// file: /src/plugins/minimal-native-scanner-test.js v2 - Capacitor 7.0 JavaScript test

import { registerPlugin } from '@capacitor/core';
import { Capacitor } from '@capacitor/core';

/**
 * CRITICAL: Capacitor 7.0 requires exact plugin name matching
 * Swift: @objc(MinimalNativeScanner)
 * JavaScript: registerPlugin('MinimalNativeScanner')
 */
const MinimalNativeScanner = registerPlugin('MinimalNativeScanner');

/**
 * Test all plugin methods with comprehensive error handling
 */
export const testMinimalNativeScannerCapacitor7 = async () => {
    const results = {
        step1: { name: "Platform Check", status: "unknown", details: {} },
        step2: { name: "Plugin Registration", status: "unknown", details: {} },
        step3: { name: "Test Method Call", status: "unknown", details: {} },
        step4: { name: "Camera Status Test", status: "unknown", details: {} },
        step5: { name: "Diagnostic Logs", status: "unknown", details: {} },
        summary: { success: false, reason: "", recommendations: [] }
    };

    console.log('🔧 CAPACITOR7: Starting comprehensive plugin test');

    // Step 1: Platform Check
    try {
        const isNative = Capacitor.isNativePlatform();
        const platform = Capacitor.getPlatform();

        results.step1.details = { isNative, platform };
        results.step1.status = (isNative && platform === 'ios') ? "PASS" : "FAIL";

        console.log('🔧 CAPACITOR7: Platform check:', results.step1.details);
    } catch (error) {
        results.step1.status = "FAIL";
        results.step1.details = { error: error.message };
    }

    // Step 2: Plugin Registration Check
    try {
        results.step2.details = {
            pluginExists: !!MinimalNativeScanner,
            pluginType: typeof MinimalNativeScanner,
            availableMethods: MinimalNativeScanner ? Object.keys(MinimalNativeScanner) : []
        };

        results.step2.status = MinimalNativeScanner ? "PASS" : "FAIL";
        console.log('🔧 CAPACITOR7: Plugin registration check:', results.step2.details);
    } catch (error) {
        results.step2.status = "FAIL";
        results.step2.details = { error: error.message };
    }

    // Step 3: Test Method Call (CRITICAL TEST)
    if (MinimalNativeScanner) {
        try {
            console.log('🔧 CAPACITOR7: Attempting testMethod call...');
            const testResult = await MinimalNativeScanner.testMethod();

            results.step3.details = {
                method: 'testMethod',
                called: true,
                result: testResult,
                success: true,
                resultType: typeof testResult
            };
            results.step3.status = "PASS";

            console.log('🔧 CAPACITOR7: testMethod SUCCESS:', testResult);
        } catch (error) {
            results.step3.status = "FAIL";
            results.step3.details = {
                method: 'testMethod',
                called: true,
                error: error.message,
                code: error.code || 'unknown',
                data: error.data || {}
            };

            console.error('🔧 CAPACITOR7: testMethod FAILED:', error);
        }
    } else {
        results.step3.status = "FAIL";
        results.step3.details = { error: "Plugin not available" };
    }

    // Step 4: Camera Status Test (Production Method)
    if (MinimalNativeScanner && results.step3.status === "PASS") {
        try {
            console.log('🔧 CAPACITOR7: Attempting getCameraStatus call...');
            const cameraResult = await MinimalNativeScanner.getCameraStatus();

            results.step4.details = {
                method: 'getCameraStatus',
                called: true,
                result: cameraResult,
                success: true,
                hasExpectedFields: !!(cameraResult && cameraResult.camera && cameraResult.nativeScanner)
            };
            results.step4.status = "PASS";

            console.log('🔧 CAPACITOR7: getCameraStatus SUCCESS:', cameraResult);
        } catch (error) {
            results.step4.status = "FAIL";
            results.step4.details = {
                method: 'getCameraStatus',
                called: true,
                error: error.message,
                code: error.code || 'unknown'
            };

            console.error('🔧 CAPACITOR7: getCameraStatus FAILED:', error);
        }
    } else {
        results.step4.status = "FAIL";
        results.step4.details = { error: "Prerequisites not met" };
    }

    // Step 5: Diagnostic Logs
    if (MinimalNativeScanner && results.step3.status === "PASS") {
        try {
            console.log('🔧 CAPACITOR7: Attempting getDiagnosticLogs call...');
            const logsResult = await MinimalNativeScanner.getDiagnosticLogs();

            results.step5.details = {
                method: 'getDiagnosticLogs',
                success: true,
                logCount: logsResult.count || 0,
                capacitorVersion: logsResult.capacitorVersion,
                bridgeProtocol: logsResult.bridgeProtocol,
                recentLogs: (logsResult.logs || []).slice(-5) // Show last 5 logs
            };
            results.step5.status = "PASS";

            console.log('🔧 CAPACITOR7: getDiagnosticLogs SUCCESS:', logsResult);
        } catch (error) {
            results.step5.status = "FAIL";
            results.step5.details = {
                method: 'getDiagnosticLogs',
                error: error.message,
                code: error.code || 'unknown'
            };

            console.error('🔧 CAPACITOR7: getDiagnosticLogs FAILED:', error);
        }
    } else {
        results.step5.status = "FAIL";
        results.step5.details = { error: "Prerequisites not met" };
    }

    // Generate Summary
    const passedSteps = Object.keys(results)
        .filter(key => key.startsWith('step'))
        .filter(key => results[key].status === "PASS").length;

    if (passedSteps === 5) {
        results.summary.success = true;
        results.summary.reason = "🎉 ALL TESTS PASSED! Capacitor 7.0 plugin working perfectly!";
        results.summary.recommendations = [
            "Plugin registration successful",
            "All methods are properly exposed",
            "Capacitor 7.0 bridge working correctly",
            "Ready to use scanner functionality"
        ];
    } else if (results.step1.status === "FAIL") {
        results.summary.success = false;
        results.summary.reason = "❌ Platform Issue - Not native iOS";
        results.summary.recommendations = [
            "This test only works on native iOS devices",
            "Ensure you're testing on physical device or iOS Simulator",
            "Check that app was built with 'npx cap run ios'"
        ];
    } else if (results.step2.status === "FAIL") {
        results.summary.success = false;
        results.summary.reason = "❌ Plugin Registration Failed";
        results.summary.recommendations = [
            "Plugin not found in JavaScript",
            "Check Plugins.swift registration",
            "Verify 'npx cap sync ios' was run",
            "Ensure MinimalNativeScanner.swift is in Xcode project"
        ];
    } else if (results.step3.status === "FAIL") {
        const error = results.step3.details.error || "Unknown error";
        if (error.includes("UNIMPLEMENTED")) {
            results.summary.success = false;
            results.summary.reason = "❌ UNIMPLEMENTED Error - Bridge Not Working";
            results.summary.recommendations = [
                "Plugin found but methods not accessible",
                "Check CAPBridgedPlugin implementation in Swift",
                "Verify pluginMethods array in Swift",
                "Check iOS device logs in Xcode console",
                "Try: Product -> Clean Build Folder in Xcode"
            ];
        } else {
            results.summary.success = false;
            results.summary.reason = `❌ Method Call Failed: ${error}`;
            results.summary.recommendations = [
                "Plugin registered but method calls failing",
                "Check method signatures in Swift",
                "Look for Swift runtime errors in Xcode logs"
            ];
        }
    } else {
        results.summary.success = false;
        results.summary.reason = "❌ Partial Success - Some methods failing";
        results.summary.recommendations = [
            `${passedSteps}/5 tests passed`,
            "Some methods work, others don't",
            "Check individual method implementations",
            "Look for specific Swift errors in Xcode logs"
        ];
    }

    console.log('🔧 CAPACITOR7: Test completed:', results.summary);
    return results;
};

/**
 * Quick test method for debugging
 */
export const quickTestMinimalScanner = async () => {
    try {
        console.log('🔧 CAPACITOR7: Quick test starting...');

        const result = await MinimalNativeScanner.testMethod();
        console.log('🔧 CAPACITOR7: Quick test SUCCESS:', result);

        return { success: true, result };
    } catch (error) {
        console.error('🔧 CAPACITOR7: Quick test FAILED:', error);

        return {
            success: false,
            error: error.message,
            code: error.code,
            data: error.data
        };
    }
};

export default MinimalNativeScanner;