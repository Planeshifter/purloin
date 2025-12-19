import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';
import { stdin as processStdin } from 'node:process';

export async function readPurlsFromFile(filePath: string): Promise<string[]> {
  const purls: string[] = [];
  const fileStream = createReadStream(filePath);
  const rl = createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      purls.push(trimmed);
    }
  }

  return purls;
}

export async function readPurlsFromStdin(): Promise<string[]> {
  const purls: string[] = [];

  // Check if stdin is a TTY (interactive terminal)
  if (processStdin.isTTY) {
    return purls;
  }

  const rl = createInterface({
    input: processStdin,
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      purls.push(trimmed);
    }
  }

  return purls;
}

export async function collectPurls(
  args: string[],
  options: { file?: string; stdin: boolean }
): Promise<string[]> {
  const purls: string[] = [];

  // Collect from CLI arguments
  purls.push(...args);

  // Collect from file
  if (options.file) {
    const filePurls = await readPurlsFromFile(options.file);
    purls.push(...filePurls);
  }

  // Collect from stdin
  if (options.stdin) {
    const stdinPurls = await readPurlsFromStdin();
    purls.push(...stdinPurls);
  }

  return purls;
}
