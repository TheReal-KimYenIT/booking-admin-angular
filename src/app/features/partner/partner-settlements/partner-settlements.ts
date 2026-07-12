import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-partner-settlements',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './partner-settlements.html',
  styleUrl: './partner-settlements.css'
})
export class PartnerSettlementsComponent implements OnInit {
  private apiUrl = 'http://localhost:8000/api/partner/settlements';
  
  settlementData: any = null;
  isLoading = false;
  isExporting = false;
  selectedMonth: string = '';

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    const today = new Date();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    this.selectedMonth = `${yyyy}-${mm}`;
    this.loadData();
  }

  loadData() {
    this.isLoading = true;
    const token = localStorage.getItem('partner_token');
    const [year, month] = this.selectedMonth.split('-');

    this.http.get(`${this.apiUrl}?month=${month}&year=${year}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).subscribe({
      next: (res: any) => {
        this.settlementData = res.data;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.isLoading = false;
        this.settlementData = null;
        Swal.fire('Lỗi', 'Không thể tải dữ liệu chốt công nợ', 'error');
      }
    });
  }

  exportPdf() {
    this.isExporting = true;
    const token = localStorage.getItem('partner_token') || '';
    const [year, month] = this.selectedMonth.split('-');

    this.http.get(`${this.apiUrl}/export-pdf?month=${month}&year=${year}`, {
      headers: { 'Authorization': `Bearer ${token}` },
      responseType: 'blob'
    }).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Chot_Cong_No_${month}_${year}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        this.isExporting = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.isExporting = false;
        this.cdr.detectChanges();
        Swal.fire('Lỗi', 'Không thể xuất PDF!', 'error');
      }
    });
  }

  selectedFile: File | null = null;

  onFileSelected(event: any) {
    this.selectedFile = event.target.files[0];
  }

  uploadProof() {
    if (!this.selectedFile) return;

    const [year, month] = this.selectedMonth.split('-');
    const formData = new FormData();
    formData.append('month', month);
    formData.append('year', year);
    formData.append('proof_image', this.selectedFile);

    const token = localStorage.getItem('partner_token');
    
    this.http.post('http://localhost:8000/api/partner/settlements/upload-proof', formData, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).subscribe({
      next: () => {
        Swal.fire('Thành công', 'Đã gửi ảnh chuyển khoản cho Admin!', 'success');
        this.loadData();
      },
      error: (err) => {
        console.error(err);
        Swal.fire('Lỗi', 'Không thể gửi Bill. Vui lòng thử lại!', 'error');
      }
    });
  }

  partnerConfirm() {
    Swal.fire({
      title: 'Xác nhận đã nhận tiền?',
      text: 'Bạn xác nhận đã nhận đủ tiền chuyển khoản công nợ từ hệ thống Sàn?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Đúng, đã nhận đủ'
    }).then((result) => {
      if (result.isConfirmed) {
        const [year, month] = this.selectedMonth.split('-');
        const token = localStorage.getItem('partner_token');
        
        this.http.post(`${this.apiUrl}/partner-confirm`, { month, year }, {
          headers: { 'Authorization': `Bearer ${token}` }
        }).subscribe(() => {
          Swal.fire('Thành công', 'Giao dịch công nợ đã hoàn tất chốt sổ!', 'success');
          this.loadData();
        });
      }
    });
  }
}