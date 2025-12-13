import { spawn } from 'node:child_process';
import { logger } from './logger.js';

/**
 * Execute an OmniJS script in OmniFocus using stdin piping (no temp files).
 *
 * This is the preferred execution method as it eliminates filesystem I/O.
 * The script content is piped directly to osascript via stdin.
 *
 * @param scriptContent - The OmniJS script to execute (as a string)
 * @returns Promise resolving to the parsed JSON result from OmniFocus
 * @throws Error if script execution fails or produces invalid output
 */
export async function executeOmniJS(scriptContent: string): Promise<unknown> {
  // Validate input
  if (typeof scriptContent !== 'string' || scriptContent.trim().length === 0) {
    throw new Error('Script content must be a non-empty string');
  }

  // Escape the script content for embedding in JXA template literal
  const escapedScript = scriptContent
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$/g, '\\$');

  // Build the JXA wrapper that executes OmniJS in OmniFocus
  const jxaScript = `function run() {
  try {
    const app = Application('OmniFocus');
    app.includeStandardAdditions = true;
    const result = app.evaluateJavascript(\`${escapedScript}\`);
    return result;
  } catch (e) {
    // Handle various error types - JXA errors may not have standard structure
    var errorMsg = (e && typeof e.message === 'string') ? e.message : String(e);
    return JSON.stringify({ error: errorMsg });
  }
}`;

  return new Promise((resolve, reject) => {
    // Spawn osascript with stdin mode (the '-' argument reads from stdin)
    const proc = spawn('osascript', ['-l', 'JavaScript', '-'], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data: Buffer) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data: Buffer) => {
      stderr += data.toString();
    });

    proc.on('close', (code: number | null) => {
      if (code !== 0) {
        logger.error('osascript exited with non-zero code', 'executeOmniJS', {
          code,
          stderr
        });
        reject(new Error(`osascript exited with code ${code}: ${stderr}`));
        return;
      }

      if (stderr) {
        logger.warning('Script stderr output', 'executeOmniJS', { stderr });
      }

      // Parse the JSON output and return the parsed object
      const trimmed = stdout.trim();
      try {
        resolve(JSON.parse(trimmed));
      } catch (parseError) {
        const err = parseError instanceof Error ? parseError : new Error(String(parseError));
        logger.error('Error parsing script output', 'executeOmniJS', {
          message: err.message
        });
        logger.debug('Script output was', 'executeOmniJS', { stdout: trimmed });
        // Return raw string as fallback (caller can handle)
        resolve(trimmed);
      }
    });

    proc.on('error', (err: Error) => {
      logger.error('Failed to spawn osascript', 'executeOmniJS', {
        message: err.message
      });
      reject(new Error(`Failed to execute osascript: ${err.message}`));
    });

    // Write the JXA script to stdin and close the stream
    proc.stdin.write(jxaScript);
    proc.stdin.end();
  });
}
