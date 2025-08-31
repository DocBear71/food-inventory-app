// file: /src/plugins/visual-plugin-debugger.js v1 - Visual debugging for iPad testing

import { registerPlugin } from '@capacitor/core';
import { Capacitor } from '@capacitor/core';

const NativeScannerBridge = registerPlugin('NativeScannerBridge');

/**
 * Visual plugin debugger that shows results on screen
 * @param {Function} displayCallback - Function to display debug results
 * @returns {Object} Debug results for display
 */
export const visualPluginDebug = async (displayCallback) => {
    const debug = displayCallback || console.log;
    const results = {
        step1: { name: "Platform Check", status: "unknown", details: "" },
        step2: { name: "Plugin Object", status: "unknown", details: "" },
        step3: { name: "Method Discovery", status: "unknown", details: "" },
        step4: { name: "Method Test", status: "unknown", details: "" },
        summary: { success: false, reason: "" }
    };

    try {
        // Step 1: Platform Check
        results.step1.details = {
            isNative: Capacitor.isNativePlatform(),
            platform: Capacitor.getPlatform(),
            isIOS: Capacitor.getPlatform() === 'ios'
        };
        results.step1.status = (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios') ? "PASS" : "FAIL";

        // Step 2: Plugin Object Check
        results.step2.details = {
            exists: NativeScannerBridge !== null && NativeScannerBridge !== undefined,
            type: typeof NativeScannerBridge,
            isNull: NativeScannerBridge === null,
            isUndefined: NativeScannerBridge === undefined
        };
        results.step2.status = (NativeScannerBridge && typeof NativeScannerBridge === 'object') ? "PASS" : "FAIL";

        // Step 3: Method Discovery
        const methods = NativeScannerBridge ? Object.keys(NativeScannerBridge) : [];
        const expectedMethods = ['presentNativeScanner', 'getCameraPermissions', 'requestCameraPermissions'];
        const foundMethods = expectedMethods.filter(method =>
            NativeScannerBridge && typeof NativeScannerBridge[method] === 'function'
        );

        results.step3.details = {
            allKeys: methods,
            expectedMethods: expectedMethods,
            foundMethods: foundMethods,
            methodTypes: {}
        };

        // Check each expected method
        expectedMethods.forEach(methodName => {
            if (NativeScannerBridge && NativeScannerBridge[methodName]) {
                results.step3.details.methodTypes[methodName] = typeof NativeScannerBridge[methodName];
            } else {
                results.step3.details.methodTypes[methodName] = "NOT_FOUND";
            }
        });

        results.step3.status = (foundMethods.length === expectedMethods.length) ? "PASS" : "PARTIAL";

        // Step 4: Method Test (only if we found methods)
        if (foundMethods.length > 0) {
            try {
                // Test the simplest method first - getCameraPermissions
                if (foundMethods.includes('getCameraPermissions')) {
                    const permissionResult = await NativeScannerBridge.getCameraPermissions();
                    results.step4.details = {
                        testedMethod: "getCameraPermissions",
                        result: permissionResult,
                        success: true
                    };
                    results.step4.status = "PASS";
                } else {
                    results.step4.details = {
                        testedMethod: "none",
                        result: null,
                        success: false,
                        reason: "No testable methods found"
                    };
                    results.step4.status = "SKIP";
                }
            } catch (methodError) {
                results.step4.details = {
                    testedMethod: "getCameraPermissions",
                    result: null,
                    success: false,
                    error: {
                        message: methodError.message,
                        code: methodError.code
                    }
                };
                results.step4.status = "FAIL";
            }
        } else {
            results.step4.details = {
                testedMethod: "none",
                result: null,
                success: false,
                reason: "No methods available to test"
            };
            results.step4.status = "SKIP";
        }

        // Final Summary
        if (results.step1.status === "PASS" &&
            results.step2.status === "PASS" &&
            results.step3.status === "PASS" &&
            results.step4.status === "PASS") {
            results.summary.success = true;
            results.summary.reason = "All tests passed - plugin is working correctly";
        } else {
            results.summary.success = false;

            if (results.step1.status === "FAIL") {
                results.summary.reason = "Platform check failed - not running on native iOS";
            } else if (results.step2.status === "FAIL") {
                results.summary.reason = "Plugin object not found - registration issue";
            } else if (results.step3.status !== "PASS") {
                results.summary.reason = `Method discovery failed - found ${foundMethods.length}/${expectedMethods.length} methods`;
            } else if (results.step4.status === "FAIL") {
                results.summary.reason = "Method test failed - Swift bridge not working";
            } else {
                results.summary.reason = "Unknown failure";
            }
        }

    } catch (outerError) {
        results.summary.success = false;
        results.summary.reason = `Debug failed: ${outerError.message}`;
    }

    // Display results
    debug("=== VISUAL PLUGIN DEBUG RESULTS ===");
    Object.keys(results).forEach(key => {
        debug(`${key.toUpperCase()}:`, results[key]);
    });

    return results;
};