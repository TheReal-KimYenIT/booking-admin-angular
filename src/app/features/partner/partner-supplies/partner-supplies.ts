import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PartnerService } from '../../../services/partner.service';
import Swal from 'sweetalert2';
import { Router } from '@angular/router';

@Component({
  selector: 'app-partner-supplies',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './partner-supplies.html',
  styleUrls: ['./partner-supplies.css']
})
export class PartnerSuppliesComponent implements OnInit {
  itemList: any[] = [];
  isLoading = true;
  isSubmitting = false;

  // Filter, Search & Sort
  searchKeyword: string = '';
  selectedStatus: string = 'all';
  sortBy: string = 'default';

  // Modal
  showModal = false;
  isEditMode = false;
  currentItem: any = {
    id: null,
    name: '',
    price: 0,
    quantity: 1,
    status: 1
  };

  constructor(
    private router: Router,
    private partnerService: PartnerService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const userStr = localStorage.getItem('partner_user');
    if (userStr) {
      const user = JSON.parse(userStr);
      const isOwner = Number(user.role_id) === 1;
      const permissions: string[] = user.role?.permissions || [];
      const hasPermission = isOwner || permissions.includes('supplies');

      if (!hasPermission) {
        Swal.fire({
          icon: 'error',
          title: 'Từ chối truy cập',
          text: 'Tài khoản của bạn không có quyền truy cập mục Quản lý Vật tư!',
          confirmButtonColor: '#4f46e5'
        });
        this.router.navigate(['/dashboard/room-matrix']);
        return;
      }
    }

    this.loadData();
  }

  loadData(): void {
    this.isLoading = true;
    this.partnerService.getSupplies().subscribe({
      next: (res: any) => {
        this.itemList = res.data || [];
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error('Lỗi tải danh mục vật tư:', err);
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  // ==========================================
  // COMPUTED GETTERS FOR KPIS
  // ==========================================
  get totalSupplies(): number {
    return this.itemList.length;
  }

  get activeSupplies(): number {
    return this.itemList.filter(i => Number(i.status) === 1).length;
  }

  get inactiveSupplies(): number {
    return this.itemList.filter(i => Number(i.status) === 0).length;
  }

  get maxPrice(): number {
    if (this.itemList.length === 0) return 0;
    return Math.max(...this.itemList.map(i => Number(i.price_per_unit) || 0));
  }

  get filteredList(): any[] {
    let result = this.itemList.filter(item => {
      // 1. Tìm theo từ khóa
      if (this.searchKeyword.trim()) {
        const kw = this.searchKeyword.toLowerCase().trim();
        const name = (item.name || '').toLowerCase();
        if (!name.includes(kw)) return false;
      }

      // 2. Lọc theo trạng thái
      if (this.selectedStatus === 'active' && Number(item.status) !== 1) return false;
      if (this.selectedStatus === 'inactive' && Number(item.status) !== 0) return false;

      return true;
    });

    // 3. Sắp xếp
    if (this.sortBy === 'price-asc') {
      result = [...result].sort((a, b) => (Number(a.price_per_unit) || 0) - (Number(b.price_per_unit) || 0));
    } else if (this.sortBy === 'price-desc') {
      result = [...result].sort((a, b) => (Number(b.price_per_unit) || 0) - (Number(a.price_per_unit) || 0));
    } else if (this.sortBy === 'name-asc') {
      result = [...result].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }

    return result;
  }

  resetFilters(): void {
    this.searchKeyword = '';
    this.selectedStatus = 'all';
    this.sortBy = 'default';
    this.cdr.detectChanges();
  }

  // ==========================================
  // MODAL ACTIONS
  // ==========================================
  openModal(item?: any): void {
    if (item) {
      this.isEditMode = true;
      this.currentItem = {
        id: item.id,
        name: item.name,
        price: item.price_per_unit,
        quantity: item.total_quantity || 1,
        status: Number(item.status) === 1 ? 1 : 0
      };
    } else {
      this.isEditMode = false;
      this.currentItem = {
        id: null,
        name: '',
        price: 0,
        quantity: 1,
        status: 1
      };
    }
    this.showModal = true;
    this.cdr.detectChanges();
  }

  closeModal(): void {
    this.showModal = false;
    this.cdr.detectChanges();
  }

  saveItem(): void {
    const name = (this.currentItem.name || '').trim();
    const price = Number(this.currentItem.price);

    if (!name) {
      Swal.fire('Thiếu thông tin', 'Vui lòng nhập tên tài sản / vật tư đền bù!', 'warning');
      return;
    }
    if (isNaN(price) || price < 0 || price > 99999999) {
      Swal.fire('Mức phí không hợp lệ', 'Mức phí đền bù phải từ 0đ đến tối đa 99,999,999đ!', 'warning');
      return;
    }

    this.isSubmitting = true;

    const payload = {
      name: name,
      price: price,
      quantity: 1,
      status: Number(this.currentItem.status)
    };

    const apiCall$ = this.isEditMode
      ? this.partnerService.updateSupply(this.currentItem.id, payload)
      : this.partnerService.addSupply(payload);

    apiCall$.subscribe({
      next: (res: any) => {
        this.isSubmitting = false;
        Swal.fire({
          icon: 'success',
          title: 'Thành công!',
          text: res.message || 'Đã lưu thông tin vật tư thành công!',
          timer: 1800,
          showConfirmButton: false
        });
        this.closeModal();
        this.loadData();
      },
      error: (err: any) => {
        this.isSubmitting = false;
        console.error('Lỗi lưu vật tư:', err);
        Swal.fire({
          icon: 'error',
          title: 'Lỗi',
          text: err.error?.message || 'Có lỗi xảy ra khi lưu dữ liệu!',
          confirmButtonColor: '#4f46e5'
        });
        this.cdr.detectChanges();
      }
    });
  }

  toggleStatus(item: any, newStatus: number): void {
    const isActivating = newStatus === 1;
    const actionText = isActivating ? 'áp dụng lại' : 'ngừng áp dụng';
    const confirmColor = isActivating ? '#059669' : '#d97706';

    Swal.fire({
      title: `Xác nhận ${actionText}?`,
      text: isActivating
        ? `Vật tư "${item.name}" sẽ hiển thị khi Lễ tân tính phí đền bù sự cố buồng phòng.`
        : `Vật tư "${item.name}" sẽ tạm ẩn khỏi danh sách tính phí đền bù sự cố.`,
      icon: isActivating ? 'question' : 'warning',
      showCancelButton: true,
      confirmButtonColor: confirmColor,
      cancelButtonColor: '#64748b',
      confirmButtonText: isActivating ? 'Áp dụng ngay' : 'Đồng ý ngừng',
      cancelButtonText: 'Hủy bỏ'
    }).then((result) => {
      if (result.isConfirmed) {
        const payload = {
          name: item.name,
          price: item.price_per_unit,
          status: newStatus
        };

        this.partnerService.updateSupply(item.id, payload).subscribe({
          next: (res: any) => {
            item.status = newStatus;
            Swal.fire({
              icon: 'success',
              title: 'Thành công!',
              text: res.message || `Đã ${actionText} thành công!`,
              timer: 1500,
              showConfirmButton: false
            });
            this.cdr.detectChanges();
          },
          error: (err: any) => {
            console.error('Lỗi chuyển trạng thái vật tư:', err);
            Swal.fire('Lỗi', err.error?.message || 'Không thể thay đổi trạng thái.', 'error');
          }
        });
      }
    });
  }

  deleteItem(item: any): void {
    Swal.fire({
      title: 'Xóa vật tư này?',
      html: `Bạn có chắc muốn xóa <strong class="text-danger">${item.name}</strong> khỏi bảng giá đền bù?<br><small class="text-muted">Hành động này không thể hoàn tác nếu vật tư chưa phát sinh trong các đơn phòng.</small>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Xóa vĩnh viễn',
      cancelButtonText: 'Giữ lại'
    }).then((result) => {
      if (result.isConfirmed) {
        this.partnerService.deleteSupply(item.id).subscribe({
          next: (res: any) => {
            Swal.fire({
              icon: 'success',
              title: 'Đã xóa!',
              text: res.message || 'Đã xóa vật tư thành công!',
              timer: 1800,
              showConfirmButton: false
            });
            this.itemList = this.itemList.filter(i => i.id !== item.id);
            this.cdr.detectChanges();
          },
          error: (err: any) => {
            console.error('Lỗi xóa vật tư:', err);
            Swal.fire({
              icon: 'error',
              title: 'Không thể xóa',
              text: err.error?.message || 'Không thể xóa vật tư này.',
              confirmButtonColor: '#4f46e5'
            });
          }
        });
      }
    });
  }

  // ==========================================
  // HELPERS
  // ==========================================
  getItemIcon(name: string): string {
    const n = (name || '').toLowerCase();
    if (n.includes('dù') || n.includes('ô')) return 'bi-umbrella-fill';
    if (n.includes('ấm') || n.includes('bình') || n.includes('ấm đun')) return 'bi-cup-hot-fill';
    if (n.includes('thẻ') || n.includes('khóa')) return 'bi-key-fill';
    if (n.includes('gối') || n.includes('chăn') || n.includes('nệm') || n.includes('ga')) return 'bi-cloud-fill';
    if (n.includes('khăn') || n.includes('áo')) return 'bi-badge-ad-fill';
    if (n.includes('tivi') || n.includes('tv') || n.includes('remote') || n.includes('điều khiển')) return 'bi-tv-fill';
    if (n.includes('ly') || n.includes('cốc') || n.includes('tách') || n.includes('chén')) return 'bi-cup-straw';
    if (n.includes('đèn')) return 'bi-lamp-fill';
    return 'bi-box-seam-fill';
  }
}