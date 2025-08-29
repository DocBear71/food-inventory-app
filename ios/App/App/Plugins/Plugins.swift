// file: ios/App/App/Plugins/Plugins.swift v1 - Register native barcode scanner plugin

import Foundation
import Capacitor

public func registerPlugins() -> [CAPPlugin.Type] {
    return [
        // Native Barcode Scanner Plugin
        NativeBarcodeScanner.self,

         // Native Haptic Feedback Plugin
         HapticFeedback.self,

        // Add other plugins here as needed...
    ]
}