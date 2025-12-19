import type { EcosystemType, RegistryHandler } from '../types/index.ts';
import { NpmRegistry } from './npm.ts';
import { PypiRegistry } from './pypi.ts';
import { MavenRegistry } from './maven.ts';
import { RubygemsRegistry } from './rubygems.ts';
import { CargoRegistry } from './cargo.ts';
import { NugetRegistry } from './nuget.ts';
import { GolangRegistry } from './golang.ts';
import { HexRegistry } from './hex.ts';
import { VscodeRegistry } from './vscode.ts';
import { ChromeRegistry } from './chrome.ts';
import { ComposerRegistry } from './composer.ts';

const registries: Record<EcosystemType, RegistryHandler> = {
  npm: new NpmRegistry(),
  pypi: new PypiRegistry(),
  maven: new MavenRegistry(),
  gem: new RubygemsRegistry(),
  cargo: new CargoRegistry(),
  nuget: new NugetRegistry(),
  golang: new GolangRegistry(),
  hex: new HexRegistry(),
  vscode: new VscodeRegistry(),
  chrome: new ChromeRegistry(),
  composer: new ComposerRegistry(),
};

export function getRegistry(type: EcosystemType): RegistryHandler {
  const registry = registries[type];
  if (!registry) {
    throw new Error(`Unsupported ecosystem type: ${type}`);
  }
  return registry;
}

export function getSupportedTypes(): EcosystemType[] {
  return Object.keys(registries) as EcosystemType[];
}
