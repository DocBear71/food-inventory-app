// file: ios/App/App/Plugins/Plugins.swift v5 - Fixed to match minimal plugin

import Foundation
import Capacitor

@_cdecl("registerPlugins")
public func registerPlugins() -> [CAPPlugin.Type] {
    NSLog("🔧 Registering plugins...")

    let plugins: [CAPPlugin.Type] = [
        MinimalNativeScanner.self,
        HapticFeedback.self
    ]

    NSLog("🔧 Found %d plugins to register", plugins.count)
    return plugins
}