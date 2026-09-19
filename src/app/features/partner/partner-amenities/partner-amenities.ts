import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PartnerService } from '../../../services/partner.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-partner-amenities',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './partner-amenities.html',
  styleUrl: './partner-amenities.css'
})
export class PartnerAmenitiesComponent implements OnInit {
  isLoading = true;
  isSaving = false;

  allAmenities: any[] = [];
  filteredAmenities: any[] = [];
  selectedIds: number[] = [];

  searchTerm: string = '';
  activeFilterTab: 'all' | 'selected' | 'unselected' = 'all';

  constructor(
    private router: Router,
    private partnerService: PartnerService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    const userStr = localStorage.getItem('partner_user');
    if (userStr) {
      const user = JSON.parse(userStr);
      if (Number(user.role_id) === 3) {
        Swal.fire('Từ chối truy cập', 'Bạn là Lễ tân, không có quyền vào trang này!', 'error');
        this.router.navigate(['/dashboard/room-matrix']);
        return;
      }
    }
    this.loadData();
  }

  loadData() {
    this.isLoading = true;
    this.partnerService.getHotelAmenities().subscribe({
      next: (res: any) => {
        this.allAmenities = res.all_amenities || [];
        this.selectedIds = (res.selected_ids || []).map((id: any) => Number(id));
        this.applyFilter();
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error('Lỗi nạp tiện ích:', err);
        this.isLoading = false;
        this.cdr.detectChanges();
        Swal.fire('Lỗi', 'Không thể tải danh sách tiện ích khách sạn!', 'error');
      }
    });
  }

  // Lọc tìm kiếm và tabs
  applyFilter() {
    let list = [...this.allAmenities];

    // 1. Lọc theo tab
    if (this.activeFilterTab === 'selected') {
      list = list.filter(item => this.selectedIds.includes(item.id));
    } else if (this.activeFilterTab === 'unselected') {
      list = list.filter(item => !this.selectedIds.includes(item.id));
    }

    // 2. Tìm kiếm theo tên
    if (this.searchTerm && this.searchTerm.trim() !== '') {
      const term = this.searchTerm.trim().toLowerCase();
      list = list.filter(item => (item.name || '').toLowerCase().includes(term));
    }

    this.filteredAmenities = list;
    this.cdr.detectChanges();
  }

  setFilterTab(tab: 'all' | 'selected' | 'unselected') {
    this.activeFilterTab = tab;
    this.applyFilter();
  }

  onSearch() {
    this.applyFilter();
  }

  clearSearch() {
    this.searchTerm = '';
    this.applyFilter();
  }

  // Bật/Tắt lựa chọn tiện ích
  toggleAmenity(amenityId: number) {
    const id = Number(amenityId);
    const index = this.selectedIds.indexOf(id);
    if (index > -1) {
      this.selectedIds.splice(index, 1);
    } else {
      this.selectedIds.push(id);
    }
    this.cdr.detectChanges();
  }

  isSelected(amenityId: number): boolean {
    return this.selectedIds.includes(Number(amenityId));
  }

  // Chọn nhanh tất cả
  selectAll() {
    this.selectedIds = this.allAmenities.map(a => Number(a.id));
    this.applyFilter();
    const Toast = Swal.mixin({
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 1500
    });
    Toast.fire({ icon: 'info', title: `Đã chọn tất cả ${this.selectedIds.length} tiện ích` });
  }

  // Bỏ chọn tất cả
  deselectAll() {
    this.selectedIds = [];
    this.applyFilter();
    const Toast = Swal.mixin({
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 1500
    });
    Toast.fire({ icon: 'info', title: 'Đã bỏ chọn tất cả tiện ích' });
  }

  // Lưu xuống Database
  saveAmenities() {
    this.isSaving = true;
    Swal.fire({ title: 'Đang lưu tiện ích...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    this.partnerService.updateHotelAmenities(this.selectedIds).subscribe({
      next: (res: any) => {
        this.isSaving = false;
        Swal.fire({
          icon: 'success',
          title: 'Thành công!',
          text: res.message || 'Cập nhật danh mục tiện ích khách sạn thành công!',
          timer: 1600,
          showConfirmButton: false
        });
      },
      error: (err: any) => {
        this.isSaving = false;
        Swal.fire({
          icon: 'error',
          title: 'Lỗi',
          text: err.error?.message || 'Có lỗi xảy ra khi lưu tiện ích.',
          confirmButtonText: 'Đóng'
        });
      }
    });
  }
}