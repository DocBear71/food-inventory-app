// file: ios/App/App/Plugins/MinimalNativeScanner.swift v1 - Clean implementation avoiding all Capacitor conflicts

import Foundation
import Capacitor
import UIKit
import AVFoundation

@objc(MinimalNativeScanner)
public class MinimalNativeScanner: CAPPlugin {

    private var currentCall: CAPPluginCall?
    private var nativeScannerVC: NativeBarcodeScannerViewController?

    public override func load() {
        super.load()
        NSLog("🍎 MinimalNativeScanner loaded - Pure iOS implementation")
    }

    // Custom method names to avoid any Capacitor conflicts
    @objc func scanWithNativeCamera(_ call: CAPPluginCall) {
        NSLog("🍎 Starting native camera scan")
        currentCall = call

        DispatchQueue.main.async {
            self.checkCameraAndPresent()
        }
    }

    @objc func getCameraStatus(_ call: CAPPluginCall) {
        let cameraAuthStatus = AVCaptureDevice.authorizationStatus(for: .video)

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
            "nativeScanner": "available"
        ])
    }

    @objc func requestCameraAccess(_ call: CAPPluginCall) {
        AVCaptureDevice.requestAccess(for: .video) { granted in
            DispatchQueue.main.async {
                call.resolve([
                    "camera": granted ? "granted" : "denied",
                    "nativeScanner": "available"
                ])
            }
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
        // Create the native scanner
        nativeScannerVC = NativeBarcodeScannerViewController()
        nativeScannerVC?.delegate = self

        // Present it modally with native iOS presentation style
        nativeScannerVC?.modalPresentationStyle = .fullScreen
        nativeScannerVC?.modalTransitionStyle = .coverVertical

        // Find the root view controller and present
        if let rootViewController = UIApplication.shared.windows.first?.rootViewController {
            var topController = rootViewController

            // Find the topmost view controller
            while let presentedViewController = topController.presentedViewController {
                topController = presentedViewController
            }

            // Present the native scanner
            topController.present(nativeScannerVC!, animated: true) {
                NSLog("🍎 Native barcode scanner presented successfully")
            }
        } else {
            currentCall?.reject("Could not present scanner", "PRESENTATION_ERROR")
            currentCall = nil
        }
    }
}

// MARK: - NativeBarcodeScannerDelegate
extension MinimalNativeScanner: NativeBarcodeScannerDelegate {

    func barcodeScannerDidScanBarcode(_ barcode: String, format: String) {
        NSLog("🍎 Native scanner detected barcode: %@ (format: %@)", barcode, format)

        // Return success result to JavaScript
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
        NSLog("🍎 Native scanner cancelled by user")

        // Return cancelled result to JavaScript
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
        NSLog("🍎 Native scanner failed: %@", error)

        // Return error to JavaScript
        currentCall?.reject("Scanner failed", "SCANNER_ERROR", NSError(domain: "ScannerError", code: 1, userInfo: [NSLocalizedDescriptionKey: error]))

        currentCall = nil
        nativeScannerVC = nil
    }
}