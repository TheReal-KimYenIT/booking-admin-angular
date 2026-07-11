import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http'; // 👉 Bổ sung HttpClientModule
import Swal from 'sweetalert2';

@Component({
  selector: 'app-system-settings',
  standalone: true,
  // 👉 PHẢI CÓ HttpClientModule ở đây
  imports: [CommonModule, FormsModule, HttpClientModule], 
  templateUrl: './admin-system-settings.html',
  styleUrl: './admin-system-settings.css'
})
export class SystemSettingsComponent implements OnInit {
  private apiUrl = 'http://localhost:8000/api/admin/system-settings';

  settings = {
    vat_rate: 10,
    default_commission_rate: 15
  };

  isLoading: boolean = false;
  isSaving: boolean = false;

  // 👉 Bổ sung ChangeDetectorRef
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
        if (res.data) {
          this.settings.vat_rate = res.data.vat_rate;
          this.settings.default_commission_rate = res.data.default_commission_rate;
        }
        this.isLoading = false;
        this.cdr.detectChanges(); // 👉 Cập nhật giao diện ngay lập tức
      },
      error: () => {
        this.isLoading = false;
        this.cdr.detectChanges();
        Swal.fire('Lỗi', 'Không thể tải cấu hình hệ thống!', 'error');
      }
    });
  }

  saveSettings() {
    if (this.settings.vat_rate < 0 || this.settings.default_commission_rate < 0) {
      Swal.fire('Cảnh báo', 'Các chỉ số % không được là số âm!', 'warning');
      return;
    }

    this.isSaving = true;
    const token = localStorage.getItem('admin_token');

    this.http.post(this.apiUrl, this.settings, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).subscribe({
      next: (res: any) => {
        this.isSaving = false;
        this.cdr.detectChanges();
        Swal.fire({
          icon: 'success',
          title: 'Thành công!',
          text: 'Đã lưu cấu hình tài chính hệ thống.',
          timer: 1500,
          showConfirmButton: false
        });
      },
      error: (err: any) => {
        this.isSaving = false;
        this.cdr.detectChanges();
        Swal.fire('Lỗi', err.error?.message || 'Không thể lưu cấu hình!', 'error');
      }
    });
  }
}