// file: ios/App/App/Plugins/HapticFeedback.swift v1 - Native iOS haptic feedback plugin

import Foundation
import Capacitor
import AVFoundation
import UIKit
import AudioToolbox

@objc(HapticFeedback)
public class HapticFeedback: CAPPlugin {

    private var impactLight: UIImpactFeedbackGenerator?
    private var impactMedium: UIImpactFeedbackGenerator?
    private var impactHeavy: UIImpactFeedbackGenerator?
    private var notificationFeedback: UINotificationFeedbackGenerator?
    private var selectionFeedback: UISelectionFeedbackGenerator?

    public override func load() {
        super.load()

        // Pre-initialize feedback generators for better performance
        prepareHapticGenerators()

        NSLog("🍎 HapticFeedback plugin loaded and generators prepared")
    }

    private func prepareHapticGenerators() {
        impactLight = UIImpactFeedbackGenerator(style: .light)
        impactMedium = UIImpactFeedbackGenerator(style: .medium)
        impactHeavy = UIImpactFeedbackGenerator(style: .heavy)
        notificationFeedback = UINotificationFeedbackGenerator()
        selectionFeedback = UISelectionFeedbackGenerator()

        // Prepare generators for immediate response
        impactLight?.prepare()
        impactMedium?.prepare()
        impactHeavy?.prepare()
        notificationFeedback?.prepare()
        selectionFeedback?.prepare()
    }

    @objc func impact(_ call: CAPPluginCall) {
        let style = call.getString("style") ?? "medium"

        DispatchQueue.main.async {
            switch style.lowercased() {
            case "light":
                self.impactLight?.impactOccurred()
                NSLog("🍎 Light haptic impact triggered")
            case "heavy":
                self.impactHeavy?.impactOccurred()
                NSLog("🍎 Heavy haptic impact triggered")
            default: // medium
                self.impactMedium?.impactOccurred()
                NSLog("🍎 Medium haptic impact triggered")
            }

            call.resolve()
        }
    }

    @objc func notification(_ call: CAPPluginCall) {
        let type = call.getString("type") ?? "success"

        DispatchQueue.main.async {
            switch type.lowercased() {
            case "success":
                self.notificationFeedback?.notificationOccurred(.success)
                NSLog("🍎 Success haptic notification triggered")
            case "warning":
                self.notificationFeedback?.notificationOccurred(.warning)
                NSLog("🍎 Warning haptic notification triggered")
            case "error":
                self.notificationFeedback?.notificationOccurred(.error)
                NSLog("🍎 Error haptic notification triggered")
            default:
                self.notificationFeedback?.notificationOccurred(.success)
                NSLog("🍎 Default success haptic notification triggered")
            }

            call.resolve()
        }
    }

    @objc func selection(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.selectionFeedback?.selectionChanged()
            NSLog("🍎 Selection haptic feedback triggered")
            call.resolve()
        }
    }

    @objc func vibrate(_ call: CAPPluginCall) {
        let duration = call.getInt("duration") ?? 500

        DispatchQueue.main.async {
            // For compatibility, provide basic vibration
            AudioServicesPlaySystemSound(kSystemSoundID_Vibrate)
            NSLog("🍎 Basic vibration triggered (duration: %d ms)", duration)
            call.resolve()
        }
    }

    // Enhanced haptic patterns for specific app actions
    @objc func buttonTap(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.impactLight?.impactOccurred()
            NSLog("🍎 Button tap haptic triggered")
            call.resolve()
        }
    }

    @objc func actionSuccess(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.notificationFeedback?.notificationOccurred(.success)
            NSLog("🍎 Action success haptic triggered")
            call.resolve()
        }
    }

    @objc func actionError(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.notificationFeedback?.notificationOccurred(.error)
            NSLog("🍎 Action error haptic triggered")
            call.resolve()
        }
    }

    @objc func formSubmit(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.impactMedium?.impactOccurred()
            NSLog("🍎 Form submit haptic triggered")
            call.resolve()
        }
    }

    @objc func navigationChange(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.selectionFeedback?.selectionChanged()
            NSLog("🍎 Navigation change haptic triggered")
            call.resolve()
        }
    }

    @objc func modalOpen(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.impactLight?.impactOccurred()
            NSLog("🍎 Modal open haptic triggered")
            call.resolve()
        }
    }

    @objc func modalClose(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.impactLight?.impactOccurred()
            NSLog("🍎 Modal close haptic triggered")
            call.resolve()
        }
    }

    // Inventory-specific haptic patterns
    @objc func itemAdded(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            // Double tap pattern for item added
            self.impactMedium?.impactOccurred()
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
                self.impactLight?.impactOccurred()
            }
            NSLog("🍎 Item added haptic pattern triggered")
            call.resolve()
        }
    }

    @objc func itemRemoved(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.impactHeavy?.impactOccurred()
            NSLog("🍎 Item removed haptic triggered")
            call.resolve()
        }
    }

    @objc func scanSuccess(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            // Triple tap pattern for successful scan
            self.impactMedium?.impactOccurred()
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.05) {
                self.impactMedium?.impactOccurred()
            }
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
                self.notificationFeedback?.notificationOccurred(.success)
            }
            NSLog("🍎 Scan success haptic pattern triggered")
            call.resolve()
        }
    }

    @objc func scanError(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.notificationFeedback?.notificationOccurred(.error)
            NSLog("🍎 Scan error haptic triggered")
            call.resolve()
        }
    }

    // Check if haptic feedback is available
    @objc func isAvailable(_ call: CAPPluginCall) {
        // Haptic feedback is available on iPhone 7 and later
        let isAvailable = UIDevice.current.userInterfaceIdiom == .phone

        call.resolve([
            "available": isAvailable
        ])
    }

    // Re-prepare generators (useful after app becomes active)
    @objc func prepare(_ call: CAPPluginCall) {
        prepareHapticGenerators()
        call.resolve([
            "prepared": true
        ])
    }
}