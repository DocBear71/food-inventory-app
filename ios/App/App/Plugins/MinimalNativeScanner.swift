// file: ios/App/App/Plugins/MinimalNativeScanner.swift v5 - Minimal direct plugin test

import Foundation
import Capacitor
import UIKit
import AVFoundation

@objc(MinimalNativeScanner)
public class MinimalNativeScanner: CAPPlugin {

    // Test if the class can be instantiated at all
    @objc public override init() {
        super.init()
        NSLog("🔧 MinimalNativeScanner init() called - Class instantiation successful")
    }

    @objc public override init(bridge: CAPBridge?, pluginId: String, pluginName: String) {
        super.init(bridge: bridge, pluginId: pluginId, pluginName: pluginName)
        NSLog("🔧 MinimalNativeScanner init(bridge:) called - Capacitor instantiation successful")
        NSLog("🔧 Plugin ID: %@, Plugin Name: %@", pluginId, pluginName)
        NSLog("🔧 Bridge exists: %@", bridge != nil ? "YES" : "NO")
    }

    public override func load() {
        super.load()
        NSLog("🔧 MinimalNativeScanner load() called")
        NSLog("🔧 Bridge: %@", self.bridge != nil ? "available" : "nil")
        NSLog("🔧 Plugin ID: %@", self.pluginId ?? "nil")
    }

    // Simplest possible method - no parameters, just return success
    @objc func ping(_ call: CAPPluginCall) {
        NSLog("🔧 ping() method called - SUCCESS!")
        NSLog("🔧 Call object: %@", call)
        NSLog("🔧 Call callback ID: %@", call.callbackId)

        call.resolve([
            "message": "ping successful",
            "timestamp": Date().timeIntervalSince1970,
            "success": true
        ])

        NSLog("🔧 ping() response sent successfully")
    }

    // Test camera status without any complex logic
    @objc func simpleTest(_ call: CAPPluginCall) {
        NSLog("🔧 simpleTest() called")

        call.resolve([
            "test": "working",
            "platform": "ios",
            "native": true
        ])
    }
}