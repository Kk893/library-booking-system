package com.librarybook.app.ui.admin;

import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;

import com.librarybook.app.R;
import com.librarybook.app.data.api.ApiClient;
import com.librarybook.app.data.api.ApiService;
import com.librarybook.app.util.PreferenceManager;

import org.json.JSONException;
import org.json.JSONObject;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class AdminHomeFragment extends Fragment {

    private TextView tvTotalBookings;
    private TextView tvTotalRevenue;
    private TextView tvTotalBooks;
    private TextView tvTotalUsers;
    private ApiService apiService;
    private PreferenceManager preferenceManager;

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        View view = inflater.inflate(R.layout.fragment_admin_home, container, false);
        
        apiService = ApiClient.getClient().create(ApiService.class);
        preferenceManager = new PreferenceManager(requireContext());
        
        initViews(view);
        fetchDashboardData();
        
        return view;
    }

    private void initViews(View view) {
        tvTotalBookings = view.findViewById(R.id.tv_total_bookings);
        tvTotalRevenue = view.findViewById(R.id.tv_total_revenue);
        tvTotalBooks = view.findViewById(R.id.tv_total_books);
        tvTotalUsers = view.findViewById(R.id.tv_total_users);
    }

    private void fetchDashboardData() {
        apiService.getAdminDashboard().enqueue(new Callback<Object>() {
            @Override
            public void onResponse(Call<Object> call, Response<Object> response) {
                if (response.isSuccessful() && response.body() != null) {
                    try {
                        JSONObject dashboardData = new JSONObject(response.body().toString());
                        
                        // Update UI with dashboard data
                        tvTotalBookings.setText(dashboardData.optString("totalBookings", "0"));
                        tvTotalRevenue.setText("₹" + dashboardData.optString("totalRevenue", "0"));
                        tvTotalBooks.setText(dashboardData.optString("totalBooks", "0"));
                        tvTotalUsers.setText(dashboardData.optString("totalUsers", "0"));
                        
                    } catch (JSONException e) {
                        e.printStackTrace();
                    }
                }
            }

            @Override
            public void onFailure(Call<Object> call, Throwable t) {
                // Handle error
            }
        });
    }
}