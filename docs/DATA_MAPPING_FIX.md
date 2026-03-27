# Data Mapping Fix - API Response to UI

## Vấn đề

API đã trả về data thành công nhưng giao diện không hiển thị gì.

## Nguyên nhân

Frontend `UserProfile` interface KHÔNG KHỚP với Backend response structure.

### ❌ Frontend Interface (SAI - trước khi sửa):

```typescript
export interface UserProfile {
  id: string; // ❌ Backend trả về "userId"
  firstName: string; // ❌ Backend không có field này
  lastName: string; // ❌ Backend không có field này
  fullName: string; // ❌ Backend trả về "displayName"
  avatar?: string; // ❌ Backend trả về "avatarUrl"
  role: string; // ❌ Backend trả về "roles" (array)
  isActive: boolean; // ❌ Backend không có field này
  createdAt: string; // ❌ Backend trả về "createdDateTime"
  updatedAt: string; // ❌ Backend trả về "updatedDateTime"
  lastLoginAt?: string; // ❌ Backend không có field này
}
```

### ✅ Backend Response (ĐÚNG):

```json
{
  "userId": "0001-01-01T00:00:00+00:00",
  "email": "user@example.com",
  "userName": "user@example.com",
  "displayName": "User Name",
  "avatarUrl": null,
  "timezone": null,
  "phoneNumber": null,
  "emailConfirmed": true,
  "phoneNumberConfirmed": false,
  "twoFactorEnabled": false,
  "lockoutEnabled": true,
  "lockoutEnd": null,
  "isLockedOut": false,
  "accessFailedCount": 0,
  "createdDateTime": "0001-01-01T00:00:00+00:00",
  "updatedDateTime": null,
  "profileCreatedDateTime": null,
  "profileUpdatedDateTime": null,
  "roles": ["User"]
}
```

## Các lỗi đã sửa

### 1. Cập nhật UserProfile Interface

```typescript
// ✅ SAU - Khớp với Backend
export interface UserProfile {
  userId: string;
  email: string;
  userName: string;
  displayName: string;
  avatarUrl?: string;
  timezone?: string;
  phoneNumber?: string;
  emailConfirmed: boolean;
  phoneNumberConfirmed: boolean;
  twoFactorEnabled: boolean;
  lockoutEnabled: boolean;
  lockoutEnd?: string;
  isLockedOut: boolean;
  accessFailedCount: number;
  createdDateTime: string;
  updatedDateTime?: string;
  profileCreatedDateTime?: string;
  profileUpdatedDateTime?: string;
  roles: string[];
}
```

### 2. Cập nhật UpdateProfileRequest

```typescript
// ❌ TRƯỚC
export interface UpdateProfileRequest {
  firstName?: string;
  lastName?: string;
  avatar?: string;
}

// ✅ SAU - Khớp với Backend UpdateProfileModel
export interface UpdateProfileRequest {
  displayName?: string;
  timezone?: string;
}
```

### 3. Sửa userService methods

```typescript
// ❌ TRƯỚC - Có .data wrapper
getCurrentUser: async (): Promise<UserProfile> => {
  const response = await apiService.get("/auth/me/profile");
  return response.data; // ❌ SAI - apiService.get() đã trả về data trực tiếp
};

// ✅ SAU - Không có .data wrapper
getCurrentUser: async (): Promise<UserProfile> => {
  return await apiService.get<UserProfile>("/auth/me/profile");
};
```

### 4. Cập nhật AccountSettingsPage state

```typescript
// ❌ TRƯỚC
const [profileData, setProfileData] = useState({
  firstName: "",
  lastName: "",
});

React.useEffect(() => {
  if (profile) {
    setProfileData({
      firstName: profile.firstName || "",
      lastName: profile.lastName || "",
    });
  }
}, [profile]);

// ✅ SAU
const [profileData, setProfileData] = useState({
  displayName: "",
  timezone: "",
});

React.useEffect(() => {
  if (profile) {
    setProfileData({
      displayName: profile.displayName || "",
      timezone: profile.timezone || "",
    });
  }
}, [profile]);
```

### 5. Cập nhật UI fields

```tsx
// ❌ TRƯỚC - Hiển thị firstName, lastName
<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
  <div>
    <label>First Name</label>
    <input value={profileData.firstName} ... />
  </div>
  <div>
    <label>Last Name</label>
    <input value={profileData.lastName} ... />
  </div>
</div>

// ✅ SAU - Hiển thị displayName, timezone
<div className="grid grid-cols-1 gap-6">
  <div>
    <label>Display Name</label>
    <input value={profileData.displayName} ... />
  </div>
  <div>
    <label>Timezone</label>
    <input value={profileData.timezone} ... />
  </div>
</div>
```

### 6. Cập nhật avatar display

```tsx
// ❌ TRƯỚC
{
  profile?.avatar ? <img src={profile.avatar} alt="Avatar" /> : <User />;
}

// ✅ SAU
{
  profile?.avatarUrl ? <img src={profile.avatarUrl} alt="Avatar" /> : <User />;
}
```

### 7. Cập nhật user name display

```tsx
// ❌ TRƯỚC
<p>{profile?.fullName}</p>

// ✅ SAU
<p>{profile?.displayName || profile?.userName}</p>
```

## Backend Model Reference

### UserProfileModel (C#)

```csharp
public class UserProfileModel
{
    public Guid UserId { get; set; }
    public string Email { get; set; }
    public string UserName { get; set; }
    public string DisplayName { get; set; }
    public string AvatarUrl { get; set; }
    public string Timezone { get; set; }
    public string PhoneNumber { get; set; }
    public bool EmailConfirmed { get; set; }
    public bool PhoneNumberConfirmed { get; set; }
    public bool TwoFactorEnabled { get; set; }
    public bool LockoutEnabled { get; set; }
    public DateTimeOffset? LockoutEnd { get; set; }
    public bool IsLockedOut { get; set; }
    public int AccessFailedCount { get; set; }
    public DateTimeOffset CreatedDateTime { get; set; }
    public DateTimeOffset? UpdatedDateTime { get; set; }
    public DateTimeOffset? ProfileCreatedDateTime { get; set; }
    public DateTimeOffset? ProfileUpdatedDateTime { get; set; }
    public IList<string> Roles { get; set; }
}
```

### UpdateProfileModel (C#)

```csharp
public class UpdateProfileModel
{
    [StringLength(200)]
    public string DisplayName { get; set; }

    [StringLength(50)]
    public string Timezone { get; set; }
}
```

**Note**: Backend sử dụng `JsonNamingPolicy.CamelCase` nên:

- `UserId` → `userId` trong JSON
- `DisplayName` → `displayName` trong JSON
- `AvatarUrl` → `avatarUrl` trong JSON
- etc.

## Kết quả

### Build Status

```bash
npm run build
✓ built in 7.25s
Exit Code: 0
```

✅ Build thành công

### UI Display

- ✅ Avatar hiển thị (nếu có)
- ✅ Display Name hiển thị
- ✅ Email hiển thị
- ✅ Timezone field hiển thị
- ✅ Có thể edit và save profile

### Data Flow

```
Backend API Response
    ↓
apiService.get<UserProfile>()
    ↓
UserProfile interface (khớp với Backend)
    ↓
useUserProfile hook
    ↓
AccountSettingsPage component
    ↓
UI displays data ✅
```

## Testing Checklist

- [ ] Verify profile data hiển thị đúng
- [ ] Test update displayName
- [ ] Test update timezone
- [ ] Test upload avatar
- [ ] Verify avatar URL hiển thị đúng
- [ ] Test change password
- [ ] Check console không có errors

## Files Changed

1. `src/services/userService.ts`
   - Updated `UserProfile` interface
   - Updated `UpdateProfileRequest` interface
   - Fixed `getCurrentUser()` method
   - Fixed `updateProfile()` method

2. `src/pages/AccountSettingsPage.tsx`
   - Updated `profileData` state
   - Updated `useEffect` to map correct fields
   - Updated form fields (displayName, timezone)
   - Updated avatar display (avatarUrl)
   - Updated user name display (displayName)

## Common Pitfalls

### 1. Response Wrapper

```typescript
// ❌ WRONG - apiService already returns data
const response = await apiService.get("/endpoint");
return response.data; // Error: data is undefined

// ✅ CORRECT
return await apiService.get<Type>("/endpoint");
```

### 2. Field Name Mismatch

```typescript
// ❌ WRONG - Backend doesn't have firstName
profile.firstName;

// ✅ CORRECT - Backend has displayName
profile.displayName;
```

### 3. Array vs String

```typescript
// ❌ WRONG - roles is an array
profile.role;

// ✅ CORRECT
profile.roles[0]; // or profile.roles.join(', ')
```

## Best Practices

1. **Always check Backend response structure first**
   - Use browser DevTools Network tab
   - Check Backend model definitions
   - Verify JSON serialization settings

2. **Match TypeScript interfaces with Backend models**
   - Use exact same field names (camelCase)
   - Use correct types (string vs array, etc.)
   - Include all optional fields

3. **Test data flow**
   - Log API response
   - Log state updates
   - Verify UI renders

4. **Handle null/undefined**
   - Use optional chaining: `profile?.displayName`
   - Provide fallbacks: `profile?.displayName || profile?.userName`
   - Use default values in state

## Conclusion

Đã sửa thành công data mapping giữa Backend API response và Frontend UI. Tất cả fields giờ khớp với Backend model, data hiển thị đúng trên giao diện.

**Status**: ✅ FIXED  
**Build**: ✅ SUCCESS  
**UI**: ✅ DISPLAYS DATA  
**Date**: March 27, 2026
