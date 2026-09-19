import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router'; 
import { PartnerService } from '../../../services/partner.service'; 
import Swal from 'sweetalert2';

@Component({
  selector: 'app-partner-services',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './partner-services.html',
  styleUrl: './partner-services.css'
})
export class PartnerServicesComponent implements OnInit {
  serviceList: any[] = [];
  isLoading = true;

  // Tìm kiếm & Bộ lọc
  searchTerm: string = '';
  statusFilter: string = 'all'; // 'all' | '1' | '0'

  // Modal
  showModal = false;
  isEditMode = false;
  currentService: any = { 
    name: '', 
    description: '', 
    price: 0, 
    unit: 'Lượt', 
    icon: '✨', 
    status: 1 
  };

  // Danh sách Emoji gợi ý nhanh
  commonEmojis: string[] = [
    '🚐', '🚗', '🛵', '🚲', '🧺', '👔', 
    '🍳', '☕', '🍱', '🏊', '💆‍♀️', '🧳', 
    '📶', '🎂', '👶', '🎟️'
  ];

  // Danh sách đơn vị tính phổ biến
  commonUnits: string[] = [
    'Lượt', 'Gói', 'Suất', 'Ngày', 'Đêm', 
    'Giờ', 'Chuyến', 'Kg', 'Bộ', 'Vé', 'Khách', 'Khay'
  ];

  constructor(
    private router: Router,
    private partnerService: PartnerService, 
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() { 
    // Kiểm tra phân quyền: Lễ tân (role_id = 3) không được quản trị dịch vụ
    const userStr = localStorage.getItem('partner_user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        if (Number(user.role_id) === 3) {
          Swal.fire('Từ chối truy cập', 'Bạn là Lễ tân, không có quyền quản lý dịch vụ khách sạn!', 'error');
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
    this.partnerService.getServices().subscribe({
      next: (res: any) => {
        this.serviceList = res.data || [];
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => { 
        this.isLoading = false; 
        Swal.fire({
          icon: 'error',
          title: 'Lỗi tải dữ liệu',
          text: 'Không thể tải danh sách dịch vụ của khách sạn!'
        });
        this.cdr.detectChanges(); 
      }
    });
  }

  // --- STATS COMPUTED GETTERS ---
  get totalServices(): number {
    return this.serviceList.length;
  }

  get activeServices(): number {
    return this.serviceList.filter(s => Number(s.status) === 1).length;
  }

  get inactiveServices(): number {
    return this.serviceList.filter(s => Number(s.status) === 0).length;
  }

  get averagePrice(): number {
    if (this.serviceList.length === 0) return 0;
    const total = this.serviceList.reduce((sum, s) => sum + (Number(s.price) || 0), 0);
    return Math.round(total / this.serviceList.length);
  }

  // --- FILTERED LIST ---
  get filteredServices(): any[] {
    return this.serviceList.filter(item => {
      // Lọc theo trạng thái
      if (this.statusFilter === '1' && Number(item.status) !== 1) return false;
      if (this.statusFilter === '0' && Number(item.status) !== 0) return false;

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

  // --- MODAL CONTROLS ---
  openModal(item?: any) {
    if (item) {
      this.isEditMode = true;
      this.currentService = { ...item }; 
      if (!this.currentService.unit) this.currentService.unit = 'Lượt';
    } else {
      this.isEditMode = false;
      this.currentService = { 
        name: '', 
        description: '', 
        price: 50000, 
        unit: 'Lượt', 
        icon: '✨', 
        status: 1 
      }; 
    }
    this.showModal = true;
  }

  closeModal() { 
    this.showModal = false; 
  }

  selectEmoji(emoji: string) {
    this.currentService.icon = emoji;
  }

  saveService() {
    if (!this.currentService.name || !this.currentService.name.trim()) {
      Swal.fire({ icon: 'warning', title: 'Thiếu thông tin', text: 'Vui lòng nhập tên dịch vụ!' });
      return;
    }

    if (this.currentService.price === null || this.currentService.price === undefined || this.currentService.price < 0) {
      Swal.fire({ icon: 'warning', title: 'Giá không hợp lệ', text: 'Đơn giá dịch vụ phải lớn hơn hoặc bằng 0 VND!' });
      return;
    }

    const payload = {
      name: this.currentService.name.trim(),
      description: this.currentService.description ? this.currentService.description.trim() : '',
      price: Number(this.currentService.price),
      unit: this.currentService.unit || 'Lượt',
      icon: this.currentService.icon || '✨',
      status: Number(this.currentService.status)
    };

    Swal.fire({
      title: 'Đang lưu dịch vụ...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    const apiCall = this.isEditMode 
      ? this.partnerService.updateService(this.currentService.id, payload)
      : this.partnerService.addService(payload);

    apiCall.subscribe({
      next: (res: any) => {
        Swal.fire({ 
          icon: 'success', 
          title: 'Thành công!', 
          text: res.message || 'Đã lưu dịch vụ thành công!', 
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
          text: err.error?.message || 'Có lỗi xảy ra khi lưu dịch vụ!' 
        });
      }
    });
  }

  toggleServiceStatus(item: any, newStatus: number) {
    const isActivating = (newStatus === 1);
    const actionText = isActivating ? 'mở cung cấp lại' : 'tạm ngừng cung cấp';
    const confirmColor = isActivating ? '#10b981' : '#ef4444';
    
    Swal.fire({
      title: `Bạn có chắc muốn ${actionText}?`,
      text: isActivating 
        ? `Dịch vụ "${item.name}" sẽ hiển thị trở lại cho khách đặt phòng lựa chọn.`
        : `Dịch vụ "${item.name}" sẽ tạm ẩn khỏi danh sách lựa chọn của khách đặt phòng.`,
      icon: isActivating ? 'question' : 'warning',
      showCancelButton: true,
      confirmButtonColor: confirmColor,
      cancelButtonColor: '#94a3b8',
      confirmButtonText: isActivating ? 'Mở lại ngay' : 'Tạm ngừng',
      cancelButtonText: 'Hủy'
    }).then((result) => {
      if (result.isConfirmed) {
        Swal.fire({
          title: 'Đang cập nhật...',
          allowOutsideClick: false,
          didOpen: () => Swal.showLoading()
        });

        const updatedItem = { ...item, status: newStatus };
        this.partnerService.updateService(item.id, updatedItem).subscribe({
          next: () => {
            Swal.fire({ 
              icon: 'success', 
              title: 'Thành công!', 
              text: `Đã ${actionText} dịch vụ thành công!`, 
              showConfirmButton: false, 
              timer: 1500 
            });
            this.loadData();
          },
          error: (err: any) => {
            Swal.fire({ 
              icon: 'error', 
              title: 'Lỗi', 
              text: err.error?.message || 'Không thể thay đổi trạng thái dịch vụ!' 
            });
          }
        });
      }
    });
  }

  deleteService(item: any) {
    Swal.fire({
      title: `Xóa dịch vụ "${item.name}"?`,
      text: 'Nếu dịch vụ đã từng có đơn đặt phòng, hệ thống sẽ tự động chuyển sang tạm ngừng để lưu trữ lịch sử.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: 'Xác nhận xóa',
      cancelButtonText: 'Hủy'
    }).then((result) => {
      if (result.isConfirmed) {
        Swal.fire({
          title: 'Đang xóa dịch vụ...',
          allowOutsideClick: false,
          didOpen: () => Swal.showLoading()
        });

        this.partnerService.deleteService(item.id).subscribe({
          next: (res: any) => {
            Swal.fire({
              icon: 'success',
              title: 'Thành công!',
              text: res.message || 'Đã xử lý xóa dịch vụ!',
              showConfirmButton: false,
              timer: 1500
            });
            this.loadData();
          },
          error: (err: any) => {
            Swal.fire({
              icon: 'error',
              title: 'Thất bại',
              text: err.error?.message || 'Có lỗi xảy ra khi xóa dịch vụ!'
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