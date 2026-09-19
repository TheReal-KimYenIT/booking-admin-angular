import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import { PartnerService } from '../../../services/partner.service';

@Component({
  selector: 'app-partner-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './partner-profile.html',
  styleUrls: ['./partner-profile.css']
})
export class PartnerProfileComponent implements OnInit {
  activeTab: 'profile' | 'security' = 'profile';
  isLoading = true;
  isUpdatingProfile = false;
  isChangingPassword = false;

  // Show/Hide password flags
  showCurrentPassword = false;
  showNewPassword = false;
  showConfirmPassword = false;

  profileData: any = {
    id: null,
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    role_id: null,
    role: null,
    hotel: null,
    created_at: null,
    is_active: 1
  };

  passwordData = {
    current_password: '',
    new_password: '',
    new_password_confirmation: ''
  };

  constructor(
    private partnerService: PartnerService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadProfile();
  }

  loadProfile(): void {
    this.isLoading = true;
    this.partnerService.getProfile().subscribe({
      next: (res: any) => {
        if (res && res.data) {
          const u = res.data;
          this.profileData = {
            id: u.id,
            first_name: u.first_name || '',
            last_name: u.last_name || '',
            email: u.email || '',
            phone: u.phone || '',
            role_id: u.role_id,
            role: u.role,
            hotel: u.hotel,
            created_at: u.created_at,
            is_active: u.is_active ?? 1
          };
        }
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Lỗi tải hồ sơ cá nhân:', err);
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  // ==========================================
  // COMPUTED GETTERS
  // ==========================================
  get isOwner(): boolean {
    return Number(this.profileData.role_id) === 1 || !this.profileData.role_id;
  }

  get userInitials(): string {
    const fn = (this.profileData.first_name || '').trim();
    const ln = (this.profileData.last_name || '').trim();
    if (ln && fn) return `${ln.charAt(0)}${fn.charAt(0)}`.toUpperCase();
    if (fn) return fn.substring(0, 2).toUpperCase();
    if (ln) return ln.substring(0, 2).toUpperCase();
    return (this.profileData.email || 'AD').substring(0, 2).toUpperCase();
  }

  get roleBadgeName(): string {
    if (this.isOwner) return 'Chủ Khách Sạn (Owner)';
    return this.profileData.role?.name || 'Nhân viên';
  }

  get hotelDisplayName(): string {
    return this.profileData.hotel?.name || 'Khách sạn liên kết';
  }

  // Password validation getters
  get hasMinLength(): boolean {
    return (this.passwordData.new_password || '').length >= 8;
  }

  get hasUpper(): boolean {
    return /[A-Z]/.test(this.passwordData.new_password || '');
  }

  get hasLower(): boolean {
    return /[a-z]/.test(this.passwordData.new_password || '');
  }

  get hasNumber(): boolean {
    return /\d/.test(this.passwordData.new_password || '');
  }

  get isMatched(): boolean {
    return !!this.passwordData.new_password &&
      this.passwordData.new_password === this.passwordData.new_password_confirmation;
  }

  // ==========================================
  // TAB SELECTION
  // ==========================================
  switchTab(tab: 'profile' | 'security'): void {
    this.activeTab = tab;
    this.cdr.detectChanges();
  }

  // ==========================================
  // PROFILE ACTIONS
  // ==========================================
  updateProfile(): void {
    const fn = (this.profileData.first_name || '').trim();
    const ln = (this.profileData.last_name || '').trim();
    const phone = (this.profileData.phone || '').trim();

    if (!ln) {
      Swal.fire('Thiếu thông tin', 'Vui lòng nhập họ và tên đệm của bạn.', 'warning');
      return;
    }
    if (!fn) {
      Swal.fire('Thiếu thông tin', 'Vui lòng nhập tên của bạn.', 'warning');
      return;
    }

    if (phone) {
      const phoneRegex = /^[0-9\s\-\+\(\)]{8,15}$/;
      if (!phoneRegex.test(phone)) {
        Swal.fire('Số điện thoại không hợp lệ', 'Vui lòng nhập số điện thoại hợp lệ (8 - 15 số).', 'warning');
        return;
      }
    }

    this.isUpdatingProfile = true;

    this.partnerService.updateProfile({
      first_name: fn,
      last_name: ln,
      phone: phone || null
    }).subscribe({
      next: (res: any) => {
        this.isUpdatingProfile = false;
        Swal.fire({
          icon: 'success',
          title: 'Thành công!',
          text: res.message || 'Cập nhật hồ sơ tài khoản thành công!',
          timer: 2000,
          showConfirmButton: false
        });

        // Cập nhật localStorage
        const currentUserStr = localStorage.getItem('partner_user');
        if (currentUserStr) {
          const currentUser = JSON.parse(currentUserStr);
          currentUser.first_name = fn;
          currentUser.last_name = ln;
          currentUser.phone = phone;
          localStorage.setItem('partner_user', JSON.stringify(currentUser));
        }

        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.isUpdatingProfile = false;
        console.error('Lỗi cập nhật hồ sơ:', err);
        Swal.fire({
          icon: 'error',
          title: 'Lỗi',
          text: err.error?.message || 'Không thể cập nhật thông tin tài khoản!',
          confirmButtonColor: '#4f46e5'
        });
        this.cdr.detectChanges();
      }
    });
  }

  // ==========================================
  // PASSWORD ACTIONS
  // ==========================================
  changePassword(): void {
    const cur = this.passwordData.current_password;
    const np = this.passwordData.new_password;
    const cf = this.passwordData.new_password_confirmation;

    if (!cur) {
      Swal.fire('Thiếu mật khẩu hiện tại', 'Vui lòng nhập mật khẩu hiện tại của bạn.', 'warning');
      return;
    }
    if (!np) {
      Swal.fire('Thiếu mật khẩu mới', 'Vui lòng nhập mật khẩu mới.', 'warning');
      return;
    }
    if (!cf) {
      Swal.fire('Thiếu xác nhận mật khẩu', 'Vui lòng nhập lại mật khẩu mới để xác nhận.', 'warning');
      return;
    }

    if (np.length < 8) {
      Swal.fire('Mật khẩu quá ngắn', 'Mật khẩu mới phải có ít nhất 8 ký tự.', 'warning');
      return;
    }

    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/;
    if (!regex.test(np)) {
      Swal.fire('Độ bảo mật mật khẩu', 'Mật khẩu mới phải chứa ít nhất 1 chữ hoa, 1 chữ thường và 1 số.', 'warning');
      return;
    }

    if (np !== cf) {
      Swal.fire('Mật khẩu không khớp', 'Mật khẩu xác nhận không trùng khớp với mật khẩu mới.', 'warning');
      return;
    }

    this.isChangingPassword = true;

    this.partnerService.changePassword(this.passwordData).subscribe({
      next: (res: any) => {
        this.isChangingPassword = false;
        Swal.fire({
          icon: 'success',
          title: 'Thành công!',
          text: res.message || 'Đổi mật khẩu thành công! Hãy ghi nhớ mật khẩu mới cho các lần đăng nhập sau.',
          confirmButtonColor: '#4f46e5'
        });
        this.passwordData = {
          current_password: '',
          new_password: '',
          new_password_confirmation: ''
        };
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.isChangingPassword = false;
        console.error('Lỗi đổi mật khẩu:', err);
        Swal.fire({
          icon: 'error',
          title: 'Thất bại',
          text: err.error?.message || 'Không thể đổi mật khẩu!',
          confirmButtonColor: '#4f46e5'
        });
        this.cdr.detectChanges();
      }
    });
  }
}