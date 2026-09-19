import { Component, OnInit, ChangeDetectorRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../../environments/environment';

import { AdminService } from '../../../services/admin.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-admin-partners',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-partners.html',
  styleUrl: './admin-partners.css'
})
export class AdminPartnersComponent implements OnInit {
  partnerList: any[] = [];
  filteredList: any[] = [];
  isLoading = true;
  isSubmitting = false;

  // Search, Filters & Sorting
  searchKeyword = '';
  selectedCity = 'ALL';
  selectedStar = 'ALL'; // 'ALL' | '1'..'5' | 'UNRATED'
  sortBy = 'NEWEST'; // 'NEWEST' | 'OLDEST' | 'NAME_ASC' | 'COMMISSION_DESC' | 'COMMISSION_ASC'
  citiesList: string[] = [];

  // Modals
  showSuspendModal = false;
  selectedHotelId: number | null = null;
  selectedHotelName = '';
  suspendReason = '';

  showDetailsModal = false;
  selectedHotelDetails: any = null;

  previewImageModal = false;
  previewImageUrl = '';

  // Quick suspension reasons
  quickReasons: string[] = [
    'Vi phạm nghiêm trọng chính sách mở bán & lưu trú',
    'Nhận nhiều phản ánh tiêu cực về chất lượng dịch vụ',
    'Gian lận đặt phòng hoặc không hoàn tiền theo cam kết',
    'Tạm ngừng kinh doanh theo yêu cầu từ phía chủ khách sạn',
    'Chậm trễ đối soát hoặc nợ phí hoa hồng kéo dài'
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
      this.closeFullscreenImage();
    } else if (this.showSuspendModal) {
      this.closeSuspendModal();
    } else if (this.showDetailsModal) {
      this.closeDetailsModal();
    }
  }

  loadData() {
    this.isLoading = true;
    this.adminService.getApprovedPartners().subscribe({
      next: (res: any) => {
        this.partnerList = res.data || [];
        this.extractCities();
        this.applyFilter();
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error('Lỗi tải danh sách đối tác hoạt động:', err);
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  extractCities() {
    const set = new Set<string>();
    this.partnerList.forEach(item => {
      if (item.city && item.city.trim()) {
        set.add(item.city.trim());
      }
    });
    this.citiesList = Array.from(set).sort((a, b) => a.localeCompare(b, 'vi'));
  }

  applyFilter() {
    const q = (this.searchKeyword || '').trim().toLowerCase();
    let result = this.partnerList.filter(item => {
      // 1. Search keyword
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

      // 2. City filter
      let matchCity = true;
      if (this.selectedCity !== 'ALL') {
        matchCity = item.city === this.selectedCity;
      }

      // 3. Star rating filter
      let matchStar = true;
      if (this.selectedStar === 'UNRATED') {
        matchStar = !item.star_rating || Number(item.star_rating) === 0;
      } else if (this.selectedStar !== 'ALL') {
        matchStar = Number(item.star_rating) === Number(this.selectedStar);
      }

      return matchQuery && matchCity && matchStar;
    });

    // 4. Sorting
    if (this.sortBy === 'NEWEST') {
      result.sort((a, b) => (b.id || 0) - (a.id || 0));
    } else if (this.sortBy === 'OLDEST') {
      result.sort((a, b) => (a.id || 0) - (b.id || 0));
    } else if (this.sortBy === 'NAME_ASC') {
      result.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'vi'));
    } else if (this.sortBy === 'COMMISSION_DESC') {
      result.sort((a, b) => (Number(b.commission_rate) || 0) - (Number(a.commission_rate) || 0));
    } else if (this.sortBy === 'COMMISSION_ASC') {
      result.sort((a, b) => (Number(a.commission_rate) || 0) - (Number(b.commission_rate) || 0));
    }

    this.filteredList = result;
  }

  resetFilters() {
    this.searchKeyword = '';
    this.selectedCity = 'ALL';
    this.selectedStar = 'ALL';
    this.sortBy = 'NEWEST';
    this.applyFilter();
  }

  // --- KPI GETTERS (100% computed from real data) ---
  get totalActive(): number {
    return this.partnerList.length;
  }

  get uniqueCitiesCount(): number {
    return this.citiesList.length;
  }

  get avgCommissionRate(): string {
    if (!this.partnerList.length) return '0.0%';
    const total = this.partnerList.reduce((acc, cur) => acc + (Number(cur.commission_rate) || 15), 0);
    return (total / this.partnerList.length).toFixed(1) + '%';
  }

  get withLicenseCount(): number {
    return this.partnerList.filter(i => !!i.business_license_url && i.business_license_url.trim() !== '').length;
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

  getImageUrl(path: string): string {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    const baseUrl = environment.apiUrl.replace('/api', '');
    return baseUrl + (path.startsWith('/') ? path : '/' + path);
  }

  // --- DETAILS MODAL ---
  openDetailsModal(hotel: any) {
    this.selectedHotelDetails = hotel;
    this.showDetailsModal = true;
  }

  closeDetailsModal() {
    this.showDetailsModal = false;
    this.selectedHotelDetails = null;
  }

  // --- FULLSCREEN IMAGE / LIGHTBOX ---
  openFullscreenImage(url: string, event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    if (!url) return;
    this.previewImageUrl = this.getImageUrl(url);
    this.previewImageModal = true;
  }

  closeFullscreenImage() {
    this.previewImageModal = false;
    this.previewImageUrl = '';
  }

  // --- SUSPEND / LOCK PARTNER ---
  openSuspendModal(hotelId: number, hotelName?: string) {
    this.selectedHotelId = hotelId;
    this.selectedHotelName = hotelName || '';
    this.suspendReason = '';
    this.showSuspendModal = true;
  }

  closeSuspendModal() {
    this.showSuspendModal = false;
    this.selectedHotelId = null;
    this.selectedHotelName = '';
  }

  selectQuickReason(reason: string) {
    this.suspendReason = reason;
  }

  submitSuspend() {
    if (!this.selectedHotelId || !this.suspendReason.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Thiếu lý do',
        text: 'Vui lòng nhập lý do khóa tài khoản đối tác!',
        confirmButtonColor: '#6366f1'
      });
      return;
    }

    this.isSubmitting = true;
    this.adminService.suspendPartner(this.selectedHotelId, this.suspendReason.trim()).subscribe({
      next: (res: any) => {
        this.isSubmitting = false;
        Swal.fire({
          icon: 'success',
          title: 'Đã khóa đối tác',
          text: res.message || 'Đã tạm khóa tài khoản đối tác thành công.',
          timer: 1800,
          showConfirmButton: false
        });
        this.closeSuspendModal();
        this.showDetailsModal = false;
        this.loadData();
      },
      error: (err: any) => {
        this.isSubmitting = false;
        Swal.fire({
          icon: 'error',
          title: 'Lỗi xử lý',
          text: err.error?.message || 'Không thể khóa tài khoản đối tác.',
          confirmButtonText: 'Đóng'
        });
      }
    });
  }

  // --- COMMISSION RATE UPDATE ---
  editCommission(hotel: any) {
    const hotelId = hotel.id;
    const hotelName = hotel.name;
    const currentRate = hotel.commission_rate != null ? Number(hotel.commission_rate) : 15;

    Swal.fire({
      title: 'Cấu hình Tỷ Lệ Hoa Hồng',
      html: `
        <div class="text-start small text-muted mb-2">
          Cơ sở lưu trú: <strong class="text-slate-800">${hotelName}</strong>
        </div>
        <div class="text-start small text-muted">
          Nhập tỷ lệ chiết khấu (%) StayHub thu trên mỗi lượt đặt phòng hoàn tất:
        </div>
      `,
      input: 'number',
      inputValue: currentRate,
      inputAttributes: {
        min: '0',
        max: '100',
        step: '0.1'
      },
      showCancelButton: true,
      confirmButtonText: '<i class="bi bi-check-lg me-1"></i> Lưu Thay Đổi',
      cancelButtonText: 'Hủy Bỏ',
      confirmButtonColor: '#4f46e5',
      cancelButtonColor: '#94a3b8'
    }).then((result) => {
      if (result.isConfirmed) {
        const newRate = Number(result.value);
        if (isNaN(newRate) || newRate < 0 || newRate > 100) {
          Swal.fire('Lỗi', 'Tỷ lệ hoa hồng phải từ 0% đến 100%', 'error');
          return;
        }

        this.adminService.updateCommission(hotelId, newRate).subscribe({
          next: (res: any) => {
            Swal.fire({
              icon: 'success',
              title: 'Cập nhật thành công!',
              text: `Đã đổi hoa hồng của "${hotelName}" thành ${newRate}%`,
              timer: 1800,
              showConfirmButton: false
            });
            // Update in place
            hotel.commission_rate = newRate;
            if (this.selectedHotelDetails && this.selectedHotelDetails.id === hotelId) {
              this.selectedHotelDetails.commission_rate = newRate;
            }
            this.cdr.detectChanges();
          },
          error: (err: any) => {
            Swal.fire('Lỗi cập nhật', err.error?.message || 'Không thể cập nhật hoa hồng!', 'error');
          }
        });
      }
    });
  }
}
