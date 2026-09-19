import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class PartnerService {
  private apiUrl = environment.apiUrl; 

  constructor(private http: HttpClient ) { }

  getReviews(page: number, status: string, rating: string = 'all', search: string = ''): Observable<any> {
    let url = `${this.apiUrl}/partner/reviews?page=${page}&status=${status}`;
    if (rating && rating !== 'all') {
      url += `&rating=${rating}`;
    }
    if (search && search.trim()) {
      url += `&search=${encodeURIComponent(search.trim())}`;
    }
    return this.http.get(url);
  }

  submitReply(reviewId: number, content: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/partner/reviews/${reviewId}/reply`, { reply_content: content });
  }

  registerPartner(data: FormData): Observable<any> {
    return this.http.post(`${this.apiUrl}/partner/register`, data);
  }

  // ==========================================
  // QUẢN LÝ TIỆN ÍCH KHÁCH SẠN / PHÒNG
  // ==========================================
  getHotelAmenities(): Observable<any> {
    return this.http.get(`${this.apiUrl}/partner/hotel/amenities`);
  }

  updateHotelAmenities(amenityIds: number[]): Observable<any> {
    return this.http.post(`${this.apiUrl}/partner/hotel/amenities`, { amenity_ids: amenityIds });
  }

  getRoomAmenities(): Observable<any> {
    return this.http.get(`${this.apiUrl}/partner/room-amenities`);
  }

  // ==========================================
  // QUẢN LÝ LOẠI PHÒNG (Sử dụng chuẩn FormData)
  // ==========================================
  getRoomTypes(): Observable<any> {
    return this.http.get(`${this.apiUrl}/partner/room-types`);
  }

  addRoomType(data: FormData): Observable<any> {
    return this.http.post(`${this.apiUrl}/partner/room-types`, data);
  }

  updateRoomType(id: number, data: FormData): Observable<any> {
    data.append('_method', 'PUT'); 
    return this.http.post(`${this.apiUrl}/partner/room-types/${id}`, data);
  }

  deleteRoomType(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/partner/room-types/${id}`);
  }

  setPrimaryRoomImage(mediaId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/partner/media/${mediaId}/set-primary`, {});
  }

  deleteRoomMedia(mediaId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/partner/media/${mediaId}`);
  }

  // ==========================================
  // QUẢN LÝ PHÒNG VẬT LÝ
  // ==========================================
  getRooms(): Observable<any> {
    return this.http.get(`${this.apiUrl}/partner/rooms`);
  }
  addRoom(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/partner/rooms`, data);
  }
  updateRoom(id: number, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/partner/rooms/${id}`, data);
  }
  deleteRoom(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/partner/rooms/${id}`);
  }
getAvailableRoomsByType(roomTypeId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/partner/rooms/available/${roomTypeId}`);
  }
  // ==========================================
  // QUẢN LÝ DỊCH VỤ PHÁT SINH
  // ==========================================
  getServices(): Observable<any> {
    return this.http.get(`${this.apiUrl}/partner/services`);
  }
  addService(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/partner/services`, data);
  }
  updateService(id: number, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/partner/services/${id}`, data);
  }
  deleteService(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/partner/services/${id}`);
  }

  // ==========================================
  // QUẢN LÝ MINIBAR
  // ==========================================
  getMinibars(): Observable<any> {
    return this.http.get(`${this.apiUrl}/partner/minibars`);
  }
  addMinibar(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/partner/minibars`, data);
  }
  updateMinibar(id: number, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/partner/minibars/${id}`, data);
  }
  deleteMinibar(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/partner/minibars/${id}`);
  }

  // ==========================================
  // QUẢN LÝ VẬT TƯ (Bảng đền bù)
  // ==========================================
  getSupplies(): Observable<any> {
    return this.http.get(`${this.apiUrl}/partner/supplies`);
  }
  addSupply(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/partner/supplies`, data);
  }
  updateSupply(id: number, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/partner/supplies/${id}`, data);
  }
  deleteSupply(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/partner/supplies/${id}`);
  }

  // ==========================================
  // QUẢN LÝ MÃ KHUYẾN MÃI (PROMOTION)
  // ==========================================
  getPromotions(): Observable<any> {
    return this.http.get(`${this.apiUrl}/partner/promotions`);
  }
  addPromotion(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/partner/promotions`, data);
  }
  updatePromotion(id: number, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/partner/promotions/${id}`, data);
  }
  deletePromotion(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/partner/promotions/${id}`);
  }

  // ==========================================
  // CÁC HÀM XEM HỒ SƠ CHI TIẾT
  // ==========================================
  showHotelProfile(): Observable<any> {
    return this.http.get(`${this.apiUrl}/partner/hotel`);
  }
  getHotelDetail(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/hotels/${id}`);  
  }


  // ==========================================
  // QUẢN LÝ DANH MỤC PHỤ THU
  // ==========================================
  getSurchargeCategories(): Observable<any> {
    return this.http.get(`${this.apiUrl}/partner/surcharge-categories`);
  }
  
  addSurchargeCategory(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/partner/surcharge-categories`, data);
  }
  
  updateSurchargeCategory(id: number, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/partner/surcharge-categories/${id}`, data);
  }
  
  deleteSurchargeCategory(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/partner/surcharge-categories/${id}`);
  }



  getProfile(): Observable<any> {
    return this.http.get(`${this.apiUrl}/partner/profile`);
  }

  updateProfile(data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/partner/profile`, data);
  }

  changePassword(data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/partner/profile/change-password`, data);
  }

  // ===================== QUẢN LÝ NHÂN VIÊN =====================
  getStaffs(): Observable<any> {
    return this.http.get(`${this.apiUrl}/partner/staffs`);
  }
  createStaff(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/partner/staffs`, data);
  }
  updateStaff(id: number, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/partner/staffs/${id}`, data);
  }
  deleteStaff(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/partner/staffs/${id}`);
  }
  toggleStaffStatus(id: number): Observable<any> {
    return this.http.patch(`${this.apiUrl}/partner/staffs/${id}/toggle-status`, {});
  }


  // ==========================================
  // QUẢN LÝ TIN NHẮN LIÊN HỆ (HỖ TRỢ)
  // ==========================================
  getContacts(): Observable<any> {
    return this.http.get(`${this.apiUrl}/partner/contacts`);
  }

  replyContact(id: number, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/partner/contacts/${id}`, data);
  }


  // Lấy danh sách hội thoại
  getChatThreads(): Observable<any> {
    return this.http.get(`${this.apiUrl}/partner/chat/threads`);
  }

  // Lấy chi tiết tin nhắn của 1 hội thoại
  getChatMessages(threadId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/partner/chat/${threadId}/messages`);
  }
  // Gửi tin nhắn phản hồi
  sendChatMessage(threadId: number, data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/partner/chat/${threadId}/messages`, data);
  }
  // Thêm vào partner.service.ts
updateContactStatus(threadId: number, data: any): Observable<any> {
  return this.http.put(`${this.apiUrl}/partner/chat/threads/${threadId}/status`, data);
}

// ==========================================
  // QUẢN LÝ NHÓM QUYỀN (ROLES)
  // ==========================================
  getRoles(): Observable<any> {
    return this.http.get(`${this.apiUrl}/partner/roles`);
  }
  createRole(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/partner/roles`, data);
  }
  updateRole(id: number, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/partner/roles/${id}`, data);
  }
  deleteRole(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/partner/roles/${id}`);
  }


  getRoomInventory(startDate: string, endDate: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/partner/room-inventory?start_date=${startDate}&end_date=${endDate}`);
  }

  updateBulkInventory(payload: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/partner/room-inventory/bulk-update`, payload);
  }
}