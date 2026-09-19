import { Component, OnInit, OnDestroy, ChangeDetectorRef, AfterViewChecked, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PartnerService } from '../../../services/partner.service';
import { Router, ActivatedRoute } from '@angular/router';
import Swal from 'sweetalert2';

@Component({ 
  selector: 'app-partner-support',
  standalone: true, 
  imports: [CommonModule, FormsModule],
  templateUrl: './partner-support.html',
  styleUrl: './partner-support.css'
})
export class PartnerSupportComponent implements OnInit, OnDestroy, AfterViewChecked {
  contacts: any[] = [];
  selectedContact: any = null;
  replyMessage: string = '';
  messages: any[] = []; 
  
  // Bộ lọc và tìm kiếm
  searchKeyword: string = '';
  filterStatus: string = 'all'; // 'all', 'unread', 'resolved'
  isSending: boolean = false;
  
  // Mẫu câu trả lời nhanh
  quickTemplates: string[] = [
    'Dạ khách sạn xin chào quý khách! Khách sạn có thể hỗ trợ gì cho mình ạ?',
    'Dạ giờ nhận phòng là từ 14:00 và trả phòng trước 12:00 trưa ạ.',
    'Dạ khách sạn đã ghi nhận yêu cầu của quý khách và sẽ chuẩn bị chu đáo ạ!',
    'Dạ rất hân hạnh được phục vụ quý khách tại khách sạn!'
  ];

  @ViewChild('scrollMe') private myScrollContainer!: ElementRef;
  
  private chatInterval: any;
  private customerIdToOpen: number | null = null;
  private shouldScrollBottom: boolean = false;

  constructor(
    private partnerService: PartnerService,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      if (params['customer_id']) {
        this.customerIdToOpen = Number(params['customer_id']);
      }
    });

    this.loadThreads();

    this.chatInterval = setInterval(() => {
      this.silentReload();
    }, 3500);
  }

  ngOnDestroy(): void {
    if (this.chatInterval) {
      clearInterval(this.chatInterval);
    }
  }

  get isMobileView(): boolean {
    return typeof window !== 'undefined' ? window.innerWidth < 768 : false;
  }

  get unreadCount(): number {
    return this.contacts.filter(c => c.status === 0).length;
  }

  get repliedCount(): number {
    return this.contacts.filter(c => c.status === 1).length;
  }

  get resolvedCount(): number {
    return this.contacts.filter(c => c.status === 2).length;
  }

  get filteredContacts(): any[] {
    let list = this.contacts;
    
    if (this.filterStatus === 'unread') {
      list = list.filter(c => c.status === 0);
    } else if (this.filterStatus === 'resolved') {
      list = list.filter(c => c.status === 2);
    }

    if (this.searchKeyword.trim()) {
      const kw = this.searchKeyword.trim().toLowerCase();
      list = list.filter(c => 
        (c.full_name && c.full_name.toLowerCase().includes(kw)) ||
        (c.message && c.message.toLowerCase().includes(kw)) ||
        (c.phone && c.phone.includes(kw)) ||
        (c.booking_code && c.booking_code.toLowerCase().includes(kw))
      );
    }
    return list;
  }

  loadThreads(): void {
    this.partnerService.getChatThreads().subscribe({
      next: (res: any) => {
        this.contacts = res?.data || [];
        
        // Nếu chuyển từ trang khách hàng qua, tự động mở tin nhắn
        if (this.customerIdToOpen && !this.selectedContact) {
          const targetContact = this.contacts.find(c => c.customer_id === this.customerIdToOpen);
          if (targetContact) {
            this.openChat(targetContact);
            this.customerIdToOpen = null;
          }
        }
        
        if (this.selectedContact) {
          const updated = this.contacts.find(c => c.id === this.selectedContact.id);
          if (updated) {
            this.selectedContact = updated;
            this.messages = updated.messages ? 
              [...updated.messages].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) 
              : [];
          }
        }
        this.cdr.detectChanges();
      },
      error: (err) => console.error("Lỗi khi tải danh sách chat:", err)
    });
  }

  silentReload(): void {
    this.partnerService.getChatThreads().subscribe({
      next: (res: any) => {
        const newContacts = res?.data || [];
        this.contacts = newContacts;

        // Nếu đang mở 1 khung chat
        if (this.selectedContact) {
          const updated = newContacts.find((c: any) => c.id === this.selectedContact.id);
          if (updated && updated.messages) {
            if (this.messages.length !== updated.messages.length) {
              this.selectedContact = updated;
              this.messages = [...updated.messages].sort((a: any, b: any) => 
                new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
              );
              this.shouldScrollBottom = true;
              this.cdr.detectChanges();
            }
          }
        } else {
          this.cdr.detectChanges();
        }
      }
    });
  }

  openChat(contact: any): void {
    this.selectedContact = contact;
    this.messages = contact.messages ? 
      [...contact.messages].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) 
      : [];    
    this.replyMessage = '';
    this.shouldScrollBottom = true;
    this.cdr.detectChanges();

    // Tải thêm tin nhắn chi tiết từ API để đồng bộ 100%
    if (contact.id) {
      this.partnerService.getChatMessages(contact.id).subscribe({
        next: (res: any) => {
          if (res && res.data) {
            this.messages = [...res.data].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
            this.shouldScrollBottom = true;
            this.cdr.detectChanges();
          }
        },
        error: (err) => console.warn('Không thể tải tin nhắn chi tiết:', err)
      });
    }

    if (contact.status === 0) {
      this.markAsRead(contact.id);
    }
  }

  closeChat(): void {
    this.selectedContact = null;
    this.replyMessage = '';
  }

  markAsRead(threadId: number): void {
    this.partnerService.updateContactStatus(threadId, { status: 1 }).subscribe(() => {
      if (this.selectedContact && this.selectedContact.id === threadId) {
        this.selectedContact.status = 1;
      }
      const item = this.contacts.find(c => c.id === threadId);
      if (item) {
        item.status = 1;
      }
      this.silentReload(); 
    });
  }

  toggleResolveStatus(): void {
    if (!this.selectedContact) return;
    const newStatus = this.selectedContact.status === 2 ? 1 : 2;
    const title = newStatus === 2 ? 'Đánh dấu hoàn tất?' : 'Mở lại cuộc hội thoại?';
    const text = newStatus === 2 
      ? 'Cuộc trò chuyện này sẽ được chuyển sang mục Đã giải quyết.' 
      : 'Hội thoại sẽ được mở lại để tiếp tục trao đổi với khách.';

    Swal.fire({
      title: title,
      text: text,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Đồng ý',
      cancelButtonText: 'Hủy',
      confirmButtonColor: '#4f46e5'
    }).then((result) => {
      if (result.isConfirmed) {
        this.partnerService.updateContactStatus(this.selectedContact.id, { status: newStatus }).subscribe({
          next: () => {
            this.selectedContact.status = newStatus;
            const item = this.contacts.find(c => c.id === this.selectedContact.id);
            if (item) {
              item.status = newStatus;
            }
            Swal.fire({
              icon: 'success',
              title: newStatus === 2 ? 'Đã hoàn tất hội thoại' : 'Đã mở lại hội thoại',
              timer: 1400,
              showConfirmButton: false
            });
            this.cdr.detectChanges();
          },
          error: () => Swal.fire('Lỗi', 'Không thể cập nhật trạng thái', 'error')
        });
      }
    });
  }

  insertTemplate(template: string): void {
    this.replyMessage = template;
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendReply();
    }
  }

  sendReply(): void {
    const text = this.replyMessage.trim();
    if (!text || !this.selectedContact || this.isSending) return;

    this.isSending = true;
    this.partnerService.sendChatMessage(this.selectedContact.id, { message: text }).subscribe({
      next: (res) => {
        this.messages = [...this.messages, res];
        this.replyMessage = '';
        this.isSending = false;
        this.shouldScrollBottom = true;
        this.selectedContact.status = 1;
        
        const item = this.contacts.find(c => c.id === this.selectedContact.id);
        if (item) {
          item.status = 1;
          item.message = text;
          item.created_at = new Date().toISOString();
        }

        this.silentReload(); 
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isSending = false;
        Swal.fire('Lỗi', err.error?.message || 'Không thể gửi tin nhắn', 'error');
      }
    });
  }

  scrollToBottom(): void {
    if (this.myScrollContainer) {
      try {
        this.myScrollContainer.nativeElement.scrollTop = this.myScrollContainer.nativeElement.scrollHeight;
      } catch (e) {}
    }
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollBottom) {
      setTimeout(() => {
        this.scrollToBottom();
      }, 50);
      this.shouldScrollBottom = false;
    }
  }

  goToBooking(bookingId: number): void {
    if (bookingId) {
      this.router.navigate(['/dashboard/bookings', bookingId]);
    }
  }

  getInitials(name: string): string {
    if (!name) return 'K';
    const parts = name.trim().split(' ');
    if (parts.length > 1) {
      return parts[parts.length - 1].charAt(0).toUpperCase();
    }
    return name.charAt(0).toUpperCase();
  }
}
