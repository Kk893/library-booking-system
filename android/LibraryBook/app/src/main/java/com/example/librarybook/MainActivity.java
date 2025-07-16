package com.example.librarybook;

import android.annotation.SuppressLint;
import android.os.Bundle;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;
import androidx.appcompat.app.AppCompatActivity;

public class MainActivity extends AppCompatActivity {
    private WebView webView;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        // Initialize WebView
        webView = findViewById(R.id.webView);
        
        // Configure WebView settings
        WebSettings webSettings = webView.getSettings();
        webSettings.setJavaScriptEnabled(true);
        webSettings.setDomStorageEnabled(true);
        webSettings.setCacheMode(WebSettings.LOAD_CACHE_ELSE_NETWORK);
        webSettings.setRenderPriority(WebSettings.RenderPriority.HIGH);
        
        // Set WebViewClient to handle all URLs within the WebView
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                // Show error message if the page fails to load
                if (request.isForMainFrame()) {
                    Toast.makeText(MainActivity.this, "Cannot load page. Check your internet connection.", Toast.LENGTH_SHORT).show();
                }
            }
        });
        
        // Load your frontend URL - replace with your actual URL
        webView.loadUrl("https://librarybook-demo.netlify.app");
    }

    @Override
    public void onBackPressed() {
        // Handle back button press to navigate back in WebView
        if (webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}