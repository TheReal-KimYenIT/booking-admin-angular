import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PartnerService } from '../../../services/partner.service';
import Swal from 'sweetalert2';
import { Router } from '@angular/router';

@Component({
  selector: 'app-partner-staff',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './partner-staff.html',
  styleUrls: ['./partner-staff.css']
})
export class PartnerStaffComponent implements OnInit {
  staffs: any[] = [];
  roles: any[] = [];
  isLoading = true;
  isSubmitting = false;

  // Filter & Search
  searchKeyword: string = '';
  selectedRoleId: any = 'all';
  selectedStatus: string = 'all';

  // Modal
  showModal = false;
  isEditMode = false;
  showPassword = false;

  formData = {
    id: null as number | null,
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    phone: '',
    role_id: null as number | null,
    is_active: 1
  };

  private readonly avatarColors = [
    'linear-gradient(135deg, #4f46e5, #7c3aed)',
    'linear-gradient(135deg, #0284c7, #2563eb)',
    'linear-gradient(135deg, #059669, #10b981)',
    'linear-gradient(135deg, #d97706, #f59e0b)',
    'linear-gradient(135deg, #e11d48, #f43f5e)',
    'linear-gradient(135deg, #7c2d12, #c2410c)',
    'linear-gradient(135deg, #475569, #64748b)'
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
      // Chỉ Chủ KS (role_id === 1) mới được quản lý tài khoản nhân viên
      if (Number(user.role_id) !== 1) {
        Swal.fire({
          icon: 'error',
          title: 'Từ chối truy cập',
          text: 'Chỉ Chủ khách sạn mới có quyền quản lý tài khoản nhân viên!',
          confirmButtonColor: '#4f46e5'
        });
        this.router.navigate(['/dashboard/room-matrix']);
        return;
      }
    }

    this.loadRoles();
    this.loadStaffs();
  }

  loadRoles(): void {
    this.partnerService.getRoles().subscribe({
      next: (res: any) => {
        this.roles = res.data || [];
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Lỗi tải danh sách nhóm quyền:', err);
      }
    });
  }

  loadStaffs(): void {
    this.isLoading = true;
    this.partnerService.getStaffs().subscribe({
      next: (res: any) => {
        this.staffs = res.data || [];
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Lỗi tải danh sách nhân viên:', err);
        Swal.fire({
          icon: 'error',
          title: 'Lỗi',
          text: 'Không thể tải danh sách nhân sự hoặc phiên đăng nhập hết hạn.',
          confirmButtonColor: '#4f46e5'
        });
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  // ==========================================
  // COMPUTED GETTERS
  // ==========================================
  get totalStaff(): number {
    return this.staffs.length;
  }

  get activeStaff(): number {
    return this.staffs.filter(s => Number(s.is_active) === 1).length;
  }

  get inactiveStaff(): number {
    return this.staffs.filter(s => Number(s.is_active) === 0).length;
  }

  get totalRolesUsed(): number {
    const roleIdSet = new Set(this.staffs.map(s => s.role_id).filter(id => !!id));
    return roleIdSet.size;
  }

  get filteredStaffs(): any[] {
    return this.staffs.filter(staff => {
      // 1. Tìm theo từ khóa
      if (this.searchKeyword.trim()) {
        const kw = this.searchKeyword.toLowerCase().trim();
        const fullName = `${staff.last_name || ''} ${staff.first_name || ''}`.toLowerCase();
        const email = (staff.email || '').toLowerCase();
        const phone = (staff.phone || '').toLowerCase();
        const roleName = (staff.role?.name || '').toLowerCase();

        const matchKw = fullName.includes(kw) || email.includes(kw) || phone.includes(kw) || roleName.includes(kw);
        if (!matchKw) return false;
      }

      // 2. Lọc theo nhóm quyền
      if (this.selectedRoleId !== 'all') {
        if (Number(staff.role_id) !== Number(this.selectedRoleId)) return false;
      }

      // 3. Lọc theo trạng thái
      if (this.selectedStatus === 'active' && Number(staff.is_active) !== 1) return false;
      if (this.selectedStatus === 'inactive' && Number(staff.is_active) !== 0) return false;

      return true;
    });
  }

  resetFilters(): void {
    this.searchKeyword = '';
    this.selectedRoleId = 'all';
    this.selectedStatus = 'all';
    this.cdr.detectChanges();
  }

  // ==========================================
  // MODAL ACTIONS
  // ==========================================
  openAddModal(): void {
    this.isEditMode = false;
    this.showPassword = false;
    const defaultRoleId = this.roles.length > 0 ? this.roles[0].id : null;

    this.formData = {
      id: null,
      first_name: '',
      last_name: '',
      email: '',
      password: '',
      phone: '',
      role_id: defaultRoleId,
      is_active: 1
    };

    this.showModal = true;
    this.cdr.detectChanges();
  }

  openEditModal(staff: any): void {
    this.isEditMode = true;
    this.showPassword = false;

    this.formData = {
      id: staff.id,
      first_name: staff.first_name || '',
      last_name: staff.last_name || '',
      email: staff.email || '',
      password: '',
      phone: staff.phone || '',
      role_id: staff.role_id || null,
      is_active: Number(staff.is_active) === 1 ? 1 : 0
    };

    this.showModal = true;
    this.cdr.detectChanges();
  }

  closeModal(): void {
    this.showModal = false;
    this.cdr.detectChanges();
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  saveStaff(): void {
    const fn = (this.formData.first_name || '').trim();
    const ln = (this.formData.last_name || '').trim();
    const email = (this.formData.email || '').trim();
    const phone = (this.formData.phone || '').trim();
    const pwd = this.formData.password || '';

    // Validation
    if (!ln) {
      Swal.fire('Thiếu thông tin', 'Vui lòng nhập Họ và tên đệm của nhân viên.', 'warning');
      return;
    }
    if (!fn) {
      Swal.fire('Thiếu thông tin', 'Vui lòng nhập Tên của nhân viên.', 'warning');
      return;
    }
    if (!this.formData.role_id) {
      Swal.fire('Thiếu thông tin', 'Vui lòng chọn Nhóm quyền vai trò cho nhân viên.', 'warning');
      return;
    }

    if (!this.isEditMode) {
      if (!email) {
        Swal.fire('Thiếu thông tin', 'Vui lòng nhập Email đăng nhập cho nhân viên.', 'warning');
        return;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        Swal.fire('Email không hợp lệ', 'Vui lòng nhập đúng định dạng email (ví dụ: staff@hotel.com).', 'warning');
        return;
      }

      if (!pwd) {
        Swal.fire('Thiếu mật khẩu', 'Vui lòng đặt mật khẩu khởi tạo cho tài khoản nhân viên.', 'warning');
        return;
      }
      if (pwd.length < 8) {
        Swal.fire('Mật khẩu quá ngắn', 'Mật khẩu phải chứa ít nhất 8 ký tự.', 'warning');
        return;
      }
      const pwdRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/;
      if (!pwdRegex.test(pwd)) {
        Swal.fire('Độ bảo mật mật khẩu', 'Mật khẩu phải chứa ít nhất 1 chữ hoa, 1 chữ thường và 1 số.', 'warning');
        return;
      }
    } else {
      // Khi chỉnh sửa, nếu có nhập mật khẩu mới
      if (pwd) {
        if (pwd.length < 8) {
          Swal.fire('Mật khẩu quá ngắn', 'Mật khẩu mới phải chứa ít nhất 8 ký tự.', 'warning');
          return;
        }
        const pwdRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/;
        if (!pwdRegex.test(pwd)) {
          Swal.fire('Độ bảo mật mật khẩu', 'Mật khẩu phải chứa ít nhất 1 chữ hoa, 1 chữ thường và 1 số.', 'warning');
          return;
        }
      }
    }

    this.isSubmitting = true;

    const payload: any = {
      first_name: fn,
      last_name: ln,
      phone: phone || null,
      role_id: Number(this.formData.role_id),
      is_active: Number(this.formData.is_active)
    };

    if (!this.isEditMode) {
      payload.email = email;
      payload.password = pwd;
    } else if (pwd) {
      payload.password = pwd;
    }

    const req$ = this.isEditMode
      ? this.partnerService.updateStaff(this.formData.id!, payload)
      : this.partnerService.createStaff(payload);

    req$.subscribe({
      next: (res: any) => {
        this.isSubmitting = false;
        Swal.fire({
          icon: 'success',
          title: 'Thành công',
          text: res.message || 'Đã lưu thông tin nhân viên thành công!',
          timer: 2000,
          showConfirmButton: false
        });
        this.closeModal();
        this.loadStaffs();
      },
      error: (err: any) => {
        this.isSubmitting = false;
        console.error('Lỗi lưu nhân viên:', err);
        let errorMsg = 'Có lỗi xảy ra khi lưu thông tin nhân viên.';
        if (err.error?.errors) {
          const firstKey = Object.keys(err.error.errors)[0];
          errorMsg = err.error.errors[firstKey][0];
        } else if (err.error?.message) {
          errorMsg = err.error.message;
        }
        Swal.fire({
          icon: 'error',
          title: 'Không thể lưu',
          text: errorMsg,
          confirmButtonColor: '#4f46e5'
        });
        this.cdr.detectChanges();
      }
    });
  }

  toggleStatus(staff: any): void {
    const isCurrentlyActive = Number(staff.is_active) === 1;
    const actionText = isCurrentlyActive ? 'Tạm khóa' : 'Mở khóa kích hoạt';
    const confirmButtonText = isCurrentlyActive ? 'Đồng ý khóa' : 'Kích hoạt ngay';
    const confirmColor = isCurrentlyActive ? '#d97706' : '#059669';

    Swal.fire({
      title: `${actionText} tài khoản?`,
      text: isCurrentlyActive
        ? `Nhân viên "${staff.last_name} ${staff.first_name}" sẽ bị từ chối quyền đăng nhập vào hệ thống.`
        : `Nhân viên "${staff.last_name} ${staff.first_name}" sẽ được phép đăng nhập trở lại.`,
      icon: isCurrentlyActive ? 'warning' : 'question',
      showCancelButton: true,
      confirmButtonText: confirmButtonText,
      cancelButtonText: 'Hủy bỏ',
      confirmButtonColor: confirmColor,
      cancelButtonColor: '#64748b'
    }).then((result) => {
      if (result.isConfirmed) {
        this.partnerService.toggleStaffStatus(staff.id).subscribe({
          next: (res: any) => {
            staff.is_active = res.data ? res.data.is_active : (isCurrentlyActive ? 0 : 1);
            Swal.fire({
              icon: 'success',
              title: 'Thành công',
              text: res.message || 'Cập nhật trạng thái thành công!',
              timer: 1800,
              showConfirmButton: false
            });
            this.cdr.detectChanges();
          },
          error: (err) => {
            console.error('Lỗi chuyển trạng thái nhân viên:', err);
            Swal.fire('Lỗi', err.error?.message || 'Không thể đổi trạng thái nhân viên', 'error');
          }
        });
      }
    });
  }

  deleteStaff(staff: any): void {
    Swal.fire({
      title: 'Xác nhận xóa tài khoản?',
      html: `Bạn có chắc muốn xóa nhân viên <strong class="text-danger">${staff.last_name} ${staff.first_name}</strong>?<br><small class="text-muted">Hành động này không thể hoàn tác và nhân viên sẽ mất toàn bộ quyền truy cập.</small>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Xóa vĩnh viễn',
      cancelButtonText: 'Giữ lại',
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b'
    }).then((result) => {
      if (result.isConfirmed) {
        this.partnerService.deleteStaff(staff.id).subscribe({
          next: (res: any) => {
            Swal.fire({
              icon: 'success',
              title: 'Đã xóa!',
              text: res.message || 'Tài khoản nhân viên đã được xóa khỏi hệ thống.',
              timer: 2000,
              showConfirmButton: false
            });
            this.staffs = this.staffs.filter(s => s.id !== staff.id);
            this.cdr.detectChanges();
          },
          error: (err: any) => {
            console.error('Lỗi xóa nhân viên:', err);
            Swal.fire('Lỗi', err.error?.message || 'Không thể xóa nhân viên', 'error');
          }
        });
      }
    });
  }

  // ==========================================
  // PRESENTATION HELPERS
  // ==========================================
  getInitials(staff: any): string {
    const fn = (staff.first_name || '').trim();
    const ln = (staff.last_name || '').trim();
    if (ln && fn) {
      return `${ln.charAt(0)}${fn.charAt(0)}`.toUpperCase();
    }
    if (fn) return fn.substring(0, 2).toUpperCase();
    if (ln) return ln.substring(0, 2).toUpperCase();
    return (staff.email || 'NV').substring(0, 2).toUpperCase();
  }

  getAvatarBg(staff: any): string {
    const id = Number(staff.id) || 0;
    return this.avatarColors[id % this.avatarColors.length];
  }

  getRolePermissionsCount(staff: any): number {
    if (staff.role?.permissions && Array.isArray(staff.role.permissions)) {
      return staff.role.permissions.length;
    }
    const matchedRole = this.roles.find(r => r.id === staff.role_id);
    if (matchedRole?.permissions && Array.isArray(matchedRole.permissions)) {
      return matchedRole.permissions.length;
    }
    return 0;
  }
}
