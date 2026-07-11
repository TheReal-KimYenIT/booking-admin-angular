import { Component, OnInit, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import Chart from 'chart.js/auto'; 
import Swal from 'sweetalert2';

@Component({
  selector: 'app-transactions',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-transactions.html',
  styleUrl: './admin-transactions.css'
})
export class TransactionsComponent implements OnInit {
  private apiUrl = 'http://localhost:8000/api'; 
  @ViewChild('vnpayChart') vnpayChartRef!: ElementRef; 
  chartInstance: any; 

  transactions: any[] = [];
  hotels: any[] = []; 
  stats: any = { vnpay_total: 0, cash_total: 0, pos_total: 0, success_count: 0, failed_count: 0 };

  // Các biến bộ lọc thông minh đã đồng bộ Backend
  keyword: string = '';
  startDate: string = '';
  endDate: string = '';
  selectedMethod: string = 'all';
  selectedHotel: string = 'all';
  selectedStatus: string = 'all'; // all, 1: Thành công, 0: Đang chờ, 2: Thất bại

  // Các biến Phân trang
  currentPage: number = 1;
  lastPage: number = 1;
  totalRecords: number = 0;

  isLoading: boolean = false;
  isExporting: boolean = false;

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    // Mặc định: Từ ngày 1 của tháng hiện tại -> Hôm nay
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    
    this.startDate = firstDay.toISOString().split('T')[0];
    this.endDate = today.toISOString().split('T')[0];
    
    this.loadTransactions();
  }

  loadTransactions(page: number = 1) {
    this.isLoading = true;
    this.cdr.detectChanges(); // Thông báo giao diện hiển thị trạng thái loading spinner
    
    const token = localStorage.getItem('admin_token');
    let queryParams = `?page=${page}&start_date=${this.startDate}&end_date=${this.endDate}&method=${this.selectedMethod}&hotel_id=${this.selectedHotel}&status=${this.selectedStatus}&keyword=${this.keyword}`;

    this.http.get(`${this.apiUrl}/admin/transactions${queryParams}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).subscribe({
      next: (res: any) => {
        this.transactions = res.data.data || [];
        this.currentPage = res.data.current_page;
        this.lastPage = res.data.last_page;
        this.totalRecords = res.data.total;
        this.stats = res.stats;
        this.hotels = res.hotels || []; 

        this.isLoading = false;
        this.cdr.detectChanges(); // Ép Angular dựng lại DOM chứa thẻ <canvas> xong xuôi

        // Vẽ biểu đồ an toàn sau khi luồng xử lý DOM của Angular đã hoàn tất ổn định
        if (res.chart) {
          setTimeout(() => {
            this.renderChart(res.chart.labels, res.chart.data);
          }, 50);
        }
      },
      error: () => {
        this.isLoading = false;
        this.cdr.detectChanges();
        Swal.fire('Lỗi', 'Không thể tải lịch sử dòng tiền giao dịch!', 'error');
      }
    });
  }

  renderChart(labels: string[], data: number[]) {
    // 1. Phá hủy thực thể biểu đồ cũ tránh lỗi lặp / đè tài nguyên bộ nhớ canvas
    if (this.chartInstance) {
      this.chartInstance.destroy(); 
    }
    
    // 2. Chặn an toàn nếu ViewChild chưa tìm thấy thẻ native canvas trên DOM
    if (!this.vnpayChartRef || !this.vnpayChartRef.nativeElement) {
      return;
    }

    const ctx = this.vnpayChartRef.nativeElement.getContext('2d');
    this.chartInstance = new Chart(ctx, {
      type: 'bar', 
      data: {
        labels: labels,
        datasets: [{
          label: 'Doanh thu VNPAY (VNĐ)',
          data: data,
          backgroundColor: '#3b82f6', 
          borderRadius: 6,
          maxBarThickness: 40
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false } 
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function(value) {
                return value.toLocaleString('vi-VN') + ' đ';
              }
            }
          }
        }
      }
    });
  }

  onFilterChange() {
    this.loadTransactions(1); 
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.lastPage) {
      this.loadTransactions(page);
    }
  }

exportExcel() {
    this.isExporting = true;
    this.cdr.detectChanges();

    const token = localStorage.getItem('admin_token') || '';
    
    // Tạo đường dẫn API với các bộ lọc
    let queryParams = `?start_date=${this.startDate}&end_date=${this.endDate}&method=${this.selectedMethod}&hotel_id=${this.selectedHotel}&status=${this.selectedStatus}&keyword=${this.keyword}`;

    // Sử dụng HttpClient để gọi API lấy file (blob) và truyền Token bảo mật
    this.http.get(`${this.apiUrl}/admin/transactions/export${queryParams}`, {
      headers: { 'Authorization': `Bearer ${token}` },
      responseType: 'blob' // Bắt buộc phải có dòng này để trình duyệt hiểu đây là file
    }).subscribe({
      next: (blob: Blob) => {
        // Tạo đường dẫn ảo để tải file
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Doi_Soat_StayBook_${this.startDate}_den_${this.endDate}.csv`;
        
        // Kích hoạt trình duyệt tải xuống
        document.body.appendChild(a);
        a.click();
        
        // Dọn dẹp bộ nhớ
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        // Tắt loading
        this.isExporting = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Lỗi xuất file:', err);
        this.isExporting = false;
        this.cdr.detectChanges();
        Swal.fire('Lỗi', 'Không thể xuất file Excel! Kiểm tra lại kết nối.', 'error');
      }
    });
  }

  getMethodName(method: number): string {
    switch(Number(method)) {
      case 1: return '💵 Tiền mặt';
      case 2: return '💳 Quẹt thẻ POS';
      case 3: return '🏦 Chuyển khoản';
      case 4: return '🌐 VNPAY';
      default: return '❓ Không rõ';
    }
  }
}