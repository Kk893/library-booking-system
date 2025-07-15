package com.librarybook.app.data.api;

import com.librarybook.app.data.model.Book;
import com.librarybook.app.data.model.Booking;
import com.librarybook.app.data.model.Library;
import com.librarybook.app.data.model.LoginRequest;
import com.librarybook.app.data.model.LoginResponse;
import com.librarybook.app.data.model.RegisterRequest;
import com.librarybook.app.data.model.RegisterResponse;
import com.librarybook.app.data.model.User;

import java.util.List;

import retrofit2.Call;
import retrofit2.http.Body;
import retrofit2.http.DELETE;
import retrofit2.http.GET;
import retrofit2.http.POST;
import retrofit2.http.PUT;
import retrofit2.http.Path;
import retrofit2.http.Query;

public interface ApiService {

    // Auth Endpoints
    @POST("api/auth/login")
    Call<LoginResponse> login(@Body LoginRequest loginRequest);

    @POST("api/auth/register")
    Call<RegisterResponse> register(@Body RegisterRequest registerRequest);

    @POST("api/auth/forgot-password")
    Call<Void> forgotPassword(@Body String email);

    @GET("api/auth/me")
    Call<User> getCurrentUser();

    // Library Endpoints
    @GET("api/libraries")
    Call<List<Library>> getAllLibraries();

    @GET("api/libraries/nearby")
    Call<List<Library>> getNearbyLibraries(
            @Query("lat") double latitude,
            @Query("lng") double longitude,
            @Query("radius") int radius
    );

    @GET("api/libraries/popular")
    Call<List<Library>> getPopularLibraries();

    @GET("api/libraries/recent")
    Call<List<Library>> getRecentLibraries();

    @GET("api/libraries/top-rated")
    Call<List<Library>> getTopRatedLibraries();

    @GET("api/libraries/{id}")
    Call<Library> getLibraryDetails(@Path("id") String libraryId);

    // Book Endpoints
    @GET("api/books")
    Call<List<Book>> getAllBooks();

    @GET("api/books/{id}")
    Call<Book> getBookDetails(@Path("id") String bookId);

    @GET("api/books/search")
    Call<List<Book>> searchBooks(@Query("query") String query);

    // Booking Endpoints
    @GET("api/user/bookings")
    Call<List<Booking>> getUserBookings();

    @POST("api/bookings/seats")
    Call<Booking> bookSeat(@Body Booking booking);

    @POST("api/bookings/books")
    Call<Booking> bookBook(@Body Booking booking);

    @PUT("api/user/bookings/{id}/cancel")
    Call<Booking> cancelBooking(@Path("id") String bookingId);

    // Admin Endpoints
    @GET("api/admin/dashboard")
    Call<Object> getAdminDashboard();

    @GET("api/admin/bookings")
    Call<List<Booking>> getAdminBookings();

    @GET("api/admin/books")
    Call<List<Book>> getAdminBooks();

    @POST("api/admin/books")
    Call<Book> addBook(@Body Book book);

    @PUT("api/admin/books/{id}")
    Call<Book> updateBook(@Path("id") String bookId, @Body Book book);

    @DELETE("api/admin/books/{id}")
    Call<Void> deleteBook(@Path("id") String bookId);

    // Super Admin Endpoints
    @GET("api/admin/libraries")
    Call<List<Library>> getAdminLibraries();

    @POST("api/admin/libraries")
    Call<Library> addLibrary(@Body Library library);

    @PUT("api/admin/libraries/{id}")
    Call<Library> updateLibrary(@Path("id") String libraryId, @Body Library library);

    @DELETE("api/admin/libraries/{id}")
    Call<Void> deleteLibrary(@Path("id") String libraryId);

    @GET("api/admin/users")
    Call<List<User>> getAdminUsers();

    @POST("api/admin/create-admin")
    Call<User> createAdmin(@Body User user);
}