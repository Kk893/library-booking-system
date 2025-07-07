# 🔐 Library Booking System - Privilege Hierarchy

## Overview
The system now implements a comprehensive **3-tier privilege hierarchy** where higher-level users can manage content created by lower-level users, but not vice versa.

## 🏗️ Privilege Hierarchy

```
SuperAdmin (Level 3) 👑
    ↓ can manage
Admin (Level 2) 🛡️
    ↓ can manage  
User (Level 1) 👤
```

## 📋 Privilege Rules

### ✅ **SuperAdmin Privileges**
- Can create, modify, and delete **ALL** content
- Can manage Admin and User accounts
- Can create new Admins
- Can modify Libraries created by anyone
- Can modify Books created by Admins or Users
- Can deactivate any user account
- **Cannot be managed by Admins**

### ✅ **Admin Privileges**
- Can create, modify, and delete content created by **Users**
- Can modify their **own** content
- Can manage User accounts (not SuperAdmin accounts)
- Can create Books and manage library content
- **Cannot modify SuperAdmin content**
- **Cannot create SuperAdmins**
- **Cannot manage other Admins**

### ✅ **User Privileges**
- Can only modify their **own** content
- Can update their own profile
- Can manage their own bookings
- **Cannot modify Admin or SuperAdmin content**
- **Cannot change their role**

## 🛡️ Security Features

### 1. **Privilege Escalation Prevention**
```javascript
// Users cannot promote themselves
// Admins cannot create SuperAdmins
// Only SuperAdmins can create Admins
```

### 2. **Resource Modification Control**
```javascript
// Check who created the resource
// Compare privilege levels
// Allow modification only if current user >= creator level
```

### 3. **Audit Logging**
```javascript
// All privilege actions are logged
// Track who modified what and when
// Maintain lastModifiedBy field
```

## 🔧 Implementation Details

### Database Schema Updates
All models now include:
- `createdBy`: Reference to user who created the resource
- `lastModifiedBy`: Reference to user who last modified
- `privilegeLevel`: Numeric level for quick comparisons

### Middleware Functions
- `requireRole(minRole)`: Require minimum role level
- `checkModifyPermission(Model)`: Check if user can modify resource
- `canManageUser`: Check if user can manage another user
- `preventPrivilegeEscalation`: Prevent role promotion abuse
- `logPrivilegeAction(action)`: Log privilege-sensitive actions

## 📝 Usage Examples

### Creating Content
```javascript
// SuperAdmin creates library
POST /api/admin/libraries
// Sets createdBy: superadmin_id

// Admin creates book  
POST /api/admin/books
// Sets createdBy: admin_id
```

### Modifying Content
```javascript
// SuperAdmin can modify admin's book ✅
PUT /api/admin/books/:id (created by admin)

// Admin cannot modify superadmin's library ❌
PUT /api/admin/libraries/:id (created by superadmin)
// Returns: 403 Insufficient privileges
```

### User Management
```javascript
// SuperAdmin can deactivate admin ✅
PUT /api/user/users/:adminId { isActive: false }

// Admin cannot manage superadmin ❌
PUT /api/user/users/:superadminId
// Returns: 403 Admins cannot manage superadmins
```

## 🚀 API Endpoints with Privilege Control

### SuperAdmin Only
- `POST /api/admin/libraries` - Create library
- `POST /api/admin/create-admin` - Create admin user
- `DELETE /api/admin/admins/:id` - Remove admin
- `PUT /api/admin/manage-admin-offer/:id` - Modify admin offers

### Admin+ (Admin & SuperAdmin)
- `POST /api/admin/books` - Create book
- `PUT /api/admin/books/:id` - Modify book (with privilege check)
- `GET /api/admin/users` - View users
- `PUT /api/user/users/:userId` - Manage users (with restrictions)

### User+ (All roles)
- `GET /api/user/profile` - View own profile
- `PUT /api/user/profile` - Update own profile
- `GET /api/user/bookings` - View own bookings

## 🔍 Testing the System

### Test Credentials
```
SuperAdmin: superadmin@test.com / password123
Admin: admin@test.com / password123  
User: user@test.com / password123
```

### Test Scenarios
1. **SuperAdmin modifies Admin content** ✅ Should work
2. **Admin modifies SuperAdmin content** ❌ Should fail
3. **User tries to change role** ❌ Should fail
4. **Admin creates SuperAdmin** ❌ Should fail

### Run Test Script
```bash
cd backend
node test-privilege-system.js
```

## 📊 Privilege Matrix

| Action | User | Admin | SuperAdmin |
|--------|------|-------|------------|
| Modify own content | ✅ | ✅ | ✅ |
| Modify user content | ❌ | ✅ | ✅ |
| Modify admin content | ❌ | ❌ | ✅ |
| Create admin | ❌ | ❌ | ✅ |
| Deactivate user | ❌ | ✅ | ✅ |
| Deactivate admin | ❌ | ❌ | ✅ |
| Change own role | ❌ | ❌ | ✅ |

## 🔒 Security Best Practices

1. **Always validate privilege levels** before operations
2. **Log all privilege-sensitive actions** for audit trails
3. **Use middleware consistently** across all routes
4. **Prevent privilege escalation** in all user inputs
5. **Check resource ownership** before modifications

## 🎯 Benefits

- **Secure hierarchy**: Clear privilege boundaries
- **Audit trail**: Track all modifications
- **Flexible permissions**: Easy to extend roles
- **Prevention of abuse**: Multiple security layers
- **Scalable design**: Easy to add new privilege levels

---

**The privilege system ensures that your library booking platform maintains proper access control and prevents unauthorized modifications while providing flexibility for different user roles.**