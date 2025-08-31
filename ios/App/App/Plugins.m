#import <Foundation/Foundation.h>
#import <Capacitor/Capacitor.h>

// Register the native scanner bridge (this is what Apple wants to see)
CAP_PLUGIN(NativeScannerBridge, "NativeScannerBridge",
    CAP_PLUGIN_METHOD(presentNativeScanner, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(checkPermissions, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(requestPermissions, CAPPluginReturnPromise);
)

// Register HapticFeedback plugin
CAP_PLUGIN(HapticFeedback, "HapticFeedback",
    CAP_PLUGIN_METHOD(impact, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(notification, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(selection, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(buttonTap, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(actionSuccess, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(actionError, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(scanSuccess, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(scanError, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(isAvailable, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(prepare, CAPPluginReturnPromise);
)