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
import com.librarybook.app.data.model.Library;

import java.util.List;

public class LibraryAdapter extends RecyclerView.Adapter<LibraryAdapter.LibraryViewHolder> {

    private List<Library> libraries;
    private final Context context;

    public LibraryAdapter(List<Library> libraries, Context context) {
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
        Library library = libraries.get(position);
        
        holder.tvLibraryName.setText(library.getName());
        holder.tvLibraryLocation.setText(String.format("%s, %s", library.getArea(), library.getCity()));
        holder.ratingBar.setRating((float) library.getAverageRating());
        holder.tvRating.setText(String.format("%.1f (%d)", library.getAverageRating(), library.getTotalRatings()));
        
        // Load library image
        if (library.getImages() != null && !library.getImages().isEmpty()) {
            Glide.with(context)
                    .load(library.getImages().get(0))
                    .placeholder(R.drawable.placeholder_library)
                    .error(R.drawable.placeholder_library)
                    .centerCrop()
                    .into(holder.ivLibrary);
        } else {
            holder.ivLibrary.setImageResource(R.drawable.placeholder_library);
        }
        
        // Set click listener for book now button
        holder.btnBookNow.setOnClickListener(v -> {
            Intent intent = new Intent(context, LibraryDetailsActivity.class);
            intent.putExtra("libraryId", library.getId());
            context.startActivity(intent);
        });
        
        // Set click listener for the whole item
        holder.itemView.setOnClickListener(v -> {
            Intent intent = new Intent(context, LibraryDetailsActivity.class);
            intent.putExtra("libraryId", library.getId());
            context.startActivity(intent);
        });
    }

    @Override
    public int getItemCount() {
        return libraries != null ? libraries.size() : 0;
    }
    
    public void updateLibraries(List<Library> newLibraries) {
        this.libraries = newLibraries;
        notifyDataSetChanged();
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