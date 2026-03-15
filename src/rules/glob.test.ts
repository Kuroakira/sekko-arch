import { describe, it, expect } from "vitest";
import { globMatch } from "./glob.js";

describe("globMatch", () => {
  describe("exact match", () => {
    it("matches exact path", () => {
      expect(globMatch("src/auth/login.ts", "src/auth/login.ts")).toBe(true);
    });

    it("rejects non-matching path", () => {
      expect(globMatch("src/auth/login.ts", "src/auth/logout.ts")).toBe(false);
    });
  });

  describe("single wildcard *", () => {
    it("matches any file in a directory", () => {
      expect(globMatch("src/auth/*", "src/auth/login.ts")).toBe(true);
      expect(globMatch("src/auth/*", "src/auth/logout.ts")).toBe(true);
    });

    it("does not match files in subdirectories", () => {
      expect(globMatch("src/auth/*", "src/auth/middleware/jwt.ts")).toBe(false);
    });

    it("matches file extension pattern", () => {
      expect(globMatch("*.ts", "index.ts")).toBe(true);
      expect(globMatch("*.ts", "index.js")).toBe(false);
    });
  });

  describe("double wildcard **", () => {
    it("matches files at any depth", () => {
      expect(globMatch("src/**", "src/auth/login.ts")).toBe(true);
      expect(globMatch("src/**", "src/auth/middleware/jwt.ts")).toBe(true);
      expect(globMatch("src/**", "src/index.ts")).toBe(true);
    });

    it("does not match outside prefix", () => {
      expect(globMatch("src/**", "lib/auth/login.ts")).toBe(false);
    });

    it("matches with extension filter", () => {
      expect(globMatch("src/**/*.ts", "src/auth/login.ts")).toBe(true);
      expect(globMatch("src/**/*.ts", "src/auth/login.js")).toBe(false);
      expect(globMatch("src/**/*.ts", "src/deep/nested/file.ts")).toBe(true);
    });
  });

  describe("prefix match", () => {
    it("matches directory prefix", () => {
      expect(globMatch("src/auth", "src/auth/login.ts")).toBe(true);
      expect(globMatch("src/auth", "src/auth/middleware/jwt.ts")).toBe(true);
    });

    it("does not match partial directory names", () => {
      expect(globMatch("src/auth", "src/authorization/login.ts")).toBe(false);
    });
  });
});
