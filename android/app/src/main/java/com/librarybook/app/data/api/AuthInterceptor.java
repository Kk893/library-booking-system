package com.librarybook.app.data.api;

import android.text.TextUtils;

import com.librarybook.app.LibraryBookApplication;
import com.librarybook.app.util.PreferenceManager;

import java.io.IOException;

import okhttp3.Interceptor;
import okhttp3.Request;
import okhttp3.Response;

public class AuthInterceptor implements Interceptor {
    
    @Override
    public Response intercept(Chain chain) throws IOException {
        Request original = chain.request();
        
        // Get token from shared preferences
        PreferenceManager preferenceManager = new PreferenceManager(LibraryBookApplication.getAppContext());
        String token = preferenceManager.getToken();
        
        // If token exists, add it to the header
        if (!TextUtils.isEmpty(token)) {
            Request.Builder requestBuilder = original.newBuilder()
                    .header("Authorization", "Bearer " + token)
                    .header("Accept", "application/json")
                    .method(original.method(), original.body());
            
            Request request = requestBuilder.build();
            return chain.proceed(request);
        }
        
        return chain.proceed(original);
    }
}