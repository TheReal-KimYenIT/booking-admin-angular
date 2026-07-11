import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment'; 
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AdminService {
  private apiUrl = environment.apiUrl; 

  constructor(private http: HttpClient) {}

  // ==========================================
  // QUẢN LÝ ĐỐI TÁC (PARTNERS)
  // ==========================================
  getPendingPartners(): Observable<any> {
    return this.http.get(`${this.apiUrl}/admin/pending-partners`);
  }

  approvePartner(hotelId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/admin/approve-partner/${hotelId}`, {});
  }

  rejectPartner(hotelId: number, reason: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/admin/reject-partner/${hotelId}`, { reason });
  }

  getApprovedPartners(): Observable<any> {
    return this.http.get(`${this.apiUrl}/admin/approved-partners`);
  }

  suspendPartner(hotelId: number, reason: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/admin/suspend-partner/${hotelId}`, { reason });
  }

  // ==========================================
  // QUẢN LÝ KHÁCH HÀNG (CUSTOMERS)
  // ==========================================
  getCustomers(): Observable<any> {
    return this.http.get(`${this.apiUrl}/admin/customers`);
  }

  toggleCustomerStatus(userId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/admin/customers/${userId}/toggle-status`, {});
  }

  // ==========================================
  // QUẢN LÝ TIỆN ÍCH CHUNG (AMENITIES)
  // ==========================================
  getAmenities(): Observable<any> {
    return this.http.get(`${this.apiUrl}/admin/amenities`);
  }

  addAmenity(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/admin/amenities`, data);
  }

  updateAmenity(id: number, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/admin/amenities/${id}`, data);
  }

  deleteAmenity(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/admin/amenities/${id}`);
  }

  // ==========================================
  // QUẢN LÝ HƯỚNG NHÌN (ROOM VIEWS)
  // ==========================================
  getRoomViews(): Observable<any> {
    return this.http.get(`${this.apiUrl}/admin/room-views`);
  }

  addRoomView(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/admin/room-views`, data);
  }

  updateRoomView(id: number, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/admin/room-views/${id}`, data);
  }

  deleteRoomView(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/admin/room-views/${id}`);
  }

  // ==========================================
  // QUẢN LÝ LOẠI GIƯỜNG (BED TYPES)
  // ==========================================
  getBedTypes(): Observable<any> {
    return this.http.get(`${this.apiUrl}/admin/bed-types`);
  }

  addBedType(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/admin/bed-types`, data);
  }

  updateBedType(id: number, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/admin/bed-types/${id}`, data);
  }

  deleteBedType(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/admin/bed-types/${id}`);
  }

  // 1. Lấy danh sách liên hệ gửi cho Admin
  getSystemContacts(): Observable<any> {
    return this.http.get(`${this.apiUrl}/admin/contacts`);
  }

  // 2. Cập nhật trạng thái đã xử lý
  resolveContact(id: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/admin/contacts/${id}/resolve`, {});
  }

  getGlobalPromotions(): Observable<any> {
    return this.http.get(`${this.apiUrl}/admin/promotions`);
  }
  addGlobalPromotion(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/admin/promotions`, data);
  }
  updateGlobalPromotion(id: number, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/admin/promotions/${id}`, data);
  }

  getTransactions(date: string, method: string) {
  return this.http.get(`${this.apiUrl}/admin/transactions?date=${date}&method=${method}`);
}
}