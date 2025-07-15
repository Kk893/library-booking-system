package com.librarybook.app.ui.library;

import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import androidx.recyclerview.widget.GridLayoutManager;

import com.librarybook.app.data.api.ApiClient;
import com.librarybook.app.data.api.ApiService;
import com.librarybook.app.databinding.FragmentLibrariesBinding;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class LibrariesFragment extends Fragment {

    private FragmentLibrariesBinding binding;
    private ApiService apiService;
    private LibraryGridAdapter adapter;

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        binding = FragmentLibrariesBinding.inflate(inflater, container, false);
        return binding.getRoot();
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);
        
        apiService = ApiClient.getClient().create(ApiService.class);
        
        setupRecyclerView();
        fetchLibraries();
    }

    private void setupRecyclerView() {
        binding.rvLibraries.setLayoutManager(new GridLayoutManager(requireContext(), 2));
        adapter = new LibraryGridAdapter(new ArrayList<>(), requireContext());
        binding.rvLibraries.setAdapter(adapter);
    }

    private void fetchLibraries() {
        binding.progressBar.setVisibility(View.VISIBLE);
        
        apiService.getAllLibraries().enqueue(new Callback<List<Map<String, Object>>>() {
            @Override
            public void onResponse(Call<List<Map<String, Object>>> call, Response<List<Map<String, Object>>> response) {
                binding.progressBar.setVisibility(View.GONE);
                
                if (response.isSuccessful() && response.body() != null) {
                    adapter.updateLibraries(response.body());
                    
                    if (response.body().isEmpty()) {
                        binding.tvNoLibraries.setVisibility(View.VISIBLE);
                    } else {
                        binding.tvNoLibraries.setVisibility(View.GONE);
                    }
                } else {
                    binding.tvNoLibraries.setVisibility(View.VISIBLE);
                }
            }

            @Override
            public void onFailure(Call<List<Map<String, Object>>> call, Throwable t) {
                binding.progressBar.setVisibility(View.GONE);
                binding.tvNoLibraries.setVisibility(View.VISIBLE);
                Toast.makeText(requireContext(), "Failed to load libraries", Toast.LENGTH_SHORT).show();
            }
        });
    }

    @Override
    public void onDestroyView() {
        super.onDestroyView();
        binding = null;
    }
}