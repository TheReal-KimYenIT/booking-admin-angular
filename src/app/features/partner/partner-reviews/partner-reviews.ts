import { Component, OnInit, ChangeDetectorRef, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PartnerService } from '../../../services/partner.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-partner-reviews',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './partner-reviews.html',
  styleUrls: ['./partner-reviews.css']
})
export class PartnerReviewsComponent implements OnInit, AfterViewInit, OnDestroy {
  reviews: any[] = [];
  isLoading: boolean = false;
  
  // Bộ lọc
  selectedStatus: string = 'all'; // 'all', 'unreplied', 'replied'
  selectedRating: string = 'all'; // 'all', '5', '4', '3', '2', '1'
  searchTerm: string = '';
  private searchDebounceTimer: any = null;

  // Thống kê KPI
  stats: any = {
    total_reviews: 0,
    avg_rating: 0,
    unreplied_count: 0,
    replied_count: 0,
    five_star_count: 0,
    five_star_rate: 0
  };

  // Phân trang
  currentPage: number = 1;
  lastPage: number = 1;
  totalItems: number = 0;
  
  replyInputs: { [key: number]: string } = {};
  isSubmitting: number | null = null;
  selectedReview: any = null;

  // Mẫu câu trả lời nhanh
  quickTemplates: string[] = [
    'Khách sạn chân thành cảm ơn quý khách đã tin tưởng trải nghiệm dịch vụ. Rất mong sớm được đón tiếp quý khách lần tới!',
    'Khách sạn rất vui vì quý khách đã có kỳ nghỉ trọn vẹn và hài lòng. Kính chúc quý khách và gia đình luôn dồi dào sức khỏe!',
    'Khách sạn chân thành xin lỗi vì trải nghiệm chưa được trọn vẹn. Chúng tôi đã ghi nhận đóng góp và sẽ nâng cấp dịch vụ ngay!'
  ];

  constructor(
    private partnerService: PartnerService,
    private cdr: ChangeDetectorRef
  ) {}

  ngAfterViewInit(): void {
    const modal = document.getElementById('reviewDetailModal');
    if (modal) {
      document.body.appendChild(modal);
    }
  }

  ngOnDestroy(): void {
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }
    const modal = document.getElementById('reviewDetailModal');
    if (modal) {
      modal.remove();
    }
  }

  ngOnInit(): void {
    this.loadReviews();
  }

  loadReviews(): void {
    this.isLoading = true;
    this.cdr.detectChanges();
    
    this.partnerService.getReviews(
      this.currentPage, 
      this.selectedStatus, 
      this.selectedRating, 
      this.searchTerm
    ).subscribe({
      next: (res: any) => {
        if (res && res.data && res.data.data) {
          this.reviews = res.data.data;
          this.currentPage = res.data.current_page || 1;
          this.lastPage = res.data.last_page || 1;
          this.totalItems = res.data.total || 0;
          
          this.reviews.forEach(review => {
            if (!review.partner_reply) {
              if (this.replyInputs[review.id] === undefined) {
                this.replyInputs[review.id] = '';
              }
            } else {
              this.replyInputs[review.id] = review.partner_reply;
            }
          });
        } else {
          this.reviews = [];
          this.totalItems = 0;
        }

        // Cập nhật thống kê từ API hoặc fallback
        if (res && res.stats) {
          this.stats = res.stats;
        } else if (this.reviews.length > 0) {
          const total = this.reviews.length;
          const sum = this.reviews.reduce((acc, cur) => acc + (cur.rating || 0), 0);
          const fiveStar = this.reviews.filter(r => r.rating === 5).length;
          const unreplied = this.reviews.filter(r => !r.partner_reply).length;
          this.stats = {
            total_reviews: total,
            avg_rating: total > 0 ? (sum / total).toFixed(1) : 0,
            unreplied_count: unreplied,
            replied_count: total - unreplied,
            five_star_count: fiveStar,
            five_star_rate: total > 0 ? Math.round((fiveStar / total) * 100) : 0
          };
        }
        
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isLoading = false;
        this.cdr.detectChanges();
        Swal.fire('Lỗi', err.error?.message || 'Không thể tải danh sách đánh giá', 'error');
      }
    });
  }

  onSearchInput(): void {
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }
    this.searchDebounceTimer = setTimeout(() => {
      this.currentPage = 1;
      this.loadReviews();
    }, 350);
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.currentPage = 1;
    this.loadReviews();
  }

  selectStatus(status: string): void {
    if (this.selectedStatus !== status) {
      this.selectedStatus = status;
      this.currentPage = 1;
      this.loadReviews();
    }
  }

  selectRating(rating: string): void {
    if (this.selectedRating !== rating) {
      this.selectedRating = rating;
      this.currentPage = 1;
      this.loadReviews();
    }
  }

  resetAllFilters(): void {
    this.selectedStatus = 'all';
    this.selectedRating = 'all';
    this.searchTerm = '';
    this.currentPage = 1;
    this.loadReviews();
  }

  viewDetail(review: any): void {
    this.selectedReview = { ...review };
    this.replyInputs[review.id] = review.partner_reply || '';
  }

  applyTemplate(template: string): void {
    if (this.selectedReview) {
      this.replyInputs[this.selectedReview.id] = template;
    }
  }

  changePage(page: number): void {
    if (page >= 1 && page <= this.lastPage && page !== this.currentPage) {
      this.currentPage = page;
      this.loadReviews();
    }
  }

  sendReply(reviewId: number): void {
    const content = this.replyInputs[reviewId]?.trim();
    if (!content) {
      Swal.fire('Chú ý', 'Vui lòng nhập nội dung phản hồi cho khách hàng', 'warning');
      return;
    }

    this.isSubmitting = reviewId;
    this.partnerService.submitReply(reviewId, content).subscribe({
      next: (res: any) => {
        Swal.fire({
          icon: 'success',
          title: 'Thành công',
          text: 'Đã gửi phản hồi đánh giá thành công!',
          timer: 1600,
          showConfirmButton: false
        });
        this.isSubmitting = null;
        
        if (this.selectedReview && this.selectedReview.id === reviewId) {
          this.selectedReview.partner_reply = content;
          this.selectedReview.replied_at = new Date().toISOString();
        }

        // Cập nhật ngay trong list hiện tại
        const item = this.reviews.find(r => r.id === reviewId);
        if (item) {
          item.partner_reply = content;
          item.replied_at = new Date().toISOString();
        }
        
        this.loadReviews();
      },
      error: (err) => {
        Swal.fire('Lỗi', err.error?.message || 'Có lỗi xảy ra khi gửi phản hồi', 'error');
        this.isSubmitting = null;
      }
    });
  }

  openImage(url: string): void {
    Swal.fire({
      imageUrl: url,
      imageAlt: 'Hình ảnh đánh giá',
      showConfirmButton: false,
      width: 'auto',
      showCloseButton: true,
      customClass: {
        popup: 'p-2 bg-white rounded-4 shadow-lg border-0'
      },
      backdrop: 'rgba(15, 23, 42, 0.85)'
    });
  }

  getInitials(name: string): string {
    if (!name) return 'K';
    const parts = name.trim().split(' ');
    if (parts.length > 1) {
      return (parts[parts.length - 1].charAt(0)).toUpperCase();
    }
    return name.charAt(0).toUpperCase();
  }
}