import { Component, OnInit, ChangeDetectorRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import { AdminService } from '../../../services/admin.service';

@Component({
  selector: 'app-admin-promotions',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-promotions.html',
  styleUrls: ['./admin-promotions.css']
})
export class AdminPromotionsComponent implements OnInit {
  itemList: any[] = [];
  filteredList: any[] = [];
  isLoading = true;
  isSubmitting = false;

  // Search & Filter state
  searchKeyword = '';
  statusFilter = 'ALL';         // 'ALL' | 'ACTIVE' | 'EXPIRED' | 'DEPLETED' | 'LOCKED' | 'UPCOMING'
  discountTypeFilter = 'ALL';   // 'ALL' | '1' (Percent) | '2' (Fixed)
  sortBy = 'NEWEST';            // 'NEWEST' | 'OLDEST' | 'DISCOUNT_DESC' | 'USAGE_DESC'

  // Modal State
  showModal = false;
  isEditMode = false;
  currentItem: any = this.getEmptyItem();

  constructor(
    private adminService: AdminService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.loadData();
  }

  @HostListener('window:keydown.escape')
  onEscapePress() {
    if (this.showModal) {
      this.closeModal();
    }
  }

  getEmptyItem() {
    const now = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(now.getDate() + 7);

    return {
      code: '',
      discount_type: 1,
      discount_value: 10,
      max_discount_amount: null,
      min_booking_value: 0,
      start_date: this.formatDateForInput(now),
      end_date: this.formatDateForInput(nextWeek),
      usage_limit: null,
      usage_limit_per_user: 1,
      status: 1
    };
  }

  formatDateForInput(d: any): string {
    if (!d) return '';
    const dateObj = typeof d === 'string' ? new Date(d.replace(' ', 'T')) : d;
    if (isNaN(dateObj.getTime())) return '';
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    const hours = String(dateObj.getHours()).padStart(2, '0');
    const minutes = String(dateObj.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  loadData() {
    this.isLoading = true;
    this.adminService.getGlobalPromotions().subscribe({
      next: (res: any) => {
        this.itemList = res.promotions || [];
        this.applyFilter();
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error('Lỗi tải danh sách khuyến mãi:', err);
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  getSmartStatus(item: any) {
    if (item.status == 0) {
      return { key: 'LOCKED', label: 'Đã khóa', class: 'bg-slate-100 text-slate-600 border-slate-300' };
    }
    if (item.usage_limit && Number(item.used_count) >= Number(item.usage_limit)) {
      return { key: 'DEPLETED', label: 'Hết lượt', class: 'bg-amber-50 text-amber-700 border-amber-200' };
    }

    const now = new Date();
    const startDate = new Date(String(item.start_date).replace(' ', 'T'));
    const endDate = new Date(String(item.end_date).replace(' ', 'T'));

    if (!isNaN(startDate.getTime()) && now < startDate) {
      return { key: 'UPCOMING', label: 'Sắp diễn ra', class: 'bg-blue-50 text-blue-700 border-blue-200' };
    }
    if (!isNaN(endDate.getTime()) && now > endDate) {
      return { key: 'EXPIRED', label: 'Đã hết hạn', class: 'bg-rose-50 text-rose-700 border-rose-200' };
    }

    return { key: 'ACTIVE', label: 'Đang diễn ra', class: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  }

  applyFilter() {
    const q = (this.searchKeyword || '').trim().toLowerCase();

    let result = this.itemList.filter(item => {
      // 1. Keyword search (Code, Min value, Discount)
      let matchQuery = true;
      if (q) {
        const code = (item.code || '').toLowerCase();
        const discountVal = String(item.discount_value || '');
        const idStr = `#${item.id}`;
        matchQuery = code.includes(q) || discountVal.includes(q) || idStr.includes(q);
      }

      // 2. Status filter
      let matchStatus = true;
      if (this.statusFilter !== 'ALL') {
        const statusKey = this.getSmartStatus(item).key;
        matchStatus = statusKey === this.statusFilter;
      }

      // 3. Discount type filter
      let matchType = true;
      if (this.discountTypeFilter !== 'ALL') {
        matchType = item.discount_type == Number(this.discountTypeFilter);
      }

      return matchQuery && matchStatus && matchType;
    });

    // 4. Sorting
    if (this.sortBy === 'NEWEST') {
      result.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
    } else if (this.sortBy === 'OLDEST') {
      result.sort((a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime());
    } else if (this.sortBy === 'DISCOUNT_DESC') {
      result.sort((a, b) => (Number(b.discount_value) || 0) - (Number(a.discount_value) || 0));
    } else if (this.sortBy === 'USAGE_DESC') {
      result.sort((a, b) => (Number(b.used_count) || 0) - (Number(a.used_count) || 0));
    }

    this.filteredList = result;
    this.cdr.detectChanges();
  }

  resetFilters() {
    this.searchKeyword = '';
    this.statusFilter = 'ALL';
    this.discountTypeFilter = 'ALL';
    this.sortBy = 'NEWEST';
    this.applyFilter();
  }

  // --- KPI GETTERS (100% computed from real DB data) ---
  get totalPromotions(): number {
    return this.itemList.length;
  }

  get activePromotionsCount(): number {
    return this.itemList.filter(item => this.getSmartStatus(item).key === 'ACTIVE').length;
  }

  get endedPromotionsCount(): number {
    return this.itemList.filter(item => ['EXPIRED', 'DEPLETED'].includes(this.getSmartStatus(item).key)).length;
  }

  get totalRedeemedCount(): number {
    return this.itemList.reduce((acc, cur) => acc + (Number(cur.used_count) || 0), 0);
  }

  // --- MODAL ACTIONS ---
  openModal(item?: any) {
    if (item) {
      this.isEditMode = true;
      this.currentItem = { ...item };
      this.currentItem.start_date = this.formatDateForInput(this.currentItem.start_date);
      this.currentItem.end_date = this.formatDateForInput(this.currentItem.end_date);
    } else {
      this.isEditMode = false;
      this.currentItem = this.getEmptyItem();
    }
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
  }

  saveItem() {
    const code = (this.currentItem.code || '').trim().toUpperCase();
    if (!code) {
      Swal.fire({ icon: 'warning', title: 'Thiếu thông tin', text: 'Vui lòng nhập mã Voucher!' });
      return;
    }

    const discountVal = Number(this.currentItem.discount_value);
    if (isNaN(discountVal) || discountVal <= 0) {
      Swal.fire({ icon: 'warning', title: 'Không hợp lệ', text: 'Mức giảm giá phải lớn hơn 0!' });
      return;
    }

    if (this.currentItem.discount_type == 1 && discountVal > 100) {
      Swal.fire({ icon: 'warning', title: 'Không hợp lệ', text: 'Mức giảm theo phần trăm không được vượt quá 100%!' });
      return;
    }

    if (!this.currentItem.start_date || !this.currentItem.end_date) {
      Swal.fire({ icon: 'warning', title: 'Thiếu thông tin', text: 'Vui lòng chọn thời gian bắt đầu và kết thúc!' });
      return;
    }

    const startDate = new Date(this.currentItem.start_date);
    const endDate = new Date(this.currentItem.end_date);
    if (endDate < startDate) {
      Swal.fire({ icon: 'warning', title: 'Thời gian không hợp lệ', text: 'Thời gian kết thúc phải diễn ra sau hoặc bằng thời gian bắt đầu!' });
      return;
    }

    // Kiểm tra không âm
    if (this.currentItem.discount_type == 1 && this.currentItem.max_discount_amount && Number(this.currentItem.max_discount_amount) < 0) {
      Swal.fire({ icon: 'warning', title: 'Không hợp lệ', text: 'Mức giảm tối đa không được là số âm!' });
      return;
    }

    if (this.currentItem.min_booking_value && Number(this.currentItem.min_booking_value) < 0) {
      Swal.fire({ icon: 'warning', title: 'Không hợp lệ', text: 'Giá trị đơn tối thiểu không được là số âm!' });
      return;
    }

    // Kiểm tra logic giảm giá tiền mặt cố định không vượt quá đơn tối thiểu nếu có thiết lập
    if (this.currentItem.discount_type == 2 && this.currentItem.min_booking_value && Number(this.currentItem.min_booking_value) > 0 && Number(this.currentItem.min_booking_value) < discountVal) {
      Swal.fire({
        icon: 'warning',
        title: 'Giá trị chưa hợp lý',
        text: `Đơn tối thiểu (${Number(this.currentItem.min_booking_value).toLocaleString()}đ) không nên nhỏ hơn số tiền giảm (${discountVal.toLocaleString()}đ) để tránh tạo đơn hàng âm tiền!`
      });
      return;
    }

    // Kiểm tra giới hạn lượt dùng không được nhỏ hơn số lượt đã dùng thực tế
    if (this.isEditMode && this.currentItem.usage_limit && Number(this.currentItem.usage_limit) < Number(this.currentItem.used_count || 0)) {
      Swal.fire({
        icon: 'warning',
        title: 'Giới hạn không hợp lệ',
        text: `Tổng lượt sử dụng (${this.currentItem.usage_limit}) không thể nhỏ hơn số lượt đã dùng thực tế (${this.currentItem.used_count})!`
      });
      return;
    }

    // Kiểm tra lượt dùng trên mỗi khách
    const limitPerUser = Number(this.currentItem.usage_limit_per_user);
    if (isNaN(limitPerUser) || limitPerUser < 1) {
      Swal.fire({ icon: 'warning', title: 'Không hợp lệ', text: 'Lượt dùng trên mỗi khách hàng tối thiểu phải là 1!' });
      return;
    }

    const payload = {
      ...this.currentItem,
      code: code,
      discount_value: discountVal,
      min_booking_value: Number(this.currentItem.min_booking_value) || 0,
      max_discount_amount: this.currentItem.discount_type == 1 ? (Number(this.currentItem.max_discount_amount) || null) : null,
      usage_limit: this.currentItem.usage_limit ? Number(this.currentItem.usage_limit) : null,
      usage_limit_per_user: Number(this.currentItem.usage_limit_per_user) || 1
    };

    this.isSubmitting = true;

    const apiCall = this.isEditMode
      ? this.adminService.updateGlobalPromotion(this.currentItem.id, payload)
      : this.adminService.addGlobalPromotion(payload);

    apiCall.subscribe({
      next: (res: any) => {
        this.isSubmitting = false;
        Swal.fire({
          icon: 'success',
          title: 'Thành công!',
          text: res.message || 'Lưu mã khuyến mãi thành công!',
          showConfirmButton: false,
          timer: 1500
        });
        this.closeModal();
        this.loadData();
      },
      error: (err: any) => {
        this.isSubmitting = false;
        Swal.fire({
          icon: 'error',
          title: 'Lỗi',
          text: err.error?.message || 'Có lỗi xảy ra khi lưu mã khuyến mãi.',
          confirmButtonText: 'Đóng'
        });
      }
    });
  }

  toggleStatus(item: any, newStatus: number) {
    const actionText = newStatus === 1 ? 'mở khóa' : 'tạm khóa';
    Swal.fire({
      title: `Xác nhận ${actionText}?`,
      html: `Bạn có chắc muốn <strong>${actionText}</strong> mã khuyến mãi <strong>"${item.code}"</strong>?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: newStatus === 1 ? '#10b981' : '#64748b',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: `<i class="bi ${newStatus === 1 ? 'bi-unlock-fill' : 'bi-lock-fill'} me-1"></i> Đồng Ý`,
      cancelButtonText: 'Hủy'
    }).then((result) => {
      if (result.isConfirmed) {
        this.adminService.updateGlobalPromotion(item.id, { status: newStatus }).subscribe({
          next: () => {
            Swal.fire({
              icon: 'success',
              title: 'Thành công!',
              text: `Đã ${actionText} mã "${item.code}".`,
              showConfirmButton: false,
              timer: 1500
            });
            this.loadData();
          },
          error: (err: any) => {
            Swal.fire({
              icon: 'error',
              title: 'Lỗi',
              text: err.error?.message || 'Không thể cập nhật trạng thái.',
              confirmButtonText: 'Đóng'
            });
          }
        });
      }
    });
  }

  deleteItem(item: any) {
    if (Number(item.used_count) > 0) {
      Swal.fire({
        icon: 'error',
        title: 'Không thể xóa!',
        html: `Mã <strong>"${item.code}"</strong> đã được khách hàng sử dụng cho <strong>${item.used_count}</strong> lượt đặt phòng.<br>` +
          `<small class="text-muted mt-2 d-block">Bạn có thể chọn <strong>Khóa</strong> mã để ngưng áp dụng thay vì xóa.</small>`,
        confirmButtonColor: '#4f46e5'
      });
      return;
    }

    Swal.fire({
      title: 'Xóa mã khuyến mãi?',
      html: `Bạn có chắc chắn muốn xóa vĩnh viễn mã <strong>"${item.code}"</strong>? Thao tác này không thể hoàn tác.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: '<i class="bi bi-trash3-fill me-1"></i> Xóa Vĩnh Viễn',
      cancelButtonText: 'Hủy'
    }).then((result) => {
      if (result.isConfirmed) {
        this.adminService.deleteGlobalPromotion(item.id).subscribe({
          next: (res: any) => {
            Swal.fire({
              icon: 'success',
              title: 'Đã xóa!',
              text: res.message || 'Đã xóa mã khuyến mãi thành công!',
              showConfirmButton: false,
              timer: 1500
            });
            this.loadData();
          },
          error: (err: any) => {
            Swal.fire({
              icon: 'error',
              title: 'Lỗi xóa',
              text: err.error?.message || 'Không thể xóa mã khuyến mãi lúc này.',
              confirmButtonText: 'Đóng'
            });
          }
        });
      }
    });
  }
}