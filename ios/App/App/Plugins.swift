// file: ios/App/App/Plugins.swift v10 - RECREATE for Capacitor 7.0 with VISUAL logging

import Foundation
import Capacitor

// CRITICAL: Capture ALL registration logs for visual display in iPad
private var registrationLogs: [String] = []

private func addRegistrationLog(_ message: String) {
    let timestamp = DateFormatter().string(from: Date())
    let logEntry = "[\(timestamp)] \(message)"
    registrationLogs.append(logEntry)
    NSLog("🔧 CAPACITOR7: %@", message) // Still log to Xcode (even though you can't see it)

    // Keep only last 50 entries to prevent memory issues
    if registrationLogs.count > 50 {
        registrationLogs.removeFirst()
    }
}

@_cdecl("registerPlugins")
public func registerPlugins() -> [CAPPlugin.Type] {
    addRegistrationLog("registerPlugins() called - RECREATED version for visual logging")
    addRegistrationLog("Attempting to register MinimalNativeScanner")

    // CRITICAL: Test if the class is even loadable
    let pluginClass = MinimalNativeScanner.self
    addRegistrationLog("Plugin class reference obtained: \(pluginClass)")

    // Test protocol conformance at runtime
    let conformsToCAPPlugin = pluginClass is CAPPlugin.Type
    let conformsToCAPBridgedPlugin = pluginClass is CAPBridgedPlugin.Type

    addRegistrationLog("Conforms to CAPPlugin: \(conformsToCAPPlugin)")
    addRegistrationLog("Conforms to CAPBridgedPlugin: \(conformsToCAPBridgedPlugin)")

    if conformsToCAPPlugin && conformsToCAPBridgedPlugin {
        addRegistrationLog("✅ Plugin passes protocol tests")

        // Test creating an instance
        do {
            let instance = MinimalNativeScanner()
            addRegistrationLog("✅ Plugin instance created successfully")
            addRegistrationLog("Instance identifier: \(instance.identifier)")
            addRegistrationLog("Instance jsName: \(instance.jsName)")
            addRegistrationLog("Instance methods count: \(instance.pluginMethods.count)")

            for (index, method) in instance.pluginMethods.enumerated() {
                addRegistrationLog("Method[\(index)]: \(method.name) -> \(method.returnType)")
            }

            // Store the logs in the plugin instance so we can retrieve them later
            MinimalNativeScanner.setRegistrationLogs(registrationLogs)

        } catch {
            addRegistrationLog("❌ Failed to create plugin instance: \(error)")
        }

    } else {
        addRegistrationLog("❌ Plugin fails protocol conformance tests")
        if !conformsToCAPPlugin {
            addRegistrationLog("❌ Does not conform to CAPPlugin")
        }
        if !conformsToCAPBridgedPlugin {
            addRegistrationLog("❌ Does not conform to CAPBridgedPlugin")
        }
    }

    let plugins: [CAPPlugin.Type] = [
        MinimalNativeScanner.self
    ]

    addRegistrationLog("Returning \(plugins.count) plugin(s) for registration")
    addRegistrationLog("Registration function completed")

    return plugins
}