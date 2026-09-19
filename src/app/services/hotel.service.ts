import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';

// KHI ĐÃ CÓ INTERCEPTOR, BẠN THẬM CHÍ KHÔNG CẦN IMPORT AUTH SERVICE LUÔN!

@Injectable({ providedIn: 'root' })
export class HotelService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // ==========================================
  // HỒ SƠ KHÁCH SẠN
  // ==========================================
  getProfile(): Observable<any> {
    // Siêu gọn: Bỏ luôn tham số thứ 2
    return this.http.get(`${this.apiUrl}/partner/hotel`);
  }

  updateProfile(data: any): Observable<any> {
    // Siêu gọn: Bỏ luôn tham số thứ 3
    return this.http.put(`${this.apiUrl}/partner/hotel`, data);
  }

  // ==========================================
  // TỔNG QUAN (DASHBOARD)
  // ==========================================
  getDashboardStats(period: string = 'month'): Observable<any> {
    return this.http.get(`${this.apiUrl}/partner/dashboard-stats?period=${period}`);
  }

  // ==========================================
  // UPLOAD ẢNH BÌA
  // ==========================================
  uploadHotelImage(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('is_primary', '1'); 

    // Token đã được Interceptor tự động gắn vào!
    // Bạn chỉ cần set Accept: application/json để Laravel trả về format lỗi cho đúng
    return this.http.post(`${this.apiUrl}/partner/hotel/images`, formData, { 
      headers: { 'Accept': 'application/json' } 
    });
  }
}