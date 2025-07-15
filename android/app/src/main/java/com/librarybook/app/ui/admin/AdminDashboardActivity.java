package com.librarybook.app.ui.admin;

import android.os.Bundle;
import android.view.MenuItem;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.appcompat.app.ActionBarDrawerToggle;
import androidx.appcompat.app.AppCompatActivity;
import androidx.appcompat.widget.Toolbar;
import androidx.core.view.GravityCompat;
import androidx.drawerlayout.widget.DrawerLayout;
import androidx.fragment.app.Fragment;

import com.google.android.material.navigation.NavigationView;
import com.librarybook.app.R;
import com.librarybook.app.data.model.User;
import com.librarybook.app.util.PreferenceManager;

public class AdminDashboardActivity extends AppCompatActivity implements NavigationView.OnNavigationItemSelectedListener {

    private DrawerLayout drawerLayout;
    private NavigationView navigationView;
    private Toolbar toolbar;
    private PreferenceManager preferenceManager;
    private User currentUser;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_admin_dashboard);

        preferenceManager = new PreferenceManager(this);
        currentUser = preferenceManager.getUserData();

        initViews();
        setupNavigation();
        updateUserInfo();

        // Set default fragment
        if (savedInstanceState == null) {
            getSupportFragmentManager().beginTransaction()
                    .replace(R.id.admin_fragment_container, new AdminHomeFragment())
                    .commit();
            navigationView.setCheckedItem(R.id.nav_admin_dashboard);
        }
    }

    private void initViews() {
        toolbar = findViewById(R.id.toolbar);
        setSupportActionBar(toolbar);

        drawerLayout = findViewById(R.id.drawer_layout);
        navigationView = findViewById(R.id.nav_view);
    }

    private void setupNavigation() {
        ActionBarDrawerToggle toggle = new ActionBarDrawerToggle(
                this, drawerLayout, toolbar,
                R.string.navigation_drawer_open,
                R.string.navigation_drawer_close);
        drawerLayout.addDrawerListener(toggle);
        toggle.syncState();

        navigationView.setNavigationItemSelectedListener(this);

        // Show/hide menu items based on user role
        if (currentUser != null && "superadmin".equals(currentUser.getRole())) {
            navigationView.getMenu().findItem(R.id.nav_manage_admins).setVisible(true);
            navigationView.getMenu().findItem(R.id.nav_manage_libraries).setVisible(true);
        } else {
            navigationView.getMenu().findItem(R.id.nav_manage_admins).setVisible(false);
            navigationView.getMenu().findItem(R.id.nav_manage_libraries).setVisible(false);
        }
    }

    private void updateUserInfo() {
        if (currentUser != null) {
            TextView tvUserName = navigationView.getHeaderView(0).findViewById(R.id.tv_user_name);
            TextView tvUserEmail = navigationView.getHeaderView(0).findViewById(R.id.tv_user_email);
            TextView tvUserRole = navigationView.getHeaderView(0).findViewById(R.id.tv_user_role);

            tvUserName.setText(currentUser.getName());
            tvUserEmail.setText(currentUser.getEmail());
            tvUserRole.setText(currentUser.getRole());
        }
    }

    @Override
    public boolean onNavigationItemSelected(@NonNull MenuItem item) {
        Fragment selectedFragment = null;
        String title = "";

        switch (item.getItemId()) {
            case R.id.nav_admin_dashboard:
                selectedFragment = new AdminHomeFragment();
                title = "Dashboard";
                break;
            case R.id.nav_manage_books:
                selectedFragment = new ManageBooksFragment();
                title = "Manage Books";
                break;
            case R.id.nav_manage_bookings:
                selectedFragment = new ManageBookingsFragment();
                title = "Manage Bookings";
                break;
            case R.id.nav_manage_offers:
                selectedFragment = new ManageOffersFragment();
                title = "Manage Offers";
                break;
            case R.id.nav_manage_admins:
                selectedFragment = new ManageAdminsFragment();
                title = "Manage Admins";
                break;
            case R.id.nav_manage_libraries:
                selectedFragment = new ManageLibrariesFragment();
                title = "Manage Libraries";
                break;
            case R.id.nav_admin_settings:
                selectedFragment = new AdminSettingsFragment();
                title = "Settings";
                break;
            case R.id.nav_admin_logout:
                logout();
                return true;
        }

        if (selectedFragment != null) {
            getSupportFragmentManager().beginTransaction()
                    .replace(R.id.admin_fragment_container, selectedFragment)
                    .commit();
            
            if (!title.isEmpty()) {
                getSupportActionBar().setTitle(title);
            }
        }

        drawerLayout.closeDrawer(GravityCompat.START);
        return true;
    }

    private void logout() {
        preferenceManager.clearUserData();
        finish();
    }

    @Override
    public void onBackPressed() {
        if (drawerLayout.isDrawerOpen(GravityCompat.START)) {
            drawerLayout.closeDrawer(GravityCompat.START);
        } else {
            super.onBackPressed();
        }
    }
}