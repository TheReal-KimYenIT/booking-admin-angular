import { Component, OnInit, ChangeDetectorRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { AdminService } from '../../../services/admin.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-admin-amenities',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-amenities.html',
  styleUrl: './admin-amenities.css'
})
export class AdminAmenitiesComponent implements OnInit {
  amenityList: any[] = [];
  filteredList: any[] = [];
  isLoading = true;
  isSubmitting = false;

  // Search & Filters
  searchKeyword = '';
  typeFilter = 'ALL'; // 'ALL' | '1' (Hotel) | '2' (Room)
  usageFilter = 'ALL'; // 'ALL' | 'USED' | 'UNUSED'
  sortBy = 'NEWEST'; // 'NEWEST' | 'OLDEST' | 'NAME_ASC' | 'USAGE_DESC'

  // Modal State
  showModal = false;
  isEditMode = false;
  currentAmenity: any = { name: '', icon: '', type: 1 };

  // Quick Emoji Suggestions
  popularIcons: string[] = [
    '🏊‍♂️', '📶', '🅿️', '🍽️', '❄️', '☕', '🏋️', '🍸', '🚲', '🛎️', '💱', '🔋', '📺', '🧺', '🚭', '🛗'
  ];

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

  loadData() {
    this.isLoading = true;
    this.adminService.getAmenities().subscribe({
      next: (res: any) => {
        this.amenityList = res.data || [];
        this.applyFilter();
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error('Lỗi lấy danh sách tiện ích:', err);
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  applyFilter() {
    const q = (this.searchKeyword || '').trim().toLowerCase();
    let result = this.amenityList.filter(item => {
      // 1. Keyword search
      let matchQuery = true;
      if (q) {
        const name = (item.name || '').toLowerCase();
        const icon = (item.icon || '').toLowerCase();
        const idStr = `#${item.id}`;
        const rawId = String(item.id || '');
        matchQuery = name.includes(q) || icon.includes(q) || idStr.includes(q) || rawId.includes(q);
      }

      // 2. Type filter
      let matchType = true;
      if (this.typeFilter !== 'ALL') {
        matchType = item.type == Number(this.typeFilter);
      }

      // 3. Usage filter
      let matchUsage = true;
      const totalUsage = (Number(item.hotels_count) || 0) + (Number(item.room_types_count) || 0);
      if (this.usageFilter === 'USED') {
        matchUsage = totalUsage > 0;
      } else if (this.usageFilter === 'UNUSED') {
        matchUsage = totalUsage === 0;
      }

      return matchQuery && matchType && matchUsage;
    });

    // 4. Sorting
    if (this.sortBy === 'NEWEST') {
      result.sort((a, b) => (b.id || 0) - (a.id || 0));
    } else if (this.sortBy === 'OLDEST') {
      result.sort((a, b) => (a.id || 0) - (b.id || 0));
    } else if (this.sortBy === 'NAME_ASC') {
      result.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'vi'));
    } else if (this.sortBy === 'USAGE_DESC') {
      result.sort((a, b) => {
        const usageA = (Number(a.hotels_count) || 0) + (Number(a.room_types_count) || 0);
        const usageB = (Number(b.hotels_count) || 0) + (Number(b.room_types_count) || 0);
        return usageB - usageA;
      });
    }

    this.filteredList = result;
  }

  resetFilters() {
    this.searchKeyword = '';
    this.typeFilter = 'ALL';
    this.usageFilter = 'ALL';
    this.sortBy = 'NEWEST';
    this.applyFilter();
  }

  // --- KPI GETTERS (100% computed from real DB data) ---
  get totalAmenities(): number {
    return this.amenityList.length;
  }

  get hotelAmenitiesCount(): number {
    return this.amenityList.filter(a => a.type == 1).length;
  }

  get roomAmenitiesCount(): number {
    return this.amenityList.filter(a => a.type == 2).length;
  }

  get usedAmenitiesCount(): number {
    return this.amenityList.filter(a => ((Number(a.hotels_count) || 0) + (Number(a.room_types_count) || 0)) > 0).length;
  }

  // --- MODAL ACTIONS ---
  openModal(item?: any) {
    if (item) {
      this.isEditMode = true;
      this.currentAmenity = { ...item };
    } else {
      this.isEditMode = false;
      this.currentAmenity = { name: '', icon: '', type: 1 };
    }
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
  }

  get currentAmenityHasUsage(): boolean {
    return ((Number(this.currentAmenity?.hotels_count) || 0) + (Number(this.currentAmenity?.room_types_count) || 0)) > 0;
  }

  selectEmoji(emoji: string) {
    this.currentAmenity.icon = emoji;
  }

  selectType(type: number) {
    if (this.isEditMode && this.currentAmenityHasUsage) {
      return;
    }
    this.currentAmenity.type = type;
  }

  saveAmenity() {
    const trimmedName = (this.currentAmenity.name || '').trim();
    if (!trimmedName) {
      Swal.fire({
        icon: 'warning',
        title: 'Thiếu thông tin',
        text: 'Vui lòng nhập tên tiện ích!',
        confirmButtonColor: '#4f46e5'
      });
      return;
    }

    const payload = {
      name: trimmedName,
      icon: (this.currentAmenity.icon || '').trim() || null,
      type: Number(this.currentAmenity.type) || 1
    };

    this.isSubmitting = true;

    if (this.isEditMode) {
      this.adminService.updateAmenity(this.currentAmenity.id, payload).subscribe({
        next: (res: any) => {
          this.isSubmitting = false;
          Swal.fire({
            icon: 'success',
            title: 'Thành công!',
            text: res.message || 'Cập nhật tiện ích thành công!',
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
            title: 'Lỗi cập nhật',
            text: err.error?.message || 'Lỗi cập nhật tiện ích.',
            confirmButtonText: 'Đóng'
          });
        }
      });
    } else {
      this.adminService.addAmenity(payload).subscribe({
        next: (res: any) => {
          this.isSubmitting = false;
          Swal.fire({
            icon: 'success',
            title: 'Thành công!',
            text: res.message || 'Thêm tiện ích mới thành công!',
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
            title: 'Lỗi thêm mới',
            text: err.error?.message || 'Lỗi thêm mới tiện ích.',
            confirmButtonText: 'Đóng'
          });
        }
      });
    }
  }

  deleteAmenity(item: any) {
    const totalUsage = (Number(item.hotels_count) || 0) + (Number(item.room_types_count) || 0);

    if (totalUsage > 0) {
      Swal.fire({
        icon: 'error',
        title: 'Không thể xóa!',
        html: `Tiện ích <strong>"${item.name}"</strong> hiện đang được liên kết với:<br>` +
          (item.hotels_count > 0 ? `&bull; <strong>${item.hotels_count}</strong> khách sạn<br>` : '') +
          (item.room_types_count > 0 ? `&bull; <strong>${item.room_types_count}</strong> loại phòng<br>` : '') +
          `<small class="text-muted mt-2 d-block">Vui lòng gỡ liên kết khỏi các khách sạn / phòng trước khi xóa.</small>`,
        confirmButtonColor: '#4f46e5'
      });
      return;
    }

    Swal.fire({
      title: 'Xóa tiện ích này?',
      html: `Bạn có chắc chắn muốn xóa vĩnh viễn tiện ích <strong>"${item.name}"</strong>?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: '<i class="bi bi-trash3-fill me-1"></i> Xóa Tiện Ích',
      cancelButtonText: 'Hủy Bỏ'
    }).then((result) => {
      if (result.isConfirmed) {
        this.adminService.deleteAmenity(item.id).subscribe({
          next: (res: any) => {
            Swal.fire({
              icon: 'success',
              title: 'Đã xóa!',
              text: res.message || 'Xóa tiện ích thành công!',
              showConfirmButton: false,
              timer: 1500
            });
            this.loadData();
          },
          error: (err: any) => {
            Swal.fire({
              icon: 'error',
              title: 'Lỗi xóa',
              text: err.error?.message || 'Không thể xóa tiện ích này.',
              confirmButtonText: 'Đóng'
            });
          }
        });
      }
    });
  }
}