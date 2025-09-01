// file: /src/plugins/fixed-scanner-test.js v1 - CORRECTED plugin registration

import { registerPlugin } from '@capacitor/core';
import { Capacitor } from '@capacitor/core';

/**
 * CRITICAL FIX: Register the plugin with the EXACT same name as in Swift
 * Swift class: @objc(MinimalNativeScanner)
 * JavaScript must use: 'MinimalNativeScanner'
 */
const MinimalNativeScanner = registerPlugin('MinimalNativeScanner'); // CORRECTED NAME

/**
 * Test the corrected plugin registration
 */
export const testFixedScannerPlugin = async () => {
    const results = {
        step1: { name: "Platform Check", status: "unknown", details: {} },
        step2: { name: "Plugin Registration", status: "unknown", details: {} },
        step3: { name: "Method Availability", status: "unknown", details: {} },
        step4: { name: "Plugin Communication", status: "unknown", details: {} },
        summary: { success: false, reason: "", recommendations: [] }
    };

    console.log('🔧 TESTING CORRECTED PLUGIN REGISTRATION');

    // Step 1: Platform Check
    try {
        const isNative = Capacitor.isNativePlatform();
        const platform = Capacitor.getPlatform();

        results.step1.details = { isNative, platform };
        results.step1.status = (isNative && platform === 'ios') ? "PASS" : "FAIL";

        console.log('STEP 1 - Platform:', results.step1.details);
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
        console.log('STEP 2 - Plugin Registration:', results.step2.details);
    } catch (error) {
        results.step2.status = "FAIL";
        results.step2.details = { error: error.message };
    }

    // Step 3: Method Availability
    if (MinimalNativeScanner) {
        try {
            const expectedMethods = ['scanWithNativeCamera', 'getCameraStatus', 'requestCameraAccess'];
            const availableMethods = Object.keys(MinimalNativeScanner);
            const foundMethods = expectedMethods.filter(method => availableMethods.includes(method));

            results.step3.details = {
                expected: expectedMethods,
                available: availableMethods,
                found: foundMethods,
                missing: expectedMethods.filter(method => !foundMethods.includes(method))
            };

            results.step3.status = foundMethods.length >= 2 ? "PASS" : "FAIL";
            console.log('STEP 3 - Methods:', results.step3.details);
        } catch (error) {
            results.step3.status = "FAIL";
            results.step3.details = { error: error.message };
        }
    } else {
        results.step3.status = "FAIL";
        results.step3.details = { error: "Plugin not available" };
    }

    // Step 4: Plugin Communication Test
    if (MinimalNativeScanner && results.step1.status === "PASS") {
        try {
            console.log('🔧 Testing plugin communication...');

            // Test the getCameraStatus method
            const statusResult = await MinimalNativeScanner.getCameraStatus();

            results.step4.details = {
                method: 'getCameraStatus',
                result: statusResult,
                success: true
            };
            results.step4.status = "PASS";

            console.log('STEP 4 - Communication SUCCESS:', results.step4.details);
        } catch (error) {
            results.step4.status = "FAIL";
            results.step4.details = {
                method: 'getCameraStatus',
                error: error.message,
                code: error.code
            };
            console.log('STEP 4 - Communication FAILED:', results.step4.details);
        }
    } else {
        results.step4.status = "FAIL";
        results.step4.details = { error: "Prerequisites not met" };
    }

    // Summary
    const passedSteps = Object.keys(results)
        .filter(key => key.startsWith('step'))
        .filter(key => results[key].status === "PASS").length;

    if (passedSteps === 4) {
        results.summary.success = true;
        results.summary.reason = "Plugin registration and communication working correctly";
        results.summary.recommendations = ["✅ Plugin is ready to use!"];
    } else if (results.step1.status === "FAIL") {
        results.summary.success = false;
        results.summary.reason = "Not running on native iOS platform";
        results.summary.recommendations = ["This test only works on iOS devices in native apps"];
    } else if (results.step2.status === "FAIL") {
        results.summary.success = false;
        results.summary.reason = "MinimalNativeScanner plugin not registered";
        results.summary.recommendations = [
            "Check that MinimalNativeScanner.swift is in the iOS project",
            "Verify Plugins.swift includes MinimalNativeScanner.self",
            "Rebuild iOS app completely",
            "Check Xcode build logs for Swift compilation errors"
        ];
    } else if (results.step3.status === "FAIL") {
        results.summary.success = false;
        results.summary.reason = "Plugin methods not available";
        results.summary.recommendations = [
            "Check @objc method declarations in MinimalNativeScanner.swift",
            "Ensure methods are properly exposed to JavaScript",
            "Rebuild iOS project"
        ];
    } else if (results.step4.status === "FAIL") {
        results.summary.success = false;
        results.summary.reason = "Plugin communication failed";
        results.summary.recommendations = [
            "Check iOS logs in Xcode for Swift errors",
            "Verify camera permissions are properly handled",
            "Test on different iOS version if possible"
        ];
    }

    console.log('🔧 TEST COMPLETE - Results:', results.summary);
    return results;
};

/**
 * Present the native scanner using corrected plugin
 */
export const presentCorrectedNativeScanner = async () => {
    if (!MinimalNativeScanner) {
        throw new Error('MinimalNativeScanner plugin not available');
    }

    // Test communication first
    console.log('🎯 Testing plugin before scanning...');
    try {
        const status = await MinimalNativeScanner.getCameraStatus();
        console.log('🎯 Camera status:', status);
    } catch (error) {
        console.error('🎯 Plugin communication failed:', error);
        throw error;
    }

    // Start scanning
    console.log('🎯 Starting native scan...');
    return await MinimalNativeScanner.scanWithNativeCamera();
};

/**
 * Get camera status using corrected plugin
 */
export const getCorrectedCameraStatus = async () => {
    if (!MinimalNativeScanner) {
        throw new Error('MinimalNativeScanner plugin not available');
    }

    return await MinimalNativeScanner.getCameraStatus();
};

export default MinimalNativeScanner;