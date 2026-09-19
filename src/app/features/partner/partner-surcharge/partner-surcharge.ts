import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PartnerService } from '../../../services/partner.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-partner-surcharge',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './partner-surcharge.html',
  styleUrl: './partner-surcharge.css'
})
export class PartnerSurchargeComponent implements OnInit {
  list: any[] = [];
  isLoading = false;
  showModal = false;
  isEdit = false;
  isSaving = false;

  // Tìm kiếm
  searchTerm: string = '';

  item: any = {
    id: null,
    name: '',
    description: ''
  };

  // Các mẫu phụ thu thông dụng gợi ý sẵn (Chỉ hỗ trợ điền nhanh Tên & Mô tả)
  presets = [
    {
      name: 'Check-in sớm',
      description: 'Phụ thu 30% - 50% giá phòng tùy thuộc vào khung giờ nhận phòng sớm thực tế.'
    },
    {
      name: 'Check-out trễ',
      description: 'Phụ thu 100.000đ/giờ đến 15:00. Sau 18:00 tính 100% giá phòng một đêm.'
    },
    {
      name: 'Phụ thu thêm người lớn',
      description: 'Phụ thu 250.000đ/người/đêm (đã bao gồm phí tiện ích và suất ăn sáng).'
    },
    {
      name: 'Kê thêm giường phụ (Extra bed)',
      description: 'Phụ thu 350.000đ/giường/đêm, bao gồm nệm phụ, chăn ga gối và suất ăn sáng.'
    },
    {
      name: 'Phí đỗ xe ô tô qua đêm',
      description: 'Phụ thu bãi đỗ xe ngoài 100.000đ/xe/đêm cho các dòng xe khách cỡ lớn.'
    },
    {
      name: 'Phí trang trí phòng sự kiện/sinh nhật',
      description: 'Phụ thu dọn dẹp 200.000đ/lần nếu khách tự dán bóng bay, pháo giấy, kim tuyến trong phòng.'
    },
    {
      name: 'Phí dọn phòng đặc biệt / khử mùi',
      description: 'Phụ thu xử lý vết bẩn cứng đầu hoặc khử mùi khói thuốc trong phòng: 300.000đ/lần.'
    },
    {
      name: 'Phí đền bù hư hại tài sản',
      description: 'Áp dụng theo bảng giá đền bù tài sản hư hỏng hoặc mất mát trong phòng của khách sạn.'
    }
  ];

  constructor(
    private router: Router,
    private partnerService: PartnerService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Kiểm tra phân quyền: Lễ tân (role_id = 3) không có quyền thiết lập loại phụ thu
    const userStr = localStorage.getItem('partner_user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        if (Number(user.role_id) === 3) {
          Swal.fire('Từ chối truy cập', 'Bạn là Lễ tân, không có quyền thiết lập danh mục phụ thu!', 'error');
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

    this.partnerService.getSurchargeCategories().subscribe({
      next: (res: any) => {
        if (res && res.data && Array.isArray(res.data)) {
          this.list = res.data;
        } else if (Array.isArray(res)) {
          this.list = res;
        } else {
          this.list = [];
        }
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Lỗi API surcharge categories:', err);
        this.isLoading = false;
        Swal.fire({
          icon: 'error',
          title: 'Lỗi tải dữ liệu',
          text: 'Không thể tải danh mục phụ thu từ máy chủ!'
        });
        this.cdr.detectChanges();
      }
    });
  }

  // --- STATS THỰC TẾ DỰA TRÊN DỮ LIỆU CSDL ---
  get totalCategories(): number {
    return this.list.length;
  }

  get withDescCount(): number {
    return this.list.filter(item => item.description && item.description.trim()).length;
  }

  get withoutDescCount(): number {
    return this.list.filter(item => !item.description || !item.description.trim()).length;
  }

  // --- DANH SÁCH LỌC THEO TỪ KHÓA TÌM KIẾM ---
  get filteredList(): any[] {
    if (!this.searchTerm.trim()) {
      return this.list;
    }
    const query = this.searchTerm.toLowerCase().trim();
    return this.list.filter(item => {
      const matchName = item.name?.toLowerCase().includes(query);
      const matchDesc = item.description?.toLowerCase().includes(query);
      return matchName || matchDesc;
    });
  }

  // --- MODAL & PRESETS ---
  openModal(data: any = null) {
    if (data) {
      this.isEdit = true;
      this.item = { ...data };
    } else {
      this.isEdit = false;
      this.item = { id: null, name: '', description: '' };
    }
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
  }

  applyPreset(preset: any) {
    this.item.name = preset.name;
    this.item.description = preset.description;
  }

  save() {
    if (!this.item.name || !this.item.name.trim()) {
      Swal.fire({ icon: 'warning', title: 'Thiếu thông tin', text: 'Vui lòng nhập tên loại phụ thu!' });
      return;
    }

    if (this.isSaving) return;
    this.isSaving = true;

    Swal.fire({
      title: 'Đang lưu loại phụ thu...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    const payload = {
      name: this.item.name.trim(),
      description: this.item.description ? this.item.description.trim() : ''
    };

    const apiCall = this.isEdit
      ? this.partnerService.updateSurchargeCategory(this.item.id, payload)
      : this.partnerService.addSurchargeCategory(payload);

    apiCall.subscribe({
      next: () => {
        this.isSaving = false;
        Swal.fire({
          icon: 'success',
          title: 'Thành công!',
          text: this.isEdit ? 'Đã cập nhật loại phụ thu!' : 'Đã thêm mới loại phụ thu!',
          showConfirmButton: false,
          timer: 1500
        });
        this.closeModal();
        this.loadData();
      },
      error: (err) => {
        this.isSaving = false;
        console.error('Lỗi khi lưu phụ thu:', err);
        Swal.fire({
          icon: 'error',
          title: 'Thất bại',
          text: err.error?.message || 'Có lỗi xảy ra khi lưu loại phụ thu!'
        });
      }
    });
  }

  delete(cat: any) {
    Swal.fire({
      title: `Xóa "${cat.name}"?`,
      text: 'Hệ thống sẽ kiểm tra: nếu loại phụ thu này đã từng phát sinh trong hóa đơn thanh toán của khách, hệ thống sẽ bảo vệ dữ liệu và từ chối xóa.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: 'Xác nhận xóa',
      cancelButtonText: 'Hủy'
    }).then((result) => {
      if (result.isConfirmed) {
        Swal.fire({
          title: 'Đang xóa loại phụ thu...',
          allowOutsideClick: false,
          didOpen: () => Swal.showLoading()
        });

        this.partnerService.deleteSurchargeCategory(cat.id).subscribe({
          next: () => {
            Swal.fire({
              icon: 'success',
              title: 'Đã xóa!',
              text: 'Loại phụ thu đã được xóa khỏi danh mục.',
              showConfirmButton: false,
              timer: 1500
            });
            this.loadData();
          },
          error: (err) => {
            Swal.fire({
              icon: 'error',
              title: 'Không thể xóa',
              text: err.error?.message || 'Không thể xóa do loại phụ thu này đang được sử dụng trong hóa đơn của khách!'
            });
          }
        });
      }
    });
  }
}