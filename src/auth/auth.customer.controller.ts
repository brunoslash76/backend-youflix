import { Body, Controller, Post } from "@nestjs/common";
import { ApiBody, ApiOperation } from "@nestjs/swagger";
import { CustomerDTO } from "./dto/customer.dto.js";

@Controller('auth/customer')
export class AuthCustomerController {

  @Post('register')
  @ApiOperation({ summary: 'Register a new customer' })
  @ApiBody({ type: CustomerDTO })
  async register(@Body() customerDTO: Partial<CustomerDTO>) {

  }

}