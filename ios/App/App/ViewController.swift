// file: ios/App/App/ViewController.swift v3 - Properly configured for custom plugins

import UIKit
import Capacitor

class ViewController: CAPBridgeViewController {
    override func viewDidLoad() {
        super.viewDidLoad()
    }

    override func capacitorDidLoad() {
        bridge?.registerPlugins(registerPlugins())
        NSLog("🍎 Custom plugins registered via Swift method")
    }
}