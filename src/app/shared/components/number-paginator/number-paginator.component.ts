import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-number-paginator',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './number-paginator.component.html',
  styleUrls: ['./number-paginator.component.scss'],
})
export class NumberPaginatorComponent implements OnChanges {
  /** Total number of items across all pages. */
  @Input() length = 0;
  /** Items shown per page. */
  @Input() pageSize = 10;
  /** Zero-based current page index. */
  @Input() pageIndex = 0;
  /** Max numbered buttons visible at once (excluding first/last when ellipsis used). */
  @Input() visiblePages = 5;

  @Output() pageChange = new EventEmitter<number>();

  pageNumbers: Array<number | '...'> = [];
  totalPages = 0;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['length'] || changes['pageSize'] || changes['pageIndex'] || changes['visiblePages']) {
      this.recompute();
    }
  }

  get canGoPrevious(): boolean {
    return this.pageIndex > 0;
  }

  get canGoNext(): boolean {
    return this.pageIndex < this.totalPages - 1;
  }

  get rangeLabel(): string {
    if (this.length === 0) return '0 items';
    const start = this.pageIndex * this.pageSize + 1;
    const end = Math.min((this.pageIndex + 1) * this.pageSize, this.length);
    return `${start}–${end} of ${this.length}`;
  }

  previous(): void {
    if (!this.canGoPrevious) return;
    this.emitPage(this.pageIndex - 1);
  }

  next(): void {
    if (!this.canGoNext) return;
    this.emitPage(this.pageIndex + 1);
  }

  goToPage(page: number | '...'): void {
    if (page === '...' || typeof page !== 'number') return;
    if (page < 0 || page >= this.totalPages || page === this.pageIndex) return;
    this.emitPage(page);
  }

  private emitPage(index: number): void {
    this.pageChange.emit(index);
  }

  private recompute(): void {
    const size = Math.max(1, this.pageSize || 10);
    this.totalPages = Math.max(1, Math.ceil(Math.max(0, this.length) / size));
    this.pageNumbers = this.buildPageNumbers();
  }

  private buildPageNumbers(): Array<number | '...'> {
    const total = this.totalPages;
    const current = Math.min(Math.max(0, this.pageIndex), Math.max(0, total - 1));
    const maxVisible = Math.max(3, this.visiblePages);

    if (total <= maxVisible + 2) {
      return Array.from({ length: total }, (_, i) => i);
    }

    const pages: Array<number | '...'> = [0];
    let start = Math.max(1, current - Math.floor((maxVisible - 1) / 2));
    let end = Math.min(total - 2, start + maxVisible - 1);

    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    if (start > 1) {
      pages.push('...');
    }

    for (let i = start; i <= end; i += 1) {
      pages.push(i);
    }

    if (end < total - 2) {
      pages.push('...');
    }

    pages.push(total - 1);
    return pages;
  }
}
