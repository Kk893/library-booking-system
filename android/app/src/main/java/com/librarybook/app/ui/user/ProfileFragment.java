package com.librarybook.app.ui.user;

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
import com.librarybook.app.databinding.FragmentProfileBinding;
import com.librarybook.app.ui.auth.LoginActivity;
import com.librarybook.app.util.PreferenceManager;

public class ProfileFragment extends Fragment {

    private FragmentProfileBinding binding;
    private PreferenceManager preferenceManager;

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        binding = FragmentProfileBinding.inflate(inflater, container, false);
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
        
        setupUserInfo();
        setupListeners();
    }

    private void setupUserInfo() {
        if (preferenceManager.getUserData() != null) {
            binding.tvUserName.setText(preferenceManager.getUserData().getName());
            binding.tvUserEmail.setText(preferenceManager.getUserData().getEmail());
            binding.tvUserPhone.setText(preferenceManager.getUserData().getPhone());
        }
    }

    private void setupListeners() {
        binding.tvEditProfile.setOnClickListener(v -> {
            Toast.makeText(requireContext(), "Edit Profile coming soon!", Toast.LENGTH_SHORT).show();
        });
        
        binding.tvChangePassword.setOnClickListener(v -> {
            Toast.makeText(requireContext(), "Change Password coming soon!", Toast.LENGTH_SHORT).show();
        });
        
        binding.tvSettings.setOnClickListener(v -> {
            Toast.makeText(requireContext(), "Settings coming soon!", Toast.LENGTH_SHORT).show();
        });
        
        binding.btnLogout.setOnClickListener(v -> {
            preferenceManager.clearUserData();
            Toast.makeText(requireContext(), "Logged out successfully", Toast.LENGTH_SHORT).show();
            
            // Go back to home tab
            if (getActivity() != null) {
                getActivity().findViewById(R.id.nav_home).performClick();
            }
        });
    }

    @Override
    public void onDestroyView() {
        super.onDestroyView();
        binding = null;
    }
}