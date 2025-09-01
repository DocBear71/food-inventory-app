// file: ios/App/App/Plugins/MinimalNativeScanner.swift v4 - Self-contained diagnostic with registration logging

import Foundation
import Capacitor
import UIKit
import AVFoundation

@objc(MinimalNativeScanner)
public class MinimalNativeScanner: CAPPlugin {

    private var currentCall: CAPPluginCall?
    private var nativeScannerVC: NativeBarcodeScannerViewController?

    // Enhanced logging system that captures everything
    private static var allDiagnosticLogs: [String] = []

    private static func addGlobalLog(_ message: String) {
        let timestamp = DateFormatter().string(from: Date())
        let logEntry = "[\(timestamp)] \(message)"
        allDiagnosticLogs.append(logEntry)
        NSLog("🎯 %@", message)

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
        addGlobalLog("STATIC: MinimalNativeScanner class being registered")
        addGlobalLog("STATIC: Class name: \(String(describing: MinimalNativeScanner.self))")
        addGlobalLog("STATIC: Superclass: \(String(describing: MinimalNativeScanner.superclass()))")

        // Test method visibility at class level
        let instance = MinimalNativeScanner()
        let methodNames = ["scanWithNativeCamera", "getCameraStatus", "requestCameraAccess", "testMethod", "getDiagnosticLogs"]

        for methodName in methodNames {
            let selector = NSSelectorFromString("\(methodName):")
            let responds = instance.responds(to: selector)
            addGlobalLog("STATIC: Method '\(methodName)' responds: \(responds ? "YES" : "NO")")
        }
    }

    public override func load() {
        super.load()
        addDiagnosticLog("INSTANCE: MinimalNativeScanner load() called")
        addDiagnosticLog("INSTANCE: Plugin instance created successfully")
        addDiagnosticLog("INSTANCE: Instance class: \(String(describing: type(of: self)))")

        // Test instance method registration
        let methodNames = ["scanWithNativeCamera", "getCameraStatus", "requestCameraAccess", "testMethod", "getDiagnosticLogs"]

        addDiagnosticLog("INSTANCE: Testing method registration on live instance:")
        for methodName in methodNames {
            let selector = NSSelectorFromString("\(methodName):")
            let responds = self.responds(to: selector)
            addDiagnosticLog("INSTANCE: Method '\(methodName)' responds: \(responds ? "YES" : "NO")")
        }

        addDiagnosticLog("INSTANCE: MinimalNativeScanner initialization complete")
    }

    // Enhanced diagnostic logs that include registration logs
    @objc func getDiagnosticLogs(_ call: CAPPluginCall) {
        addDiagnosticLog("getDiagnosticLogs called - returning \(MinimalNativeScanner.allDiagnosticLogs.count) total log entries")

        call.resolve([
            "success": true,
            "logs": MinimalNativeScanner.allDiagnosticLogs,
            "count": MinimalNativeScanner.allDiagnosticLogs.count,
            "timestamp": Date().timeIntervalSince1970,
            "registrationLogs": MinimalNativeScanner.allDiagnosticLogs.filter { $0.contains("STATIC:") },
            "instanceLogs": MinimalNativeScanner.allDiagnosticLogs.filter { $0.contains("INSTANCE:") }
        ])
    }

    // Simple test method that logs everything
    @objc func testMethod(_ call: CAPPluginCall) {
        addDiagnosticLog("testMethod called successfully - Bridge is working!")
        addDiagnosticLog("testMethod: Call object type: \(type(of: call))")
        addDiagnosticLog("testMethod: Thread: \(Thread.current)")
        addDiagnosticLog("testMethod: Is main thread: \(Thread.isMainThread)")

        // Test if we can resolve successfully
        do {
            call.resolve([
                "success": true,
                "message": "MinimalNativeScanner testMethod working perfectly",
                "timestamp": Date().timeIntervalSince1970,
                "threadInfo": [
                    "current": Thread.current.description,
                    "isMain": Thread.isMainThread
                ],
                "callInfo": [
                    "callId": call.callbackId,
                    "methodName": call.methodName
                ]
            ])
            addDiagnosticLog("testMethod: Successfully resolved call")
        } catch {
            addDiagnosticLog("testMethod: ERROR resolving call: \(error)")
        }
    }

    @objc func getCameraStatus(_ call: CAPPluginCall) {
        addDiagnosticLog("getCameraStatus called")

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
            "diagnostic": "getCameraStatus completed successfully",
            "rawAuthStatus": cameraAuthStatus.rawValue
        ])
    }

    @objc func requestCameraAccess(_ call: CAPPluginCall) {
        addDiagnosticLog("requestCameraAccess called")

        AVCaptureDevice.requestAccess(for: .video) { [weak self] granted in
            self?.addDiagnosticLog("Camera access request completed - granted: \(granted)")

            DispatchQueue.main.async {
                call.resolve([
                    "camera": granted ? "granted" : "denied",
                    "nativeScanner": "available",
                    "diagnostic": "requestCameraAccess completed"
                ])
            }
        }
    }

    @objc func scanWithNativeCamera(_ call: CAPPluginCall) {
        addDiagnosticLog("scanWithNativeCamera called")
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

        if let rootViewController = UIApplication.shared.windows.first?.rootViewController {
            var topController = rootViewController

            while let presentedViewController = topController.presentedViewController {
                topController = presentedViewController
            }

            addDiagnosticLog("Presenting scanner view controller")
            topController.present(nativeScannerVC!, animated: true) {
                self.addDiagnosticLog("Scanner view controller presented successfully")
            }
        } else {
            addDiagnosticLog("ERROR: Could not find root view controller")
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
            "source": "native_ios_scanner"
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
            "source": "native_ios_scanner"
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