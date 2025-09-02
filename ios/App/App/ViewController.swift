// file: ios/App/App/ViewController.swift v5 - Direct native scanner integration

import UIKit
import Capacitor

class ViewController: CAPBridgeViewController {
    override func viewDidLoad() {
        super.viewDidLoad()
    }

    override func capacitorDidLoad() {
    super.capacitorDidLoad()
    NSLog("🍎 ViewController loaded - Capacitor plugins registered")

    if let bridge = self.bridge {
        bridge.registerPluginInstance(MinimalNativeScanner())
    }
    NSLog("🍎 ViewController loaded - Custom plugins registered for Capacitor 7.0")
}
}