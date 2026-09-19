import { Component, OnInit, ChangeDetectorRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../../environments/environment';

import { AdminService } from '../../../services/admin.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-admin-pending-partners',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-pending-partners.html',
  styleUrl: './admin-pending-partners.css'
})
export class AdminPendingPartnersComponent implements OnInit {
  pendingList: any[] = [];
  filteredList: any[] = [];
  isLoading = true;
  isSubmitting = false;

  // Search & Filters & Sorting
  searchKeyword = '';
  licenseFilter = 'ALL'; // 'ALL' | 'WITH_LICENSE' | 'WITHOUT_LICENSE'
  selectedCity = 'ALL';
  sortBy = 'NEWEST'; // 'NEWEST' | 'OLDEST' | 'NAME_ASC'
  citiesList: string[] = [];

  // Modals
  showDetailModal = false;
  selectedPartnerDetail: any = null;

  showRejectModal = false;
  selectedHotelId: number | null = null;
  selectedHotelName = '';
  rejectReason = '';

  previewImageModal = false;
  previewImageUrl = '';

  // Pre-defined quick reasons
  quickReasons: string[] = [
    'Giấy phép kinh doanh chưa rõ ràng hoặc không hợp lệ',
    'Thông tin địa chỉ cơ sở lưu trú chưa chính xác hoặc thiếu',
    'Số điện thoại người đại diện không thể liên lạc được',
    'Thông tin cơ sở lưu trú bị trùng lặp trên hệ thống',
    'Hồ sơ thiếu thông tin pháp lý cần thiết để xác thực'
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
    if (this.previewImageModal) {
      this.closePreviewImage();
    } else if (this.showRejectModal) {
      this.closeRejectModal();
    } else if (this.showDetailModal) {
      this.closeDetailModal();
    }
  }

  loadData() {
    this.isLoading = true;
    this.adminService.getPendingPartners().subscribe({
      next: (res: any) => {
        this.pendingList = res.data || [];
        this.extractCities();
        this.applyFilter();
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error('Lỗi lấy danh sách đối tác chờ duyệt:', err);
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  extractCities() {
    const set = new Set<string>();
    this.pendingList.forEach(item => {
      if (item.city && item.city.trim()) {
        set.add(item.city.trim());
      }
    });
    this.citiesList = Array.from(set).sort((a, b) => a.localeCompare(b, 'vi'));
  }

  applyFilter() {
    const q = (this.searchKeyword || '').trim().toLowerCase();
    let result = this.pendingList.filter(item => {
      // 1. Keyword search
      let matchQuery = true;
      if (q) {
        const hotelName = (item.name || '').toLowerCase();
        const city = (item.city || '').toLowerCase();
        const address = (item.address || '').toLowerCase();
        const taxCode = (item.tax_code || '').toLowerCase();
        const partnerName = item.partner
          ? `${item.partner.last_name || ''} ${item.partner.first_name || ''}`.toLowerCase()
          : '';
        const email = item.partner?.email ? item.partner.email.toLowerCase() : '';
        const phone = item.partner?.phone ? item.partner.phone.toLowerCase() : '';
        const idStr = `#${item.id}`;

        matchQuery =
          hotelName.includes(q) ||
          city.includes(q) ||
          address.includes(q) ||
          taxCode.includes(q) ||
          partnerName.includes(q) ||
          email.includes(q) ||
          phone.includes(q) ||
          idStr.includes(q);
      }

      // 2. License filter
      let matchLicense = true;
      if (this.licenseFilter === 'WITH_LICENSE') {
        matchLicense = !!item.business_license_url && item.business_license_url.trim() !== '';
      } else if (this.licenseFilter === 'WITHOUT_LICENSE') {
        matchLicense = !item.business_license_url || item.business_license_url.trim() === '';
      }

      // 3. City filter
      let matchCity = true;
      if (this.selectedCity !== 'ALL') {
        matchCity = item.city === this.selectedCity;
      }

      return matchQuery && matchLicense && matchCity;
    });

    // 4. Sorting
    if (this.sortBy === 'NEWEST') {
      result.sort((a, b) => (b.id || 0) - (a.id || 0));
    } else if (this.sortBy === 'OLDEST') {
      result.sort((a, b) => (a.id || 0) - (b.id || 0));
    } else if (this.sortBy === 'NAME_ASC') {
      result.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'vi'));
    }

    this.filteredList = result;
  }

  resetFilters() {
    this.searchKeyword = '';
    this.licenseFilter = 'ALL';
    this.selectedCity = 'ALL';
    this.sortBy = 'NEWEST';
    this.applyFilter();
  }

  get totalPending(): number {
    return this.pendingList.length;
  }

  get withLicenseCount(): number {
    return this.pendingList.filter(i => !!i.business_license_url && i.business_license_url.trim() !== '').length;
  }

  get withoutLicenseCount(): number {
    return this.pendingList.filter(i => !i.business_license_url || i.business_license_url.trim() === '').length;
  }

  get uniqueCitiesCount(): number {
    return this.citiesList.length;
  }

  formatTime(time: string | null | undefined): string {
    if (!time || typeof time !== 'string') return '';
    return time.slice(0, 5);
  }

  isPdf(path: string | null | undefined): boolean {
    if (!path) return false;
    const clean = path.toLowerCase().split('?')[0];
    return clean.endsWith('.pdf');
  }

  onImageError(event: any) {
    event.target.style.display = 'none';
    const placeholder = event.target.nextElementSibling;
    if (placeholder) {
      placeholder.style.display = 'block';
    }
  }

  viewDetail(item: any) {
    this.selectedPartnerDetail = item;
    this.showDetailModal = true;
  }

  closeDetailModal() {
    this.showDetailModal = false;
    this.selectedPartnerDetail = null;
  }

  getImageUrl(path: string): string {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    const baseUrl = environment.apiUrl.replace('/api', '');
    return baseUrl + (path.startsWith('/') ? path : '/' + path);
  }

  openPreviewImage(url: string, event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    if (!url) return;
    this.previewImageUrl = this.getImageUrl(url);
    this.previewImageModal = true;
  }

  closePreviewImage() {
    this.previewImageModal = false;
    this.previewImageUrl = '';
  }

  approve(hotelId: number, hotelName?: string) {
    const name = hotelName || (this.selectedPartnerDetail?.name ? `"${this.selectedPartnerDetail.name}"` : 'đối tác này');
    Swal.fire({
      title: 'Phê duyệt đối tác?',
      html: `Bạn có chắc chắn muốn phê duyệt khách sạn <strong>${name}</strong> mở bán phòng trên hệ thống StayHub?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#16a34a',
      cancelButtonColor: '#64748b',
      confirmButtonText: '<i class="bi bi-check-lg me-1"></i> Phê Duyệt Ngay',
      cancelButtonText: 'Hủy bỏ'
    }).then((result) => {
      if (result.isConfirmed) {
        this.isSubmitting = true;
        this.adminService.approvePartner(hotelId).subscribe({
          next: (res: any) => {
            this.isSubmitting = false;
            Swal.fire({
              icon: 'success',
              title: 'Đã phê duyệt!',
              text: res.message || 'Đối tác đã được phê duyệt và cấp quyền hoạt động.',
              timer: 1800,
              showConfirmButton: false
            });
            this.showDetailModal = false;
            this.loadData();
          },
          error: (err: any) => {
            this.isSubmitting = false;
            Swal.fire({
              icon: 'error',
              title: 'Lỗi phê duyệt',
              text: err.error?.message || 'Không thể xử lý yêu cầu phê duyệt.',
              confirmButtonText: 'Đóng'
            });
          }
        });
      }
    });
  }

  openRejectModal(hotelId: number, hotelName?: string) {
    this.selectedHotelId = hotelId;
    this.selectedHotelName = hotelName || '';
    this.rejectReason = '';
    this.showRejectModal = true;
  }

  closeRejectModal() {
    this.showRejectModal = false;
    this.selectedHotelId = null;
    this.selectedHotelName = '';
  }

  selectQuickReason(reason: string) {
    this.rejectReason = reason;
  }

  submitReject() {
    if (!this.selectedHotelId || !this.rejectReason.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Thiếu lý do',
        text: 'Vui lòng nhập lý do từ chối hồ sơ đăng ký!',
        confirmButtonColor: '#6366f1'
      });
      return;
    }

    this.isSubmitting = true;
    this.adminService.rejectPartner(this.selectedHotelId, this.rejectReason.trim()).subscribe({
      next: (res: any) => {
        this.isSubmitting = false;
        Swal.fire({
          icon: 'success',
          title: 'Đã từ chối',
          text: res.message || 'Đã từ chối hồ sơ đăng ký của đối tác.',
          timer: 1800,
          showConfirmButton: false
        });
        this.closeRejectModal();
        this.showDetailModal = false;
        this.loadData();
      },
      error: (err: any) => {
        this.isSubmitting = false;
        Swal.fire({
          icon: 'error',
          title: 'Lỗi từ chối',
          text: err.error?.message || 'Không thể từ chối hồ sơ này.',
          confirmButtonText: 'Đóng'
        });
      }
    });
  }
}