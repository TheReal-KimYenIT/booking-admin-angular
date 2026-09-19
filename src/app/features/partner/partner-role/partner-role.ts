import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PartnerService } from '../../../services/partner.service';
import Swal from 'sweetalert2';
import { Router } from '@angular/router';

@Component({
  selector: 'app-partner-role',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './partner-role.html',
  styleUrls: ['./partner-role.css']
})
export class PartnerRoleComponent implements OnInit {
  roles: any[] = [];
  isLoading: boolean = true;
  showModal: boolean = false;
  isEditMode: boolean = false;
  searchKeyword: string = '';

  formData = {
    id: null as number | null,
    name: '',
    permissions: [] as string[]
  };

  // Phân loại nhóm quyền logic theo nghiệp vụ quản lý khách sạn
  permissionCategories = [
    {
      name: 'Vận Hành & Đặt Phòng',
      icon: 'bi-door-open-fill',
      badgeClass: 'bg-indigo-50 text-indigo-700',
      permissions: [
        { key: 'room_matrix', name: 'Sơ đồ & Số phòng', desc: 'Xem và điều phối trạng thái buồng phòng' },
        { key: 'room_types', name: 'Quản lý Loại phòng', desc: 'Cấu hình hạng phòng, giá niêm yết, số lượng' },
        { key: 'bookings', name: 'Quản lý Đơn hàng', desc: 'Xử lý đặt phòng, check-in, check-out, thanh toán' },
        { key: 'refunds', name: 'Quản lý Hoàn tiền', desc: 'Tiếp nhận và xác nhận hoàn tiền hủy phòng' },
        { key: 'partner_surcharge', name: 'Quản lý Phụ thu', desc: 'Thiết lập danh mục phí phát sinh' }
      ]
    },
    {
      name: 'Dịch Vụ & Vật Tư',
      icon: 'bi-cup-hot-fill',
      badgeClass: 'bg-amber-50 text-amber-700',
      permissions: [
        { key: 'hotel_amenities', name: 'Tiện ích Khách sạn', desc: 'Cập nhật tiện ích chung (Hồ bơi, Gym...)' },
        { key: 'services', name: 'Dịch vụ đi kèm', desc: 'Quản lý menu ẩm thực, giặt ủi, spa...' },
        { key: 'minibar', name: 'Quản lý Minibar', desc: 'Danh mục và giá thức uống trong phòng' },
        { key: 'supplies', name: 'Quản lý Vật tư', desc: 'Theo dõi hàng tồn kho vật tư buồng phòng' },
        { key: 'promotions', name: 'Mã Khuyến mãi', desc: 'Thiết lập voucher giảm giá phòng' }
      ]
    },
    {
      name: 'Khách Hàng & Hỗ Trợ',
      icon: 'bi-people-fill',
      badgeClass: 'bg-blue-50 text-blue-700',
      permissions: [
        { key: 'customers', name: 'Hồ sơ Khách hàng', desc: 'Tra cứu thông tin và lịch sử lưu trú' },
        { key: 'reviews', name: 'Quản lý Đánh giá', desc: 'Xem và gửi phản hồi đánh giá từ khách' },
        { key: 'support', name: 'Tin nhắn Hỗ trợ', desc: 'Chat trực tuyến và hỗ trợ khách lưu trú' }
      ]
    },
    {
      name: 'Báo Cáo & Quản Trị',
      icon: 'bi-shield-lock-fill',
      badgeClass: 'bg-emerald-50 text-emerald-700',
      permissions: [
        { key: 'overview', name: 'Thống kê & Tổng quan', desc: 'Xem biểu đồ doanh thu và công suất phòng' },
        { key: 'hotel', name: 'Hồ sơ Khách sạn', desc: 'Chỉnh sửa thông tin, chính sách khách sạn' },
        { key: 'staffs', name: 'Quản lý Nhân viên', desc: 'Thêm tài khoản và phân quyền nhân sự' },
        { key: 'roles', name: 'Quản lý Phân quyền', desc: 'Tạo nhóm vai trò và cấp quyền hệ thống' }
      ]
    }
  ];

  constructor(
    private router: Router,
    private partnerService: PartnerService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const userStr = localStorage.getItem('partner_user');
    if (userStr) {
      const user = JSON.parse(userStr);
      if (Number(user.role_id) !== 1) {
        Swal.fire('Từ chối truy cập', 'Chỉ Chủ khách sạn mới có quyền quản lý nhóm quyền!', 'error');
        this.router.navigate(['/dashboard/room-matrix']);
        return;
      }
    }
    this.loadRoles();
  }

  get allPermissions(): any[] {
    return this.permissionCategories.flatMap(c => c.permissions);
  }

  get totalStaffAssigned(): number {
    return this.roles.reduce((sum, r) => sum + (r.staffs_count || 0), 0);
  }

  get filteredRoles(): any[] {
    if (!this.searchKeyword.trim()) return this.roles;
    const kw = this.searchKeyword.trim().toLowerCase();
    return this.roles.filter(r => r.name.toLowerCase().includes(kw));
  }

  getRolePermissionsList(role: any): string {
    if (!role.permissions || role.permissions.length === 0) return 'Chưa cấp quyền nào';
    return role.permissions
      .map((k: string) => this.allPermissions.find(p => p.key === k)?.name || k)
      .join(', ');
  }

  loadRoles(): void {
    this.isLoading = true;
    this.partnerService.getRoles().subscribe({
      next: (res: any) => {
        this.roles = res.data || [];
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  openAddModal(): void {
    this.isEditMode = false;
    this.formData = { id: null, name: '', permissions: [] };
    this.showModal = true;
  }

  openEditModal(role: any): void {
    this.isEditMode = true;
    this.formData = { 
      id: role.id, 
      name: role.name, 
      permissions: Array.isArray(role.permissions) ? [...role.permissions] : [] 
    };
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
  }

  togglePermission(key: string, event: any): void {
    const isChecked = event.target.checked;
    if (isChecked) {
      if (!this.formData.permissions.includes(key)) {
        this.formData.permissions.push(key);
      }
    } else {
      this.formData.permissions = this.formData.permissions.filter(p => p !== key);
    }
  }

  hasPermission(key: string): boolean {
    return this.formData.permissions.includes(key);
  }

  selectAllPermissions(): void {
    this.formData.permissions = this.allPermissions.map(p => p.key);
  }

  deselectAllPermissions(): void {
    this.formData.permissions = [];
  }

  isCategoryAllSelected(cat: any): boolean {
    return cat.permissions.every((p: any) => this.formData.permissions.includes(p.key));
  }

  toggleCategory(cat: any): void {
    const allSelected = this.isCategoryAllSelected(cat);
    if (allSelected) {
      const keysToRemove = cat.permissions.map((p: any) => p.key);
      this.formData.permissions = this.formData.permissions.filter(k => !keysToRemove.includes(k));
    } else {
      cat.permissions.forEach((p: any) => {
        if (!this.formData.permissions.includes(p.key)) {
          this.formData.permissions.push(p.key);
        }
      });
    }
  }

  saveRole(): void {
    if (!this.formData.name.trim()) {
      Swal.fire('Chú ý', 'Vui lòng nhập tên nhóm quyền (Ví dụ: Lễ tân, Buồng phòng...)', 'warning');
      return;
    }

    if (this.formData.permissions.length === 0) {
      Swal.fire('Chú ý', 'Vui lòng chọn ít nhất 1 quyền truy cập cho nhóm này.', 'warning');
      return;
    }

    const payload = {
      name: this.formData.name.trim(),
      permissions: this.formData.permissions
    };

    const req = this.isEditMode 
      ? this.partnerService.updateRole(this.formData.id!, payload)
      : this.partnerService.createRole(payload);

    req.subscribe({
      next: (res: any) => {
        Swal.fire({
          icon: 'success',
          title: 'Thành công',
          text: res.message || 'Đã lưu nhóm quyền thành công!',
          timer: 1500,
          showConfirmButton: false
        });
        this.closeModal();
        this.loadRoles();
      },
      error: (err) => Swal.fire('Lỗi', err.error?.message || 'Có lỗi xảy ra khi lưu nhóm quyền', 'error')
    });
  }

  deleteRole(role: any): void {
    if (role.staffs_count > 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Không thể xóa',
        text: `Nhóm quyền "${role.name}" đang có ${role.staffs_count} nhân viên sử dụng. Vui lòng chuyển nhân viên sang nhóm khác trước khi xóa!`
      });
      return;
    }

    Swal.fire({
      title: `Xóa nhóm "${role.name}"?`,
      text: 'Hành động này không thể khôi phục.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Đồng ý xóa',
      cancelButtonText: 'Hủy',
      confirmButtonColor: '#ef4444'
    }).then((result) => {
      if (result.isConfirmed) {
        this.partnerService.deleteRole(role.id).subscribe({
          next: () => {
            Swal.fire({
              icon: 'success',
              title: 'Đã xóa thành công',
              timer: 1400,
              showConfirmButton: false
            });
            this.loadRoles();
          },
          error: (err) => Swal.fire('Lỗi', err.error?.message || 'Không thể xóa nhóm quyền', 'error')
        });
      }
    });
  }
}