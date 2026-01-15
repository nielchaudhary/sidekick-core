// src/config/Env.ts
import dotenv from 'dotenv';
import { SidekickPlatformError } from './exceptions.ts';

export class Env {
  private static initialized = false;

  static require(key: string): string {
    return this.get(key);
  }

  static initEnvironmentVars() {
    if (this.initialized) {
      return;
    }

    dotenv.config();
    this.initialized = true;

    this.require('mongoURI');
  }

  static get(key: string): string {
    const value = process.env[key];
    if (!value) {
      throw SidekickPlatformError.validation(`Missing required environment variable: ${key}`);
    }
    return value;
  }
}
