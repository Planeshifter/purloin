import { describe, it, expect } from 'vitest';
import { getRegistry, getSupportedTypes } from '../../src/registries/index.ts';
import { NpmRegistry } from '../../src/registries/npm.ts';
import { PypiRegistry } from '../../src/registries/pypi.ts';
import { MavenRegistry } from '../../src/registries/maven.ts';
import { RubygemsRegistry } from '../../src/registries/rubygems.ts';
import { CargoRegistry } from '../../src/registries/cargo.ts';
import { NugetRegistry } from '../../src/registries/nuget.ts';
import { GolangRegistry } from '../../src/registries/golang.ts';
import { HexRegistry } from '../../src/registries/hex.ts';
import { VscodeRegistry } from '../../src/registries/vscode.ts';
import { ChromeRegistry } from '../../src/registries/chrome.ts';
import { ComposerRegistry } from '../../src/registries/composer.ts';

describe('Registry Factory', () => {
  describe('getRegistry', () => {
    it('should return NpmRegistry for "npm"', () => {
      const registry = getRegistry('npm');
      expect(registry).toBeInstanceOf(NpmRegistry);
      expect(registry.type).toBe('npm');
    });

    it('should return PypiRegistry for "pypi"', () => {
      const registry = getRegistry('pypi');
      expect(registry).toBeInstanceOf(PypiRegistry);
      expect(registry.type).toBe('pypi');
    });

    it('should return MavenRegistry for "maven"', () => {
      const registry = getRegistry('maven');
      expect(registry).toBeInstanceOf(MavenRegistry);
      expect(registry.type).toBe('maven');
    });

    it('should return RubygemsRegistry for "gem"', () => {
      const registry = getRegistry('gem');
      expect(registry).toBeInstanceOf(RubygemsRegistry);
      expect(registry.type).toBe('gem');
    });

    it('should return CargoRegistry for "cargo"', () => {
      const registry = getRegistry('cargo');
      expect(registry).toBeInstanceOf(CargoRegistry);
      expect(registry.type).toBe('cargo');
    });

    it('should return NugetRegistry for "nuget"', () => {
      const registry = getRegistry('nuget');
      expect(registry).toBeInstanceOf(NugetRegistry);
      expect(registry.type).toBe('nuget');
    });

    it('should return GolangRegistry for "golang"', () => {
      const registry = getRegistry('golang');
      expect(registry).toBeInstanceOf(GolangRegistry);
      expect(registry.type).toBe('golang');
    });

    it('should return HexRegistry for "hex"', () => {
      const registry = getRegistry('hex');
      expect(registry).toBeInstanceOf(HexRegistry);
      expect(registry.type).toBe('hex');
    });

    it('should return VscodeRegistry for "vscode"', () => {
      const registry = getRegistry('vscode');
      expect(registry).toBeInstanceOf(VscodeRegistry);
      expect(registry.type).toBe('vscode');
    });

    it('should return ChromeRegistry for "chrome"', () => {
      const registry = getRegistry('chrome');
      expect(registry).toBeInstanceOf(ChromeRegistry);
      expect(registry.type).toBe('chrome');
    });

    it('should return ComposerRegistry for "composer"', () => {
      const registry = getRegistry('composer');
      expect(registry).toBeInstanceOf(ComposerRegistry);
      expect(registry.type).toBe('composer');
    });

    it('should throw for unsupported type', () => {
      // @ts-expect-error Testing invalid input
      expect(() => getRegistry('invalid')).toThrow(/Unsupported ecosystem type/);
    });
  });

  describe('getSupportedTypes', () => {
    it('should return all 11 supported ecosystem types', () => {
      const types = getSupportedTypes();
      expect(types).toHaveLength(11);
      expect(types).toContain('npm');
      expect(types).toContain('pypi');
      expect(types).toContain('maven');
      expect(types).toContain('gem');
      expect(types).toContain('cargo');
      expect(types).toContain('nuget');
      expect(types).toContain('golang');
      expect(types).toContain('hex');
      expect(types).toContain('vscode');
      expect(types).toContain('chrome');
      expect(types).toContain('composer');
    });
  });
});
