package com.librarybook.app.ui.user;

import android.content.Intent;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;

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
        binding.btnLogout.setOnClickListener(v -> {
            preferenceManager.clearUserData();
            Intent intent = new Intent(requireContext(), LoginActivity.class);
            intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
            startActivity(intent);
        });
    }

    @Override
    public void onDestroyView() {
        super.onDestroyView();
        binding = null;
    }
}