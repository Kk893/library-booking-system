package com.librarybook.app.data.model;

import com.google.gson.annotations.SerializedName;

import java.io.Serializable;
import java.util.List;

public class Booking implements Serializable {
    
    @SerializedName("_id")
    private String id;
    
    @SerializedName("userId")
    private String userId;
    
    @SerializedName("libraryId")
    private String libraryId;
    
    @SerializedName("bookingType")
    private String bookingType; // "seat" or "book"
    
    @SerializedName("bookingDate")
    private String bookingDate;
    
    @SerializedName("startTime")
    private String startTime;
    
    @SerializedName("endTime")
    private String endTime;
    
    @SerializedName("status")
    private String status; // "confirmed", "pending", "cancelled", "completed"
    
    @SerializedName("seatId")
    private String seatId;
    
    @SerializedName("bookId")
    private String bookId;
    
    @SerializedName("paymentId")
    private String paymentId;
    
    @SerializedName("amount")
    private double amount;
    
    @SerializedName("qrCode")
    private String qrCode;
    
    @SerializedName("createdAt")
    private String createdAt;
    
    @SerializedName("updatedAt")
    private String updatedAt;
    
    @SerializedName("user")
    private User user;
    
    @SerializedName("library")
    private Library library;
    
    @SerializedName("book")
    private Book book;
    
    @SerializedName("seat")
    private Library.Seat seat;

    // Getters and Setters
    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public String getLibraryId() {
        return libraryId;
    }

    public void setLibraryId(String libraryId) {
        this.libraryId = libraryId;
    }

    public String getBookingType() {
        return bookingType;
    }

    public void setBookingType(String bookingType) {
        this.bookingType = bookingType;
    }

    public String getBookingDate() {
        return bookingDate;
    }

    public void setBookingDate(String bookingDate) {
        this.bookingDate = bookingDate;
    }

    public String getStartTime() {
        return startTime;
    }

    public void setStartTime(String startTime) {
        this.startTime = startTime;
    }

    public String getEndTime() {
        return endTime;
    }

    public void setEndTime(String endTime) {
        this.endTime = endTime;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getSeatId() {
        return seatId;
    }

    public void setSeatId(String seatId) {
        this.seatId = seatId;
    }

    public String getBookId() {
        return bookId;
    }

    public void setBookId(String bookId) {
        this.bookId = bookId;
    }

    public String getPaymentId() {
        return paymentId;
    }

    public void setPaymentId(String paymentId) {
        this.paymentId = paymentId;
    }

    public double getAmount() {
        return amount;
    }

    public void setAmount(double amount) {
        this.amount = amount;
    }

    public String getQrCode() {
        return qrCode;
    }

    public void setQrCode(String qrCode) {
        this.qrCode = qrCode;
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

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public Library getLibrary() {
        return library;
    }

    public void setLibrary(Library library) {
        this.library = library;
    }

    public Book getBook() {
        return book;
    }

    public void setBook(Book book) {
        this.book = book;
    }

    public Library.Seat getSeat() {
        return seat;
    }

    public void setSeat(Library.Seat seat) {
        this.seat = seat;
    }
}