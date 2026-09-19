import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router'; 
import { PartnerService } from '../../../services/partner.service'; 
import Swal from 'sweetalert2';

@Component({
  selector: 'app-partner-minibars',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './partner-minibars.html',
  styleUrl: './partner-minibars.css'
})
export class PartnerMinibarsComponent implements OnInit {
  itemList: any[] = [];
  isLoading = true;

  // Tìm kiếm & Bộ lọc
  searchTerm: string = '';
  statusFilter: string = 'all'; // 'all' | '1' | '0' | 'low_stock'

  // Modal Thêm / Sửa
  showModal = false;
  isEditMode = false;
  currentItem: any = { 
    name: '', 
    description: '', 
    price: 0, 
    quantity: 20, 
    unit: 'Lon', 
    icon: '🥤', 
    status: 1 
  };

  // Modal Nhập Hàng Nhanh (Quick Restock)
  showRestockModal = false;
  restockItem: any = null;
  restockAmount: number = 10;

  // Danh sách Emoji gợi ý nhanh cho Minibar
  commonEmojis: string[] = [
    '💧', '🥤', '🧃', '☕', '🍵', 
    '🍺', '🍷', '🍾', '🍫', '🥜', 
    '🍿', '🍪', '🍜', '🧊', '✨'
  ];

  // Danh sách đơn vị tính phổ biến
  commonUnits: string[] = [
    'Lon', 'Chai', 'Gói', 'Hộp', 'Ly', 
    'Thanh', 'Túi', 'Chai 500ml', 'Lon 330ml'
  ];

  constructor(
    private router: Router,
    private partnerService: PartnerService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() { 
    // Kiểm tra phân quyền: Lễ tân (role_id = 3) không được quản trị Minibar
    const userStr = localStorage.getItem('partner_user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        if (Number(user.role_id) === 3) {
          Swal.fire('Từ chối truy cập', 'Bạn là Lễ tân, không có quyền quản lý danh mục Minibar!', 'error');
          this.router.navigate(['/dashboard/room-matrix']);
          return;
        }
      } catch (e) {
        console.error('Error parsing partner user:', e);
      }
    }
    this.loadData(); 
  }

  loadData() {
    this.isLoading = true;
    this.cdr.detectChanges();
    this.partnerService.getMinibars().subscribe({
      next: (res: any) => {
        this.itemList = res.data || [];
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.isLoading = false;
        Swal.fire({
          icon: 'error',
          title: 'Lỗi tải dữ liệu',
          text: 'Không thể tải danh mục Minibar từ máy chủ!'
        });
        this.cdr.detectChanges();
      }
    });
  }

  // --- STATS COMPUTED GETTERS ---
  get totalItems(): number {
    return this.itemList.length;
  }

  get activeItems(): number {
    return this.itemList.filter(i => Number(i.status) === 1).length;
  }

  get inactiveItems(): number {
    return this.itemList.filter(i => Number(i.status) === 0).length;
  }

  get totalStock(): number {
    return this.itemList.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);
  }

  get lowStockCount(): number {
    return this.itemList.filter(i => Number(i.quantity) <= 10).length;
  }

  get outOfStockCount(): number {
    return this.itemList.filter(i => Number(i.quantity) === 0).length;
  }

  // --- FILTERED LIST ---
  get filteredItems(): any[] {
    return this.itemList.filter(item => {
      // Lọc theo trạng thái
      if (this.statusFilter === '1' && Number(item.status) !== 1) return false;
      if (this.statusFilter === '0' && Number(item.status) !== 0) return false;
      if (this.statusFilter === 'low_stock' && Number(item.quantity) > 10) return false;

      // Lọc theo từ khóa tìm kiếm
      if (this.searchTerm.trim()) {
        const query = this.searchTerm.toLowerCase().trim();
        const matchName = item.name?.toLowerCase().includes(query);
        const matchDesc = item.description?.toLowerCase().includes(query);
        const matchUnit = item.unit?.toLowerCase().includes(query);
        if (!matchName && !matchDesc && !matchUnit) return false;
      }

      return true;
    });
  }

  // --- MODAL THÊM / SỬA ---
  openModal(item?: any) {
    if (item) {
      this.isEditMode = true;
      this.currentItem = { ...item }; 
      if (!this.currentItem.unit) this.currentItem.unit = 'Lon';
    } else {
      this.isEditMode = false;
      this.currentItem = { 
        name: '', 
        description: '', 
        price: 20000, 
        quantity: 20, 
        unit: 'Lon', 
        icon: '🥤', 
        status: 1 
      }; 
    }
    this.showModal = true;
  }

  closeModal() { 
    this.showModal = false; 
  }

  selectEmoji(emoji: string) {
    this.currentItem.icon = emoji;
  }

  addModalQuantity(amount: number) {
    this.currentItem.quantity = (Number(this.currentItem.quantity) || 0) + amount;
  }

  saveItem() {
    if (!this.currentItem.name || !this.currentItem.name.trim()) {
      Swal.fire({ icon: 'warning', title: 'Thiếu thông tin', text: 'Vui lòng nhập tên món Minibar!' });
      return;
    }

    if (this.currentItem.price === null || this.currentItem.price === undefined || this.currentItem.price < 0) {
      Swal.fire({ icon: 'warning', title: 'Giá không hợp lệ', text: 'Đơn giá món Minibar phải lớn hơn hoặc bằng 0 VND!' });
      return;
    }

    if (this.currentItem.quantity === null || this.currentItem.quantity === undefined || this.currentItem.quantity < 0) {
      Swal.fire({ icon: 'warning', title: 'Số lượng tồn không hợp lệ', text: 'Số lượng tồn kho phải lớn hơn hoặc bằng 0!' });
      return;
    }

    const payload = {
      name: this.currentItem.name.trim(),
      description: this.currentItem.description ? this.currentItem.description.trim() : '',
      price: Number(this.currentItem.price),
      quantity: Number(this.currentItem.quantity),
      unit: this.currentItem.unit || 'Món',
      icon: this.currentItem.icon || '🥤',
      status: Number(this.currentItem.status)
    };

    Swal.fire({
      title: 'Đang lưu món Minibar...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    const apiCall = this.isEditMode 
      ? this.partnerService.updateMinibar(this.currentItem.id, payload)
      : this.partnerService.addMinibar(payload);

    apiCall.subscribe({
      next: (res: any) => {
        Swal.fire({ 
          icon: 'success', 
          title: 'Thành công!', 
          text: res.message || 'Đã lưu món Minibar thành công!', 
          showConfirmButton: false, 
          timer: 1500 
        });
        this.closeModal();
        this.loadData();
      },
      error: (err: any) => {
        Swal.fire({ 
          icon: 'error', 
          title: 'Lỗi', 
          text: err.error?.message || 'Có lỗi xảy ra khi lưu món Minibar!' 
        });
      }
    });
  }

  // --- MODAL NHẬP HÀNG NHANH (QUICK RESTOCK) ---
  openRestockModal(item: any, event?: Event) {
    if (event) event.stopPropagation();
    this.restockItem = { ...item };
    this.restockAmount = 10;
    this.showRestockModal = true;
  }

  closeRestockModal() {
    this.showRestockModal = false;
    this.restockItem = null;
  }

  quickAddRestock(amount: number) {
    this.restockAmount = (Number(this.restockAmount) || 0) + amount;
  }

  confirmRestock() {
    if (!this.restockItem || this.restockAmount <= 0) {
      Swal.fire('Lỗi', 'Số lượng nhập phải lớn hơn 0!', 'warning');
      return;
    }

    const newQuantity = Number(this.restockItem.quantity) + Number(this.restockAmount);
    const updatedPayload = { ...this.restockItem, quantity: newQuantity };

    Swal.fire({
      title: 'Đang cập nhật kho...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    this.partnerService.updateMinibar(this.restockItem.id, updatedPayload).subscribe({
      next: () => {
        Swal.fire({
          icon: 'success',
          title: 'Nhập hàng thành công!',
          text: `Đã cộng thêm +${this.restockAmount} ${this.restockItem.unit || 'món'}. Tồn kho mới: ${newQuantity}`,
          showConfirmButton: false,
          timer: 1800
        });
        this.closeRestockModal();
        this.loadData();
      },
      error: (err: any) => {
        Swal.fire('Lỗi', err.error?.message || 'Không thể cập nhật số lượng nhập kho!', 'error');
      }
    });
  }

  // --- TRẠNG THÁI & XÓA ---
  toggleStatus(item: any, newStatus: number) {
    const isActivating = (newStatus === 1);
    const actionText = isActivating ? 'mở bán lại' : 'ngừng kinh doanh';
    const confirmColor = isActivating ? '#10b981' : '#ef4444';
    
    Swal.fire({
      title: `Bạn có chắc muốn ${actionText}?`,
      text: isActivating 
        ? `Món "${item.name}" sẽ hiển thị trở lại trong danh mục Minibar phòng.`
        : `Món "${item.name}" sẽ tạm ngừng phục vụ trong phòng.`,
      icon: isActivating ? 'question' : 'warning',
      showCancelButton: true,
      confirmButtonColor: confirmColor,
      cancelButtonColor: '#94a3b8',
      confirmButtonText: isActivating ? 'Mở bán ngay' : 'Ngừng bán',
      cancelButtonText: 'Hủy'
    }).then((result) => {
      if (result.isConfirmed) {
        Swal.fire({
          title: 'Đang cập nhật...',
          allowOutsideClick: false,
          didOpen: () => Swal.showLoading()
        });

        const updatedItem = { ...item, status: newStatus };
        this.partnerService.updateMinibar(item.id, updatedItem).subscribe({
          next: () => {
            Swal.fire({ 
              icon: 'success', 
              title: 'Thành công!', 
              text: `Đã ${actionText} thành công!`, 
              showConfirmButton: false, 
              timer: 1500 
            });
            this.loadData();
          },
          error: (err: any) => {
            Swal.fire({ 
              icon: 'error', 
              title: 'Lỗi', 
              text: err.error?.message || 'Không thể thay đổi trạng thái món Minibar!' 
            });
          }
        });
      }
    });
  }

  deleteItem(item: any) {
    Swal.fire({
      title: `Xóa món "${item.name}"?`,
      text: 'Nếu món đã từng có khách tiêu thụ trong đơn đặt phòng, hệ thống sẽ tự động chuyển sang ngừng kinh doanh để bảo toàn lịch sử.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: 'Xác nhận xóa',
      cancelButtonText: 'Hủy'
    }).then((result) => {
      if (result.isConfirmed) {
        Swal.fire({
          title: 'Đang xóa món Minibar...',
          allowOutsideClick: false,
          didOpen: () => Swal.showLoading()
        });

        this.partnerService.deleteMinibar(item.id).subscribe({
          next: (res: any) => {
            Swal.fire({
              icon: 'success',
              title: 'Thành công!',
              text: res.message || 'Đã xử lý xóa món Minibar!',
              showConfirmButton: false,
              timer: 1500
            });
            this.loadData();
          },
          error: (err: any) => {
            Swal.fire({
              icon: 'error',
              title: 'Thất bại',
              text: err.error?.message || 'Có lỗi xảy ra khi xóa món Minibar!'
            });
          }
        });
      }
    });
  }

  // --- HELPERS ---
  formatPrice(price: number): string {
    return new Intl.NumberFormat('vi-VN').format(Math.round(price || 0)) + ' đ';
  }
}