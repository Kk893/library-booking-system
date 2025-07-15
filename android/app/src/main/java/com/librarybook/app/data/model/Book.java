package com.librarybook.app.data.model;

import com.google.gson.annotations.SerializedName;

import java.io.Serializable;
import java.util.List;

public class Book implements Serializable {
    
    @SerializedName("_id")
    private String id;
    
    @SerializedName("title")
    private String title;
    
    @SerializedName("author")
    private String author;
    
    @SerializedName("description")
    private String description;
    
    @SerializedName("isbn")
    private String isbn;
    
    @SerializedName("category")
    private String category;
    
    @SerializedName("coverImage")
    private String coverImage;
    
    @SerializedName("libraryId")
    private String libraryId;
    
    @SerializedName("isAvailable")
    private boolean isAvailable;
    
    @SerializedName("totalCopies")
    private int totalCopies;
    
    @SerializedName("availableCopies")
    private int availableCopies;
    
    @SerializedName("publishedYear")
    private int publishedYear;
    
    @SerializedName("publisher")
    private String publisher;
    
    @SerializedName("language")
    private String language;
    
    @SerializedName("pages")
    private int pages;
    
    @SerializedName("tags")
    private List<String> tags;
    
    @SerializedName("createdAt")
    private String createdAt;
    
    @SerializedName("updatedAt")
    private String updatedAt;

    // Getters and Setters
    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getAuthor() {
        return author;
    }

    public void setAuthor(String author) {
        this.author = author;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getIsbn() {
        return isbn;
    }

    public void setIsbn(String isbn) {
        this.isbn = isbn;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public String getCoverImage() {
        return coverImage;
    }

    public void setCoverImage(String coverImage) {
        this.coverImage = coverImage;
    }

    public String getLibraryId() {
        return libraryId;
    }

    public void setLibraryId(String libraryId) {
        this.libraryId = libraryId;
    }

    public boolean isAvailable() {
        return isAvailable;
    }

    public void setAvailable(boolean available) {
        isAvailable = available;
    }

    public int getTotalCopies() {
        return totalCopies;
    }

    public void setTotalCopies(int totalCopies) {
        this.totalCopies = totalCopies;
    }

    public int getAvailableCopies() {
        return availableCopies;
    }

    public void setAvailableCopies(int availableCopies) {
        this.availableCopies = availableCopies;
    }

    public int getPublishedYear() {
        return publishedYear;
    }

    public void setPublishedYear(int publishedYear) {
        this.publishedYear = publishedYear;
    }

    public String getPublisher() {
        return publisher;
    }

    public void setPublisher(String publisher) {
        this.publisher = publisher;
    }

    public String getLanguage() {
        return language;
    }

    public void setLanguage(String language) {
        this.language = language;
    }

    public int getPages() {
        return pages;
    }

    public void setPages(int pages) {
        this.pages = pages;
    }

    public List<String> getTags() {
        return tags;
    }

    public void setTags(List<String> tags) {
        this.tags = tags;
    }

    public String getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(String createdAt) {
        this.createdAt = createdAt;
    }

    public String getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(String updatedAt) {
        this.updatedAt = updatedAt;
    }
}