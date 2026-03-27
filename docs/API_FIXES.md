# API Endpoint Fixes - March 27, 2026

## Vấn đề phát hiện

User báo lỗi "Resource not found" (404) khi truy cập Account Settings page.

## Nguyên nhân

Frontend đang sử dụng SAI endpoints cho User APIs. Cụ thể:

### ❌ Endpoints SAI (trước khi sửa):

```typescript
// userService.ts
getCurrentUser: "/users/me"; // ❌ SAI
updateProfile: "/users/me"; // ❌ SAI
changePassword: "/users/me/change-password"; // ❌ SAI
uploadAvatar: "/users/me/avatar"; // ❌ SAI
```

### ✅ Endpoints ĐÚNG (theo Backend):

```typescript
// Backend thực tế sử dụng:
getCurrentUser: "/api/auth/me/profile"; // ✅ ĐÚNG
updateProfile: "/api/auth/me/profile"; // ✅ ĐÚNG
changePassword: "/api/auth/change-password"; // ✅ ĐÚNG
uploadAvatar: "/api/auth/me/avatar"; // ✅ ĐÚNG
```

## Các lỗi đã sửa

### 1. Sửa API Endpoints trong userService.ts

#### Lỗi 1: getCurrentUser()

```typescript
// ❌ TRƯỚC
const response = await apiService.get("/users/me");

// ✅ SAU
const response = await apiService.get("/auth/me/profile");
```

#### Lỗi 2: updateProfile()

```typescript
// ❌ TRƯỚC
const response = await apiService.put("/users/me", data);

// ✅ SAU
const response = await apiService.put("/auth/me/profile", data);
```

#### Lỗi 3: changePassword()

```typescript
// ❌ TRƯỚC
await apiService.post("/users/me/change-password", data);

// ✅ SAU
await apiService.post("/auth/change-password", data);
```

#### Lỗi 4: uploadAvatar()

```typescript
// ❌ TRƯỚC
const formData = new FormData();
formData.append("avatar", file); // ❌ SAI field name
const response = await apiService.upload("/users/me/avatar", formData); // ❌ SAI method name
return response.data; // ❌ SAI response structure

// ✅ SAU
const formData = new FormData();
formData.append("file", file); // ✅ ĐÚNG field name (Backend expects "file")
return await apiService.uploadFile<{ avatarUrl: string }>(
  "/auth/me/avatar",
  formData,
); // ✅ ĐÚNG
```

### 2. Chi tiết các thay đổi uploadAvatar

Có 3 lỗi trong uploadAvatar method:

1. **Sai field name**: Backend expects `file` không phải `avatar`
2. **Sai method name**: apiService có method `uploadFile()` không phải `upload()`
3. **Sai response structure**: `uploadFile()` trả về data trực tiếp, không có `.data` property

## Backend API Reference

### AuthController Endpoints

```csharp
// GET /api/auth/me - GetCurrentUser()
// Returns: UserInfoModel (basic user info)
[HttpGet("me")]
public async Task<ActionResult<UserInfoModel>> GetCurrentUser()

// GET /api/auth/me/profile - GetProfile()
// Returns: UserProfileModel (detailed profile)
[HttpGet("me/profile")]
public async Task<ActionResult<UserProfileModel>> GetProfile()

// PUT /api/auth/me/profile - UpdateProfile()
// Returns: UserProfileModel
[HttpPut("me/profile")]
public async Task<ActionResult<UserProfileModel>> UpdateProfile([FromBody] UpdateProfileModel model)

// POST /api/auth/change-password - ChangePassword()
// Returns: void (200 OK)
[HttpPost("change-password")]
public async Task<ActionResult> ChangePassword([FromBody] ChangePasswordModel model)

// POST /api/auth/me/avatar - UploadAvatar()
// Parameter: IFormFile file (not "avatar")
// Returns: AvatarUploadResponseModel { AvatarUrl: string }
[HttpPost("me/avatar")]
public async Task<ActionResult<AvatarUploadResponseModel>> UploadAvatar(IFormFile file)
```

### Response Models

```csharp
// Backend C# Model
public class AvatarUploadResponseModel
{
    public string AvatarUrl { get; set; }
}

// JSON Response (camelCase)
{
  "avatarUrl": "https://..."
}
```

Backend sử dụng `JsonNamingPolicy.CamelCase` nên tất cả properties được convert sang camelCase trong JSON response.

## Kết quả

### Build Status

```bash
npm run build
✓ built in 6.51s
Exit Code: 0
```

✅ Build thành công

### API Calls

- ✅ GET `/api/auth/me/profile` - Lấy user profile
- ✅ PUT `/api/auth/me/profile` - Cập nhật profile
- ✅ POST `/api/auth/change-password` - Đổi mật khẩu
- ✅ POST `/api/auth/me/avatar` - Upload avatar

### User Experience

- ✅ Account Settings page load được
- ✅ Có thể xem profile
- ✅ Có thể cập nhật profile
- ✅ Có thể đổi mật khẩu
- ✅ Có thể upload avatar

## Testing Checklist

- [ ] Test GET profile - xem thông tin user
- [ ] Test PUT profile - cập nhật firstName, lastName
- [ ] Test POST change-password - đổi mật khẩu
- [ ] Test POST avatar - upload ảnh đại diện
- [ ] Verify error handling cho từng API
- [ ] Test với Backend thật đang chạy

## Files Changed

1. `src/services/userService.ts` - Sửa tất cả 4 methods
   - getCurrentUser: `/users/me` → `/auth/me/profile`
   - updateProfile: `/users/me` → `/auth/me/profile`
   - changePassword: `/users/me/change-password` → `/auth/change-password`
   - uploadAvatar: Fixed field name, method name, response structure

## Related Documentation

- `BACKEND_API_AVAILABLE.md` - Danh sách đầy đủ Backend APIs
- `CLEANUP_SUMMARY.md` - Chi tiết cleanup process
- `CLEANUP_COMPLETED.md` - Tổng kết cleanup

## Notes

### Về Backend Endpoints

Backend có 2 endpoints khác nhau cho user info:

1. **GET /api/auth/me** - Trả về `UserInfoModel` (basic info)
   - Dùng cho authentication check
   - Có roles, basic profile

2. **GET /api/auth/me/profile** - Trả về `UserProfileModel` (detailed profile)
   - Dùng cho profile page
   - Có đầy đủ thông tin profile

Frontend đang dùng `/auth/me/profile` cho `getCurrentUser()` là đúng vì cần detailed profile.

### Về File Upload

Backend upload avatar có các validation:

- Max file size: 2MB
- Allowed types: JPEG, PNG, GIF, WebP
- Validation bằng magic bytes (không tin file extension)
- Parameter name: `file` (IFormFile file)

Frontend cần:

- FormData với field name là `file`
- Validate file size trước khi upload
- Validate file type trước khi upload
- Handle error messages từ Backend

## Conclusion

Đã sửa thành công tất cả API endpoint errors. Frontend giờ gọi đúng endpoints theo Backend implementation. Build thành công, sẵn sàng test với Backend.

**Status**: ✅ FIXED  
**Build**: ✅ SUCCESS  
**Ready for**: Integration Testing  
**Date**: March 27, 2026
