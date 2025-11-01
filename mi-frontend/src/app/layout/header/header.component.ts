// layout/header/header.component.ts
import { Component, inject, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <header class="header">
      <div class="header-content">
        <div class="header-left">
          <button class="menu-toggle" (click)="toggleSidebar.emit()">
            ☰
          </button>
          <div class="logo">
            <h1>Sistema de Inventario</h1>
          </div>
        </div>
        
        <div class="user-section">
          <span class="user-info">Hola, {{ currentUser?.email }}</span>
          <button class="logout-btn" (click)="onLogout()">
            Cerrar Sesión
          </button>
        </div>
      </div>
    </header>
  `,
  styles: [`
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 0;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 1000;
      height: 60px;
    }

    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0 1rem;
      height: 100%;
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .menu-toggle {
      background: none;
      border: none;
      color: white;
      font-size: 1.5rem;
      cursor: pointer;
      padding: 0.5rem;
      border-radius: 4px;
      transition: background-color 0.3s ease;
    }

    .menu-toggle:hover {
      background: rgba(255,255,255,0.1);
    }

    .logo h1 {
      margin: 0;
      font-size: 1.3rem;
      font-weight: 600;
    }

    .user-section {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .user-info {
      font-weight: 500;
      font-size: 0.9rem;
    }

    .logout-btn {
      background: rgba(255,255,255,0.2);
      color: white;
      border: 1px solid rgba(255,255,255,0.3);
      padding: 0.5rem 1rem;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.3s ease;
      font-weight: 500;
      font-size: 0.9rem;
    }

    .logout-btn:hover {
      background: rgba(255,255,255,0.3);
      transform: translateY(-1px);
    }

    @media (max-width: 768px) {
      .logo h1 {
        font-size: 1.1rem;
      }
      
      .user-info {
        display: none;
      }
    }
  `]
})
export class HeaderComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  @Output() toggleSidebar = new EventEmitter<void>();

  currentUser: any;

  constructor() {
    this.loadCurrentUser();
  }

  loadCurrentUser() {
    this.currentUser = this.authService.loadUserFromStorage();
  }

  async onLogout() {
    try {
      await this.authService.logout().toPromise();
    } catch (error) {
      console.warn('Error al cerrar sesión en el backend, forzando logout local');
      this.authService.forceLogout();
    }
  }
}
