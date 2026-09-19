import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import Swal from 'sweetalert2';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-system-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule], 
  templateUrl: './admin-system-settings.html',
  styleUrl: './admin-system-settings.css'
})
export class SystemSettingsComponent implements OnInit {
  private apiUrl = `${environment.apiUrl}/admin/system-settings`;

  settings = {
    vat_rate: 10,
    default_commission_rate: 14
  };

  originalSettings = {
    vat_rate: 10,
    default_commission_rate: 14
  };

  // Thống kê thực tế trực tiếp từ DB
  metaStats = {
    updated_at: '',
    total_hotels: 0,
    total_bookings: 0,
    total_platform_fee: 0,
    total_vat_collected: 0
  };

  // Trình mô phỏng dòng tiền đơn hàng
  sampleBookingAmount: number = 2000000;

  isLoading: boolean = false;
  isSaving: boolean = false;

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.loadSettings();
  }

  loadSettings() {
    this.isLoading = true;
    const token = localStorage.getItem('admin_token');

    this.http.get(this.apiUrl, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).subscribe({
      next: (res: any) => {
        if (res && res.data) {
          this.settings.vat_rate = Number(res.data.vat_rate ?? 10);
          this.settings.default_commission_rate = Number(res.data.default_commission_rate ?? 14);
          this.originalSettings = { ...this.settings };

          this.metaStats = {
            updated_at: res.data.updated_at || 'Mặc định',
            total_hotels: Number(res.data.total_hotels || 0),
            total_bookings: Number(res.data.total_bookings || 0),
            total_platform_fee: Number(res.data.total_platform_fee || 0),
            total_vat_collected: Number(res.data.total_vat_collected || 0)
          };
        }
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.isLoading = false;
        this.cdr.detectChanges();
        Swal.fire('Lỗi', 'Không thể tải cấu hình hệ thống từ máy chủ!', 'error');
      }
    });
  }

  // Chọn nhanh preset
  setVatPreset(rate: number) {
    this.settings.vat_rate = rate;
    this.cdr.detectChanges();
  }

  setCommissionPreset(rate: number) {
    this.settings.default_commission_rate = rate;
    this.cdr.detectChanges();
  }

  setSampleAmount(amount: number) {
    this.sampleBookingAmount = amount;
    this.cdr.detectChanges();
  }

  // Khôi phục giá trị đã lưu
  resetSettings() {
    this.settings = { ...this.originalSettings };
    this.cdr.detectChanges();
  }

  get isDirty(): boolean {
    return this.settings.vat_rate !== this.originalSettings.vat_rate ||
           this.settings.default_commission_rate !== this.originalSettings.default_commission_rate;
  }

  // --- GETTERS MÔ PHỎNG DÒNG TIỀN (SIMULATOR) ---
  get simulatedVatAmount(): number {
    const rate = Number(this.settings.vat_rate) || 0;
    return Math.round(this.sampleBookingAmount * (rate / 100));
  }

  get simulatedTotalAmount(): number {
    return Math.round(this.sampleBookingAmount + this.simulatedVatAmount);
  }

  get simulatedCommissionFee(): number {
    const rate = Number(this.settings.default_commission_rate) || 0;
    return Math.round(this.simulatedTotalAmount * (rate / 100));
  }

  get simulatedHotelPayout(): number {
    return Math.max(0, this.simulatedTotalAmount - this.simulatedCommissionFee);
  }

  // Doanh thu phòng thuần của Khách sạn (sau khi trừ phí sàn StayHub)
  get simulatedHotelNetRoom(): number {
    return Math.max(0, this.sampleBookingAmount - this.simulatedCommissionFee);
  }

  get simulatedPlatformPercent(): number {
    if (!this.simulatedTotalAmount) return 0;
    return Math.min(100, Math.max(0, Math.round((this.simulatedCommissionFee / this.simulatedTotalAmount) * 100)));
  }

  get simulatedHotelPercent(): number {
    return Math.max(0, 100 - this.simulatedPlatformPercent);
  }

  saveSettings() {
    // 1. Kiểm tra rỗng hoặc NaN
    if (this.settings.vat_rate === null || this.settings.vat_rate === undefined || isNaN(this.settings.vat_rate)) {
      Swal.fire('Cảnh báo', 'Vui lòng nhập thuế Giá trị gia tăng (VAT) hợp lệ!', 'warning');
      return;
    }

    if (this.settings.default_commission_rate === null || this.settings.default_commission_rate === undefined || isNaN(this.settings.default_commission_rate)) {
      Swal.fire('Cảnh báo', 'Vui lòng nhập tỉ lệ hoa hồng mặc định hợp lệ!', 'warning');
      return;
    }

    // 2. Kiểm tra biên độ 0% - 100%
    if (this.settings.vat_rate < 0 || this.settings.vat_rate > 100) {
      Swal.fire('Cảnh báo', 'Thuế VAT phải nằm trong khoảng từ 0% đến 100%!', 'warning');
      return;
    }

    if (this.settings.default_commission_rate < 0 || this.settings.default_commission_rate > 100) {
      Swal.fire('Cảnh báo', 'Tỉ lệ hoa hồng mặc định phải nằm trong khoảng từ 0% đến 100%!', 'warning');
      return;
    }

    this.isSaving = true;
    const token = localStorage.getItem('admin_token');

    this.http.post(this.apiUrl, this.settings, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).subscribe({
      next: (res: any) => {
        this.isSaving = false;
        this.originalSettings = { ...this.settings };
        if (res && res.data && res.data.updated_at) {
          this.metaStats.updated_at = res.data.updated_at;
        }
        this.cdr.detectChanges();

        Swal.fire({
          icon: 'success',
          title: 'Cập nhật thành công!',
          html: `
            <div class="text-start small mt-2">
              <p class="mb-1"><strong>Thuế VAT mới:</strong> <span class="text-primary font-monospace">${this.settings.vat_rate}%</span> (áp dụng ngay cho mọi đơn đặt phòng mới trên sàn)</p>
              <p class="mb-0"><strong>Hoa hồng mặc định:</strong> <span class="text-success font-monospace">${this.settings.default_commission_rate}%</span> (áp dụng cho đối tác mới)</p>
            </div>
          `,
          timer: 2500,
          showConfirmButton: true,
          confirmButtonColor: '#4f46e5'
        });
      },
      error: (err: any) => {
        this.isSaving = false;
        this.cdr.detectChanges();
        Swal.fire('Lỗi', err.error?.message || 'Không thể lưu cấu hình hệ thống!', 'error');
      }
    });
  }
}
