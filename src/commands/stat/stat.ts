import { Command, CommandContext, ExecResult } from '../../types.js';
import { hasHelpFlag, showHelp } from '../help.js';

const statHelp = {
  name: 'stat',
  summary: 'display file or file system status',
  usage: 'stat [OPTION]... FILE...',
  options: [
    '-c FORMAT   use the specified FORMAT instead of the default',
    '    --help  display this help and exit',
  ],
};

export const statCommand: Command = {
  name: 'stat',

  async execute(args: string[], ctx: CommandContext): Promise<ExecResult> {
    if (hasHelpFlag(args)) {
      return showHelp(statHelp);
    }

    let format: string | null = null;
    const files: string[] = [];

    // Parse arguments
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      if (arg === '-c' && i + 1 < args.length) {
        format = args[++i];
      } else if (!arg.startsWith('-')) {
        files.push(arg);
      }
    }

    if (files.length === 0) {
      return {
        stdout: '',
        stderr: 'stat: missing operand\n',
        exitCode: 1,
      };
    }

    let stdout = '';
    let stderr = '';
    let hasError = false;

    for (const file of files) {
      const fullPath = ctx.fs.resolvePath(ctx.cwd, file);

      try {
        const stat = await ctx.fs.stat(fullPath);

        if (format) {
          // Handle custom format
          let output = format;
          output = output.replace(/%n/g, file); // file name
          output = output.replace(/%N/g, `'${file}'`); // quoted file name
          output = output.replace(/%s/g, String(stat.size)); // size
          output = output.replace(/%F/g, stat.isDirectory ? 'directory' : 'regular file'); // file type
          output = output.replace(/%a/g, '644'); // access rights (octal)
          output = output.replace(/%A/g, stat.isDirectory ? 'drwxr-xr-x' : '-rw-r--r--'); // access rights
          output = output.replace(/%u/g, '1000'); // user ID
          output = output.replace(/%U/g, 'user'); // user name
          output = output.replace(/%g/g, '1000'); // group ID
          output = output.replace(/%G/g, 'group'); // group name
          stdout += output + '\n';
        } else {
          // Default format
          stdout += `  File: ${file}\n`;
          stdout += `  Size: ${stat.size}\t\tBlocks: ${Math.ceil(stat.size / 512)}\n`;
          stdout += `Access: ${stat.isDirectory ? '(0755/drwxr-xr-x)' : '(0644/-rw-r--r--)'}\n`;
          stdout += `Modify: ${stat.mtime.toISOString()}\n`;
        }
      } catch {
        stderr += `stat: cannot stat '${file}': No such file or directory\n`;
        hasError = true;
      }
    }

    return { stdout, stderr, exitCode: hasError ? 1 : 0 };
  },
};
