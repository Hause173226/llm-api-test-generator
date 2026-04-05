# UI Testing Checklist - Theme & i18n

## CHECKLIST TEST SAU KHI SỬA

### A. TEST LIGHT/DARK MODE

#### 1. Global Components
- [ ] **TopAppBar**
  - [ ] Background color đồng bộ với theme
  - [ ] Text color rõ ràng, dễ đọc
  - [ ] Icons có màu phù hợp
  - [ ] User menu dropdown có background/text đúng
  - [ ] Theme toggle button hoạt động
  - [ ] Language toggle button rõ ràng

- [ ] **Sidebar**
  - [ ] Background color đồng bộ
  - [ ] Active menu item highlight rõ ràng
  - [ ] Hover state có màu phù hợp
  - [ ] Text dễ đọc trong cả 2 mode
  - [ ] Project selector dropdown đúng màu
  - [ ] Border/divider rõ ràng nhưng không quá nổi

- [ ] **Toast Notifications**
  - [ ] Success toast: text rõ ràng, background phù hợp
  - [ ] Error toast: text rõ ràng, background phù hợp
  - [ ] Info toast: text rõ ràng, background phù hợp
  - [ ] Loading toast: text rõ ràng, background phù hợp
  - [ ] Icon colors đúng với theme

#### 2. Pages - Light Mode
- [ ] **Dashboard**
  - [ ] Cards có background/shadow phù hợp
  - [ ] Text trên cards dễ đọc
  - [ ] Charts/graphs có màu rõ ràng
  - [ ] Table headers/rows có contrast tốt
  - [ ] Buttons có màu đúng

- [ ] **Projects Management**
  - [ ] Table có border/background rõ ràng
  - [ ] Status badges có màu phù hợp
  - [ ] Modal có background/text đúng
  - [ ] Form inputs có border rõ ràng

- [ ] **API Specifications**
  - [ ] Upload area có border/background rõ
  - [ ] File list có hover state tốt
  - [ ] Status indicators có màu đúng

- [ ] **Endpoints Management**
  - [ ] Endpoint cards có background tốt
  - [ ] Method badges (GET/POST/etc) có màu rõ
  - [ ] Search input có border/placeholder rõ
  - [ ] Empty state message dễ đọc

- [ ] **Test Suites**
  - [ ] Suite cards có shadow/border phù hợp
  - [ ] Run button có màu nổi bật
  - [ ] Modal form có background/text đúng

- [ ] **Test Runs**
  - [ ] Status badges (success/failed) rõ ràng
  - [ ] Table rows có hover state tốt
  - [ ] Filter dropdowns có background đúng
  - [ ] Progress indicators có màu phù hợp

- [ ] **Reports**
  - [ ] Charts có màu rõ ràng
  - [ ] Metric cards có background/text tốt
  - [ ] Export button rõ ràng

- [ ] **Settings**
  - [ ] Tabs có active state rõ
  - [ ] Form inputs có border/focus state tốt
  - [ ] Save button nổi bật

#### 3. Pages - Dark Mode
Lặp lại tất cả các test trên nhưng trong Dark Mode, đặc biệt chú ý:
- [ ] Không có text sáng trên nền sáng
- [ ] Không có text tối trên nền tối
- [ ] Border không quá mờ hoặc quá đậm
- [ ] Shadow vẫn thấy được nhưng subtle
- [ ] Focus states vẫn rõ ràng

#### 4. Interactive States
- [ ] **Hover states**
  - [ ] Buttons có hover color phù hợp
  - [ ] Links có hover underline/color
  - [ ] Cards có hover shadow/border

- [ ] **Focus states**
  - [ ] Inputs có focus ring rõ ràng
  - [ ] Buttons có focus indicator
  - [ ] Keyboard navigation rõ ràng

- [ ] **Disabled states**
  - [ ] Disabled buttons có màu mờ phù hợp
  - [ ] Disabled inputs có opacity/color đúng
  - [ ] Cursor pointer đúng

- [ ] **Loading states**
  - [ ] Spinners có màu rõ ràng
  - [ ] Skeleton loaders có background phù hợp
  - [ ] Loading text dễ đọc

#### 5. Edge Cases
- [ ] Scroll bars có màu phù hợp với theme
- [ ] Modals có backdrop đúng opacity
- [ ] Dropdowns có shadow/border rõ
- [ ] Tooltips có background/text đúng
- [ ] Code editors (Monaco) có theme phù hợp

---

### B. TEST ENGLISH/VIETNAMESE

#### 1. Navigation & Layout
- [ ] **Sidebar menu items**
  - [ ] Tất cả menu items đã dịch
  - [ ] Text không bị cắt/tràn
  - [ ] Collapsed state vẫn hiển thị đúng

- [ ] **TopAppBar**
  - [ ] User role/name hiển thị đúng
  - [ ] Dropdown menu items đã dịch
  - [ ] Language toggle hiển thị đúng (EN/VI)

#### 2. Pages - English
- [ ] **Dashboard**
  - [ ] Page title đã dịch
  - [ ] All metric labels đã dịch
  - [ ] Chart labels đã dịch
  - [ ] Table headers đã dịch
  - [ ] Empty states đã dịch

- [ ] **Projects**
  - [ ] Page title & subtitle đã dịch
  - [ ] Button labels đã dịch
  - [ ] Table headers đã dịch
  - [ ] Modal title & labels đã dịch
  - [ ] Placeholder text đã dịch
  - [ ] Validation messages đã dịch

- [ ] **Specifications**
  - [ ] Upload instructions đã dịch
  - [ ] File format labels đã dịch
  - [ ] Status labels đã dịch
  - [ ] Action buttons đã dịch

- [ ] **Endpoints**
  - [ ] Search placeholder đã dịch
  - [ ] Filter labels đã dịch
  - [ ] Method labels đã dịch
  - [ ] Empty state message đã dịch

- [ ] **Test Suites**
  - [ ] All buttons đã dịch
  - [ ] Modal form labels đã dịch
  - [ ] Environment options đã dịch
  - [ ] Status labels đã dịch

- [ ] **Test Runs**
  - [ ] Stats labels đã dịch
  - [ ] Date range options đã dịch
  - [ ] Status labels đã dịch
  - [ ] Action buttons đã dịch
  - [ ] Auto-analysis messages đã dịch

- [ ] **Reports**
  - [ ] Chart titles đã dịch
  - [ ] Metric labels đã dịch
  - [ ] Legend labels đã dịch

- [ ] **Settings**
  - [ ] Tab labels đã dịch
  - [ ] Form labels đã dịch
  - [ ] Help text đã dịch
  - [ ] Success/error messages đã dịch

- [ ] **Help**
  - [ ] FAQ questions & answers đã dịch
  - [ ] Category descriptions đã dịch
  - [ ] Contact info đã dịch

#### 3. Pages - Vietnamese
Lặp lại tất cả các test trên nhưng trong tiếng Việt, đặc biệt chú ý:
- [ ] **Layout không bị vỡ**
  - [ ] Buttons không bị tràn text
  - [ ] Cards không bị stretch quá mức
  - [ ] Table columns vẫn cân đối
  - [ ] Modal không bị quá rộng

- [ ] **Text quality**
  - [ ] Dịch tự nhiên, không máy móc
  - [ ] Thuật ngữ kỹ thuật nhất quán
  - [ ] Không có lỗi chính tả
  - [ ] Ngữ cảnh phù hợp với UI

#### 4. Common UI Elements
- [ ] **Buttons**
  - [ ] "Save" / "Lưu"
  - [ ] "Cancel" / "Hủy"
  - [ ] "Delete" / "Xóa"
  - [ ] "Create" / "Tạo"
  - [ ] "Edit" / "Sửa"
  - [ ] "Back" / "Quay lại"

- [ ] **Status labels**
  - [ ] "Active" / "Đang hoạt động"
  - [ ] "Inactive" / "Không hoạt động"
  - [ ] "Success" / "Thành công"
  - [ ] "Failed" / "Thất bại"
  - [ ] "Pending" / "Đang chờ"
  - [ ] "Loading" / "Đang tải"

- [ ] **Empty states**
  - [ ] "No data found" / "Không tìm thấy dữ liệu"
  - [ ] "No results" / "Không có kết quả"
  - [ ] "Not found" / "Không tìm thấy"

- [ ] **Validation messages**
  - [ ] Required field messages
  - [ ] Format error messages
  - [ ] Success messages
  - [ ] Error messages

#### 5. Dynamic Content
- [ ] **Dates & Times**
  - [ ] Format phù hợp với locale (DD/MM/YYYY vs MM/DD/YYYY)
  - [ ] Relative time ("2 hours ago" / "2 giờ trước")

- [ ] **Numbers**
  - [ ] Thousand separators đúng (1,000 vs 1.000)
  - [ ] Decimal separators đúng

- [ ] **Pluralization**
  - [ ] "1 item" / "1 mục"
  - [ ] "5 items" / "5 mục"

---

### C. CROSS-BROWSER TESTING

- [ ] **Chrome** (latest)
  - [ ] Light mode
  - [ ] Dark mode
  - [ ] English
  - [ ] Vietnamese

- [ ] **Firefox** (latest)
  - [ ] Light mode
  - [ ] Dark mode
  - [ ] English
  - [ ] Vietnamese

- [ ] **Safari** (if available)
  - [ ] Light mode
  - [ ] Dark mode
  - [ ] English
  - [ ] Vietnamese

- [ ] **Edge** (latest)
  - [ ] Light mode
  - [ ] Dark mode
  - [ ] English
  - [ ] Vietnamese

---

### D. RESPONSIVE TESTING

- [ ] **Desktop (1920x1080)**
  - [ ] All pages render correctly
  - [ ] No horizontal scroll
  - [ ] Sidebar fully visible

- [ ] **Laptop (1366x768)**
  - [ ] Layout adapts properly
  - [ ] Text remains readable
  - [ ] No content cutoff

- [ ] **Tablet (768x1024)**
  - [ ] Sidebar collapses/adapts
  - [ ] Tables scroll horizontally if needed
  - [ ] Touch targets adequate size

- [ ] **Mobile (375x667)**
  - [ ] Mobile menu works
  - [ ] Forms are usable
  - [ ] Text size appropriate
  - [ ] No horizontal scroll

---

### E. ACCESSIBILITY

- [ ] **Keyboard Navigation**
  - [ ] Tab order logical
  - [ ] Focus indicators visible in both themes
  - [ ] All interactive elements reachable

- [ ] **Screen Reader**
  - [ ] Alt text on images
  - [ ] ARIA labels where needed
  - [ ] Semantic HTML used

- [ ] **Color Contrast**
  - [ ] Text meets WCAG AA standards (4.5:1)
  - [ ] Interactive elements distinguishable
  - [ ] Not relying on color alone for information

---

### F. PERFORMANCE

- [ ] **Theme Switch**
  - [ ] Instant, no flicker
  - [ ] Persists on page reload
  - [ ] No layout shift

- [ ] **Language Switch**
  - [ ] Fast, no delay
  - [ ] Persists on page reload
  - [ ] No content flash

- [ ] **Initial Load**
  - [ ] Correct theme applied immediately
  - [ ] Correct language loaded
  - [ ] No FOUC (Flash of Unstyled Content)

---

## TESTING WORKFLOW

### 1. Automated Testing (Recommended)
```bash
# Run linter
npm run lint

# Run type check
npm run type-check

# Run tests (if available)
npm test
```

### 2. Manual Testing Steps

**Step 1: Light Mode + English**
1. Clear browser cache
2. Open app in incognito/private mode
3. Verify default is light mode + English
4. Go through all pages in checklist
5. Test all interactive elements

**Step 2: Dark Mode + English**
1. Toggle to dark mode
2. Verify theme persists on page reload
3. Go through all pages in checklist
4. Compare with light mode screenshots

**Step 3: Light Mode + Vietnamese**
1. Toggle back to light mode
2. Switch language to Vietnamese
3. Verify language persists on page reload
4. Go through all pages in checklist
5. Check for layout issues

**Step 4: Dark Mode + Vietnamese**
1. Toggle to dark mode
2. Keep Vietnamese language
3. Go through all pages in checklist
4. This is the final combination test

**Step 5: Edge Cases**
1. Test theme switch while on different pages
2. Test language switch while on different pages
3. Test with browser zoom (90%, 110%, 125%)
4. Test with browser dev tools open
5. Test with slow network (throttling)

### 3. Screenshot Comparison
Take screenshots of key pages in all 4 combinations:
- Light + EN
- Light + VI
- Dark + EN
- Dark + VI

Compare side-by-side to spot inconsistencies.

---

## BUG REPORTING TEMPLATE

When you find an issue, report it with:

```markdown
**Page/Component:** [e.g., Dashboard, TopAppBar]
**Theme:** [Light/Dark]
**Language:** [EN/VI]
**Browser:** [Chrome 120, Firefox 121, etc.]
**Issue:** [Brief description]
**Expected:** [What should happen]
**Actual:** [What actually happens]
**Screenshot:** [If applicable]
**Steps to reproduce:**
1. Step 1
2. Step 2
3. Step 3
```

---

## SIGN-OFF

After completing all tests, sign off:

- [ ] All Light/Dark mode tests passed
- [ ] All English/Vietnamese tests passed
- [ ] All cross-browser tests passed
- [ ] All responsive tests passed
- [ ] All accessibility checks passed
- [ ] All performance checks passed
- [ ] No critical bugs found
- [ ] Documentation updated

**Tested by:** _______________
**Date:** _______________
**Notes:** _______________
