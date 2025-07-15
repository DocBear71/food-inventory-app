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

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private static final String TAG = "MainActivity";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // FIXED: Comprehensive system bar setup for all Android versions
        setupEdgeToEdge();

        // ADD: Handle share intent on app launch
        handleShareIntent(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);

        // ADD: Handle share intent when app is already running
        handleShareIntent(intent);
    }

    // FIXED: Share intent handling method - removed debug popups
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
            // Log extras for debugging (console only, no popup)
            Log.d(TAG, "Share intent contains extras:");
            for (String key : extras.keySet()) {
                Object value = extras.get(key);
                Log.d(TAG, "  " + key + ": " + value);
            }

            // Look for specific extras
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
            // Log that no extras were found (no popup)
            Log.d(TAG, "No extras found in share intent - Facebook is only sending the URL");
        }

        // Handle text share (like Facebook URLs)
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

        // Handle URL intents (direct Facebook links)
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

    // EXISTING: Your edge-to-edge setup (unchanged)
    private void setupEdgeToEdge() {
        Window window = getWindow();

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            // Android 11+ (API 30+) - Use WindowInsetsController
            window.setDecorFitsSystemWindows(false);

            WindowInsetsController controller = window.getInsetsController();
            if (controller != null) {
                // Set light status bar (dark icons)
                controller.setSystemBarsAppearance(
                    WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS |
                    WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS,
                    WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS |
                    WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS
                );
            }

        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            // Android 6-10 (API 23-29)
            window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
            window.clearFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_STATUS);
            window.clearFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_NAVIGATION);

            View decorView = window.getDecorView();
            int flags = decorView.getSystemUiVisibility();

            // Light status bar
            flags |= View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;

            // Light navigation bar (API 26+)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                flags |= View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
            }

            decorView.setSystemUiVisibility(flags);
        }

        // Set semi-transparent system bars
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            window.setStatusBarColor(Color.argb(64, 0, 0, 0)); // 25% black
            window.setNavigationBarColor(Color.argb(64, 0, 0, 0)); // 25% black
        }
    }

    @Override
    public void onResume() {
        super.onResume();
        // Reapply edge-to-edge when app resumes
        setupEdgeToEdge();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            // Ensure edge-to-edge is maintained when window gains focus
            setupEdgeToEdge();
        }
    }
}