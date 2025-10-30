import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl;

  private getHeaders() {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  get(endpoint: string) {
    return this.http.get(`${this.baseUrl}/${endpoint}`, { headers: this.getHeaders() });
  }

  post(endpoint: string, data: any) {
    return this.http.post(`${this.baseUrl}/${endpoint}`, data, { headers: this.getHeaders() });
  }

  put(endpoint: string, data: any) {
    return this.http.put(`${this.baseUrl}/${endpoint}`, data, { headers: this.getHeaders() });
  }

  delete(endpoint: string) {
    return this.http.delete(`${this.baseUrl}/${endpoint}`, { headers: this.getHeaders() });
  }
}

