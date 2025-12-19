import { BaseRegistry } from './base.ts';
import type { ParsedPurl, EcosystemType } from '../types/index.ts';
import { PurlParseError } from '../types/index.ts';

export class MavenRegistry extends BaseRegistry {
  readonly type: EcosystemType = 'maven';
  readonly baseUrl = 'https://repo.maven.apache.org/maven2';

  async getDownloadUrl(purl: ParsedPurl): Promise<string> {
    this.validatePurl(purl);

    const { namespace, name, version } = purl;

    // namespace = groupId (e.g., org.apache.commons)
    // name = artifactId (e.g., commons-lang3)
    if (!namespace) {
      throw new PurlParseError(purl.raw, 'Maven packages require a groupId (namespace)');
    }

    // Convert groupId dots to path: org.apache.commons -> org/apache/commons
    const groupPath = namespace.replace(/\./g, '/');

    // URL: /org/apache/commons/commons-lang3/3.12.0/commons-lang3-3.12.0.jar
    return `${this.baseUrl}/${groupPath}/${name}/${version}/${name}-${version}.jar`;
  }

  getOutputFilename(purl: ParsedPurl): string {
    const { namespace, name, version } = purl;
    // Include groupId in filename to avoid collisions
    const groupPrefix = namespace?.replace(/\./g, '-') || '';
    return this.sanitizeFilename(`${groupPrefix}-${name}-${version}.jar`);
  }
}
