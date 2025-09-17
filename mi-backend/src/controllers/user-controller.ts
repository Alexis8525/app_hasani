import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { UserModel } from '../models/user.models';

export class UserController {
  static async crearUsuario(req: Request, res: Response) {
    const { email, password } = req.body;
    try {
      console.log("📩 Datos recibidos:", req.body);

      const existingUser = await UserModel.findByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: 'Usuario ya registrado' });
      }

      const user = await UserModel.create(email, password);
      res.status(201).json({ message: 'Usuario registrado', user });
    } catch (error: any) {
      console.error("❌ Error en crearUsuario:", error.message);
      res.status(500).json({ message: 'Error al registrar usuario', error: error.message });
    }
  }

  static async getUsuarios(req: Request, res: Response) {
    try {
      const usuarios = await UserModel.getUsuarios();
      res.json(usuarios);
    } catch (error: any) {
      res.status(500).json({ message: "Error al obtener usuarios", error: error.message });
    }
  }

  static async updateUsuario(req: Request, res: Response) {
    const { id, password } = req.body;
    try {
      const user = await UserModel.updateUsuario(id, password);
      if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });
      res.json({ message: 'Usuario actualizado', user });
    } catch (error: any) {
      res.status(500).json({ message: 'Error al actualizar usuario', error: error.message });
    }
  }

  static async deleteUsuario(req: Request, res: Response) {
    const { id } = req.body;
    try {
      const deleted = await UserModel.deleteUsuario(id);
      if (!deleted) return res.status(404).json({ message: 'Usuario no encontrado' });
      res.json({ message: 'Usuario eliminado' });
    } catch (error: any) {
      res.status(500).json({ message: 'Error al eliminar usuario', error: error.message });
    }
  }

  static async login(req: Request, res: Response) {
    const { email, password } = req.body;
    try {
      console.log("📩 Login request:", req.body);
  
      const user = await UserModel.findByEmail(email);
      console.log("👤 Usuario encontrado:", user);
  
      if (!user) return res.status(401).json({ message: 'Credenciales inválidas' });
  
      const valid = await bcrypt.compare(password, user.password);
      console.log("🔑 Contraseña válida?", valid);
  
      if (!valid) return res.status(401).json({ message: 'Credenciales inválidas' });
  
      res.status(200).json({ message: 'Login exitoso', user });
    } catch (error: any) {
      console.error("❌ Error en login:", error);
      res.status(500).json({ message: 'Error al iniciar sesión', error: error.message });
    }
  }
  
}
