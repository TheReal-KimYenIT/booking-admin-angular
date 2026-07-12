import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-partner-customers',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './partner-customers.html',
  styleUrl: './partner-customers.css'
})
export class PartnerCustomersComponent implements OnInit {
  private apiUrl = 'http://localhost:8000/api/partner/customers';
  customerList: any[] = [];
  filteredList: any[] = [];
  isLoading = true;
  searchTerm: string = '';

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef, private router: Router) {}

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.isLoading = true;
    const token = localStorage.getItem('partner_token') || '';
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

    this.http.get<any>(this.apiUrl, { headers }).subscribe({
      next: (res) => {
        this.customerList = res.data || [];
        this.filteredList = [...this.customerList];
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  // Bộ lọc tìm kiếm
  onSearch() {
    this.filteredList = this.customerList.filter(c => 
      c.first_name.toLowerCase().includes(this.searchTerm.toLowerCase()) || 
      c.last_name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
      c.phone.includes(this.searchTerm)
    );
  }

  toggleBlock(item: any) {
    const action = item.is_blocked === 1 ? 'MỞ KHÓA' : 'CHẶN ĐẶT PHÒNG';
    Swal.fire({
      title: `Bạn có chắc muốn ${action}?`,
      text: `Khách hàng: ${item.last_name} ${item.first_name}`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Đồng ý'
    }).then((result) => {
      if (result.isConfirmed) {
        const token = localStorage.getItem('partner_token') || '';
        const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
        this.http.post<any>(`http://localhost:8000/api/partner/customers/${item.id}/toggle-block`, {}, { headers }).subscribe({
          next: (res) => {
            Swal.fire('Thành công', res.message, 'success');
            this.loadData();
          },
          error: () => Swal.fire('Lỗi', 'Có lỗi xảy ra', 'error')
        });
      }
    });
  }

  // Điều hướng (Bạn thay đường dẫn cho khớp với trang của bạn)
  goToMessages(customer: any) {
    this.router.navigate(['/partner/messages'], { queryParams: { customer_id: customer.id } });
  }

  viewOrders(customer: any) {
    this.router.navigate(['/partner/orders'], { queryParams: { customer_id: customer.id } });
  }
}