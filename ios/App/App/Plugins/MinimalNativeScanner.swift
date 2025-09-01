// file: ios/App/App/Plugins/MinimalNativeScanner.swift v3 - Self-logging for remote debugging

import Foundation
import Capacitor
import UIKit
import AVFoundation

@objc(MinimalNativeScanner)
public class MinimalNativeScanner: CAPPlugin {

    private var currentCall: CAPPluginCall?
    private var nativeScannerVC: NativeBarcodeScannerViewController?

    // Self-logging system for remote debugging
    private static var diagnosticLogs: [String] = []

    private func addDiagnosticLog(_ message: String) {
        let timestamp = DateFormatter().string(from: Date())
        let logEntry = "[\(timestamp)] \(message)"
        MinimalNativeScanner.diagnosticLogs.append(logEntry)
        NSLog("🎯 %@", message) // Still log to system in case it helps

        // Keep only last 50 log entries to prevent memory issues
        if MinimalNativeScanner.diagnosticLogs.count > 50 {
            MinimalNativeScanner.diagnosticLogs.removeFirst()
        }
    }

    public override func load() {
        super.load()
        addDiagnosticLog("MinimalNativeScanner load() called - Plugin initializing")

        // Test method registration
        let methodNames = ["scanWithNativeCamera", "getCameraStatus", "requestCameraAccess", "testMethod", "getDiagnosticLogs"]

        addDiagnosticLog("Testing method registration:")
        for methodName in methodNames {
            let selector = NSSelectorFromString("\(methodName):")
            let responds = self.responds(to: selector)
            addDiagnosticLog("Method '\(methodName)' responds: \(responds ? "YES" : "NO")")
        }

        addDiagnosticLog("Plugin class: \(String(describing: type(of: self)))")
        addDiagnosticLog("Plugin superclass: \(String(describing: type(of: self).superclass()))")
        addDiagnosticLog("MinimalNativeScanner initialization complete")
    }

    // NEW: Method to retrieve diagnostic logs for display in app
    @objc func getDiagnosticLogs(_ call: CAPPluginCall) {
        addDiagnosticLog("getDiagnosticLogs called - returning \(MinimalNativeScanner.diagnosticLogs.count) log entries")

        call.resolve([
            "success": true,
            "logs": MinimalNativeScanner.diagnosticLogs,
            "count": MinimalNativeScanner.diagnosticLogs.count,
            "timestamp": Date().timeIntervalSince1970
        ])
    }

    // DIAGNOSTIC: Simple test method
    @objc func testMethod(_ call: CAPPluginCall) {
        addDiagnosticLog("testMethod called successfully - Bridge is working!")

        call.resolve([
            "success": true,
            "message": "MinimalNativeScanner testMethod working",
            "timestamp": Date().timeIntervalSince1970,
            "methodsAvailable": [
                "testMethod": "working",
                "getDiagnosticLogs": "working",
                "scanWithNativeCamera": "available",
                "getCameraStatus": "available",
                "requestCameraAccess": "available"
            ]
        ])
    }

    @objc func scanWithNativeCamera(_ call: CAPPluginCall) {
        addDiagnosticLog("scanWithNativeCamera called")
        currentCall = call

        DispatchQueue.main.async {
            self.addDiagnosticLog("Dispatched to main queue for camera check")
            self.checkCameraAndPresent()
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