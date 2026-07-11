// 👉 THÊM MỚI: Import OnDestroy
import { Component, OnInit, OnDestroy, ChangeDetectorRef, AfterViewChecked, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PartnerService } from '../../../services/partner.service';

import { Router } from '@angular/router';

@Component({ 
  selector: 'app-partner-support',
  standalone: true, 
  imports: [CommonModule, FormsModule],
  templateUrl: './partner-support.html',
  styleUrl: './partner-support.css'
})
// 👉 THÊM MỚI: Khai báo OnDestroy
export class PartnerSupportComponent implements OnInit, OnDestroy, AfterViewChecked {
  contacts: any[] = [];
  selectedContact: any = null;
  replyMessage: string = '';
  messages: any[] = []; 
  
  @ViewChild('scrollMe') private myScrollContainer!: ElementRef;
  
  // 👉 THÊM MỚI: Biến lưu trữ vòng lặp
  private chatInterval: any;

  constructor(
    private partnerService: PartnerService,
    private cdr: ChangeDetectorRef ,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadThreads();

    // 👉 THÊM MỚI: Tự động chạy ngầm mỗi 3 giây (3000 ms)
    this.chatInterval = setInterval(() => {
        this.silentReload();
    }, 3000);
  }

  // 👉 THÊM MỚI: Xóa vòng lặp khi thoát khỏi trang Hỗ trợ để không bị nặng máy
  ngOnDestroy() {
    if (this.chatInterval) {
        clearInterval(this.chatInterval);
    }
  }

  loadThreads() {
    this.partnerService.getChatThreads().subscribe({
      next: (res: any) => {
        this.contacts = res?.data || [];
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
      error: (err) => console.error("Lỗi:", err)
    });
  }

  // 👉 THÊM MỚI: Hàm load ngầm không làm giật màn hình
  silentReload() {
    this.partnerService.getChatThreads().subscribe({
        next: (res: any) => {
            const newContacts = res?.data || [];
            this.contacts = newContacts;

            // Nếu đang mở 1 khung chat
            if (this.selectedContact) {
                const updated = newContacts.find((c: any) => c.id === this.selectedContact.id);
                if (updated && updated.messages) {
                    // CỰC KỲ QUAN TRỌNG: Chỉ cập nhật mảng nếu số lượng tin nhắn thay đổi (có tin mới)
                    // Điều này giúp bạn đang gõ phím không bị mất focus
                    if (this.messages.length !== updated.messages.length) {
                        this.selectedContact = updated;
                        this.messages = [...updated.messages].sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
                        this.cdr.detectChanges();
                        this.scrollToBottom(); // Tự cuộn xuống khi khách vừa nhắn
                    }
                }
            } else {
                this.cdr.detectChanges();
            }
        }
    });
  }

  openChat(contact: any) {
    this.selectedContact = contact;
    this.messages = contact.messages ? 
        [...contact.messages].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) 
        : [];    
    this.replyMessage = '';
    this.cdr.detectChanges();
    if (contact.status === 0) {
        this.markAsRead(contact.id);
    }
  }

  markAsRead(threadId: number) {
    this.partnerService.updateContactStatus(threadId, { status: 1 }).subscribe(() => {
        this.selectedContact.status = 1;
        this.silentReload(); 
    });
  }

  sendReply() {
    if (!this.replyMessage.trim() || !this.selectedContact) return;

    this.partnerService.sendChatMessage(this.selectedContact.id, { message: this.replyMessage }).subscribe({
      next: (res) => {
        this.messages = [...this.messages, res]; 
        this.replyMessage = '';
        this.silentReload(); 
      }
    });
  }

  scrollToBottom(): void {
    if (this.myScrollContainer) {
        this.myScrollContainer.nativeElement.scrollTop = this.myScrollContainer.nativeElement.scrollHeight;
    }
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }
  goToBooking(bookingId: number) {
    if (bookingId) {
      this.router.navigate(['/dashboard/bookings', bookingId]);
    }
  }
}