package com.librarybook.app.ui.home;

import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.librarybook.app.R;
import com.librarybook.app.data.api.ApiClient;
import com.librarybook.app.data.api.ApiService;
import com.librarybook.app.data.model.Library;
import com.librarybook.app.ui.library.LibraryAdapter;
import com.librarybook.app.util.PreferenceManager;

import java.util.ArrayList;
import java.util.List;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class HomeFragment extends Fragment {

    private RecyclerView rvNearbyLibraries;
    private RecyclerView rvPopularLibraries;
    private RecyclerView rvRecentLibraries;
    private RecyclerView rvTopRatedLibraries;
    
    private LibraryAdapter nearbyAdapter;
    private LibraryAdapter popularAdapter;
    private LibraryAdapter recentAdapter;
    private LibraryAdapter topRatedAdapter;
    
    private ApiService apiService;
    private PreferenceManager preferenceManager;

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        View view = inflater.inflate(R.layout.fragment_home, container, false);
        
        apiService = ApiClient.getClient().create(ApiService.class);
        preferenceManager = new PreferenceManager(requireContext());
        
        initViews(view);
        fetchLibraries();
        
        return view;
    }

    private void initViews(View view) {
        // Initialize RecyclerViews
        rvNearbyLibraries = view.findViewById(R.id.rv_nearby_libraries);
        rvPopularLibraries = view.findViewById(R.id.rv_popular_libraries);
        rvRecentLibraries = view.findViewById(R.id.rv_recent_libraries);
        rvTopRatedLibraries = view.findViewById(R.id.rv_top_rated_libraries);
        
        // Setup RecyclerViews
        setupRecyclerView(rvNearbyLibraries);
        setupRecyclerView(rvPopularLibraries);
        setupRecyclerView(rvRecentLibraries);
        setupRecyclerView(rvTopRatedLibraries);
        
        // Initialize adapters
        nearbyAdapter = new LibraryAdapter(new ArrayList<>(), requireContext());
        popularAdapter = new LibraryAdapter(new ArrayList<>(), requireContext());
        recentAdapter = new LibraryAdapter(new ArrayList<>(), requireContext());
        topRatedAdapter = new LibraryAdapter(new ArrayList<>(), requireContext());
        
        // Set adapters
        rvNearbyLibraries.setAdapter(nearbyAdapter);
        rvPopularLibraries.setAdapter(popularAdapter);
        rvRecentLibraries.setAdapter(recentAdapter);
        rvTopRatedLibraries.setAdapter(topRatedAdapter);
    }

    private void setupRecyclerView(RecyclerView recyclerView) {
        recyclerView.setLayoutManager(new LinearLayoutManager(requireContext(), LinearLayoutManager.HORIZONTAL, false));
        recyclerView.setHasFixedSize(true);
    }

    private void fetchLibraries() {
        // Fetch nearby libraries
        apiService.getNearbyLibraries().enqueue(new Callback<List<Library>>() {
            @Override
            public void onResponse(Call<List<Library>> call, Response<List<Library>> response) {
                if (response.isSuccessful() && response.body() != null) {
                    nearbyAdapter.updateLibraries(response.body());
                }
            }

            @Override
            public void onFailure(Call<List<Library>> call, Throwable t) {
                // Handle error
            }
        });
        
        // Fetch popular libraries
        apiService.getPopularLibraries().enqueue(new Callback<List<Library>>() {
            @Override
            public void onResponse(Call<List<Library>> call, Response<List<Library>> response) {
                if (response.isSuccessful() && response.body() != null) {
                    popularAdapter.updateLibraries(response.body());
                }
            }

            @Override
            public void onFailure(Call<List<Library>> call, Throwable t) {
                // Handle error
            }
        });
        
        // Fetch recent libraries
        apiService.getRecentLibraries().enqueue(new Callback<List<Library>>() {
            @Override
            public void onResponse(Call<List<Library>> call, Response<List<Library>> response) {
                if (response.isSuccessful() && response.body() != null) {
                    recentAdapter.updateLibraries(response.body());
                }
            }

            @Override
            public void onFailure(Call<List<Library>> call, Throwable t) {
                // Handle error
            }
        });
        
        // Fetch top rated libraries
        apiService.getTopRatedLibraries().enqueue(new Callback<List<Library>>() {
            @Override
            public void onResponse(Call<List<Library>> call, Response<List<Library>> response) {
                if (response.isSuccessful() && response.body() != null) {
                    topRatedAdapter.updateLibraries(response.body());
                }
            }

            @Override
            public void onFailure(Call<List<Library>> call, Throwable t) {
                // Handle error
            }
        });
    }
}