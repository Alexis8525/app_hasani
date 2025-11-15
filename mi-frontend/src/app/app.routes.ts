import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { UsuariosComponent } from './pages/usuarios/usuarios.component';
import { ProductosComponent } from './pages/productos/productos.component';
import { authGuard } from './guards/auth.guard';
import { ClientesComponent } from './pages/clientes/clientes.component';
import { ProveedoresComponent } from './pages/proveedores/proveedores.component';
import { MovimientosComponent } from './pages/movimientos/movimientos.component';
import { BitacoraComponent } from './pages/bitacora/bitacora.component';
import { MainLayoutComponent } from './layout/main-layout/main-layout.component';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { 
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: 'dashboard', component: DashboardComponent },
      { path: 'usuarios', component: UsuariosComponent },
      { path: 'productos', component: ProductosComponent },
      { path: 'clientes', component: ClientesComponent },
      { path: 'proveedores', component: ProveedoresComponent },
      { path: 'movimientos', component: MovimientosComponent },
      { path: 'bitacora', component: BitacoraComponent },
    ]
  },
  { path: '**', redirectTo: '/usuarios' }
];
