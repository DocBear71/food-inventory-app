// file: ios/App/App/TestPlugin.swift - Simple test plugin to verify Swift compilation

import Foundation
import Capacitor
import UIKit

@objc(TestPlugin)
public class TestPlugin: CAPPlugin, CAPBridgedPlugin {
    
    public let identifier = "TestPlugin"
    public let jsName = "TestPlugin"
    
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "simpleTest", returnType: CAPPluginReturnPromise)
    ]
    
    public override func load() {
        super.load()
        NSLog("🧪 TestPlugin loaded successfully")
    }
    
    @objc func simpleTest(_ call: CAPPluginCall) {
        NSLog("🧪 TestPlugin simpleTest method called")
        call.resolve([
            "success": true,
            "message": "TestPlugin is working - Swift compilation is OK",
            "timestamp": Date().timeIntervalSince1970
        ])
    }
}