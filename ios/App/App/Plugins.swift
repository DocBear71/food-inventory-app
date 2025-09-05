// file: ios/App/App/Plugins.swift v1 - Capacitor 7.0 custom plugin registration

import Foundation
import Capacitor

public func registerPlugins(_ config: InstanceConfiguration) -> [CAPPlugin] {
    
    // Enhanced logging for plugin registration debugging
    var registrationLogs: [String] = []
    
    func addLog(_ message: String) {
        let timestamp = DateFormatter().string(from: Date())
        let logEntry = "[\(timestamp)] REGISTRATION: \(message)"
        registrationLogs.append(logEntry)
        NSLog("🔧 PLUGIN_REGISTRATION: %@", message)
    }
    
    addLog("Starting Capacitor 7.0 plugin registration process")
    addLog("Config: \(config)")
    
    // Register your custom plugin
    addLog("Attempting to register MinimalNativeScanner")
    
    // Call the static logging method on your plugin
    MinimalNativeScanner.logPluginRegistration()
    
    // Create plugin instances
    let minimalNativeScanner = MinimalNativeScanner()
    addLog("Created MinimalNativeScanner instance: \(minimalNativeScanner)")

    
    // Pass registration logs to the plugin for later diagnostic access
    MinimalNativeScanner.setRegistrationLogs(registrationLogs)
    
    let plugins: [CAPPlugin] = [
        minimalNativeScanner,
        HapticFeedback()
    ]
    
    addLog("Successfully registered \(plugins.count) custom plugins")
    for (index, plugin) in plugins.enumerated() {
        addLog("Plugin[\(index)]: \(type(of: plugin)) - \(plugin)")
    }
    
    addLog("Plugin registration complete - returning \(plugins.count) plugins")
    
    return plugins
}