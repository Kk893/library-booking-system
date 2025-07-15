package com.librarybook.app.data.api;

import com.librarybook.app.data.model.LoginRequest;
import com.librarybook.app.data.model.LoginResponse;
import com.librarybook.app.data.model.User;

import java.util.List;
import java.util.Map;

import retrofit2.Call;
import retrofit2.http.Body;
import retrofit2.http.GET;
import retrofit2.http.POST;
import retrofit2.http.Query;

public interface ApiService {

    // Auth Endpoints
    @POST("api/auth/login")
    Call<LoginResponse> login(@Body LoginRequest loginRequest);

    @GET("api/auth/me")
    Call<User> getCurrentUser();

    // Library Endpoints
    @GET("api/libraries")
    Call<List<Map<String, Object>>> getAllLibraries();

    @GET("api/libraries/nearby")
    Call<List<Map<String, Object>>> getNearbyLibraries(
            @Query("lat") double latitude,
            @Query("lng") double longitude,
            @Query("radius") int radius
    );

    @GET("api/libraries/popular")
    Call<List<Map<String, Object>>> getPopularLibraries();

    @GET("api/libraries/recent")
    Call<List<Map<String, Object>>> getRecentLibraries();

    @GET("api/libraries/top-rated")
    Call<List<Map<String, Object>>> getTopRatedLibraries();

    // Admin Endpoints
    @GET("api/admin/dashboard")
    Call<Map<String, Object>> getAdminDashboard();
}