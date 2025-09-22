import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { UserModel } from '../models/user.models';

export class UserController {
  // static async login(req: Request, res: Response) {
  //   const { email, password } = req.body;
  //   try {
  //     console.log("📩 Login request:", req.body);
  
  //     // Validar email
  //     if (!UserModel.validateEmail(email)) {
  //       return res.status(400).json({ message: 'Correo electrónico inválido' });
  //     }
  
  //     // Buscar usuario
  //     const user = await UserModel.findByEmail(email);
  //     console.log("👤 Usuario encontrado:", user);
  
  //     if (!user) return res.status(401).json({ message: 'Credenciales inválidas' });
  
  //     // Comparar contraseña
  //     const valid = await bcrypt.compare(password, user.password);
  //     console.log("🔑 Contraseña válida?", valid);
  
  //     if (!valid) return res.status(401).json({ message: 'Credenciales inválidas' });
  
  //     res.status(200).json({ message: 'Login exitoso', user });
  //   } catch (error: any) {
  //     console.error("❌ Error en login:", error);
  //     res.status(500).json({ message: 'Error al iniciar sesión', error: error.message });
  //   }
  // }  

  static async crearUsuario(req: Request, res: Response) {
    const { email, password, role, phone } = req.body; // recibir role y phone
    try {
      console.log("📩 Datos recibidos:", req.body);
  
      if (!email || !password || !role || !phone) {
        return res.status(400).json({ message: 'Email, password, role y phone son obligatorios' });
      }
  
      if (!UserModel.validateEmail(email)) {
        return res.status(400).json({ message: 'Correo electrónico inválido' });
      }
  
      if (!UserModel.validatePasswordFormat(password)) {
        return res.status(400).json({
          message: 'Contraseña inválida. Debe tener al menos 8 caracteres, una mayúscula, un número y un símbolo especial.'
        });
      }
  
      if (!UserModel.validatePhone(phone)) {
        return res.status(400).json({ message: 'Teléfono inválido' });
      }
  
      const existingUser = await UserModel.findByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: 'Usuario ya registrado' });
      }
  
      const user = await UserModel.create(email, password, role, phone); // pasar los 4 argumentos
  
      res.status(201).json({ message: 'Usuario registrado', user });
    } catch (error: any) {
      console.error("❌ Error en crearUsuario:", error.message);
      res.status(500).json({ message: 'Error al registrar usuario', error: error.message });
    }
  }
  

  static async updateUsuario(req: Request, res: Response) {
    const { email } = req.params; // ahora pasamos email en URL
    const { newEmail, role, password, phone } = req.body;
  
    try {
      const user = await UserModel.updateUsuarioByEmail(email, { newEmail, role, password, phone });
  
      if (!user) return res.status(404).json({ code: 1, message: 'Usuario no encontrado' });
  
      res.json({ code: 0, message: 'Usuario actualizado', user });
    } catch (error: any) {
      res.status(500).json({ code: 1, message: 'Error al actualizar usuario', error: error.message });
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

  static async deleteUsuario(req: Request, res: Response) {
    const { email } = req.params;
  
    try {
      const deleted = await UserModel.deleteUsuarioByEmail(email);
      if (!deleted) return res.status(404).json({ code: 1, message: 'Usuario no encontrado' });
      res.json({ code: 0, message: 'Usuario eliminado' });
    } catch (error: any) {
      res.status(500).json({ code: 1, message: 'Error al eliminar usuario', error: error.message });
    }
  }
  
}
