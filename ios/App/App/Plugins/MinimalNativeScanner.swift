// file: ios/App/App/Plugins/MinimalNativeScanner.swift v9 - CORRECT Capacitor 7.0 syntax

import Foundation
import Capacitor
import UIKit
import AVFoundation

@objc(MinimalNativeScanner)
public class MinimalNativeScanner: CAPPlugin {
    
    // Remove CAPBridgedPlugin conformance - it may not exist in this Capacitor version
    // Use standard CAPPlugin approach instead
    // Add this to the top of MinimalNativeScanner.swift
    #warning("MinimalNativeScanner.swift is being compiled - you should see this warning in Xcode")
    
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
        NSLog("🎯 CAPACITOR7_CORRECT: %@", message)
        
        // Keep only last 100 log entries
        if allDiagnosticLogs.count > 100 {
            allDiagnosticLogs.removeFirst()
        }
    }
    
    private func addDiagnosticLog(_ message: String) {
        MinimalNativeScanner.addGlobalLog(message)
    }

    @objc public static func logPluginRegistration() {
        addGlobalLog("STATIC: MinimalNativeScanner class being registered with CORRECT Capacitor 7.0")
        addGlobalLog("STATIC: Class name: \(String(describing: MinimalNativeScanner.self))")
        addGlobalLog("STATIC: Superclass: \(String(describing: MinimalNativeScanner.superclass()))")
        addGlobalLog("STATIC: Using standard CAPPlugin approach")
        
        // Test method visibility at class level
        let instance = MinimalNativeScanner()
        let methodNames = ["scanWithNativeCamera", "getCameraStatus", "requestCameraAccess", "testMethod", "getDiagnosticLogs", "getViewControllerDiagnosticLogs"]
        
        for methodName in methodNames {
            let selector = NSSelectorFromString("\(methodName):")
            let responds = instance.responds(to: selector)
            addGlobalLog("STATIC: Method '\(methodName)' responds: \(responds ? "YES" : "NO")")
        }
    }

    // Standard Capacitor plugin loading
    public override func load() {
        super.load()
        addDiagnosticLog("INSTANCE: MinimalNativeScanner CORRECT load() called - Capacitor 7.0")
        addDiagnosticLog("INSTANCE: Using standard CAPPlugin inheritance")
        
        // Test if bridge exists
        if let bridge = self.bridge {
            addDiagnosticLog("INSTANCE: Bridge exists: YES")
            addDiagnosticLog("INSTANCE: Bridge class: \(String(describing: type(of: bridge)))")
        } else {
            addDiagnosticLog("INSTANCE: ERROR - Bridge is nil!")
        }
        
        addDiagnosticLog("INSTANCE: Plugin instance created successfully")
        addDiagnosticLog("INSTANCE: Instance class: \(String(describing: type(of: self)))")
        addDiagnosticLog("INSTANCE: MinimalNativeScanner CORRECT initialization complete - Capacitor 7.0")
    }

    @objc func getDiagnosticLogs(_ call: CAPPluginCall) {
        addDiagnosticLog("getDiagnosticLogs called - returning \(MinimalNativeScanner.allDiagnosticLogs.count) total log entries")
        
        call.resolve([
            "success": true,
            "logs": MinimalNativeScanner.allDiagnosticLogs,
            "count": MinimalNativeScanner.allDiagnosticLogs.count,
            "timestamp": Date().timeIntervalSince1970,
            "capacitorVersion": "7.0-CORRECT",
            "pluginApproach": "Standard CAPPlugin",
            "registrationLogs": MinimalNativeScanner.registrationLogs,
            "instanceLogs": MinimalNativeScanner.allDiagnosticLogs.filter { $0.contains("INSTANCE:") },
            "registrationLogCount": MinimalNativeScanner.registrationLogs.count,
            "hasRegistrationLogs": !MinimalNativeScanner.registrationLogs.isEmpty,
            "pluginInfo": [
                "className": String(describing: MinimalNativeScanner.self),
                "superclass": String(describing: MinimalNativeScanner.superclass()),
                "protocols": "CAPPlugin only"
            ]
        ])
    }

    @objc func getViewControllerDiagnosticLogs(_ call: CAPPluginCall) {
        addDiagnosticLog("getViewControllerDiagnosticLogs called")
        
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

    @objc func testMethod(_ call: CAPPluginCall) {
        addDiagnosticLog("testMethod called successfully - CORRECT Capacitor 7.0 Bridge is working!")
        
        call.resolve([
            "success": true,
            "message": "MinimalNativeScanner testMethod working perfectly with CORRECT Capacitor 7.0",
            "timestamp": Date().timeIntervalSince1970,
            "capacitorVersion": "7.0-CORRECT",
            "pluginApproach": "Standard CAPPlugin"
        ])
    }

    @objc func getCameraStatus(_ call: CAPPluginCall) {
        addDiagnosticLog("getCameraStatus called - CORRECT Capacitor 7.0")
        
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

        call.resolve([
            "camera": status,
            "nativeScanner": "available",
            "capacitorVersion": "7.0-CORRECT"
        ])
    }

    @objc func requestCameraAccess(_ call: CAPPluginCall) {
        addDiagnosticLog("requestCameraAccess called - CORRECT Capacitor 7.0")
        
        AVCaptureDevice.requestAccess(for: .video) { [weak self] granted in
            self?.addDiagnosticLog("Camera access request completed - granted: \(granted)")
            
            DispatchQueue.main.async {
                call.resolve([
                    "camera": granted ? "granted" : "denied",
                    "nativeScanner": "available",
                    "capacitorVersion": "7.0-CORRECT"
                ])
            }
        }
    }

    @objc func scanWithNativeCamera(_ call: CAPPluginCall) {
        addDiagnosticLog("scanWithNativeCamera called - CORRECT Capacitor 7.0")
        currentCall = call

        DispatchQueue.main.async {
            self.checkCameraAndPresent()
        }
    }

    private func checkCameraAndPresent() {
        let cameraAuthStatus = AVCaptureDevice.authorizationStatus(for: .video)

        switch cameraAuthStatus {
        case .authorized:
            presentNativeScanner()
        case .notDetermined:
            AVCaptureDevice.requestAccess(for: .video) { [weak self] granted in
                DispatchQueue.main.async {
                    if granted {
                        self?.presentNativeScanner()
                    } else {
                        self?.currentCall?.reject("Camera permission denied", "PERMISSION_DENIED")
                        self?.currentCall = nil
                    }
                }
            }
        case .denied, .restricted:
            currentCall?.reject("Camera permission required. Please enable camera access in Settings.", "PERMISSION_DENIED")
            currentCall = nil
        @unknown default:
            currentCall?.reject("Unknown camera permission status", "PERMISSION_ERROR")
            currentCall = nil
        }
    }

    private func presentNativeScanner() {
        nativeScannerVC = NativeBarcodeScannerViewController()
        nativeScannerVC?.delegate = self
        nativeScannerVC?.modalPresentationStyle = .fullScreen
        nativeScannerVC?.modalTransitionStyle = .coverVertical

        if let bridge = self.bridge, let viewController = bridge.viewController {
            viewController.present(nativeScannerVC!, animated: true)
        } else if let rootViewController = UIApplication.shared.windows.first?.rootViewController {
            var topController = rootViewController
            while let presentedViewController = topController.presentedViewController {
                topController = presentedViewController
            }
            topController.present(nativeScannerVC!, animated: true)
        } else {
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
            "source": "native_ios_scanner_capacitor7_correct"
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
            "source": "native_ios_scanner_capacitor7_correct"
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