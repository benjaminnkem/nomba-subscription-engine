import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { AuditAction } from '../shared/enums';
import { hashValue, generateRandomToken } from '../shared/utils';
import { AuditService } from '../audit/audit.service';
import { Merchant } from '../merchants/entities/merchant.entity';
import { AuthResponseDto } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { ResetPasswordDto } from './dto/password-reset.dto';
import { SignupDto } from './dto/signup.dto';
import { User } from './entities/user.entity';
import { JwtPayload } from './strategies/jwt.strategy';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Merchant) private merchantRepo: Repository<Merchant>,
    private jwtService: JwtService,
    private config: ConfigService,
    private auditService: AuditService,
  ) {}

  async signup(dto: SignupDto): Promise<AuthResponseDto> {
    const existing = await this.userRepo.findOne({
      where: { email: dto.email },
    });
    if (existing) throw new ConflictException('Email already registered');

    const merchant = this.merchantRepo.create({
      businessName: dto.businessName,
      email: dto.email,
      phone: dto.phone,
      webhookSecret: generateRandomToken(32),
    });
    await this.merchantRepo.save(merchant);

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const user = this.userRepo.create({
      merchantId: merchant.id,
      email: dto.email,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
    });
    await this.userRepo.save(user);

    const tokens = await this.generateTokens(user);
    await this.storeRefreshToken(user.id, tokens.refreshToken);

    await this.auditService.log({
      merchantId: merchant.id,
      actor: user.email,
      action: AuditAction.CREATE,
      resourceType: 'merchant',
      resourceId: merchant.id,
    });

    return this.buildAuthResponse(user, tokens);
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.userRepo.findOne({
      where: { email: dto.email, isActive: true },
    });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.generateTokens(user);
    await this.storeRefreshToken(user.id, tokens.refreshToken);

    await this.auditService.log({
      merchantId: user.merchantId,
      actor: user.email,
      action: AuditAction.LOGIN,
      resourceType: 'user',
      resourceId: user.id,
    });

    return this.buildAuthResponse(user, tokens);
  }

  async refresh(refreshToken: string): Promise<AuthResponseDto> {
    let payload: JwtPayload;
    try {
      payload = this.jwtService.verify<JwtPayload>(refreshToken, {
        secret: this.config.get<string>('jwt.refreshSecret'),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.userRepo.findOne({
      where: { id: payload.sub, isActive: true },
    });
    if (!user?.refreshTokenHash) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const tokenHash = hashValue(refreshToken);
    if (user.refreshTokenHash !== tokenHash) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const tokens = await this.generateTokens(user);
    await this.storeRefreshToken(user.id, tokens.refreshToken);

    return this.buildAuthResponse(user, tokens);
  }

  async requestPasswordReset(email: string): Promise<{ message: string }> {
    const user = await this.userRepo.findOne({ where: { email } });
    if (!user) {
      return { message: 'If the email exists, a reset link has been sent' };
    }

    const token = generateRandomToken(32);
    user.passwordResetTokenHash = hashValue(token);
    user.passwordResetTokenExpiresAt = new Date(Date.now() + 3600000);
    await this.userRepo.save(user);

    return { message: 'If the email exists, a reset link has been sent' };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    const tokenHash = hashValue(dto.token);
    const user = await this.userRepo.findOne({
      where: { passwordResetTokenHash: tokenHash },
    });

    if (
      !user ||
      !user.passwordResetTokenExpiresAt ||
      user.passwordResetTokenExpiresAt < new Date()
    ) {
      throw new UnauthorizedException('Invalid or expired reset token');
    }

    user.passwordHash = await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS);
    user.passwordResetTokenHash = null;
    user.passwordResetTokenExpiresAt = null;
    await this.userRepo.save(user);

    return { message: 'Password reset successfully' };
  }

  private async generateTokens(user: User) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      merchantId: user.merchantId,
    };

    const accessExpiry = this.config.getOrThrow<string>(
      'jwt.accessExpiry',
    ) as `${number}m`;
    const refreshExpiry = this.config.getOrThrow<string>(
      'jwt.refreshExpiry',
    ) as `${number}d`;

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.config.getOrThrow<string>('jwt.accessSecret'),
        expiresIn: accessExpiry,
      }),
      this.jwtService.signAsync(payload, {
        secret: this.config.getOrThrow<string>('jwt.refreshSecret'),
        expiresIn: refreshExpiry,
      }),
    ]);

    return {
      accessToken,
      refreshToken,
      expiresIn: this.config.get<string>('jwt.accessExpiry')!,
    };
  }

  private async storeRefreshToken(userId: string, refreshToken: string) {
    await this.userRepo.update(userId, {
      refreshTokenHash: hashValue(refreshToken),
    });
  }

  private buildAuthResponse(
    user: User,
    tokens: { accessToken: string; refreshToken: string; expiresIn: string },
  ): AuthResponseDto {
    return {
      user: {
        id: user.id,
        email: user.email,
        merchantId: user.merchantId,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      tokens,
    };
  }
}
