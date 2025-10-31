import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { UsuariosComponent } from './pages/usuarios/usuarios.component';
import { ProductosComponent } from './pages/productos/productos.component';
import { authGuard } from './guards/auth.guard';
import { ClientesComponent } from './pages/clientes/clientes.component';

export const routes: Routes = [
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { 
    path: 'dashboard', 
    component: DashboardComponent, 
    canActivate: [authGuard] 
  },
  { 
    path: 'usuarios', 
    component: UsuariosComponent, 
    canActivate: [authGuard] 
  },
  { 
    path: 'productos', 
    component: ProductosComponent, 
    canActivate: [authGuard] 
  },
  { 
    path: 'clientes', 
    component: ClientesComponent, 
    canActivate: [authGuard] 
  },
  { path: '**', redirectTo: '/dashboard' }
];
