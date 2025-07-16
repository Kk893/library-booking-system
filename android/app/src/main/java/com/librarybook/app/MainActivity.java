package com.librarybook.app;

import android.content.Intent;
import android.os.Bundle;
import android.view.MenuItem;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.fragment.app.Fragment;

import com.google.android.material.bottomnavigation.BottomNavigationView;
import com.librarybook.app.databinding.ActivityMainBinding;
import com.librarybook.app.ui.auth.LoginActivity;
import com.librarybook.app.ui.booking.BookingsFragment;
import com.librarybook.app.ui.home.HomeFragment;
import com.librarybook.app.ui.library.LibrariesFragment;
import com.librarybook.app.ui.user.ProfileFragment;
import com.librarybook.app.util.PreferenceManager;

public class MainActivity extends AppCompatActivity {

    private ActivityMainBinding binding;
    private PreferenceManager preferenceManager;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        binding = ActivityMainBinding.inflate(getLayoutInflater());
        setContentView(binding.getRoot());

        preferenceManager = new PreferenceManager(this);

        binding.bottomNavigation.setOnItemSelectedListener(navListener);

        // Set default fragment
        if (savedInstanceState == null) {
            getSupportFragmentManager().beginTransaction()
                    .replace(R.id.fragment_container, new HomeFragment())
                    .commit();
        }
    }

    private final BottomNavigationView.OnItemSelectedListener navListener =
            new BottomNavigationView.OnItemSelectedListener() {
                @Override
                public boolean onNavigationItemSelected(@NonNull MenuItem item) {
                    Fragment selectedFragment = null;
                    int itemId = item.getItemId();

                    if (itemId == R.id.nav_home) {
                        selectedFragment = new HomeFragment();
                    } else if (itemId == R.id.nav_libraries) {
                        selectedFragment = new LibrariesFragment();
                    } else if (itemId == R.id.nav_bookings) {
                        // Check if user is logged in for bookings
                        if (!preferenceManager.isLoggedIn()) {
                            startActivity(new Intent(MainActivity.this, LoginActivity.class));
                            return false;
                        }
                        selectedFragment = new BookingsFragment();
                    } else if (itemId == R.id.nav_profile) {
                        // Check if user is logged in for profile
                        if (!preferenceManager.isLoggedIn()) {
                            startActivity(new Intent(MainActivity.this, LoginActivity.class));
                            return false;
                        }
                        selectedFragment = new ProfileFragment();
                    }

                    if (selectedFragment != null) {
                        getSupportFragmentManager().beginTransaction()
                                .replace(R.id.fragment_container, selectedFragment)
                                .commit();
                    }

                    return true;
                }
            };
}