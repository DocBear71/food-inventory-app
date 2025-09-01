// file: ios/App/App/NativeScannerManager.swift v1 - Direct native implementation bypassing Capacitor

import Foundation
import UIKit
import AVFoundation
import WebKit

class NativeScannerManager: NSObject {

    static let shared = NativeScannerManager()

    private var webView: WKWebView?
    private var currentViewController: UIViewController?
    private var scannerViewController: NativeBarcodeScannerViewController?

    // Register this manager with the web view
    func registerWithWebView(_ webView: WKWebView, viewController: UIViewController) {
        self.webView = webView
        self.currentViewController = viewController

        // Add JavaScript interface
        let contentController = webView.configuration.userContentController
        contentController.add(self, name: "nativeScannerBridge")

        print("🍎 NativeScannerManager registered successfully")
    }

    // Present the native scanner
    func presentScanner() {
        guard let viewController = currentViewController else {
            print("❌ No view controller available")
            sendResultToWeb(success: false, error: "No view controller available")
            return
        }

        print("🍎 Presenting native scanner")

        // Check camera permissions first
        let cameraAuthStatus = AVCaptureDevice.authorizationStatus(for: .video)

        switch cameraAuthStatus {
        case .authorized:
            showScanner(from: viewController)
        case .notDetermined:
            AVCaptureDevice.requestAccess(for: .video) { [weak self] granted in
                DispatchQueue.main.async {
                    if granted {
                        self?.showScanner(from: viewController)
                    } else {
                        self?.sendResultToWeb(success: false, error: "Camera permission denied")
                    }
                }
            }
        case .denied, .restricted:
            sendResultToWeb(success: false, error: "Camera permission required. Please enable in Settings.")
        @unknown default:
            sendResultToWeb(success: false, error: "Unknown camera permission status")
        }
    }

    private func showScanner(from viewController: UIViewController) {
        scannerViewController = NativeBarcodeScannerViewController()
        scannerViewController?.delegate = self

        scannerViewController?.modalPresentationStyle = .fullScreen
        scannerViewController?.modalTransitionStyle = .coverVertical

        viewController.present(scannerViewController!, animated: true) {
            print("🍎 Native scanner presented successfully")
        }
    }

    // Send results back to web layer
    private func sendResultToWeb(success: Bool, barcode: String? = nil, format: String? = nil, error: String? = nil) {
        let result: [String: Any] = [
            "success": success,
            "barcode": barcode ?? "",
            "format": format ?? "",
            "error": error ?? "",
            "source": "native_ios_direct"
        ]

        guard let jsonData = try? JSONSerialization.data(withJSONObject: result),
              let jsonString = String(data: jsonData, encoding: .utf8) else {
            print("❌ Failed to serialize scanner result")
            return
        }

        let jsCode = "window.handleNativeScanResult(\(jsonString));"

        DispatchQueue.main.async {
            self.webView?.evaluateJavaScript(jsCode) { _, error in
                if let error = error {
                    print("❌ Error sending result to web: \(error)")
                } else {
                    print("✅ Scanner result sent to web successfully")
                }
            }
        }
    }
}

// MARK: - WKScriptMessageHandler
extension NativeScannerManager: WKScriptMessageHandler {
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.name == "nativeScannerBridge" else { return }

        guard let messageBody = message.body as? [String: Any],
              let action = messageBody["action"] as? String else {
            print("❌ Invalid message format")
            return
        }

        print("🍎 Received action: \(action)")

        switch action {
        case "presentScanner":
            presentScanner()
        case "checkPermissions":
            checkCameraPermissions()
        default:
            print("❌ Unknown action: \(action)")
        }
    }

    private func checkCameraPermissions() {
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

        let result: [String: Any] = [
            "action": "permissionStatus",
            "camera": status,
            "available": true
        ]

        guard let jsonData = try? JSONSerialization.data(withJSONObject: result),
              let jsonString = String(data: jsonData, encoding: .utf8) else {
            return
        }

        let jsCode = "window.handleNativePermissionResult(\(jsonString));"

        DispatchQueue.main.async {
            self.webView?.evaluateJavaScript(jsCode, completionHandler: nil)
        }
    }
}

// MARK: - NativeBarcodeScannerDelegate
extension NativeScannerManager: NativeBarcodeScannerDelegate {
    func barcodeScannerDidScanBarcode(_ barcode: String, format: String) {
        print("🍎 Native scanner detected barcode: \(barcode) (format: \(format))")
        sendResultToWeb(success: true, barcode: barcode, format: format)

        // Dismiss scanner
        scannerViewController?.dismiss(animated: true) {
            self.scannerViewController = nil
        }
    }

    func barcodeScannerDidCancel() {
        print("🍎 Native scanner cancelled by user")
        sendResultToWeb(success: false, error: "User cancelled")

        scannerViewController?.dismiss(animated: true) {
            self.scannerViewController = nil
        }
    }

    func barcodeScannerDidFail(with error: String) {
        print("🍎 Native scanner failed: \(error)")
        sendResultToWeb(success: false, error: error)

        scannerViewController?.dismiss(animated: true) {
            self.scannerViewController = nil
        }
    }
}