import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

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
  isLoading = true;

  // Biến cho Modal Khóa tài khoản
  showSuspendModal = false;
  selectedHotelId: number | null = null;
  suspendReason = '';

  // 👉 THÊM: Biến cho Modal Xem Chi Tiết
  showDetailsModal = false;
  selectedHotelDetails: any = null;

  constructor(
    private adminService: AdminService,
    private cdr: ChangeDetectorRef,
    private http: HttpClient
  ) {}

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.isLoading = true;
    this.adminService.getApprovedPartners().subscribe({
      next: (res: any) => {
        this.partnerList = res.data || [];
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error(err);
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  // --- CÁC HÀM XỬ LÝ KHÓA TÀI KHOẢN ---
  openSuspendModal(hotelId: number) {
    this.selectedHotelId = hotelId;
    this.suspendReason = '';
    this.showSuspendModal = true;
  }

  closeSuspendModal() {
    this.showSuspendModal = false;
    this.selectedHotelId = null;
  }

  submitSuspend() {
    if (!this.selectedHotelId || !this.suspendReason.trim()) {
      Swal.fire({ icon: 'error', title: 'Lỗi', text: 'Vui lòng nhập lý do!', confirmButtonText: 'Đóng' });
      return;
    }

    this.adminService.suspendPartner(this.selectedHotelId, this.suspendReason).subscribe({
      next: (res: any) => {
        Swal.fire({ icon: 'success', title: 'Thành công!', text: res.message || 'Đã khóa thành công.', showConfirmButton: false, timer: 1500 });
        this.closeSuspendModal();
        this.loadData(); 
      },
      error: (err: any) => {
        Swal.fire({ icon: 'error', title: 'Lỗi', text: err.error?.message || 'Lỗi xử lý.', confirmButtonText: 'Đóng' });
      }
    });
  }

  // --- CÁC HÀM XỬ LÝ CHI TIẾT KHÁCH SẠN ---
  openDetailsModal(hotel: any) {
    this.selectedHotelDetails = hotel;
    this.showDetailsModal = true;
  }

  closeDetailsModal() {
    this.showDetailsModal = false;
    this.selectedHotelDetails = null;
  }

  // Hàm xử lý link ảnh (Phòng trường hợp link lưu trong DB bị thiếu domain backend)
  getImageUrl(path: string): string {
    if (!path) return ''; 
    if (path.startsWith('http')) return path;
    return `http://localhost:8000${path}`;
  }

  // --- HÀM XỬ LÝ HOA HỒNG ---
  editCommission(hotelId: number, currentRate: number, hotelName: string) {
    const displayRate = currentRate ? currentRate : 15;

    Swal.fire({
      title: 'Cấu hình Hoa Hồng',
      html: `Nhập tỉ lệ chiết khấu (%) Sàn sẽ thu của <br><b class="text-primary">${hotelName}</b>`,
      input: 'number',
      inputValue: displayRate,
      inputAttributes: {
        min: '0',
        max: '100',
        step: '0.1'
      },
      showCancelButton: true,
      confirmButtonText: '💾 Lưu thay đổi',
      cancelButtonText: 'Hủy',
      confirmButtonColor: '#3b82f6',
    }).then((result) => {
      if (result.isConfirmed) {
        const newRate = result.value;
        const token = localStorage.getItem('admin_token');
        
        this.http.put(`http://localhost:8000/api/admin/hotels/${hotelId}/commission`, 
          { commission_rate: newRate }, 
          { headers: { 'Authorization': `Bearer ${token}` } }
        ).subscribe({
          next: (res: any) => {
            Swal.fire({
              icon: 'success',
              title: 'Thành công!',
              text: `Đã cập nhật hoa hồng thành ${newRate}%`,
              timer: 1500,
              showConfirmButton: false
            });
            this.ngOnInit(); 
          },
          error: (err: any) => {
            Swal.fire('Lỗi', err.error?.message || 'Không thể cập nhật hoa hồng!', 'error');
          }
        });
      }
    });
  }
}