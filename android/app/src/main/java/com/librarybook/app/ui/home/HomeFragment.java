package com.librarybook.app.ui.home;

import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import androidx.recyclerview.widget.LinearLayoutManager;

import com.librarybook.app.data.api.ApiClient;
import com.librarybook.app.data.api.ApiService;
import com.librarybook.app.databinding.FragmentHomeBinding;
import com.librarybook.app.ui.library.LibraryAdapter;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class HomeFragment extends Fragment {

    private FragmentHomeBinding binding;
    private ApiService apiService;
    private LibraryAdapter nearbyAdapter;
    private LibraryAdapter popularAdapter;
    private LibraryAdapter recentAdapter;
    private LibraryAdapter topRatedAdapter;

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        binding = FragmentHomeBinding.inflate(inflater, container, false);
        return binding.getRoot();
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);
        
        apiService = ApiClient.getClient().create(ApiService.class);
        
        setupRecyclerViews();
        fetchLibraries();
    }

    private void setupRecyclerViews() {
        // Setup RecyclerViews with horizontal layout
        binding.rvNearbyLibraries.setLayoutManager(new LinearLayoutManager(requireContext(), LinearLayoutManager.HORIZONTAL, false));
        binding.rvPopularLibraries.setLayoutManager(new LinearLayoutManager(requireContext(), LinearLayoutManager.HORIZONTAL, false));
        binding.rvRecentLibraries.setLayoutManager(new LinearLayoutManager(requireContext(), LinearLayoutManager.HORIZONTAL, false));
        binding.rvTopRatedLibraries.setLayoutManager(new LinearLayoutManager(requireContext(), LinearLayoutManager.HORIZONTAL, false));
        
        // Initialize adapters
        nearbyAdapter = new LibraryAdapter(new ArrayList<>(), requireContext());
        popularAdapter = new LibraryAdapter(new ArrayList<>(), requireContext());
        recentAdapter = new LibraryAdapter(new ArrayList<>(), requireContext());
        topRatedAdapter = new LibraryAdapter(new ArrayList<>(), requireContext());
        
        // Set adapters
        binding.rvNearbyLibraries.setAdapter(nearbyAdapter);
        binding.rvPopularLibraries.setAdapter(popularAdapter);
        binding.rvRecentLibraries.setAdapter(recentAdapter);
        binding.rvTopRatedLibraries.setAdapter(topRatedAdapter);
    }

    private void fetchLibraries() {
        // Fetch nearby libraries
        apiService.getAllLibraries().enqueue(new Callback<List<Map<String, Object>>>() {
            @Override
            public void onResponse(Call<List<Map<String, Object>>> call, Response<List<Map<String, Object>>> response) {
                if (response.isSuccessful() && response.body() != null) {
                    nearbyAdapter.updateLibraries(response.body());
                }
            }

            @Override
            public void onFailure(Call<List<Map<String, Object>>> call, Throwable t) {
                Toast.makeText(requireContext(), "Failed to load libraries", Toast.LENGTH_SHORT).show();
            }
        });
        
        // Fetch popular libraries
        apiService.getPopularLibraries().enqueue(new Callback<List<Map<String, Object>>>() {
            @Override
            public void onResponse(Call<List<Map<String, Object>>> call, Response<List<Map<String, Object>>> response) {
                if (response.isSuccessful() && response.body() != null) {
                    popularAdapter.updateLibraries(response.body());
                }
            }

            @Override
            public void onFailure(Call<List<Map<String, Object>>> call, Throwable t) {
                // Handle error
            }
        });
        
        // Fetch recent libraries
        apiService.getRecentLibraries().enqueue(new Callback<List<Map<String, Object>>>() {
            @Override
            public void onResponse(Call<List<Map<String, Object>>> call, Response<List<Map<String, Object>>> response) {
                if (response.isSuccessful() && response.body() != null) {
                    recentAdapter.updateLibraries(response.body());
                }
            }

            @Override
            public void onFailure(Call<List<Map<String, Object>>> call, Throwable t) {
                // Handle error
            }
        });
        
        // Fetch top rated libraries
        apiService.getTopRatedLibraries().enqueue(new Callback<List<Map<String, Object>>>() {
            @Override
            public void onResponse(Call<List<Map<String, Object>>> call, Response<List<Map<String, Object>>> response) {
                if (response.isSuccessful() && response.body() != null) {
                    topRatedAdapter.updateLibraries(response.body());
                }
            }

            @Override
            public void onFailure(Call<List<Map<String, Object>>> call, Throwable t) {
                // Handle error
            }
        });
    }

    @Override
    public void onDestroyView() {
        super.onDestroyView();
        binding = null;
    }
}