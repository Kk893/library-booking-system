package com.librarybook.app.ui.booking;

import android.content.Intent;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;

import com.librarybook.app.R;
import com.librarybook.app.databinding.FragmentBookingsBinding;
import com.librarybook.app.ui.auth.LoginActivity;
import com.librarybook.app.util.PreferenceManager;

public class BookingsFragment extends Fragment {

    private FragmentBookingsBinding binding;
    private PreferenceManager preferenceManager;

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        binding = FragmentBookingsBinding.inflate(inflater, container, false);
        return binding.getRoot();
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);
        
        preferenceManager = new PreferenceManager(requireContext());
        
        // Check if user is logged in
        if (!preferenceManager.isLoggedIn()) {
            // This should not happen as MainActivity should redirect to login
            // But just in case, redirect to login
            Intent intent = new Intent(requireContext(), LoginActivity.class);
            startActivity(intent);
            if (getActivity() != null) {
                getActivity().findViewById(R.id.nav_home).performClick();
            }
            return;
        }
        
        // Show empty state for now
        binding.tvNoBookings.setVisibility(View.VISIBLE);
        
        // Setup tabs
        binding.tabLayout.addTab(binding.tabLayout.newTab().setText("Upcoming"));
        binding.tabLayout.addTab(binding.tabLayout.newTab().setText("Past"));
        binding.tabLayout.addTab(binding.tabLayout.newTab().setText("Cancelled"));
        
        binding.tabLayout.addOnTabSelectedListener(new com.google.android.material.tabs.TabLayout.OnTabSelectedListener() {
            @Override
            public void onTabSelected(com.google.android.material.tabs.TabLayout.Tab tab) {
                // In a real app, we would load different bookings based on tab
                Toast.makeText(requireContext(), tab.getText() + " bookings", Toast.LENGTH_SHORT).show();
            }

            @Override
            public void onTabUnselected(com.google.android.material.tabs.TabLayout.Tab tab) {
                // Not needed
            }

            @Override
            public void onTabReselected(com.google.android.material.tabs.TabLayout.Tab tab) {
                // Not needed
            }
        });
    }

    @Override
    public void onDestroyView() {
        super.onDestroyView();
        binding = null;
    }
}