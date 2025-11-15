// components/modal/modal.component.ts
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="isOpen" class="modal-overlay" (click)="onOverlayClick($event)">
      <div class="modal-content" [class]="size">
        <div class="modal-header">
          <h3>{{ title }}</h3>
          <button class="btn-close" (click)="onClose()">×</button>
        </div>
        <div class="modal-body">
          <ng-content></ng-content>
        </div>
        <div *ngIf="showFooter" class="modal-footer">
          <button class="btn btn-secondary" (click)="onClose()">Cancelar</button>
          <button class="btn btn-primary" (click)="onConfirm()">Confirmar</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 1000;
    }
    .modal-content {
      background: white;
      border-radius: 8px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      max-width: 90%;
      max-height: 90%;
      overflow: auto;
    }
    .modal-content.large {
      width: 800px;
    }
    .modal-content.medium {
      width: 600px;
    }
    .modal-content.small {
      width: 400px;
    }
    .modal-header {
      padding: 1rem 1.5rem;
      border-bottom: 1px solid #e5e7eb;
      display: flex;
      justify-content: between;
      align-items: center;
    }
    .modal-header h3 {
      margin: 0;
      flex: 1;
    }
    .btn-close {
      background: none;
      border: none;
      font-size: 1.5rem;
      cursor: pointer;
      padding: 0;
      width: 30px;
      height: 30px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .modal-body {
      padding: 1.5rem;
    }
    .modal-footer {
      padding: 1rem 1.5rem;
      border-top: 1px solid #e5e7eb;
      display: flex;
      justify-content: flex-end;
      gap: 0.5rem;
    }
  `]
})
export class ModalComponent {
  @Input() isOpen = false;
  @Input() title = '';
  @Input() showFooter = false;
  @Input() size: 'small' | 'medium' | 'large' = 'medium';
  @Output() closed = new EventEmitter<void>();
  @Output() confirmed = new EventEmitter<void>();

  onClose() {
    this.closed.emit();
  }

  onConfirm() {
    this.confirmed.emit();
  }

  onOverlayClick(event: MouseEvent) {
    if ((event.target as HTMLElement).classList.contains('modal-overlay')) {
      this.onClose();
    }
  }
}