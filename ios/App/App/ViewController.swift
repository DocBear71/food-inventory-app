// file: ios/App/App/ViewController.swift v7 - Complete diagnostic with test plugin

import UIKit
import Capacitor

class ViewController: CAPBridgeViewController {
    
    // Store diagnostic logs that can be retrieved from JavaScript
    private static var allDiagnosticLogs: [String] = []
    
    private static func addDiagnosticLog(_ message: String) {
        let timestamp = DateFormatter().string(from: Date())
        let logEntry = "[\(timestamp)] \(message)"
        allDiagnosticLogs.append(logEntry)
        NSLog("🔍 DIAGNOSTIC: %@", message)
        
        // Keep only last 50 entries
        if allDiagnosticLogs.count > 50 {
            allDiagnosticLogs.removeFirst()
        }
    }
    
    // Public method to retrieve logs from JavaScript
    public static func getDiagnosticLogs() -> [String] {
        return allDiagnosticLogs
    }
    
    override func viewDidLoad() {
        super.viewDidLoad()
        Self.addDiagnosticLog("ViewController viewDidLoad() called")
    }

    override func capacitorDidLoad() {
        super.capacitorDidLoad()
        
        Self.addDiagnosticLog("capacitorDidLoad() started")
        
        if let bridge = self.bridge {
            Self.addDiagnosticLog("✅ Bridge found, testing plugins")
            
            // Test 1: Simple TestPlugin
            Self.addDiagnosticLog("--- TESTING SIMPLE PLUGIN ---")
            testPlugin(TestPlugin.self, name: "TestPlugin")
            
            // Test 2: MinimalNativeScanner
            Self.addDiagnosticLog("--- TESTING MINIMALSCANNER PLUGIN ---")
            testPlugin(MinimalNativeScanner.self, name: "MinimalNativeScanner")
            
        } else {
            Self.addDiagnosticLog("❌ Bridge not available")
        }
        
        Self.addDiagnosticLog("capacitorDidLoad() completed")
    }
    
    private func testPlugin<T: CAPPlugin>(_ pluginClass: T.Type, name: String) {
        Self.addDiagnosticLog("Testing plugin: \(name)")
        
        // Test if class exists and is accessible
        Self.addDiagnosticLog("Class reference: \(pluginClass)")
        
        // Test protocol conformance
        let conformsToCAPPlugin = pluginClass is CAPPlugin.Type
        let conformsToCAPBridgedPlugin = pluginClass is CAPBridgedPlugin.Type
        
        Self.addDiagnosticLog("\(name) conforms to CAPPlugin: \(conformsToCAPPlugin)")
        Self.addDiagnosticLog("\(name) conforms to CAPBridgedPlugin: \(conformsToCAPBridgedPlugin)")
        
        if conformsToCAPPlugin && conformsToCAPBridgedPlugin {
            // Try to create instance
            do {
                let instance = pluginClass.init()
                Self.addDiagnosticLog("✅ \(name) instance created successfully")
                
                // Get plugin details if it's a bridged plugin
                if let bridgedInstance = instance as? CAPBridgedPlugin {
                    Self.addDiagnosticLog("\(name) identifier: \(bridgedInstance.identifier)")
                    Self.addDiagnosticLog("\(name) jsName: \(bridgedInstance.jsName)")
                    Self.addDiagnosticLog("\(name) methods count: \(bridgedInstance.pluginMethods.count)")
                    
                    for (index, method) in bridgedInstance.pluginMethods.enumerated() {
                        Self.addDiagnosticLog("\(name) method[\(index)]: \(method.name)")
                    }
                }
                
                // Try to register with bridge
                if let bridge = self.bridge {
                    bridge.registerPluginInstance(instance)
                    Self.addDiagnosticLog("✅ \(name) registered with bridge")
                    
                    // Store logs in MinimalNativeScanner if it's that plugin
                    if name == "MinimalNativeScanner", let scanner = instance as? MinimalNativeScanner {
                        // Try to call the log storage method
                        MinimalNativeScanner.setRegistrationLogs(Self.allDiagnosticLogs)
                        Self.addDiagnosticLog("Stored diagnostic logs in MinimalNativeScanner")
                    }
                } else {
                    Self.addDiagnosticLog("❌ No bridge available for registration")
                }
                
            } catch {
                Self.addDiagnosticLog("❌ Failed to create \(name) instance: \(error)")
            }
        } else {
            Self.addDiagnosticLog("❌ \(name) fails protocol conformance")
        }
        
        Self.addDiagnosticLog("--- \(name) TEST COMPLETED ---")
    }
}

// MARK: - Extension to make diagnostic logs accessible from Capacitor
extension ViewController {
    
    @objc public func getViewControllerDiagnosticLogs() -> [String] {
        return Self.allDiagnosticLogs
    }
}