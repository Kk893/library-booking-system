package com.librarybook.app.ui.library;

import android.content.Context;
import android.content.Intent;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.ImageView;
import android.widget.RatingBar;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;

import com.bumptech.glide.Glide;
import com.librarybook.app.R;

import java.util.List;
import java.util.Map;

public class LibraryAdapter extends RecyclerView.Adapter<LibraryAdapter.LibraryViewHolder> {

    private List<Map<String, Object>> libraries;
    private final Context context;

    public LibraryAdapter(List<Map<String, Object>> libraries, Context context) {
        this.libraries = libraries;
        this.context = context;
    }

    @NonNull
    @Override
    public LibraryViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_library, parent, false);
        return new LibraryViewHolder(view);
    }

    @Override
    public void onBindViewHolder(@NonNull LibraryViewHolder holder, int position) {
        Map<String, Object> library = libraries.get(position);
        
        holder.tvLibraryName.setText(String.valueOf(library.get("name")));
        
        String area = String.valueOf(library.get("area"));
        String city = String.valueOf(library.get("city"));
        holder.tvLibraryLocation.setText(String.format("%s, %s", area, city));
        
        // Set rating if available
        if (library.containsKey("rating")) {
            double rating = Double.parseDouble(String.valueOf(library.get("rating")));
            holder.ratingBar.setRating((float) rating);
            
            // Set rating text with count if available
            if (library.containsKey("ratingCount")) {
                int ratingCount = Integer.parseInt(String.valueOf(library.get("ratingCount")));
                holder.tvRating.setText(String.format("%.1f (%d)", rating, ratingCount));
            } else {
                holder.tvRating.setText(String.format("%.1f", rating));
            }
        } else {
            holder.ratingBar.setRating(0);
            holder.tvRating.setText("New");
        }
        
        // Load library image if available
        if (library.containsKey("images") && library.get("images") instanceof List) {
            List<String> images = (List<String>) library.get("images");
            if (images != null && !images.isEmpty()) {
                Glide.with(context)
                        .load(images.get(0))
                        .placeholder(R.drawable.ic_launcher_foreground)
                        .error(R.drawable.ic_launcher_foreground)
                        .centerCrop()
                        .into(holder.ivLibrary);
            }
        }
        
        // Set click listener for book now button
        holder.btnBookNow.setOnClickListener(v -> {
            String libraryId = String.valueOf(library.get("_id"));
            Intent intent = new Intent(context, LibraryDetailsActivity.class);
            intent.putExtra("libraryId", libraryId);
            context.startActivity(intent);
        });
        
        // Set click listener for the whole item
        holder.itemView.setOnClickListener(v -> {
            String libraryId = String.valueOf(library.get("_id"));
            Intent intent = new Intent(context, LibraryDetailsActivity.class);
            intent.putExtra("libraryId", libraryId);
            context.startActivity(intent);
        });
    }

    @Override
    public int getItemCount() {
        return libraries != null ? libraries.size() : 0;
    }
    
    public void updateLibraries(List<Map<String, Object>> newLibraries) {
        this.libraries = newLibraries;
        notifyDataSetChanged();
    }
    
    public List<Map<String, Object>> getLibraries() {
        return libraries;
    }

    static class LibraryViewHolder extends RecyclerView.ViewHolder {
        ImageView ivLibrary;
        TextView tvLibraryName;
        TextView tvLibraryLocation;
        RatingBar ratingBar;
        TextView tvRating;
        Button btnBookNow;

        LibraryViewHolder(@NonNull View itemView) {
            super(itemView);
            ivLibrary = itemView.findViewById(R.id.iv_library);
            tvLibraryName = itemView.findViewById(R.id.tv_library_name);
            tvLibraryLocation = itemView.findViewById(R.id.tv_library_location);
            ratingBar = itemView.findViewById(R.id.rating_bar);
            tvRating = itemView.findViewById(R.id.tv_rating);
            btnBookNow = itemView.findViewById(R.id.btn_book_now);
        }
    }
}