// file: ios/App/App/ViewController.swift v5 - Direct native scanner integration

import UIKit
import Capacitor

class ViewController: CAPBridgeViewController {
    override func viewDidLoad() {
        super.viewDidLoad()
    }

    override func capacitorDidLoad() {
        // Register the direct native scanner manager
        if let webView = self.webView {
            NativeScannerManager.shared.registerWithWebView(webView, viewController: self)
            NSLog("🍎 Direct native scanner registered successfully")
        } else {
            NSLog("❌ WebView not available for native scanner registration")
        }
    }
}