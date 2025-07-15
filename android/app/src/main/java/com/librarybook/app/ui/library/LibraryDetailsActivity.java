package com.librarybook.app.ui.library;

import android.os.Bundle;
import android.view.View;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;

import com.librarybook.app.R;
import com.librarybook.app.databinding.ActivityLibraryDetailsBinding;

public class LibraryDetailsActivity extends AppCompatActivity {

    private ActivityLibraryDetailsBinding binding;
    private String libraryId;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        binding = ActivityLibraryDetailsBinding.inflate(getLayoutInflater());
        setContentView(binding.getRoot());

        // Get library ID from intent
        libraryId = getIntent().getStringExtra("libraryId");
        if (libraryId == null) {
            Toast.makeText(this, "Library not found", Toast.LENGTH_SHORT).show();
            finish();
            return;
        }

        setupToolbar();
        // In a real app, we would fetch library details here
        // For now, just show a placeholder
        binding.tvLibraryName.setText("Library " + libraryId);
        binding.progressBar.setVisibility(View.GONE);
        binding.contentLayout.setVisibility(View.VISIBLE);
    }

    private void setupToolbar() {
        setSupportActionBar(binding.toolbar);
        if (getSupportActionBar() != null) {
            getSupportActionBar().setDisplayHomeAsUpEnabled(true);
            getSupportActionBar().setDisplayShowHomeEnabled(true);
        }
        binding.toolbar.setNavigationOnClickListener(v -> onBackPressed());
    }
}