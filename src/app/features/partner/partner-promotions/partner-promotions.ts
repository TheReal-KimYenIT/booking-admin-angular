import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PartnerService } from '../../../services/partner.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-partner-promotions',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './partner-promotions.html',
  styleUrl: './partner-promotions.css'
})
export class PartnerPromotionsComponent implements OnInit, OnDestroy {
  itemList: any[] = [];
  isLoading = true;

  // Tìm kiếm & Bộ lọc
  searchTerm: string = '';
  statusFilter: string = 'all'; // 'all' | 'active' | 'upcoming' | 'expired' | 'locked'

  // Modal Thêm / Sửa
  showModal = false;
  isEditMode = false;
  currentItem: any = this.getEmptyItem();

  private statusRefreshInterval: any;

  constructor(
    private router: Router,
    private partnerService: PartnerService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    // Phân quyền: Lễ tân (role_id = 3) không có quyền quản lý khuyến mãi
    const userStr = localStorage.getItem('partner_user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        if (Number(user.role_id) === 3) {
          Swal.fire('Từ chối truy cập', 'Bạn là Lễ tân, không có quyền quản lý chương trình khuyến mãi!', 'error');
          this.router.navigate(['/dashboard/room-matrix']);
          return;
        }
      } catch (e) {
        console.error('Error parsing partner user:', e);
      }
    }

    this.loadData();
    // Cập nhật lại UI mỗi 30 giây để trạng thái thời gian diễn ra luôn chính xác
    this.statusRefreshInterval = setInterval(() => {
      this.cdr.detectChanges();
    }, 30000);
  }

  ngOnDestroy() {
    if (this.statusRefreshInterval) {
      clearInterval(this.statusRefreshInterval);
    }
  }

  getEmptyItem() {
    // Mặc định ngày bắt đầu là hiện tại, kết thúc sau 30 ngày
    const now = new Date();
    const future = new Date();
    future.setDate(now.getDate() + 30);

    const pad = (n: number) => (n < 10 ? '0' + n : n);
    const formatDt = (d: Date) =>
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

    return {
      code: '',
      discount_type: 1, // 1: %, 2: VNĐ
      discount_value: 10,
      max_discount_amount: null,
      min_booking_value: 0,
      start_date: formatDt(now),
      end_date: formatDt(future),
      usage_limit: 50,
      usage_limit_per_user: 1,
      status: 1
    };
  }

  loadData() {
    this.isLoading = true;
    this.cdr.detectChanges();
    this.partnerService.getPromotions().subscribe({
      next: (res: any) => {
        this.itemList = res.promotions || res.data || [];
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.isLoading = false;
        Swal.fire({
          icon: 'error',
          title: 'Lỗi tải dữ liệu',
          text: 'Không thể tải danh sách mã khuyến mãi từ máy chủ!'
        });
        this.cdr.detectChanges();
      }
    });
  }

  // --- STATS COMPUTED GETTERS ---
  get totalVouchers(): number {
    return this.itemList.length;
  }

  get activeVouchers(): number {
    return this.itemList.filter(item => this.getSmartStatus(item).key === 'active').length;
  }

  get totalUsedCount(): number {
    return this.itemList.reduce((sum, item) => sum + (Number(item.used_count) || 0), 0);
  }

  get expiredOrLockedCount(): number {
    return this.itemList.filter(item => {
      const statusKey = this.getSmartStatus(item).key;
      return statusKey === 'expired' || statusKey === 'locked' || statusKey === 'depleted';
    }).length;
  }

  get upcomingVouchers(): number {
    return this.itemList.filter(item => this.getSmartStatus(item).key === 'upcoming').length;
  }

  get expiredVouchers(): number {
    return this.itemList.filter(item => {
      const k = this.getSmartStatus(item).key;
      return k === 'expired' || k === 'depleted';
    }).length;
  }

  get lockedVouchers(): number {
    return this.itemList.filter(item => this.getSmartStatus(item).key === 'locked').length;
  }

  // --- SMART STATUS HELPER ---
  getSmartStatus(item: any): { key: string; label: string; badgeClass: string; icon: string } {
    if (Number(item.status) === 0) {
      return { key: 'locked', label: 'Đã khóa', badgeClass: 'badge-status-locked', icon: 'bi-lock-fill' };
    }

    const now = new Date().getTime();
    const startDate = item.start_date ? new Date(item.start_date.replace(' ', 'T')).getTime() : 0;
    const endDate = item.end_date ? new Date(item.end_date.replace(' ', 'T')).getTime() : 0;

    if (item.usage_limit && Number(item.used_count) >= Number(item.usage_limit)) {
      return { key: 'depleted', label: 'Hết lượt', badgeClass: 'badge-status-depleted', icon: 'bi-dash-circle-fill' };
    }

    if (now < startDate) {
      return { key: 'upcoming', label: 'Sắp diễn ra', badgeClass: 'badge-status-upcoming', icon: 'bi-clock-fill' };
    }

    if (now > endDate) {
      return { key: 'expired', label: 'Đã hết hạn', badgeClass: 'badge-status-expired', icon: 'bi-x-circle-fill' };
    }

    return { key: 'active', label: 'Đang diễn ra', badgeClass: 'badge-status-active', icon: 'bi-check-circle-fill' };
  }

  // --- FILTERED LIST ---
  get filteredItems(): any[] {
    return this.itemList.filter(item => {
      const status = this.getSmartStatus(item);

      // Bộ lọc trạng thái
      if (this.statusFilter === 'active' && status.key !== 'active') return false;
      if (this.statusFilter === 'upcoming' && status.key !== 'upcoming') return false;
      if (this.statusFilter === 'expired' && (status.key !== 'expired' && status.key !== 'depleted')) return false;
      if (this.statusFilter === 'locked' && status.key !== 'locked') return false;

      // Bộ lọc từ khóa
      if (this.searchTerm.trim()) {
        const query = this.searchTerm.toLowerCase().trim();
        const matchCode = item.code?.toLowerCase().includes(query);
        const matchValue = String(item.discount_value).includes(query);
        const matchMin = String(item.min_booking_value).includes(query);
        if (!matchCode && !matchValue && !matchMin) return false;
      }

      return true;
    });
  }

  // --- TÍNH PHẦN TRĂM LƯỢT DÙNG ---
  getUsagePercentage(item: any): number {
    if (!item.usage_limit || item.usage_limit <= 0) return 0;
    const pct = Math.round((Number(item.used_count) / Number(item.usage_limit)) * 100);
    return Math.min(pct, 100);
  }

  // --- SAO CHÉP MÃ VOUCHER NHANH ---
  copyCode(code: string, event?: Event) {
    if (event) event.stopPropagation();
    if (!code) return;

    navigator.clipboard.writeText(code).then(() => {
      const Toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 2000,
        timerProgressBar: true
      });
      Toast.fire({
        icon: 'success',
        title: `Đã sao chép mã: ${code}`
      });
    }).catch(() => {
      Swal.fire('Mã voucher', code, 'info');
    });
  }

  // --- MODAL THÊM / SỬA ---
  openModal(item?: any) {
    if (item) {
      this.isEditMode = true;
      this.currentItem = { ...item };
      if (this.currentItem.start_date) {
        this.currentItem.start_date = this.currentItem.start_date.replace(' ', 'T').substring(0, 16);
      }
      if (this.currentItem.end_date) {
        this.currentItem.end_date = this.currentItem.end_date.replace(' ', 'T').substring(0, 16);
      }
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
    if (!this.currentItem.code || !this.currentItem.code.trim()) {
      Swal.fire('Thiếu thông tin', 'Vui lòng nhập mã Voucher (Code)!', 'warning');
      return;
    }

    this.currentItem.code = this.currentItem.code.trim().toUpperCase();

    if (this.currentItem.discount_value === null || this.currentItem.discount_value === undefined || this.currentItem.discount_value <= 0) {
      Swal.fire('Giá trị không hợp lệ', 'Mức giảm giá phải lớn hơn 0!', 'warning');
      return;
    }

    if (Number(this.currentItem.discount_type) === 1 && this.currentItem.discount_value > 100) {
      Swal.fire('Giá trị không hợp lệ', 'Giảm theo phần trăm (%) không được vượt quá 100%!', 'warning');
      return;
    }

    if (!this.currentItem.start_date || !this.currentItem.end_date) {
      Swal.fire('Thiếu thông tin', 'Vui lòng chọn thời gian bắt đầu và kết thúc áp dụng!', 'warning');
      return;
    }

    const startTs = new Date(this.currentItem.start_date).getTime();
    const endTs = new Date(this.currentItem.end_date).getTime();

    if (endTs <= startTs) {
      Swal.fire('Thời gian không hợp lệ', 'Thời gian kết thúc phải diễn ra sau thời gian bắt đầu!', 'warning');
      return;
    }

    const payload = {
      code: this.currentItem.code,
      discount_type: Number(this.currentItem.discount_type),
      discount_value: Number(this.currentItem.discount_value),
      max_discount_amount: this.currentItem.discount_type == 1 && this.currentItem.max_discount_amount 
        ? Number(this.currentItem.max_discount_amount) 
        : null,
      min_booking_value: Number(this.currentItem.min_booking_value) || 0,
      start_date: this.currentItem.start_date.replace('T', ' ') + ':00',
      end_date: this.currentItem.end_date.replace('T', ' ') + ':00',
      usage_limit: this.currentItem.usage_limit ? Number(this.currentItem.usage_limit) : null,
      usage_limit_per_user: this.currentItem.usage_limit_per_user ? Number(this.currentItem.usage_limit_per_user) : 1,
      status: Number(this.currentItem.status) ?? 1
    };

    Swal.fire({
      title: 'Đang lưu mã Voucher...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    const apiCall = this.isEditMode
      ? this.partnerService.updatePromotion(this.currentItem.id, payload)
      : this.partnerService.addPromotion(payload);

    apiCall.subscribe({
      next: (res: any) => {
        Swal.fire({
          icon: 'success',
          title: 'Thành công!',
          text: res.message || 'Đã lưu chương trình khuyến mãi thành công!',
          showConfirmButton: false,
          timer: 1500
        });
        this.closeModal();
        this.loadData();
      },
      error: (err: any) => {
        Swal.fire({
          icon: 'error',
          title: 'Không thể lưu',
          text: err.error?.message || 'Có lỗi xảy ra khi lưu mã khuyến mãi!'
        });
      }
    });
  }

  // --- BẬT / TẮT TRẠNG THÁI ---
  toggleStatus(item: any, newStatus: number) {
    const isActivating = (newStatus === 1);
    const actionText = isActivating ? 'mở lại' : 'tạm khóa';
    const confirmColor = isActivating ? '#10b981' : '#ef4444';

    Swal.fire({
      title: `Bạn có chắc muốn ${actionText}?`,
      text: isActivating
        ? `Mã "${item.code}" sẽ có thể áp dụng khi khách hàng đặt phòng.`
        : `Mã "${item.code}" sẽ bị vô hiệu hóa tạm thời và khách không thể sử dụng.`,
      icon: isActivating ? 'question' : 'warning',
      showCancelButton: true,
      confirmButtonColor: confirmColor,
      cancelButtonColor: '#94a3b8',
      confirmButtonText: isActivating ? 'Mở lại ngay' : 'Khóa mã',
      cancelButtonText: 'Hủy'
    }).then((result) => {
      if (result.isConfirmed) {
        Swal.fire({
          title: 'Đang cập nhật...',
          allowOutsideClick: false,
          didOpen: () => Swal.showLoading()
        });

        this.partnerService.updatePromotion(item.id, { status: newStatus }).subscribe({
          next: () => {
            Swal.fire({
              icon: 'success',
              title: 'Thành công!',
              text: `Đã ${actionText} mã thành công!`,
              showConfirmButton: false,
              timer: 1500
            });
            this.loadData();
          },
          error: (err: any) => {
            Swal.fire('Lỗi', err.error?.message || 'Không thể cập nhật trạng thái mã!', 'error');
          }
        });
      }
    });
  }

  // --- XÓA MÃ KHUYẾN MÃI ---
  deleteItem(item: any) {
    Swal.fire({
      title: `Xóa mã "${item.code}"?`,
      text: 'Nếu mã đã từng có đơn đặt phòng áp dụng, hệ thống sẽ tự động chuyển sang "Đã khóa" để bảo toàn lịch sử doanh thu.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: 'Xác nhận xóa',
      cancelButtonText: 'Hủy'
    }).then((result) => {
      if (result.isConfirmed) {
        Swal.fire({
          title: 'Đang xóa mã khuyến mãi...',
          allowOutsideClick: false,
          didOpen: () => Swal.showLoading()
        });

        this.partnerService.deletePromotion(item.id).subscribe({
          next: (res: any) => {
            Swal.fire({
              icon: 'success',
              title: 'Thành công!',
              text: res.message || 'Đã xóa mã khuyến mãi!',
              showConfirmButton: false,
              timer: 1500
            });
            this.loadData();
          },
          error: (err: any) => {
            Swal.fire('Thất bại', err.error?.message || 'Có lỗi xảy ra khi xóa mã khuyến mãi!', 'error');
          }
        });
      }
    });
  }

  // --- HELPERS ---
  formatPrice(val: number): string {
    return new Intl.NumberFormat('vi-VN').format(Math.round(val || 0)) + ' đ';
  }
}