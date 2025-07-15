package com.librarybook.app.ui.auth;

import android.content.Intent;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;

import androidx.appcompat.app.AppCompatActivity;

import com.librarybook.app.MainActivity;
import com.librarybook.app.R;
import com.librarybook.app.ui.admin.AdminDashboardActivity;
import com.librarybook.app.util.PreferenceManager;

public class SplashActivity extends AppCompatActivity {

    private static final long SPLASH_DELAY = 2000; // 2 seconds
    private PreferenceManager preferenceManager;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_splash);

        preferenceManager = new PreferenceManager(this);

        new Handler(Looper.getMainLooper()).postDelayed(this::checkUserLoginStatus, SPLASH_DELAY);
    }

    private void checkUserLoginStatus() {
        if (preferenceManager.isLoggedIn()) {
            // Check user role
            if (preferenceManager.getUserData() != null && 
                    ("admin".equals(preferenceManager.getUserData().getRole()) || 
                     "superadmin".equals(preferenceManager.getUserData().getRole()))) {
                // Navigate to admin dashboard
                startActivity(new Intent(SplashActivity.this, AdminDashboardActivity.class));
            } else {
                // Navigate to main activity
                startActivity(new Intent(SplashActivity.this, MainActivity.class));
            }
        } else {
            // Navigate to login
            startActivity(new Intent(SplashActivity.this, LoginActivity.class));
        }
        finish();
    }
}