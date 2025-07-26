package kitchen.docbearscomfort;

import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.os.Build;
import android.graphics.Color;
import android.view.Window;
import android.view.WindowManager;
import android.util.Log;

// ADDED: Microphone permission imports
import android.Manifest;
import android.content.pm.PackageManager;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

// AndroidX imports for proper edge-to-edge (non-deprecated)
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private static final String TAG = "MainActivity";
    // ADDED: Permission request code for microphone
    private static final int MICROPHONE_PERMISSION_REQUEST_CODE = 200;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // FIXED: Use only non-deprecated edge-to-edge APIs
        setupEdgeToEdgeAndroid15();

        // Enhanced large screen support
        setupLargeScreenSupport();

        // ADDED: Request microphone permissions on app start
        requestMicrophonePermissions();

        // Handle share intent on app launch
        handleShareIntent(getIntent());
    }

    // ADDED: Request microphone permissions at runtime
    private void requestMicrophonePermissions() {
        Log.d(TAG, "🎤 Checking microphone permissions...");

        // Check if we already have permissions
        boolean hasRecordAudio = ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO)
                == PackageManager.PERMISSION_GRANTED;
        boolean hasModifyAudio = ContextCompat.checkSelfPermission(this, Manifest.permission.MODIFY_AUDIO_SETTINGS)
                == PackageManager.PERMISSION_GRANTED;

        Log.d(TAG, "RECORD_AUDIO permission: " + (hasRecordAudio ? "GRANTED" : "DENIED"));
        Log.d(TAG, "MODIFY_AUDIO_SETTINGS permission: " + (hasModifyAudio ? "GRANTED" : "DENIED"));

        if (!hasRecordAudio || !hasModifyAudio) {
            Log.d(TAG, "🎤 Requesting microphone permissions...");

            // Request permissions
            ActivityCompat.requestPermissions(this,
                new String[]{
                    Manifest.permission.RECORD_AUDIO,
                    Manifest.permission.MODIFY_AUDIO_SETTINGS
                },
                MICROPHONE_PERMISSION_REQUEST_CODE);
        } else {
            Log.d(TAG, "✅ All microphone permissions already granted");
        }
    }

    // ADDED: Handle permission request results
    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);

        if (requestCode == MICROPHONE_PERMISSION_REQUEST_CODE) {
            Log.d(TAG, "🎤 Microphone permission request results:");

            boolean allPermissionsGranted = true;

            for (int i = 0; i < permissions.length; i++) {
                boolean granted = grantResults[i] == PackageManager.PERMISSION_GRANTED;
                Log.d(TAG, "  " + permissions[i] + ": " + (granted ? "GRANTED" : "DENIED"));

                if (!granted) {
                    allPermissionsGranted = false;
                }
            }

            if (allPermissionsGranted) {
                Log.d(TAG, "✅ All microphone permissions granted - voice input should work");

                // Notify the web view that permissions are now available
                getBridge().getWebView().post(() -> {
                    String jsCode = "window.dispatchEvent(new CustomEvent('microphonePermissionGranted', { detail: { granted: true } }));";
                    getBridge().getWebView().evaluateJavascript(jsCode, null);
                });
            } else {
                Log.w(TAG, "❌ Some microphone permissions denied - voice input may not work");

                // Notify the web view that permissions were denied
                getBridge().getWebView().post(() -> {
                    String jsCode = "window.dispatchEvent(new CustomEvent('microphonePermissionDenied', { detail: { granted: false } }));";
                    getBridge().getWebView().evaluateJavascript(jsCode, null);
                });
            }
        }
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        handleShareIntent(intent);
    }

    // Your existing share intent handling (unchanged)
    private void handleShareIntent(Intent intent) {
        if (intent == null) {
            Log.d(TAG, "handleShareIntent: Intent is null");
            return;
        }

        String action = intent.getAction();
        String type = intent.getType();

        Log.d(TAG, "Intent received - Action: " + action + ", Type: " + type);

        Bundle extras = intent.getExtras();
        if (extras != null) {
            Log.d(TAG, "Share intent contains extras:");
            for (String key : extras.keySet()) {
                Object value = extras.get(key);
                Log.d(TAG, "  " + key + ": " + value);
            }

            String title = extras.getString(Intent.EXTRA_TITLE);
            String subject = extras.getString(Intent.EXTRA_SUBJECT);
            String htmlText = extras.getString(Intent.EXTRA_HTML_TEXT);

            if (title != null || subject != null || htmlText != null) {
                Log.d(TAG, "Key metadata found:");
                if (title != null) Log.d(TAG, "  Title: " + title);
                if (subject != null) Log.d(TAG, "  Subject: " + subject);
                if (htmlText != null) Log.d(TAG, "  HTML: " + htmlText.substring(0, Math.min(200, htmlText.length())) + "...");
            }
        } else {
            Log.d(TAG, "No extras found in share intent - Facebook is only sending the URL");
        }

        if (Intent.ACTION_SEND.equals(action) && "text/plain".equals(type)) {
            String sharedText = intent.getStringExtra(Intent.EXTRA_TEXT);
            Log.d(TAG, "Android received share: " + sharedText);

            if (sharedText != null && !sharedText.isEmpty()) {
                Log.d(TAG, "Sending to webview: " + sharedText);

                getBridge().getWebView().post(() -> {
                    String jsCode = String.format(
                        "console.log('📱 Android share received in webview: %s'); window.dispatchEvent(new CustomEvent('shareReceived', { detail: { url: '%s', source: 'android_share' } }));",
                        sharedText.replace("'", "\\'").replace("\"", "\\\""),
                        sharedText.replace("'", "\\'").replace("\"", "\\\"")
                    );
                    Log.d(TAG, "Executing JS: " + jsCode);
                    getBridge().getWebView().evaluateJavascript(jsCode, null);
                });
            } else {
                Log.w(TAG, "Shared text is null or empty");
            }
        }
        else if (Intent.ACTION_VIEW.equals(action)) {
            android.net.Uri data = intent.getData();
            if (data != null) {
                String url = data.toString();
                Log.d(TAG, "Android received URL: " + url);

                getBridge().getWebView().post(() -> {
                    String jsCode = String.format(
                        "window.dispatchEvent(new CustomEvent('shareReceived', { detail: { url: '%s', source: 'android_url' } }));",
                        url.replace("'", "\\'").replace("\"", "\\\"")
                    );
                    getBridge().getWebView().evaluateJavascript(jsCode, null);
                });
            }
        }
    }

    // FIXED: Use only non-deprecated APIs for Android 15+
    private void setupEdgeToEdgeAndroid15() {
        Window window = getWindow();

        Log.d(TAG, "Setting up Android 15+ compatible edge-to-edge (no deprecated APIs)");

        // ALWAYS use AndroidX WindowCompat - works on all API levels and avoids deprecated APIs
        WindowCompat.setDecorFitsSystemWindows(window, false);

        // Use AndroidX WindowInsetsControllerCompat (non-deprecated)
        WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(window, window.getDecorView());
        if (controller != null) {
            // Set light system bars using non-deprecated AndroidX APIs
            controller.setAppearanceLightStatusBars(true);
            controller.setAppearanceLightNavigationBars(true);

            // ADDED: Prevent system UI from hiding automatically
            controller.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
        }

        // Handle window insets properly for all Android versions
        View decorView = window.getDecorView();
        decorView.setOnApplyWindowInsetsListener((view, insets) -> {
            androidx.core.graphics.Insets systemBars =
                WindowInsetsCompat.toWindowInsetsCompat(insets).getInsets(WindowInsetsCompat.Type.systemBars());

            // Apply minimal padding to avoid system bars overlapping content
            view.setPadding(0, systemBars.top, 0, 0);

            return insets;
        });

        Log.d(TAG, "Edge-to-edge setup complete using AndroidX APIs only");
    }

    // Enhanced large screen support for Android 16
    private void setupLargeScreenSupport() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            Log.d(TAG, "Setting up large screen support for Android 16");

            // Enhanced task description for multi-window
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                setTaskDescription(new android.app.ActivityManager.TaskDescription(
                    "Doc Bear's Comfort Kitchen"
                    // Removed deprecated icon and color parameters for Android 15+
                ));
            } else {
                // Legacy support for older versions
                setTaskDescription(new android.app.ActivityManager.TaskDescription(
                    "Doc Bear's Comfort Kitchen",
                    null,
                    Color.WHITE
                ));
            }
        }
    }

    // REMOVED: onResume and onWindowFocusChanged calls to setupEdgeToEdgeAndroid15()
    // These were causing redundant calls and potential issues
    // The setup in onCreate() is sufficient for modern Android versions
}