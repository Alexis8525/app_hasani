import { Pool } from 'pg';

export interface Cliente {
  id_cliente: number;
  id_user: number;
  nombre: string;
  telefono?: string;
  contacto?: string;
}

export class ClienteModel {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async findAll(): Promise<Cliente[]> {
    const result = await this.pool.query('SELECT * FROM clientes ORDER BY id_cliente DESC');
    return result.rows;
  }

  async findById(id: number): Promise<Cliente | null> {
    const result = await this.pool.query('SELECT * FROM clientes WHERE id_cliente = $1', [id]);
    return result.rows[0] || null;
  }

  async create(cliente: Omit<Cliente, 'id_cliente'>): Promise<Cliente> {
    const { id_user, nombre, telefono, contacto } = cliente;
    const result = await this.pool.query(
      'INSERT INTO clientes (id_user, nombre, telefono, contacto) VALUES ($1, $2, $3, $4) RETURNING *',
      [id_user, nombre, telefono, contacto]
    );
    return result.rows[0];
  }

  async update(id: number, cliente: Partial<Omit<Cliente, 'id_cliente'>>): Promise<Cliente | null> {
    const { nombre, telefono, contacto } = cliente;
    const result = await this.pool.query(
      'UPDATE clientes SET nombre = COALESCE($1, nombre), telefono = COALESCE($2, telefono), contacto = COALESCE($3, contacto) WHERE id_cliente = $4 RETURNING *',
      [nombre, telefono, contacto, id]
    );
    return result.rows[0] || null;
  }

  async delete(id: number): Promise<boolean> {
    const result = await this.pool.query('DELETE FROM clientes WHERE id_cliente = $1', [id]);
    return (result.rowCount ?? 0) > 0; // <-- aquí se corrige
  }
  

  async findByUserId(id_user: number): Promise<Cliente[]> {
    const result = await this.pool.query('SELECT * FROM clientes WHERE id_user = $1 ORDER BY id_cliente DESC', [id_user]);
    return result.rows;
  }
}