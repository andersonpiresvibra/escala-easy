import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private supabaseUrl = 'https://vefyegxmvjficncbetyp.supabase.co';
  private supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZlZnllZ3htdmpmaWNuY2JldHlwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIyNjYwMjksImV4cCI6MjA5Nzg0MjAyOX0.ioaZkwS98123Jb2xw2l6vev3FgoLwIVwsitg7pTew7c';
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(this.supabaseUrl, this.supabaseKey);
  }

  async testConnection() {
    try {
      const { data, error } = await this.supabase.auth.getSession();
      if (error) throw error;
      console.log('✅ Conexão com Supabase estabelecida com sucesso!', data);
      return true;
    } catch (err) {
      console.error('❌ Erro ao conectar com Supabase:', err);
      return false;
    }
  }

  get client() {
    return this.supabase;
  }
}
