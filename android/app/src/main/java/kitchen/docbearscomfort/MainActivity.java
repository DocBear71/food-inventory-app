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
                // BUILD DEBUG INFO FOR ALERT
                StringBuilder debugInfo = new StringBuilder("🔍 FACEBOOK SHARE METADATA:\n\n");

                for (String key : extras.keySet()) {
                    Object value = extras.get(key);
                    debugInfo.append("📦 ").append(key).append(":\n   ").append(value).append("\n\n");
                }

                // Look for specific extras
                String title = extras.getString(Intent.EXTRA_TITLE);
                String subject = extras.getString(Intent.EXTRA_SUBJECT);
                String htmlText = extras.getString(Intent.EXTRA_HTML_TEXT);

                if (title != null || subject != null || htmlText != null) {
                    debugInfo.append("🎯 KEY METADATA:\n");
                    if (title != null) debugInfo.append("Title: ").append(title).append("\n");
                    if (subject != null) debugInfo.append("Subject: ").append(subject).append("\n");
                    if (htmlText != null) debugInfo.append("HTML: ").append(htmlText.substring(0, Math.min(200, htmlText.length()))).append("...\n");
                }

                // SHOW ALERT WITH ALL METADATA
                try {
                    this.runOnUiThread(() -> {
                        android.app.AlertDialog.Builder builder = new android.app.AlertDialog.Builder(this);
                        builder.setTitle("🔍 Facebook Share Debug");
                        builder.setMessage(debugInfo.toString());
                        builder.setPositiveButton("OK", null);
                        builder.setNegativeButton("Copy", (dialog, which) -> {
                            android.content.ClipboardManager clipboard = (android.content.ClipboardManager) getSystemService(CLIPBOARD_SERVICE);
                            android.content.ClipData clip = android.content.ClipData.newPlainText("Debug", debugInfo.toString());
                            clipboard.setPrimaryClip(clip);
                        });
                        builder.show();
                    });
                } catch (Exception e) {
                    System.out.println("❌ Error showing alert: " + e.getMessage());
                }

                // CONSOLE LOGS (backup)
                for (String key : extras.keySet()) {
                    Object value = extras.get(key);
                    System.out.println("📦 Share extra - " + key + ": " + value);
                }
            } else {
                // Show alert even if no extras
                this.runOnUiThread(() -> {
                    android.app.AlertDialog.Builder builder = new android.app.AlertDialog.Builder(this);
                    builder.setTitle("🔍 Facebook Share Debug");
                    builder.setMessage("❌ No extras found in share intent!\n\nThis means Facebook is only sending the URL, not recipe metadata.");
                    builder.setPositiveButton("OK", null);
                    builder.show();
                });
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