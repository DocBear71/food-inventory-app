# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# If your project uses WebView with JS, uncomment the following
# and specify the fully qualified class name to the JavaScript interface
# class:
#-keepclassmembers class fqcn.of.javascript.interface.for.webview {
#   public *;
#}

# Uncomment this to preserve the line number information for
# debugging stack traces.
#-keepattributes SourceFile,LineNumberTable

# If you keep the line number information, uncomment this to
# hide the original source file name.
#-renamesourcefileattribute SourceFile

# Keep edge-to-edge related classes (non-deprecated)
-keep class androidx.core.view.** { *; }
-keep class androidx.core.graphics.** { *; }
-keep class androidx.window.** { *; }

# Keep Capacitor WebView classes
-keep class com.getcapacitor.** { *; }
-dontwarn com.getcapacitor.**

# IMPORTANT: Keep ML Kit classes and remove orientation restrictions
-keep class com.google.mlkit.** { *; }
-dontwarn com.google.mlkit.**

# Keep native library classes for 16KB alignment
-keep class android.app.** { *; }
-keep class androidx.activity.** { *; }

# Large screen and foldable support
-keep class android.content.res.Configuration { *; }
-keep class android.util.DisplayMetrics { *; }
-keep class android.view.WindowMetrics { *; }

# Voice input and camera classes
-keep class android.media.** { *; }
-keep class android.hardware.camera2.** { *; }

# Keep WindowCompat methods (non-deprecated edge-to-edge)
-keepclassmembers class androidx.core.view.WindowCompat {
    public static void setDecorFitsSystemWindows(...);
    public static androidx.core.view.WindowInsetsControllerCompat getInsetsController(...);
}

# Keep WindowInsetsControllerCompat methods
-keepclassmembers class androidx.core.view.WindowInsetsControllerCompat {
    public void setAppearanceLightStatusBars(...);
    public void setAppearanceLightNavigationBars(...);
}

# Prevent obfuscation of Android 15+ methods
-keepclassmembers class * {
    public void onApplyWindowInsets(...);
    public void setDecorFitsSystemWindows(...);
}

# Keep native library alignment classes
-keep class android.os.Build { *; }
-keep class android.os.Build$VERSION { *; }

# Don't warn about missing classes for optional features
-dontwarn java.lang.instrument.ClassFileTransformer
-dontwarn sun.misc.SignalHandler