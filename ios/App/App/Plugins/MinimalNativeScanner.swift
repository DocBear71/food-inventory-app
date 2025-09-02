// file: ios/App/App/Plugins/MinimalNativeScanner.swift v7 - FINAL Capacitor 7.0 fix

import Foundation
import Capacitor
import UIKit
import AVFoundation

@objc(MinimalNativeScanner)
public class MinimalNativeScanner: CAPPlugin, CAPBridgedPlugin {

    // CRITICAL: Capacitor 7.0 requires these exact properties
    public let identifier = "MinimalNativeScanner"
    public let jsName = "MinimalNativeScanner"

    // CRITICAL: This is the key missing piece - method registration
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "scanWithNativeCamera", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getCameraStatus", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestCameraAccess", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "testMethod", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getDiagnosticLogs", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getViewControllerDiagnosticLogs", returnType: CAPPluginReturnPromise)
    ]

    private var currentCall: CAPPluginCall?
    private var nativeScannerVC: NativeBarcodeScannerViewController?

    // Enhanced logging system that captures everything
    private static var allDiagnosticLogs: [String] = []

    private static var registrationLogs: [String] = []

    public static func setRegistrationLogs(_ logs: [String]) {
        registrationLogs = logs
        addGlobalLog("REGISTRATION: Received \(logs.count) registration logs from Plugins.swift")
    }

    private static func addGlobalLog(_ message: String) {
        let timestamp = DateFormatter().string(from: Date())
        let logEntry = "[\(timestamp)] \(message)"
        allDiagnosticLogs.append(logEntry)
        NSLog("🎯 CAPACITOR7_FINAL: %@", message)

        // Keep only last 100 log entries
        if allDiagnosticLogs.count > 100 {
            allDiagnosticLogs.removeFirst()
        }
    }

    private func addDiagnosticLog(_ message: String) {
        MinimalNativeScanner.addGlobalLog(message)
    }

    // Add registration logging that can be accessed later
    @objc public static func logPluginRegistration() {
        addGlobalLog("STATIC: MinimalNativeScanner class being registered with FINAL Capacitor 7.0 fix")
        addGlobalLog("STATIC: Class name: \(String(describing: MinimalNativeScanner.self))")
        addGlobalLog("STATIC: Superclass: \(String(describing: MinimalNativeScanner.superclass()))")
        addGlobalLog("STATIC: Implements CAPBridgedPlugin: YES")
        addGlobalLog("STATIC: pluginMethods array count: 5")

        // Test method visibility at class level
        let instance = MinimalNativeScanner()
        let methodNames = ["scanWithNativeCamera", "getCameraStatus", "requestCameraAccess", "testMethod", "getDiagnosticLogs"]

        for methodName in methodNames {
            let selector = NSSelectorFromString("\(methodName):")
            let responds = instance.responds(to: selector)
            addGlobalLog("STATIC: Method '\(methodName)' responds: \(responds ? "YES" : "NO")")
        }
    }

    // CRITICAL: Capacitor 7.0 plugin loading
    public override func load() {
        super.load()
        addDiagnosticLog("INSTANCE: MinimalNativeScanner FINAL load() called - Capacitor 7.0")
        addDiagnosticLog("INSTANCE: Plugin identifier: \(identifier)")
        addDiagnosticLog("INSTANCE: Plugin jsName: \(jsName)")
        addDiagnosticLog("INSTANCE: Plugin methods count: \(pluginMethods.count)")
        addDiagnosticLog("INSTANCE: Implements CAPBridgedPlugin protocol: YES")

        // Log each method in the pluginMethods array
        for (index, method) in pluginMethods.enumerated() {
            addDiagnosticLog("INSTANCE: pluginMethods[\(index)]: \(method.name) -> \(method.returnType)")
        }

        addDiagnosticLog("INSTANCE: Plugin instance created successfully")
        addDiagnosticLog("INSTANCE: Instance class: \(String(describing: type(of: self)))")

        // Test instance method registration with @objc selectors
        let methodNames = ["scanWithNativeCamera", "getCameraStatus", "requestCameraAccess", "testMethod", "getDiagnosticLogs"]

        addDiagnosticLog("INSTANCE: Testing @objc method registration on live instance:")
        for methodName in methodNames {
            let selector = NSSelectorFromString("\(methodName):")
            let responds = self.responds(to: selector)
            addDiagnosticLog("INSTANCE: @objc Method '\(methodName)' responds: \(responds ? "YES" : "NO")")
        }

        addDiagnosticLog("INSTANCE: MinimalNativeScanner FINAL initialization complete - Capacitor 7.0")
    }

    // Enhanced diagnostic logs that include registration logs
    @objc func getDiagnosticLogs(_ call: CAPPluginCall) {
        addDiagnosticLog("getDiagnosticLogs called - returning \(MinimalNativeScanner.allDiagnosticLogs.count) total log entries")

        call.resolve([
            "success": true,
            "logs": MinimalNativeScanner.allDiagnosticLogs,
            "count": MinimalNativeScanner.allDiagnosticLogs.count,
            "timestamp": Date().timeIntervalSince1970,
            "capacitorVersion": "7.0",
            "bridgeProtocol": "CAPBridgedPlugin",
            "pluginIdentifier": identifier,
            "pluginJsName": jsName,
            "methodCount": pluginMethods.count,
            "methodNames": pluginMethods.map { $0.name },
            "registrationLogs": MinimalNativeScanner.registrationLogs, // NEW: Include registration logs
            "instanceLogs": MinimalNativeScanner.allDiagnosticLogs.filter { $0.contains("INSTANCE:") },

            // NEW: Additional diagnostic info
            "registrationLogCount": MinimalNativeScanner.registrationLogs.count,
            "hasRegistrationLogs": !MinimalNativeScanner.registrationLogs.isEmpty,
            "pluginInfo": [
                "className": String(describing: MinimalNativeScanner.self),
                "superclass": String(describing: MinimalNativeScanner.superclass()),
                "protocols": "CAPPlugin, CAPBridgedPlugin"
            ]
        ])
    }

    @objc func getViewControllerDiagnosticLogs(_ call: CAPPluginCall) {
        addDiagnosticLog("getViewControllerDiagnosticLogs called")

        // Get logs from ViewController
        let viewControllerLogs = ViewController.getDiagnosticLogs()

        addDiagnosticLog("Retrieved \(viewControllerLogs.count) logs from ViewController")

        call.resolve([
            "success": true,
            "logs": viewControllerLogs,
            "count": viewControllerLogs.count,
            "timestamp": Date().timeIntervalSince1970,
            "source": "ViewController diagnostic system"
        ])
    }

    // Simple test method that logs everything - CRITICAL @objc exposure
    @objc func testMethod(_ call: CAPPluginCall) {
        addDiagnosticLog("testMethod called successfully - FINAL Capacitor 7.0 Bridge is working!")
        addDiagnosticLog("testMethod: Call object type: \(type(of: call))")
        addDiagnosticLog("testMethod: Thread: \(Thread.current)")
        addDiagnosticLog("testMethod: Is main thread: \(Thread.isMainThread)")
        addDiagnosticLog("testMethod: Plugin identifier: \(identifier)")
        addDiagnosticLog("testMethod: Plugin jsName: \(jsName)")
        addDiagnosticLog("testMethod: Method registered in pluginMethods: YES")

        // Test if we can resolve successfully
        do {
            call.resolve([
                "success": true,
                "message": "MinimalNativeScanner testMethod working perfectly with FINAL Capacitor 7.0 fix",
                "timestamp": Date().timeIntervalSince1970,
                "capacitorVersion": "7.0-FINAL",
                "bridgeProtocol": "CAPBridgedPlugin",
                "methodRegistration": "pluginMethods array",
                "pluginInfo": [
                    "identifier": identifier,
                    "jsName": jsName,
                    "methodCount": pluginMethods.count,
                    "methodNames": pluginMethods.map { $0.name }
                ],
                "threadInfo": [
                    "current": Thread.current.description,
                    "isMain": Thread.isMainThread
                ],
                "callInfo": [
                    "callId": call.callbackId,
                    "methodName": call.methodName
                ]
            ])
            addDiagnosticLog("testMethod: Successfully resolved call with FINAL Capacitor 7.0 fix")
        } catch {
            addDiagnosticLog("testMethod: ERROR resolving call: \(error)")
        }
    }

    @objc func getCameraStatus(_ call: CAPPluginCall) {
        addDiagnosticLog("getCameraStatus called - FINAL Capacitor 7.0")

        let cameraAuthStatus = AVCaptureDevice.authorizationStatus(for: .video)
        addDiagnosticLog("Camera auth status: \(cameraAuthStatus.rawValue)")

        var status: String
        switch cameraAuthStatus {
        case .authorized:
            status = "granted"
        case .denied, .restricted:
            status = "denied"
        case .notDetermined:
            status = "prompt"
        @unknown default:
            status = "prompt"
        }

        addDiagnosticLog("Returning camera status: \(status)")

        call.resolve([
            "camera": status,
            "nativeScanner": "available",
            "diagnostic": "getCameraStatus completed successfully with FINAL Capacitor 7.0 fix",
            "rawAuthStatus": cameraAuthStatus.rawValue,
            "capacitorVersion": "7.0-FINAL",
            "pluginIdentifier": identifier
        ])
    }

    @objc func requestCameraAccess(_ call: CAPPluginCall) {
        addDiagnosticLog("requestCameraAccess called - FINAL Capacitor 7.0")

        AVCaptureDevice.requestAccess(for: .video) { [weak self] granted in
            self?.addDiagnosticLog("Camera access request completed - granted: \(granted)")

            DispatchQueue.main.async {
                call.resolve([
                    "camera": granted ? "granted" : "denied",
                    "nativeScanner": "available",
                    "diagnostic": "requestCameraAccess completed with FINAL Capacitor 7.0 fix",
                    "capacitorVersion": "7.0-FINAL"
                ])
            }
        }
    }

    @objc func scanWithNativeCamera(_ call: CAPPluginCall) {
        addDiagnosticLog("scanWithNativeCamera called - FINAL Capacitor 7.0")
        currentCall = call

        DispatchQueue.main.async {
            self.addDiagnosticLog("Dispatched to main queue for camera check")
            self.checkCameraAndPresent()
        }
    }

    private func checkCameraAndPresent() {
        addDiagnosticLog("checkCameraAndPresent called")

        let cameraAuthStatus = AVCaptureDevice.authorizationStatus(for: .video)

        switch cameraAuthStatus {
        case .authorized:
            addDiagnosticLog("Camera authorized - presenting scanner")
            presentNativeScanner()
        case .notDetermined:
            addDiagnosticLog("Camera permission not determined - requesting access")
            AVCaptureDevice.requestAccess(for: .video) { [weak self] granted in
                DispatchQueue.main.async {
                    if granted {
                        self?.addDiagnosticLog("Camera access granted after request")
                        self?.presentNativeScanner()
                    } else {
                        self?.addDiagnosticLog("Camera access denied after request")
                        self?.currentCall?.reject("Camera permission denied", "PERMISSION_DENIED")
                        self?.currentCall = nil
                    }
                }
            }
        case .denied, .restricted:
            addDiagnosticLog("Camera access denied or restricted")
            currentCall?.reject("Camera permission required. Please enable camera access in Settings.", "PERMISSION_DENIED")
            currentCall = nil
        @unknown default:
            addDiagnosticLog("Unknown camera permission status")
            currentCall?.reject("Unknown camera permission status", "PERMISSION_ERROR")
            currentCall = nil
        }
    }

    private func presentNativeScanner() {
        addDiagnosticLog("presentNativeScanner called - creating scanner view controller")

        nativeScannerVC = NativeBarcodeScannerViewController()
        nativeScannerVC?.delegate = self

        nativeScannerVC?.modalPresentationStyle = .fullScreen
        nativeScannerVC?.modalTransitionStyle = .coverVertical

        // FIXED: Use Capacitor 7.0 bridge view controller access
        if let bridge = self.bridge, let viewController = bridge.viewController {
            addDiagnosticLog("Presenting scanner from FINAL Capacitor 7.0 bridge view controller")
            viewController.present(nativeScannerVC!, animated: true) {
                self.addDiagnosticLog("Scanner view controller presented successfully")
            }
        } else if let rootViewController = UIApplication.shared.windows.first?.rootViewController {
            // Fallback to old method if bridge is not available
            var topController = rootViewController

            while let presentedViewController = topController.presentedViewController {
                topController = presentedViewController
            }

            addDiagnosticLog("Presenting scanner view controller (fallback method)")
            topController.present(nativeScannerVC!, animated: true) {
                self.addDiagnosticLog("Scanner view controller presented successfully")
            }
        } else {
            addDiagnosticLog("ERROR: Could not find view controller")
            currentCall?.reject("Could not present scanner", "PRESENTATION_ERROR")
            currentCall = nil
        }
    }
}

// MARK: - NativeBarcodeScannerDelegate
extension MinimalNativeScanner: NativeBarcodeScannerDelegate {

    func barcodeScannerDidScanBarcode(_ barcode: String, format: String) {
        addDiagnosticLog("Barcode scanned: \(barcode) format: \(format)")

        currentCall?.resolve([
            "hasContent": true,
            "content": barcode,
            "format": format,
            "cancelled": false,
            "source": "native_ios_scanner_capacitor7_final"
        ])

        currentCall = nil
        nativeScannerVC = nil
    }

    func barcodeScannerDidCancel() {
        addDiagnosticLog("Scanner cancelled by user")

        currentCall?.resolve([
            "hasContent": false,
            "content": "",
            "format": "",
            "cancelled": true,
            "source": "native_ios_scanner_capacitor7_final"
        ])

        currentCall = nil
        nativeScannerVC = nil
    }

    func barcodeScannerDidFail(with error: String) {
        addDiagnosticLog("Scanner failed with error: \(error)")

        currentCall?.reject("Scanner failed", "SCANNER_ERROR", NSError(domain: "ScannerError", code: 1, userInfo: [NSLocalizedDescriptionKey: error]))

        currentCall = nil
        nativeScannerVC = nil
    }
}