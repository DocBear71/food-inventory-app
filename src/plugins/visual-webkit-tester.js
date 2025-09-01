// file: /src/plugins/visual-webkit-tester.js v1 - Visual WebKit bridge testing for iPad

/**
 * Comprehensive visual test of WebKit message handler bridge
 * @param {Function} displayCallback - Function to display results visually
 * @returns {Object} Detailed test results
 */
export const testWebKitBridge = async (displayCallback) => {
    const debug = displayCallback || console.log;

    const results = {
        step1: { name: "Platform Detection", status: "unknown", details: {} },
        step2: { name: "WebKit Detection", status: "unknown", details: {} },
        step3: { name: "Message Handler Detection", status: "unknown", details: {} },
        step4: { name: "Bridge Communication Test", status: "unknown", details: {} },
        step5: { name: "Timing Test", status: "unknown", details: {} },
        summary: { success: false, reason: "", recommendations: [] }
    };

    try {
        debug('=== WEBKIT BRIDGE COMPREHENSIVE TEST ===');

        // Step 1: Platform Detection
        results.step1.details = {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            isIOS: /iPad|iPhone|iPod/.test(navigator.userAgent),
            isStandalone: window.navigator.standalone,
            hasWindow: typeof window !== 'undefined',
            hasNavigator: typeof navigator !== 'undefined'
        };
        results.step1.status = results.step1.details.isIOS ? "PASS" : "FAIL";
        debug('STEP 1 - Platform:', results.step1.details);

        // Step 2: WebKit Detection
        results.step2.details = {
            hasWebkit: !!(window.webkit),
            hasMessageHandlers: !!(window.webkit && window.webkit.messageHandlers),
            webkitKeys: window.webkit ? Object.keys(window.webkit) : [],
            messageHandlerKeys: (window.webkit && window.webkit.messageHandlers) ?
                Object.keys(window.webkit.messageHandlers) : []
        };
        results.step2.status = results.step2.details.hasMessageHandlers ? "PASS" : "FAIL";
        debug('STEP 2 - WebKit:', results.step2.details);

        // Step 3: Specific Message Handler Detection
        const bridgeName = 'MinimalNativeScanner';
        results.step3.details = {
            bridgeName: bridgeName,
            bridgeExists: !!(window.webkit?.messageHandlers?.[bridgeName]),
            bridgeType: window.webkit?.messageHandlers?.[bridgeName] ?
                typeof window.webkit.messageHandlers[bridgeName] : 'undefined',
            hasPostMessage: !!(window.webkit?.messageHandlers?.[bridgeName]?.postMessage),
            availableBridges: (window.webkit?.messageHandlers) ?
                Object.keys(window.webkit.messageHandlers) : []
        };
        results.step3.status = results.step3.details.bridgeExists ? "PASS" : "FAIL";
        debug('STEP 3 - Message Handler:', results.step3.details);

        // Step 4: Bridge Communication Test
        if (results.step3.details.bridgeExists) {
            try {
                const testMessage = { action: 'test', timestamp: Date.now() };
                window.webkit.messageHandlers[bridgeName].postMessage(testMessage);
                results.step4.details = {
                    testSent: true,
                    message: testMessage,
                    error: null
                };
                results.step4.status = "PASS";
                debug('STEP 4 - Bridge Test: Message sent successfully');
            } catch (bridgeError) {
                results.step4.details = {
                    testSent: false,
                    message: null,
                    error: {
                        message: bridgeError.message,
                        name: bridgeError.name,
                        stack: bridgeError.stack ? bridgeError.stack.split('\n')[0] : null
                    }
                };
                results.step4.status = "FAIL";
                debug('STEP 4 - Bridge Test: FAILED', results.step4.details.error);
            }
        } else {
            results.step4.details = {
                testSent: false,
                message: null,
                error: { message: "Bridge not available for testing" }
            };
            results.step4.status = "SKIP";
            debug('STEP 4 - Bridge Test: SKIPPED (no bridge)');
        }

        // Step 5: Timing Test - Check if bridge appears after delay
        debug('STEP 5 - Starting timing test...');
        const timingTestResult = await new Promise((resolve) => {
            const checkTimes = [500, 1000, 2000, 3000, 5000];
            const timingResults = [];
            let checkIndex = 0;

            const checkBridge = () => {
                const delay = checkTimes[checkIndex];
                setTimeout(() => {
                    const bridgeAvailable = !!(window.webkit?.messageHandlers?.[bridgeName]);
                    timingResults.push({
                        delay: delay,
                        bridgeAvailable: bridgeAvailable,
                        timestamp: Date.now()
                    });

                    debug(`Timing check at ${delay}ms: ${bridgeAvailable ? 'FOUND' : 'NOT FOUND'}`);

                    checkIndex++;
                    if (checkIndex < checkTimes.length) {
                        checkBridge();
                    } else {
                        resolve(timingResults);
                    }
                }, delay);
            };

            checkBridge();
        });

        results.step5.details = {
            timingResults: timingTestResult,
            bridgeFoundAtDelay: timingTestResult.find(r => r.bridgeAvailable)?.delay || null,
            finalBridgeState: !!(window.webkit?.messageHandlers?.[bridgeName])
        };

        const bridgeFoundLater = timingTestResult.some(r => r.bridgeAvailable);
        results.step5.status = bridgeFoundLater ? "PASS" : "FAIL";
        debug('STEP 5 - Timing Test:', results.step5.details);

        // Final Summary
        const passedSteps = Object.values(results).slice(0, 5).filter(step => step.status === "PASS").length;

        if (passedSteps >= 4) {
            results.summary.success = true;
            results.summary.reason = "WebKit bridge is working correctly";
            results.summary.recommendations = ["Bridge is functional - check scanner implementation"];
        } else if (results.step1.status === "FAIL") {
            results.summary.success = false;
            results.summary.reason = "Not running on iOS platform";
            results.summary.recommendations = ["This feature only works on iOS devices"];
        } else if (results.step2.status === "FAIL") {
            results.summary.success = false;
            results.summary.reason = "WebKit not available";
            results.summary.recommendations = ["App may not be running in proper WebView context"];
        } else if (results.step3.status === "FAIL") {
            results.summary.success = false;
            results.summary.reason = "MinimalNativeScanner message handler not registered";
            results.summary.recommendations = [
                "Verify ViewController.swift calls registerWithWebView",
                "Rebuild iOS app completely"
            ];
        } else if (results.step5.details.bridgeFoundAtDelay) {
            results.summary.success = false;
            results.summary.reason = `Bridge appears after ${results.step5.details.bridgeFoundAtDelay}ms delay`;
            results.summary.recommendations = [
                "Add delay before scanner availability check",
                "Use setTimeout in JavaScript initialization"
            ];
        } else {
            results.summary.success = false;
            results.summary.reason = "Unknown bridge registration failure";
            results.summary.recommendations = [
                "Check Xcode build logs for Swift errors",
                "Verify all Swift files are included in build target"
            ];
        }

    } catch (outerError) {
        results.summary.success = false;
        results.summary.reason = `Test failed: ${outerError.message}`;
        results.summary.recommendations = ["Fix JavaScript errors and retry"];
    }

    debug('=== WEBKIT BRIDGE TEST COMPLETE ===');
    debug('FINAL RESULTS:', results.summary);

    return results;
};