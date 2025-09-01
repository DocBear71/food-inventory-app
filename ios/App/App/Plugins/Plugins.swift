// file: ios/App/App/Plugins/Plugins.swift v2 - More explicit plugin registration

import Foundation
import Capacitor

@_cdecl("registerPlugins")
public func registerPlugins() -> [CAPPlugin.Type] {
    NSLog("🍎 Registering custom plugins...")
    let plugins: [CAPPlugin.Type] = [
        MinimalNativeScanner.self,
        HapticFeedback.self
    ]
    NSLog("🍎 Found %d plugins to register", plugins.count)
    return plugins
}