import { Controller } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";

@Controller('auth')
export class AuthController {
  constructor(private jwtService: JwtService) { }

  async validateUser(email: string, password: string): Promise<any> {
    
  }
}