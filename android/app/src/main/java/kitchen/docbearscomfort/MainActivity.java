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

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

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

    // ADD: Share intent handling method
    private void handleShareIntent(Intent intent) {
        if (intent == null) {
            System.out.println("🔍 handleShareIntent: Intent is null");
            return;
        }

        String action = intent.getAction();
        String type = intent.getType();

        System.out.println("🔍 Intent received:");
        System.out.println("  Action: " + action);
        System.out.println("  Type: " + type);

        Bundle extras = intent.getExtras();
            if (extras != null) {
                System.out.println("📦 ALL SHARE EXTRAS:");
                for (String key : extras.keySet()) {
                    Object value = extras.get(key);
                    System.out.println("  " + key + ": " + value);
                }

                // Standard Android extras
                String title = extras.getString(Intent.EXTRA_TITLE);
                String subject = extras.getString(Intent.EXTRA_SUBJECT);
                String htmlText = extras.getString(Intent.EXTRA_HTML_TEXT);
                String stream = extras.getString(Intent.EXTRA_STREAM);

                System.out.println("📋 PARSED EXTRAS:");
                System.out.println("  Title: " + title);
                System.out.println("  Subject: " + subject);
                System.out.println("  HTML: " + htmlText);
                System.out.println("  Stream: " + stream);

                // BUILD RICH SHARE DATA
                JSONObject shareMetadata = new JSONObject();
                try {
                    shareMetadata.put("url", intent.getStringExtra(Intent.EXTRA_TEXT));
                    shareMetadata.put("title", title);
                    shareMetadata.put("subject", subject);
                    shareMetadata.put("htmlText", htmlText);
                    shareMetadata.put("stream", stream);

                    // Add all extras as metadata
                    JSONObject extrasJson = new JSONObject();
                    for (String key : extras.keySet()) {
                        Object value = extras.get(key);
                        if (value != null) {
                            extrasJson.put(key, value.toString());
                        }
                    }
                    shareMetadata.put("extras", extrasJson);

                } catch (Exception e) {
                    System.out.println("❌ Error building share metadata: " + e.getMessage());
                }

                System.out.println("🎯 FINAL SHARE METADATA: " + shareMetadata.toString());
            }

            // Handle text share (like Facebook URLs)
            if (Intent.ACTION_SEND.equals(action) && "text/plain".equals(type)) {
                String sharedText = intent.getStringExtra(Intent.EXTRA_TEXT);
                System.out.println("📱 Android received share: " + sharedText);

                if (sharedText != null && !sharedText.isEmpty()) {
                    System.out.println("🚀 Sending to webview: " + sharedText);

                    getBridge().getWebView().post(() -> {
                        // SEND ALL THE METADATA TO JAVASCRIPT
                        String allMetadata = "";
                        if (extras != null) {
                            try {
                                JSONObject jsMetadata = new JSONObject();
                                jsMetadata.put("url", sharedText);
                                jsMetadata.put("title", extras.getString(Intent.EXTRA_TITLE));
                                jsMetadata.put("subject", extras.getString(Intent.EXTRA_SUBJECT));
                                jsMetadata.put("htmlText", extras.getString(Intent.EXTRA_HTML_TEXT));
                                allMetadata = jsMetadata.toString().replace("'", "\\'").replace("\"", "\\\"");
                            } catch (Exception e) {
                                allMetadata = "{}";
                            }
                        }

                        String jsCode = String.format(
                            "console.log('📱 Android share with metadata:', %s); window.dispatchEvent(new CustomEvent('shareReceived', { detail: { url: '%s', source: 'android_share', metadata: %s } }));",
                            allMetadata,
                            sharedText.replace("'", "\\'").replace("\"", "\\\""),
                            allMetadata
                        );
                        System.out.println("🔧 Executing JS: " + jsCode);
                        getBridge().getWebView().evaluateJavascript(jsCode, null);
                    });
                }
            }
        }

        // Handle text share (like Facebook URLs)
        if (Intent.ACTION_SEND.equals(action) && "text/plain".equals(type)) {
            String sharedText = intent.getStringExtra(Intent.EXTRA_TEXT);
            System.out.println("📱 Android received share: " + sharedText);

            if (sharedText != null && !sharedText.isEmpty()) {
                // ADD: More debug output
                System.out.println("🚀 Sending to webview: " + sharedText);

                getBridge().getWebView().post(() -> {
                    String jsCode = String.format(
                        "console.log('📱 Android share received in webview: %s'); window.dispatchEvent(new CustomEvent('shareReceived', { detail: { url: '%s', source: 'android_share' } }));",
                        sharedText.replace("'", "\\'").replace("\"", "\\\""),
                        sharedText.replace("'", "\\'").replace("\"", "\\\"")
                    );
                    System.out.println("🔧 Executing JS: " + jsCode);
                    getBridge().getWebView().evaluateJavascript(jsCode, null);
                });
            } else {
                System.out.println("❌ Shared text is null or empty");
            }
        }

        // Handle URL intents (direct Facebook links)
        else if (Intent.ACTION_VIEW.equals(action)) {
            android.net.Uri data = intent.getData();
            if (data != null) {
                String url = data.toString();
                System.out.println("📱 Android received URL: " + url);

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