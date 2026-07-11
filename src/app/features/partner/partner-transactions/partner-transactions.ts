import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-partner-transactions',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './partner-transactions.html',
  styleUrl: './partner-transactions.css'
})
export class PartnerTransactionsComponent implements OnInit {
  private apiUrl = 'http://localhost:8000/api/partner'; 

  transactions: any[] = [];
  stats: any = { vnpay_total: 0, cash_total: 0, pos_total: 0, success_count: 0, failed_count: 0 };

  keyword: string = '';
  startDate: string = '';
  endDate: string = '';
  selectedMethod: string = 'all';
  selectedStatus: string = 'all'; 

  currentPage: number = 1;
  lastPage: number = 1;
  totalRecords: number = 0;

  isLoading: boolean = false;

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    this.startDate = firstDay.toISOString().split('T')[0];
    this.endDate = today.toISOString().split('T')[0];
    
    this.loadTransactions();
  }

  loadTransactions(page: number = 1) {
    this.isLoading = true;
    this.cdr.detectChanges();
    
    const token = localStorage.getItem('partner_token');
    let queryParams = `?page=${page}&start_date=${this.startDate}&end_date=${this.endDate}&method=${this.selectedMethod}&status=${this.selectedStatus}&keyword=${this.keyword}`;

    this.http.get(`${this.apiUrl}/transactions${queryParams}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).subscribe({
      next: (res: any) => {
        this.transactions = res.data.data || [];
        this.currentPage = res.data.current_page;
        this.lastPage = res.data.last_page;
        this.totalRecords = res.data.total;
        this.stats = res.stats;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.isLoading = false;
        this.cdr.detectChanges();
        Swal.fire('Lỗi', 'Không thể tải dữ liệu đối soát!', 'error');
      }
    });
  }

  onFilterChange() { this.loadTransactions(1); }

  goToPage(page: number) {
    if (page >= 1 && page <= this.lastPage) {
      this.loadTransactions(page);
    }
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